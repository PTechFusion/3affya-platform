// Screen 23 detail: one receipt (docs/screens/23-receipts.md; rules E3, P14, P15, P13, C5). Phone first: the total large, when and
// how it was paid with the last 4 digits, the three lines (the written estimate the patient accepted, kept after payment), any
// refund below them, then Download receipt, which hands over to the Stripe-hosted receipt (ADR 6). The visit with both times and
// the change or cancel link sits beside the money on desktop and under it on phone.
// Sample ids (id = booking id): bk_001 paid, visit upcoming; bk_002 paid, visit done; bk_003 cancelled more than the cut-off
// before the visit, refunded in full (the refund line). Any other id, or ?state=notFound, shows the not-found state.
// ?state=loading; ?tz= as on the list.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { Badge, Breadcrumbs, ChevronNext, EmptyState, LinkButton, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { formatDate, formatMoney, formatNumber, formatPercent, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { durationLabel } from "@/lib/legal";
import { fullRefundDeadline } from "@/lib/refunds";
import { doctorById, patientReceiptById } from "@/lib/sample";
import { DownloadReceipt } from "../_parts/DownloadReceipt";
import {
  patientZone,
  paymentMethodLabel,
  receiptStatus,
  receiptsHref,
  refundedCents,
  statusTone,
  tzOverride,
  visitTone,
  type SearchParams,
} from "../_parts/receipts";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "receipts" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const nowrap = (chunks: React.ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;
const linkClass = "inline-flex items-center gap-1 font-semibold text-sea-700 underline-offset-2 hover:underline";

/** One instant as three short lines: the date, the clock time, the zone named (rule P6; the zone as its own LTR run, rule R3). */
function Moment({ instant, timeZone, locale }: { instant: Date; timeZone: string; locale: Locale }) {
  return (
    <>
      <span className="block text-ink-900">{formatDate(instant, timeZone, locale)}</span>
      <span className="tabular block text-lg font-bold text-sea-900">{formatTime(instant, timeZone, locale)}</span>
      <span className="ltr-run text-xs font-medium text-ink-500">{formatZone(instant, timeZone)}</span>
    </>
  );
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("receipts");
  const tp = await getTranslations("portal");
  const tz = tzOverride(sp);
  const zone = patientZone(tz);
  // Only the signed-in patient's own receipts resolve (authorisation is server-side; task 3.6 moves it into RLS).
  const receipt = sp.state === "notFound" ? undefined : patientReceiptById(id);
  const doctor = receipt ? doctorById(receipt.doctorId) : undefined;

  if (!receipt || !doctor) {
    return (
      <div className="flex max-w-4xl flex-col gap-6">
        <Breadcrumbs
          label={t("detail.breadcrumb")}
          items={[{ label: tp("patient.title"), href: "/patient" }, { label: t("title"), href: receiptsHref(undefined, tz) }, { label: t("detail.title") }]}
        />
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("detail.title")}</h1>
        <EmptyState
          title={t("detail.notFound.title")}
          body={t("detail.notFound.body")}
          action={<LinkButton href={receiptsHref(undefined, tz)}>{t("detail.notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const money = (cents: number) => formatMoney(cents, receipt.currency, loc);
  const status = receiptStatus(receipt);
  const name = loc === "ar" ? doctor.nameAr : doctor.nameEn;
  const specialty = loc === "ar" ? doctor.specialtyAr : doctor.specialtyEn;
  const visitType = t(`visitType.${receipt.visitType}`);
  const method = paymentMethodLabel(receipt, t);
  // The platform line's share as charged, read from the receipt itself so a later change of rate never rewrites an old receipt.
  const platformPct = receipt.doctorFeeCents > 0 ? Math.round((receipt.platformFeeCents * 1000) / receipt.doctorFeeCents) / 10 : 0;
  const cutoff = await durationLabel(locale, "hours", business.fullRefundCutoffHours);
  const upcoming = receipt.visitStatus === "upcoming";
  const deadline = fullRefundDeadline(receipt.startsAt);
  const bookingHref = `/patient/bookings/${receipt.id}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        label={t("detail.breadcrumb")}
        items={[
          { label: tp("patient.title"), href: "/patient" },
          { label: t("title"), href: receiptsHref(undefined, tz) },
          // The number in a left-to-right isolate (rule R3): after Arabic text, "1847-2054" otherwise reads back as "2054-1847".
          { label: t("detail.crumb", { number: `⁦${receipt.receiptNumber}⁩` }) },
        ]}
      />
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("detail.title")}</h1>
          <Badge tone={statusTone[status]}>{t(`status.${status}`)}</Badge>
        </div>
        <p className="mt-1.5 text-ink-700">
          {name} · {specialty} · {visitType}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Rule E3: the total is the most prominent thing on the receipt; when, how (last 4 digits) and the number under it. */}
          <section aria-labelledby="receipt-total">
            <h2 id="receipt-total" className="text-sm font-semibold text-ink-700">
              {t("detail.totalPaid")}
            </h2>
            <p className="tabular text-4xl font-bold leading-tight text-sea-900">{money(receipt.totalCents)}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-500">{t("detail.paidOn")}</dt>
              <dd className="text-ink-900">
                <span className="whitespace-nowrap">{formatDate(receipt.paidAt, zone, loc)}</span> ·{" "}
                <span className="whitespace-nowrap">{formatTime(receipt.paidAt, zone, loc)}</span>{" "}
                <span className="ltr-run">{formatZone(receipt.paidAt, zone)}</span>
              </dd>
              <dt className="text-ink-500">{t("detail.method")}</dt>
              <dd className="text-ink-900">{method}</dd>
              <dt className="text-ink-500">{t("detail.number")}</dt>
              <dd className="text-ink-900">
                <span className="ltr-run tabular">{receipt.receiptNumber}</span>
              </dd>
            </dl>
          </section>

          {/* Rules P1, P15: the same three lines the patient accepted before paying, kept here as the written estimate. */}
          <div className="flex flex-col gap-2">
            <FeeBreakdown
              caption={t("detail.lines.caption")}
              lines={[
                { label: t("detail.lines.doctorFee"), detail: t("detail.lines.doctorFeeDetail"), amount: money(receipt.doctorFeeCents) },
                {
                  label: t("detail.lines.platformFee"),
                  detail: t("detail.lines.platformFeeDetail", { pct: formatPercent(platformPct, loc) }),
                  amount: money(receipt.platformFeeCents),
                },
                {
                  label: t("detail.lines.cardProcessing"),
                  detail: t("detail.lines.cardProcessingDetail"),
                  amount: money(receipt.cardProcessingCents),
                },
              ]}
              total={{ label: t("detail.lines.total"), amount: money(receipt.totalCents) }}
            />
            <p className="text-sm text-ink-700">
              {t("detail.estimate")}{" "}
              <Link href="/fees" className={linkClass}>
                {t("detail.feesLink")}
                <ChevronNext className="size-3.5" />
              </Link>
            </p>
          </div>

          {receipt.cancellation ? (
            <section aria-labelledby="receipt-refund" className="flex flex-col gap-2">
              <h2 id="receipt-refund" className="text-lg font-bold text-sea-900">
                {t("detail.refund.title")}
              </h2>
              <p className="text-ink-900">{t(`detail.refund.reason.${receipt.cancellation.reason}`, { cutoff })}</p>
              {receipt.refunds.length ? (
                // The amount shows unsigned under the Refund label: a negative amount takes CLDR's left-to-right minus in Arabic
                // ("-271.96 USD") and would read in the opposite order to every other amount in the column.
                <FeeBreakdown
                  lines={receipt.refunds.map((x, i) => ({
                    label: receipt.refunds.length > 1 ? `${t("detail.refund.line")} ${formatNumber(i + 1, loc)}` : t("detail.refund.line"),
                    detail: t(x.status === "pending" ? "detail.refund.pending" : "detail.refund.issued", { method, date: formatDate(x.at, zone, loc) }),
                    amount: money(x.amountCents),
                  }))}
                  total={{ label: t("detail.refund.net"), amount: money(receipt.totalCents - refundedCents(receipt)) }}
                />
              ) : null}
              <p className="text-sm text-ink-700">
                {receipt.refunds.length ? `${t("detail.refund.bank")} ` : null}
                <Link href="/refunds" className={linkClass}>
                  {t("detail.refund.rulesLink")}
                  <ChevronNext className="size-3.5" />
                </Link>
              </p>
            </section>
          ) : null}

          <DownloadReceipt receiptId={receipt.id} />
        </div>

        {/* Rule E3: both times, and the change and cancel route for a visit still ahead. */}
        <section aria-labelledby="receipt-visit">
          <Surface className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="receipt-visit" className="text-lg font-bold text-sea-900">
                {t("detail.visit.title")}
              </h2>
              <Badge tone={visitTone[receipt.visitStatus]}>{t(`detail.visit.status.${receipt.visitStatus}`)}</Badge>
            </div>
            <div>
              <p className="font-semibold text-ink-900">{name}</p>
              <p className="text-sm text-ink-700">
                {specialty} · {visitType}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                <dt className="text-sm font-semibold text-ink-700">{t("detail.visit.yourTime")}</dt>
                <dd className="mt-1">
                  <Moment instant={receipt.startsAt} timeZone={zone} locale={loc} />
                </dd>
              </div>
              <div className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                <dt className="text-sm font-semibold text-ink-700">{t("detail.visit.doctorTime")}</dt>
                <dd className="mt-1">
                  <Moment instant={receipt.startsAt} timeZone={receipt.doctorTimeZone} locale={loc} />
                </dd>
              </div>
            </dl>
            {receipt.cancellation ? (
              <p className="text-sm text-ink-700">{t("detail.visit.cancelledOn", { date: formatDate(receipt.cancellation.at, zone, loc) })}</p>
            ) : null}
            {upcoming ? (
              <p className="text-sm text-ink-700">
                {t.rich("detail.visit.refundBy", {
                  day: formatDate(deadline, zone, loc),
                  time: formatTimeInZone(deadline, zone, loc),
                  nowrap,
                })}
              </p>
            ) : null}
            <LinkButton href={bookingHref} variant="secondary" className="w-full">
              {t(upcoming ? "detail.visit.change" : "detail.visit.view")}
            </LinkButton>
          </Surface>
        </section>
      </div>
    </div>
  );
}
