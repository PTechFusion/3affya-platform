// Screen 35, Payouts setup (docs/screens/35-payouts-setup.md, task 3.1). One card: the doctor's practice card small with what
// one first visit pays them (B5), a sentence on how payouts work, the three steps with the current one highlighted (F3) and the
// steps left beside the heading (B3), what Stripe still needs under its step (L3), then the one Stripe button. Stripe hosts
// onboarding and the payout dashboard (ADR-6): this page explains, links out and shows status, nothing more.
// States (data/sample/payouts.json, doctor doc_002): ?state=notStarted (default), ?state=inProgress, ?state=enabled,
// ?state=restricted, ?state=loading. ?tz= overrides the doctor's own zone for payout dates.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { Badge, Disclosure, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatDate, formatMoney, formatNumber, formatPercent, formatZone, type Locale } from "@/lib/format";
import {
  canTakeBookings,
  payoutNeeds,
  payoutStatus,
  payoutStatuses,
  payoutSteps,
  type PayoutRecordStatus,
  type PayoutStatus,
} from "@/lib/payouts";
import { doctorById, samplePayoutAccount, toDoctorCardData } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { PayoutSteps } from "./_parts/PayoutSteps";
import { StripeButton, type StripeButtonKind } from "./_parts/StripeButton";
import Loading from "./loading";

const DEFAULT_SAMPLE: PayoutStatus = "notStarted";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payouts" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const BUTTON: Record<PayoutStatus, StripeButtonKind> = {
  notStarted: "setUp",
  inProgress: "continue",
  restricted: "continue",
  enabled: "dashboard",
};

const PAYOUT_TONE: Record<PayoutRecordStatus, "success" | "info" | "danger"> = { paid: "success", inTransit: "info", failed: "danger" };

export default async function PayoutsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const sample = payoutStatuses.find((s) => s === sp.state) ?? DEFAULT_SAMPLE;
  const account = samplePayoutAccount(sample);
  const doctor = account ? doctorById(account.doctorId) : undefined;
  if (!account || !doctor) notFound();

  const t = await getTranslations("payouts");
  const tl = await getTranslations("languages");
  const status = payoutStatus(account);
  const steps = payoutSteps(account);
  const needs = payoutNeeds(account);
  const bookable = canTakeBookings(account);
  const enabled = status === "enabled";
  const restricted = status === "restricted";
  const stepsLeft = steps.filter((s) => s.status !== "done").length;
  // Payout dates read in the doctor's own zone; ?tz= overrides it for the prototype.
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : account.doctorTimeZone;
  const currency = business.currencyPresentment;
  const money = (cents: number, code: string = currency) => formatMoney(cents, code, loc);
  const date = (d: Date) => formatDate(d, timeZone, loc);
  const fee = doctor.feeUsdCents != null ? feeLines(doctor.feeUsdCents) : undefined;
  const card = toDoctorCardData(doctor, loc, timeZone, tl);
  const zoneAt = account.nextPayout?.arrivesAt ?? account.recentPayouts[0]?.arrivesAt;

  // Enabled: the next payout and the last two take the place of the all-done steps (layout deviation 1 in the report).
  const payoutsBlock = enabled ? (
    <>
      {account.nextPayout ? (
        <section aria-labelledby="next-payout-title" className="rounded-[var(--radius-field)] bg-lagoon-100 p-4 text-lagoon-900">
          <h2 id="next-payout-title" className="text-sm font-semibold">
            {t("next.title")}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="tabular text-xl font-bold">{date(account.nextPayout.arrivesAt)}</span>
            <span className="tabular text-xl font-bold">{money(account.nextPayout.amountCents, account.nextPayout.currency)}</span>
          </p>
          {account.bankLast4 ? <p className="text-sm">{t("next.to", { last4: account.bankLast4 })}</p> : null}
        </section>
      ) : null}
      {account.recentPayouts.length ? (
        <section aria-labelledby="recent-payouts-title">
          <h2 id="recent-payouts-title" className="font-bold text-sea-900">
            {t("recent.title")}
          </h2>
          <ul className="mt-1 divide-y divide-sand-200 border-y border-sand-200">
            {account.recentPayouts.slice(0, 2).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="tabular min-w-0 flex-1 text-ink-900">{date(p.arrivesAt)}</span>
                <span className="tabular font-semibold text-ink-900">{money(p.amountCents, p.currency)}</span>
                <Badge tone={PAYOUT_TONE[p.status]}>{t(`recent.${p.status}`)}</Badge>
              </li>
            ))}
          </ul>
          {zoneAt ? (
            <p className="mt-1.5 text-xs text-ink-500">
              {t("zone")}{" "}
              <span className="ltr-run" dir="ltr">
                {formatZone(zoneAt, timeZone)}
              </span>
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  ) : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t(`title.${status}`)}</h1>
        {enabled || restricted ? (
          <ul aria-label={t("flags.label")} className="flex flex-wrap gap-2">
            <li>
              <Badge tone={account.chargesEnabled ? "success" : "danger"}>{t(account.chargesEnabled ? "flags.chargesOn" : "flags.chargesOff")}</Badge>
            </li>
            <li>
              <Badge tone={account.payoutsEnabled ? "success" : "danger"}>{t(account.payoutsEnabled ? "flags.payoutsOn" : "flags.payoutsOff")}</Badge>
            </li>
          </ul>
        ) : (
          <Badge tone="info">{t("steps.left", { count: stepsLeft, countLabel: formatNumber(stepsLeft, loc) })}</Badge>
        )}
      </div>

      <Surface className="grid max-w-4xl gap-4 sm:gap-6 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        {/* The value first (rule B5): the claimed card and what one first visit pays. */}
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <DoctorCard doctor={card} state={doctor.state} size="mini" side="front" bookable={bookable} />
          {enabled ? null : fee ? (
            <p className="text-ink-900">
              {t.rich("earnings.line", {
                amount: money(fee.doctorFeeCents),
                strong: (chunks) => <strong className="tabular text-lg font-bold text-sea-900">{chunks}</strong>,
              })}
            </p>
          ) : (
            <p className="text-sm text-ink-700">
              {t("earnings.noFee")}{" "}
              <Link href="/professional/builder" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                {t("earnings.noFeeLink")}
              </Link>
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {enabled ? payoutsBlock : <p className="text-ink-900">{t(`how.${status}`)}</p>}
          {enabled ? null : <PayoutSteps steps={steps} needs={needs} />}
          <StripeButton kind={BUTTON[status]} variant={enabled ? "secondary" : "primary"} />
          <p className="text-sm text-ink-700">{t(bookable ? "book.shown" : restricted ? "book.hiddenRestricted" : "book.hidden")}</p>
        </div>

        {fee ? (
          <div className="border-t border-sand-200 lg:col-start-1 lg:row-start-2 lg:self-start">
            <Disclosure summary={t("earnings.breakdown")}>
              <FeeBreakdown
                caption={t("earnings.note")}
                lines={[
                  { label: t("earnings.yourFee"), detail: t("earnings.yourFeeDetail"), amount: money(fee.doctorFeeCents) },
                  {
                    label: t("earnings.platformFee"),
                    detail: t("earnings.platformFeeDetail", { pct: formatPercent(business.firstVisitPlatformFeePct, loc) }),
                    amount: money(fee.platformFeeCents),
                  },
                  {
                    label: t("earnings.cardProcessing"),
                    detail: t("earnings.cardProcessingDetail", {
                      cardPct: formatPercent(business.cardProcessingPct, loc),
                      cardFixed: money(business.cardProcessingFixedCents),
                    }),
                    amount: money(fee.cardProcessingCents),
                  },
                ]}
                total={{ label: t("earnings.total"), amount: money(fee.totalCents) }}
              />
              <p className="mt-3 rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
                {t("earnings.prototypeNote")}
              </p>
            </Disclosure>
          </div>
        ) : null}
      </Surface>
    </>
  );
}
