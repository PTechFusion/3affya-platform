// Screen 33, Membership and billing (docs/screens/33-membership-and-billing.md, task 3.5). The page shows the plan and links out:
// Stripe Checkout starts a membership, the Stripe Customer Portal handles plan changes, cards, invoices and cancelling. There is
// no card or invoice UI here (CLAUDE.md). Prototype switch: ?state=none (the default: Claimed, with the plan choice),
// ?state=active, ?state=pastDue (gold grace banner), ?state=cancelled, ?state=loading (skeleton). Dates are in the doctor's own
// time zone; ?tz= overrides it.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Surface, type BadgeTone } from "@/components/ui";
import { DAY_MS, formatDate, formatMoney, formatNumber, formatSlotDay, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { sampleMembership, sampleProfessional, type BillingInterval, type MembershipStatus } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import type { PlanId } from "@/app/[locale]/for-professionals/plans";
import { PlanTable } from "@/components/brand/PlanTable";
import { PortalButton } from "./_parts/PortalButton";
import { SubscribeForm, type IntervalOption } from "./_parts/SubscribeForm";
import Loading from "./loading";

const STATES: Record<string, MembershipStatus> = { none: "none", active: "active", pastDue: "past_due", cancelled: "cancelled" };
const STATUS_TONE: Record<Exclude<MembershipStatus, "none">, BadgeTone> = { active: "success", past_due: "warning", cancelled: "pending" };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "membership" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function MembershipPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("membership");
  const tp = await getTranslations("forProfessionals");

  const requested = typeof sp.state === "string" ? STATES[sp.state] : undefined;
  const membership = sampleMembership(requested ?? "none");
  const status: MembershipStatus = membership?.status ?? "none";
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : (membership?.timeZone ?? sampleProfessional.timeZone);
  const now = new Date();

  const money = (cents: number) => formatMoney(cents, business.membershipCurrency, loc);
  const date = (instant: Date) => formatDate(instant, timeZone, loc);
  const priceFor = (interval: BillingInterval) => (interval === "year" ? business.membershipYearlyCents : business.membershipMonthlyCents);
  const periodFor = (interval: BillingInterval) => (interval === "year" ? t("perYear") : tp("plans.perMonth"));

  const isMember = status !== "none";
  const interval: BillingInterval = membership?.interval ?? "month";
  const plan: PlanId = isMember ? "member" : "claimed";
  const periodEnd = membership?.currentPeriodEnd ?? null;

  // Past due: the profile stays live for membershipGraceDays from the first failed renewal (task 3.5), then booking pauses.
  const graceEndsAt =
    status === "past_due" && membership?.paymentFailedAt
      ? new Date(membership.paymentFailedAt.getTime() + business.membershipGraceDays * DAY_MS)
      : null;
  const daysLeft = graceEndsAt ? Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY_MS)) : 0;

  // The tier card's facts, per state (rule B8: the price and its period up front; C5: the amount is the whole amount).
  const facts: Array<{ term: string; value: ReactNode }> = [];
  if (status === "active" && periodEnd) {
    facts.push({ term: t("current.renewsOn"), value: date(periodEnd) });
    facts.push({ term: t("current.nextPayment"), value: money(priceFor(interval)) });
  } else if (status === "past_due") {
    facts.push({ term: t("current.amountDue"), value: money(priceFor(interval)) });
    if (periodEnd) facts.push({ term: t("current.dueSince"), value: date(periodEnd) });
  } else if (status === "cancelled" && periodEnd) {
    facts.push({ term: t("current.endsOn"), value: date(periodEnd) });
  }

  const yearlySaving = business.membershipMonthlyCents * 12 - business.membershipYearlyCents;
  const options: IntervalOption[] = [
    {
      interval: "month",
      title: t("choose.monthly"),
      description: t("choose.monthlyPrice", { price: money(business.membershipMonthlyCents) }),
      summary: t("choose.summaryMonth", { price: money(business.membershipMonthlyCents) }),
    },
    {
      interval: "year",
      title: t("choose.yearly"),
      description:
        yearlySaving > 0
          ? t("choose.yearlyPrice", { price: money(business.membershipYearlyCents), saving: money(yearlySaving) })
          : t("choose.yearlyPricePlain", { price: money(business.membershipYearlyCents) }),
      summary: t("choose.summaryYear", { price: money(business.membershipYearlyCents) }),
    },
  ];
  const initialInterval: BillingInterval = sp.plan === "yearly" ? "year" : "month";

  return (
    <>
      {graceEndsAt ? (
        <section aria-labelledby="past-due-title" className="mb-6 rounded-[var(--radius-card)] border border-gold-500/50 bg-gold-100 p-5">
          <h2 id="past-due-title" className="text-lg font-bold text-ink-900">
            {t("pastDue.title")}
          </h2>
          <p className="mt-1 text-ink-900">
            {t.rich("pastDue.body", {
              days: daysLeft,
              daysLabel: formatNumber(daysLeft, loc),
              day: formatSlotDay(graceEndsAt, timeZone, loc),
              time: formatTimeInZone(graceEndsAt, timeZone, loc),
              // The time and its zone stay on one line: "GMT-4" would otherwise break after the hyphen.
              nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
            })}
          </p>
          <div className="mt-4">
            <PortalButton flow="updateCard" label={t("pastDue.action")} hint={t("pastDue.hint")} />
          </div>
        </section>
      ) : null}

      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Surface className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink-500">{t("current.label")}</h2>
            {status !== "none" ? <Badge tone={STATUS_TONE[status]}>{t(`current.status.${status}`)}</Badge> : null}
          </div>
          <div>
            <p className="text-2xl font-bold text-sea-900">{tp(`plans.${plan}.name`)}</p>
            <p className="text-sm text-ink-700">{tp(`plans.${plan}.tagline`)}</p>
          </div>
          <p>
            <span className="tabular text-3xl font-bold text-ink-900">{isMember ? money(priceFor(interval)) : tp("plans.claimed.price")}</span>{" "}
            <span className="text-ink-700">{isMember ? periodFor(interval) : tp("plans.claimed.period")}</span>
          </p>
          {facts.length ? (
            <dl className="divide-y divide-sand-200 border-y border-sand-200">
              {facts.map((f) => (
                <div key={f.term} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                  <dt className="text-ink-700">{f.term}</dt>
                  <dd className="tabular font-semibold text-ink-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {status === "none" ? <p className="text-ink-700">{t("current.none")}</p> : null}
          {status === "cancelled" ? <p className="text-ink-700">{t("current.cancelledOutcome")}</p> : null}
          {facts.length ? (
            <p className="text-sm text-ink-500">
              {t("current.zone")} <bdi dir="ltr">{formatZone(periodEnd ?? now, timeZone)}</bdi>
            </p>
          ) : null}
        </Surface>

        {isMember ? (
          <Surface className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-sea-900">{t("billing.title")}</h2>
            {status === "cancelled" && periodEnd ? (
              <>
                <p className="text-ink-700">{t("billing.renewBody", { date: date(periodEnd) })}</p>
                <PortalButton flow="manage" label={t("billing.renew")} hint={t("billing.hint")} />
              </>
            ) : (
              <>
                <p className="text-ink-700">{t("billing.body")}</p>
                <PortalButton
                  flow="manage"
                  label={t("billing.manage")}
                  hint={t("billing.hint")}
                  variant={status === "past_due" ? "secondary" : "primary"}
                />
                <p className="border-t border-sand-200 pt-3 text-sm text-ink-700">{t("billing.cancelNote")}</p>
              </>
            )}
          </Surface>
        ) : (
          <Surface className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-bold text-sea-900">{t("choose.title")}</h2>
              <p className="mt-1 text-ink-700">{tp("plans.member.tagline")}</p>
            </div>
            <SubscribeForm options={options} initial={initialInterval} />
          </Surface>
        )}
      </div>

      <PlanTable current={plan} />
    </>
  );
}
