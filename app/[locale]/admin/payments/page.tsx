// Screen 43, Payments, refunds and payouts (docs/screens/43-payments-refunds-payouts.md; tasks 3.4, 3.11; rules P13, B10, E3,
// S3, S9, A5). Phone first: the heading with Export CSV at the top end, three tabs (Payments, Refunds, Payouts), a Filters row
// one level down, then the open tab's table: payments with their three lines and status and a Refund button; refunds with the
// reason, who and when; payouts per doctor with the Stripe account status. A doctor's name opens the payment
// (?payment=<booking id>), laid out like the patient's receipt. Refund opens the drawer: the amount, the transfer reversal,
// and a confirm that names the outcome. Money state is written only by the Stripe webhooks (ADR-6); this page reads it.
// Data: lib/sample adminPayments (the receipts rows of screen 23 plus data/sample/payments.json) and adminPayoutAccounts
// (doc_002 is screen 35's account). Times in the admin's zone (sampleAdmin, Riyadh) unless ?tz=.
// States: ?tab=payments|refunds|payouts; ?state=loading | empty | error | webhook-pending (bk_009's refund waiting for
// charge.refunded); ?payment=<id> (detail; bk_004 paid, bk_003 refunded, bk_009 cancelled late, bk_002 visit done);
// ?refund=<id> opens the drawer (the refund confirm); ?payment=<id>&state=refund-requested[&kind=rule|full] is the payment
// right after a refund was asked for. Filters: ?status=, ?reason=, ?account= (repeatable), ?doctor=doc_00n, ?period=7|30|90.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs, EmptyState, LinkButton, Notice, Surface, TabLinks } from "@/components/ui";
import { formatMoney, formatNumber, formatZone, type Locale } from "@/lib/format";
import { payoutStatus, type PayoutStatus } from "@/lib/payouts";
import { adminPayments, adminPayoutAccounts, adminRefundKey, sampleAdmin, type AdminPayment, type AdminRefund } from "@/lib/sample";
import { stripeDashboardUrl } from "@/lib/stripe-dashboard";
import { drawerPayments } from "./_parts/drawer-data";
import { FilterPanel, type FilterCounts } from "./_parts/Filters";
import { PaymentDetail } from "./_parts/PaymentDetail";
import { PaymentList } from "./_parts/PaymentList";
import { PaymentsHeader, PaymentsSkeleton } from "./_parts/PaymentsSkeleton";
import { PayoutList } from "./_parts/PayoutList";
import { RefundDrawerProvider } from "./_parts/RefundDrawer";
import { RefundList } from "./_parts/RefundList";
import {
  adminZone,
  canRefund,
  exportHref,
  filterAccounts,
  filterCount,
  filterPayments,
  filterRefunds,
  filtersFrom,
  paymentStatus,
  paymentStatuses,
  paymentsHref,
  refundAmount,
  refundReasons,
  refundRows,
  ruleRefund,
  sortAccounts,
  stateFrom,
  tabFrom,
  type RefundKind,
  type SearchParams,
} from "./_parts/payments";
import { StripeLink, ltr } from "./_parts/view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminPayments" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

/** How many of `pool` each offered value has, in the order offered. */
const countOf = <K extends string>(offered: readonly K[], pool: readonly string[]) =>
  Object.fromEntries(offered.map((k) => [k, pool.filter((v) => v === k).length])) as Partial<Record<K, number>>;

const ACCOUNT_FILTER_ORDER: PayoutStatus[] = ["restricted", "inProgress", "notStarted", "enabled"];

/**
 * The ?state=refund-requested preview: the refund the drawer just asked for, as the stored request row (the key, the admin,
 * now), still waiting for Stripe's charge.refunded. Production reads that row; the webhook later replaces it with the refund.
 */
function withRequestedRefund(p: AdminPayment, sp: SearchParams, now: Date): { amountCents: number; kind: RefundKind } | undefined {
  if (!canRefund(p)) return undefined;
  const ruleAmount = refundAmount(p, "rule", now);
  const kind: RefundKind = sp.kind === "full" || sp.kind === "rule" ? sp.kind : ruleAmount > 0 ? "rule" : "full";
  const amountCents = refundAmount(p, kind, now);
  if (amountCents <= 0) return undefined;
  const basis = ruleRefund(p, now).basis;
  // A cancellation keeps its own reason; a visit still ahead refunded by the rule is "byRule"; anything above the rule is an override.
  const reason: AdminRefund["reason"] =
    amountCents > ruleAmount ? "override" : basis === "upcomingEarly" ? "byRule" : basis === "upcomingLate" || basis === "visitDone" ? "override" : basis;
  p.refunds.push({
    id: adminRefundKey(p.id),
    paymentId: p.id,
    at: now,
    amountCents,
    status: "pending",
    reason,
    by: { kind: "admin", adminId: sampleAdmin.id },
    noteEn: null,
    noteAr: null,
    idempotencyKey: adminRefundKey(p.id),
  });
  return { amountCents, kind };
}

export default async function PaymentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = tabFrom(sp);
  const state = stateFrom(sp);
  if (state === "loading") return <PaymentsSkeleton tab={tab} />;

  const loc = locale as Locale;
  const t = await getTranslations("adminPayments");
  const tp = await getTranslations("portal");
  const now = new Date();
  const zone = adminZone(sp);
  const payments = state === "empty" ? [] : adminPayments({ withPendingSample: state === "webhook-pending" });
  const accounts = state === "empty" ? [] : sortAccounts(adminPayoutAccounts());
  const n = (v: number) => formatNumber(v, loc);
  const newTab = t("newTab");

  const pendingNotice = (count: number) => (
    <Notice
      tone="warning"
      title={t("pending.title", { count, countLabel: n(count) })}
      body={t("pending.body")}
      action={<StripeLink href={stripeDashboardUrl({ kind: "webhooks" })} label={t("pending.action")} newTab={newTab} />}
    />
  );

  /* ---------------- One payment ---------------- */
  if (typeof sp.payment === "string") {
    const payment = payments.find((p) => p.id === sp.payment);
    if (!payment) {
      return (
        <div className="flex max-w-4xl flex-col gap-6">
          <Breadcrumbs
            label={t("detail.breadcrumb")}
            items={[{ label: tp("admin.title"), href: "/admin" }, { label: tp("admin.nav.payments"), href: paymentsHref(sp) }, { label: t("detail.notFound.title") }]}
          />
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("tabs.payments")}</h1>
          <EmptyState
            title={t("detail.notFound.title")}
            body={t("detail.notFound.body")}
            action={<LinkButton href={paymentsHref(sp, { filters: null })}>{t("detail.notFound.action")}</LinkButton>}
          />
        </div>
      );
    }
    const requested = state === "refund-requested" ? withRequestedRefund(payment, sp, now) : undefined;
    const pending = payment.refunds.filter((r) => r.status === "pending").length;
    const notice = requested ? (
      <Notice
        tone="success"
        role="status"
        title={t("requested.title", { amount: formatMoney(requested.amountCents, payment.currency, loc) })}
        body={
          <>
            <p>{t("requested.body", { key: ltr(adminRefundKey(payment.id)) })}</p>
            <p className="mt-1 font-semibold">{t("requested.preview")}</p>
          </>
        }
      />
    ) : pending && state === "webhook-pending" ? (
      pendingNotice(pending)
    ) : undefined;
    const drawer = await drawerPayments([payment], loc, sp, now);
    return (
      <RefundDrawerProvider payments={drawer} initialOpen={typeof sp.refund === "string" ? sp.refund : undefined}>
        <PaymentDetail payment={payment} locale={loc} zone={zone} sp={sp} now={now} notice={notice} />
      </RefundDrawerProvider>
    );
  }

  /* ---------------- The three tables ---------------- */
  const filters = filtersFrom(sp);
  const allRefunds = refundRows(payments);
  const hasRows = { payments: payments.length, refunds: allRefunds.length, payouts: accounts.length }[tab] > 0;
  const header = (
    <PaymentsHeader
      title={t("title")}
      lead={t("lead")}
      exportLabel={t("export")}
      exportHref={state !== "error" && hasRows ? exportHref(sp) : undefined}
    />
  );
  // No count pills: three tabs with counts do not fit a 390 px row (TabLinks shares it equally); the lists say their size.
  const tabLinks = (
    <TabLinks
      label={t("tabs.label")}
      scroll={false}
      items={[
        { href: paymentsHref(sp, { tab: "payments", filters: null }), label: t("tabs.payments"), current: tab === "payments" },
        { href: paymentsHref(sp, { tab: "refunds", filters: null }), label: t("tabs.refunds"), current: tab === "refunds" },
        { href: paymentsHref(sp, { tab: "payouts", filters: null }), label: t("tabs.payouts"), current: tab === "payouts" },
      ]}
    />
  );

  if (state === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {tabLinks}
        <Surface className="flex flex-col items-start gap-4">
          <div role="alert">
            <h2 className="text-lg font-bold text-ink-900">{t(`error.${tab}.title`)}</h2>
            <p className="mt-1 max-w-xl text-ink-700">{t(`error.${tab}.body`)}</p>
          </div>
          <LinkButton href={paymentsHref(sp, { state: null })}>{t("error.action")}</LinkButton>
        </Surface>
      </div>
    );
  }

  const pendingCount = allRefunds.filter((r) => r.status === "pending").length;
  const doctors = [...new Map(payments.map((p) => [p.doctor.id, p.doctor])).values()].sort((a, b) =>
    loc === "ar" ? a.nameAr.localeCompare(b.nameAr, "ar") : a.nameEn.localeCompare(b.nameEn, "en"),
  );

  // A filter value is offered when some row has it; its count follows the other filters that are on (rule S10), so the
  // count says what choosing it would show.
  const statusPool = filterPayments(payments, { ...filters, status: [] }, now).map(paymentStatus);
  const reasonPool: string[] = filterRefunds(allRefunds, { ...filters, reason: [] }, now).map((r) => r.reason);
  const accountPool = accounts.map(payoutStatus);
  const counts: FilterCounts = {
    status: countOf(
      paymentStatuses.filter((s) => payments.some((p) => paymentStatus(p) === s)),
      statusPool,
    ),
    reason: countOf(
      refundReasons.filter((r) => allRefunds.some((x) => x.reason === r)),
      reasonPool,
    ),
    account: countOf(ACCOUNT_FILTER_ORDER.filter((s) => accountPool.includes(s)), accountPool),
  };

  const filteredPayments = filterPayments(payments, filters, now);
  const filteredRefunds = filterRefunds(allRefunds, filters, now);
  const filteredAccounts = filterAccounts(accounts, filters);
  const total = { payments: payments.length, refunds: allRefunds.length, payouts: accounts.length }[tab];
  const shown = { payments: filteredPayments.length, refunds: filteredRefunds.length, payouts: filteredAccounts.length }[tab];
  const hasFilters = filterCount(tab, filters) > 0;

  const empty =
    tab === "payments" ? (
      <EmptyState
        title={t("empty.payments.title")}
        body={t("empty.payments.body")}
        action={
          <LinkButton href={stripeDashboardUrl({ kind: "payments" })} target="_blank" rel="noopener noreferrer">
            {t("empty.payments.action")}
            <span className="sr-only"> {newTab}</span>
          </LinkButton>
        }
      />
    ) : tab === "refunds" ? (
      <EmptyState
        title={t("empty.refunds.title")}
        body={t("empty.refunds.body")}
        action={<LinkButton href={paymentsHref(sp, { tab: "payments", filters: null })}>{t("empty.refunds.action")}</LinkButton>}
      />
    ) : (
      <EmptyState title={t("empty.payouts.title")} body={t("empty.payouts.body")} action={<LinkButton href="/admin/review">{t("empty.payouts.action")}</LinkButton>} />
    );

  const drawer = tab === "payments" ? await drawerPayments(filteredPayments, loc, sp, now) : [];
  const currencies = [...new Set(payments.map((p) => p.currency))];

  return (
    <RefundDrawerProvider payments={drawer} initialOpen={typeof sp.refund === "string" ? sp.refund : undefined}>
      <div className="flex flex-col gap-6">
        {header}
        {tabLinks}
        {pendingCount && tab !== "payouts" ? pendingNotice(pendingCount) : null}
        {tab === "payouts" && total ? <p className="-mt-2 max-w-2xl text-sm text-ink-700">{t("payouts.lead")}</p> : null}

        {total === 0 ? (
          empty
        ) : (
          <>
            <FilterPanel tab={tab} sp={sp} locale={loc} filters={filters} counts={counts} doctors={doctors} />
            {shown === 0 && hasFilters ? (
              <EmptyState
                title={t("empty.filtered.title")}
                body={t("empty.filtered.body")}
                action={<LinkButton href={paymentsHref(sp, { filters: null })}>{t("empty.filtered.action")}</LinkButton>}
              />
            ) : tab === "payments" ? (
              <PaymentList payments={filteredPayments} locale={loc} zone={zone} sp={sp} />
            ) : tab === "refunds" ? (
              <RefundList rows={filteredRefunds} locale={loc} zone={zone} sp={sp} />
            ) : (
              <PayoutList accounts={filteredAccounts} locale={loc} zone={zone} />
            )}
            <p className="text-sm text-ink-500">
              {t("zone")} <span className="ltr-run">{formatZone(now, zone)}</span>
              {tab !== "payouts" && currencies.length === 1 ? <> · {t("currencyNote", { currency: currencies[0] ?? "" })}</> : null}
            </p>
          </>
        )}
      </div>
    </RefundDrawerProvider>
  );
}
