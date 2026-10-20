// The payouts table (task 3.11; task 3.1 "admin sees connected account status"): one row per doctor's Stripe Connect account,
// accounts that need someone first. Each row: the account status from the account.updated flags (lib/payouts, the same rule
// as screen 35), what Stripe still needs, the bank's last 4 digits, the next and the last payout from Stripe's API, and a link
// to the account in the Stripe dashboard, which hosts payouts and bank details (ADR-6: no payout UI of our own).
import { getTranslations } from "next-intl/server";
import { Badge, Surface } from "@/components/ui";
import { formatDate, formatMoney, type Locale } from "@/lib/format";
import { canTakeBookings, payoutNeeds, payoutStatus, type PayoutRecordStatus } from "@/lib/payouts";
import type { AdminPayoutAccount } from "@/lib/sample";
import { stripeDashboardUrl } from "@/lib/stripe-dashboard";
import { accountTone } from "./payments";
import { StripeLink, doctorName, specialtyName } from "./view";

const RECORD_TONE: Record<PayoutRecordStatus, "success" | "info" | "danger"> = { paid: "success", inTransit: "info", failed: "danger" };

export async function PayoutList({ accounts, locale, zone }: { accounts: AdminPayoutAccount[]; locale: Locale; zone: string }) {
  const t = await getTranslations("adminPayments");
  const list = (items: string[]) => items.join(locale === "ar" ? "، " : ", ");

  const view = accounts.map((a) => {
    const status = payoutStatus(a);
    const needs = payoutNeeds(a).map((n) => (n.overdue ? t("payouts.overdue", { item: t(`payouts.need.${n.key}`) }) : t(`payouts.need.${n.key}`)));
    const last = a.recentPayouts[0];
    return {
      a,
      status,
      needs: needs.length ? t("payouts.needs", { items: list(needs) }) : null,
      paused: status === "restricted" && !canTakeBookings(a),
      bank: a.bankLast4 ? t("payouts.bank", { last4: a.bankLast4 }) : t("payouts.noBank"),
      next: a.nextPayout
        ? `${formatDate(a.nextPayout.arrivesAt, zone, locale)} · ${formatMoney(a.nextPayout.amountCents, a.nextPayout.currency, locale)}`
        : t("payouts.noNext"),
      last: last ? `${formatDate(last.arrivesAt, zone, locale)} · ${formatMoney(last.amountCents, last.currency, locale)}` : t("payouts.noLast"),
      lastStatus: last?.status,
      href: a.stripeAccountId ? stripeDashboardUrl({ kind: "account", id: a.stripeAccountId }) : null,
    };
  });
  const badge = (v: (typeof view)[number]) => <Badge tone={accountTone[v.status]}>{t(`payouts.status.${v.status}`)}</Badge>;
  const lastBadge = (s: PayoutRecordStatus | undefined) => (s ? <Badge tone={RECORD_TONE[s]}>{t(`payouts.record.${s}`)}</Badge> : null);
  const link = (v: (typeof view)[number]) =>
    v.href ? <StripeLink href={v.href} label={t("openStripe")} newTab={t("newTab")} /> : <span className="text-ink-500">{t("detail.stripe.noAccount")}</span>;

  return (
    <div className="@container">
      <ul className="flex flex-col gap-3 @4xl:hidden">
        {view.map((v) => (
          <li key={v.a.doctor.id}>
            <Surface className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{doctorName(v.a.doctor, locale)}</p>
                  <p className="text-sm text-ink-700">{specialtyName(v.a.doctor, locale)}</p>
                </div>
                {badge(v)}
              </div>
              {v.needs ? <p className="text-sm font-semibold text-ink-900">{v.needs}</p> : null}
              {v.paused ? <p className="text-sm text-ink-700">{t("payouts.bookingsPaused")}</p> : null}
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-ink-500">{t("columns.bank")}</dt>
                <dd className="tabular text-ink-900">{v.bank}</dd>
                <dt className="text-ink-500">{t("columns.nextPayout")}</dt>
                <dd className="tabular text-ink-900">{v.next}</dd>
                <dt className="text-ink-500">{t("columns.lastPayout")}</dt>
                <dd className="tabular flex flex-wrap items-center gap-2 text-ink-900">
                  {v.last}
                  {lastBadge(v.lastStatus)}
                </dd>
              </dl>
              <div className="text-sm">{link(v)}</div>
            </Surface>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-sand-200 bg-white @4xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("tabs.payouts")}</caption>
          <thead>
            <tr className="border-b border-sand-200 text-ink-500">
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {t("columns.doctor")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.account")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.bank")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.nextPayout")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.lastPayout")}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                <span className="sr-only">{t("openStripe")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {view.map((v) => (
              <tr key={v.a.doctor.id} className="align-top">
                <td className="min-w-44 px-4 py-3">
                  <span className="block font-semibold text-ink-900">{doctorName(v.a.doctor, locale)}</span>
                  <span className="block text-ink-700">{specialtyName(v.a.doctor, locale)}</span>
                </td>
                <td className="max-w-72 px-3 py-3">
                  {badge(v)}
                  {v.needs ? <span className="mt-1 block font-semibold text-ink-900">{v.needs}</span> : null}
                  {v.paused ? <span className="mt-1 block text-ink-700">{t("payouts.bookingsPaused")}</span> : null}
                </td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-ink-900">{v.bank}</td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-ink-900">{v.next}</td>
                <td className="tabular px-3 py-3 text-ink-900">
                  <span className="block whitespace-nowrap">{v.last}</span>
                  {v.lastStatus ? <span className="mt-1 block">{lastBadge(v.lastStatus)}</span> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{link(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
