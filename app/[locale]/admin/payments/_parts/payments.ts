// Shared logic of the admin money screen (43): the tab and preview state from the URL, the filters, links that keep them, a
// payment's money status, what the refund rule gives for a payment today and who gives back what (rule P13: a refund, never a
// void). The page, the refund action and the CSV export all read these, so they agree.
import type { BadgeTone } from "@/components/ui";
import { adminMoney } from "@/config/business";
import { DAY_MS } from "@/lib/format";
import { payoutStatus, type PayoutStatus } from "@/lib/payouts";
import { fullRefundDeadline, refundFor, type RefundReason } from "@/lib/refunds";
import { sampleAdmin, type AdminPayment, type AdminPayoutAccount, type AdminRefund } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;

export const BASE = "/admin/payments";

/* ---------------- Tabs and preview states ---------------- */

export const tabs = ["payments", "refunds", "payouts"] as const;
export type Tab = (typeof tabs)[number];

export function tabFrom(sp: SearchParams): Tab {
  return tabs.find((t) => t === sp.tab) ?? "payments";
}

export const previewStates = ["loading", "empty", "error", "refund-requested", "webhook-pending"] as const;
export type PreviewState = (typeof previewStates)[number];

export function stateFrom(sp: SearchParams): PreviewState | undefined {
  return previewStates.find((s) => s === sp.state);
}

/** `?tz=` when the prototype viewer sets one (lib/viewer); otherwise the signed-in admin's own zone. */
export function tzOverride(sp: SearchParams): string | undefined {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : undefined;
}
export const adminZone = (sp: SearchParams) => tzOverride(sp) ?? sampleAdmin.timeZone;

/* ---------------- Statuses ---------------- */

export type PaymentStatus = "paid" | "refundPending" | "partlyRefunded" | "refunded";
export const paymentStatuses: PaymentStatus[] = ["paid", "refundPending", "partlyRefunded", "refunded"];

/** Money refunded so far, as the charge.refunded webhook stored it (a request still waiting for Stripe does not count). */
export function refundedCents(p: AdminPayment): number {
  return p.refunds.filter((r) => r.status === "succeeded").reduce((sum, r) => sum + r.amountCents, 0);
}

/** The same order as the patient's receipt (23): a refund Stripe has not confirmed reads first, then refunded, then paid. */
export function paymentStatus(p: AdminPayment): PaymentStatus {
  if (p.refunds.some((r) => r.status === "pending")) return "refundPending";
  const back = refundedCents(p);
  if (back >= p.totalCents) return "refunded";
  return back > 0 ? "partlyRefunded" : "paid";
}

export const paymentTone: Record<PaymentStatus, BadgeTone> = {
  paid: "success",
  refundPending: "warning",
  partlyRefunded: "info",
  refunded: "info",
};
export const refundTone: Record<AdminRefund["status"], BadgeTone> = { pending: "warning", succeeded: "info" };
export const visitTone: Record<AdminPayment["visitStatus"], BadgeTone> = { upcoming: "info", done: "success", cancelled: "pending" };
export const accountTone: Record<PayoutStatus, BadgeTone> = {
  enabled: "success",
  inProgress: "info",
  restricted: "danger",
  notStarted: "pending",
};

/** Accounts that need someone first: restricted, then still setting up, then not started, then on. */
const ACCOUNT_ORDER: PayoutStatus[] = ["restricted", "inProgress", "notStarted", "enabled"];
export function sortAccounts(accounts: AdminPayoutAccount[]): AdminPayoutAccount[] {
  return [...accounts].sort(
    (a, b) => ACCOUNT_ORDER.indexOf(payoutStatus(a)) - ACCOUNT_ORDER.indexOf(payoutStatus(b)) || a.doctor.nameEn.localeCompare(b.doctor.nameEn),
  );
}

/* ---------------- The refund rule, applied by an admin ---------------- */

/** Why the rule gives what it gives for a payment today: a stored cancellation, a visit still ahead, or one that took place. */
export type RuleBasis = RefundReason | "upcomingEarly" | "upcomingLate" | "visitDone";

/**
 * What the refund rule (lib/refunds.ts, business.fullRefundCutoffHours) gives back for this payment. A cancelled visit keeps
 * the refund its cancellation earned; a visit still ahead is treated as the patient cancelling now; a visit that took place
 * gets nothing by the rule (an admin can still refund it in full, with a note).
 */
export function ruleRefund(p: AdminPayment, now: Date = new Date()): { basis: RuleBasis; amountCents: number } {
  if (p.cancellation) return { basis: p.cancellation.reason, amountCents: refundFor(p.totalCents, p.startsAt, p.cancellation.at, p.cancellation.by).amountCents };
  if (p.visitStatus === "upcoming" && p.startsAt.getTime() > now.getTime()) {
    const r = refundFor(p.totalCents, p.startsAt, now, "patient");
    return { basis: r.reason === "patientEarly" ? "upcomingEarly" : "upcomingLate", amountCents: r.amountCents };
  }
  return { basis: "visitDone", amountCents: 0 };
}

export type RefundKind = "rule" | "full";

/** The amount one kind of refund sends back. Refunds are whole (the rule is all or nothing), so both are the total or zero. */
export function refundAmount(p: AdminPayment, kind: RefundKind, now: Date = new Date()): number {
  return kind === "full" ? p.totalCents - refundedCents(p) : Math.max(0, ruleRefund(p, now).amountCents - refundedCents(p));
}

/** A refund can be asked for while nothing is refunded or waiting for Stripe. */
export const canRefund = (p: AdminPayment) => paymentStatus(p) === "paid";

/**
 * Who gives back what, for a refund created with reverse_transfer and refund_application_fee (task 3.4): the doctor's share of
 * the transfer comes back from their Stripe balance and 3affya returns its application fee (the platform and card lines), in
 * proportion to the amount. Stripe keeps its own processing fee, which 3affya carries.
 */
export function refundSplit(p: AdminPayment, amountCents: number): { doctorCents: number; platformCents: number } {
  if (p.totalCents <= 0) return { doctorCents: 0, platformCents: 0 };
  const doctorCents = Math.round((amountCents * p.doctorFeeCents) / p.totalCents);
  return { doctorCents, platformCents: amountCents - doctorCents };
}

export const fullRefundDeadlineFor = (p: AdminPayment) => fullRefundDeadline(p.startsAt);

/* ---------------- Filters (rules S3, S9: in the URL; several values of one type OR, types AND) ---------------- */

export const refundReasons = ["patientEarly", "doctor", "platform", "byRule", "override"] as const;
export type FilterReason = (typeof refundReasons)[number];

export type Filters = {
  status: PaymentStatus[];
  reason: FilterReason[];
  account: PayoutStatus[];
  doctor: string | undefined;
  period: number | undefined;
};

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const pick = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) =>
  [...new Set(list(v))].filter((x): x is T => (allowed as readonly string[]).includes(x));

export function filtersFrom(sp: SearchParams): Filters {
  const period = Number(typeof sp.period === "string" ? sp.period : NaN);
  return {
    status: pick(sp.status, paymentStatuses),
    reason: pick(sp.reason, refundReasons),
    account: pick(sp.account, ["enabled", "inProgress", "restricted", "notStarted"] as const),
    doctor: typeof sp.doctor === "string" && /^doc_\d+$/.test(sp.doctor) ? sp.doctor : undefined,
    period: adminMoney.periodDaysOptions.includes(period) ? period : undefined,
  };
}

/** How many filters of the open tab are on (for the Filters line and Clear). */
export function filterCount(tab: Tab, f: Filters): number {
  if (tab === "payouts") return f.account.length;
  return (tab === "payments" ? f.status.length : f.reason.length) + (f.doctor ? 1 : 0) + (f.period ? 1 : 0);
}

const within = (at: Date, days: number | undefined, now: Date) => !days || now.getTime() - at.getTime() <= days * DAY_MS;

export function filterPayments(payments: AdminPayment[], f: Filters, now: Date = new Date()): AdminPayment[] {
  return payments.filter(
    (p) =>
      (!f.status.length || f.status.includes(paymentStatus(p))) &&
      (!f.doctor || p.doctor.id === f.doctor) &&
      within(p.paidAt, f.period, now),
  );
}

export type RefundRow = AdminRefund & { payment: AdminPayment };

/** Every refund, newest first, each with its payment. */
export function refundRows(payments: AdminPayment[]): RefundRow[] {
  return payments.flatMap((p) => p.refunds.map((r) => ({ ...r, payment: p }))).sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function filterRefunds(rows: RefundRow[], f: Filters, now: Date = new Date()): RefundRow[] {
  return rows.filter(
    (r) =>
      (!f.reason.length || (f.reason as string[]).includes(r.reason)) &&
      (!f.doctor || r.payment.doctor.id === f.doctor) &&
      within(r.at, f.period, now),
  );
}

export function filterAccounts(accounts: AdminPayoutAccount[], f: Filters): AdminPayoutAccount[] {
  return accounts.filter((a) => !f.account.length || f.account.includes(payoutStatus(a)));
}

/* ---------------- Links ---------------- */

type HrefParts = {
  tab?: Tab;
  /** null drops every filter; a partial object replaces those filters only. */
  filters?: Partial<Filters> | null;
  payment?: string;
  refund?: string;
  /** null drops the preview state. */
  state?: PreviewState | null;
  kind?: RefundKind;
};

/** The preview states that belong to the whole list, so they survive moving between tabs and filters. */
const LIST_STATES: PreviewState[] = ["empty", "error", "webhook-pending"];

/**
 * A link within the screen. It keeps ?tz= and the list-wide preview states (empty, error, webhook-pending) so a reviewer can
 * move between tabs in one state; refund-requested and loading belong to one view and are dropped unless passed.
 */
export function paymentsHref(sp: SearchParams, parts: HrefParts = {}): string {
  const q = new URLSearchParams();
  const tab = parts.tab ?? tabFrom(sp);
  if (tab !== "payments") q.set("tab", tab);
  const current = stateFrom(sp);
  const state = parts.state === null ? undefined : (parts.state ?? (current && LIST_STATES.includes(current) ? current : undefined));
  if (state) q.set("state", state);
  if (parts.payment) q.set("payment", parts.payment);
  if (parts.refund) q.set("refund", parts.refund);
  if (parts.kind) q.set("kind", parts.kind);
  const f = parts.filters === null ? undefined : { ...filtersFrom(sp), ...(parts.filters ?? {}) };
  if (f) {
    if (tab === "payments") f.status?.forEach((s) => q.append("status", s));
    if (tab === "refunds") f.reason?.forEach((s) => q.append("reason", s));
    if (tab === "payouts") f.account?.forEach((s) => q.append("account", s));
    if (tab !== "payouts" && f.doctor) q.set("doctor", f.doctor);
    if (tab !== "payouts" && f.period) q.set("period", String(f.period));
  }
  const tz = tzOverride(sp);
  if (tz) q.set("tz", tz);
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
}

/** The CSV of the open tab with its filters (and the webhook-pending preview's extra row). */
export function exportHref(sp: SearchParams): string {
  const href = paymentsHref(sp);
  return href.replace(BASE, `${BASE}/export.csv`);
}
