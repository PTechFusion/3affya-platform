// The members list (screen 42) as the page shows it: one row per verified professional with plan, status, renewal or grace and
// the Stripe link, the totals over every row, the counts per view, the detail sheet and the just-changed notice. Every date and
// amount is formatted here, on the server, in the admin's zone (sampleAdmin, Riyadh) unless ?tz= is set. The arithmetic is
// lib/membership.ts, the same the doctor's own membership page (screen 33) uses, so both views of one membership agree.
import type { getTranslations } from "next-intl/server";
import type { BadgeTone } from "@/components/ui";
import { business, membershipAdmin } from "@/config/business";
import { DAY_MS, formatDate, formatMoney, formatNumber, formatSlotDay, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { addMonths, graceDaysLeft, graceEndsAt, membershipPriceCents, monthlyValueCents, type MembershipInterval } from "@/lib/membership";
import { adminMemberRow, adminMemberRows, sampleAdmin, type AdminMemberRow, type MembershipStatus } from "@/lib/sample";
import { stripeDashboardUrl } from "@/lib/stripe-dashboard";
import { viewerFrom } from "@/lib/viewer";
import {
  changesFor,
  FILTER_STATUSES,
  MEMBERS_FILTERS,
  MEMBERSHIP_CHANGES,
  membersHref,
  STATUS_TONE,
  type DetailFact,
  type MemberDetailView,
  type MembersFilter,
  type MembershipChange,
  type MembersQuery,
} from "./shared";

type T = Awaited<ReturnType<typeof getTranslations>>;
export type SearchParams = Record<string, string | string[] | undefined>;

export const filterFrom = (sp: SearchParams): MembersFilter => MEMBERS_FILTERS.find((f) => f === sp.status) ?? "current";

/** Admin pages render in the signed-in admin's zone; ?tz= overrides it for review. */
export const adminZone = (sp: SearchParams): string => (typeof sp.tz === "string" ? viewerFrom(sp).timeZone : sampleAdmin.timeZone);

/** The parts of the query every list link keeps: the view and the prototype's ?tz=. */
export const baseQuery = (sp: SearchParams): Pick<MembersQuery, "status" | "tz"> => ({
  status: filterFrom(sp),
  tz: typeof sp.tz === "string" ? sp.tz : undefined,
});

/* ---------------- A change just made ---------------- */

export type JustChanged = { doctorId: string; did: MembershipChange; months?: number };

/** ?state=changed: the demo of the list right after an admin set Dr Huda Aziz's monthly membership to end at period end. */
const DEMO_CHANGE: JustChanged = { doctorId: "doc_007", did: "cancelAtPeriodEnd" };

/** The change the sheet just made (?changed=<doctor>&did=<change>[&months=n]), only if it fits that membership. */
export function justChangedFrom(sp: SearchParams): JustChanged | undefined {
  if (sp.state === "changed") return DEMO_CHANGE;
  const did = MEMBERSHIP_CHANGES.find((c) => c === sp.did);
  const row = typeof sp.changed === "string" ? adminMemberRow(sp.changed) : undefined;
  if (!did || !row || !changesFor(row.membership?.status ?? "none").includes(did)) return undefined;
  if (did !== "comp") return { doctorId: row.doctor.id, did };
  const months = Number(sp.months);
  return membershipAdmin.compMonthsOptions.includes(months) ? { doctorId: row.doctor.id, did, months } : undefined;
}

/* ---------------- One membership's facts ---------------- */

type Facts = {
  row: AdminMemberRow;
  status: MembershipStatus;
  interval: MembershipInterval | null;
  periodEnd: Date | null;
  /** Free months still running: the next charge is then. */
  compUntil: Date | null;
  graceEnd: Date | null;
  graceDays: number;
  graceLeft: number;
};

function factsOf(row: AdminMemberRow, now: Date, extraGraceDays: number): Facts {
  const m = row.membership;
  const status = m?.status ?? "none";
  const compUntil = row.billing?.compUntil && row.billing.compUntil.getTime() > now.getTime() ? row.billing.compUntil : null;
  const graceEnd = status === "past_due" && m?.paymentFailedAt ? graceEndsAt(m.paymentFailedAt, extraGraceDays) : null;
  return {
    row,
    status,
    interval: m?.interval ?? null,
    periodEnd: m?.currentPeriodEnd ?? null,
    compUntil: status === "active" ? compUntil : null,
    graceEnd,
    graceDays: business.membershipGraceDays + extraGraceDays,
    graceLeft: graceEnd ? graceDaysLeft(graceEnd, now) : 0,
  };
}

const STATUS_ORDER: Record<MembershipStatus, number> = { past_due: 0, active: 1, cancelled: 2, none: 3 };

/** Most urgent first: past due by the end of grace, then active by the next charge, then those ending, then the rest by name. */
function compare(a: Facts, b: Facts, loc: Locale): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (byStatus) return byStatus;
  const when = (f: Facts) => (f.graceEnd ?? f.compUntil ?? f.periodEnd)?.getTime() ?? 0;
  return when(a) - when(b) || name(a.row, loc).localeCompare(name(b.row, loc), loc);
}

const name = (r: AdminMemberRow, loc: Locale) => (loc === "ar" ? r.doctor.nameAr : r.doctor.nameEn);
const specialty = (r: AdminMemberRow, loc: Locale) => (loc === "ar" ? r.doctor.specialtyAr : r.doctor.specialtyEn);

/* ---------------- Views ---------------- */

export type MemberRowView = {
  doctorId: string;
  name: string;
  specialty: string;
  status: MembershipStatus;
  statusLabel: string;
  tone: BadgeTone;
  plan: string;
  price: string;
  when: string;
  whenNote?: string;
  /** The grace period is running out: the line reads in the warning colour. */
  warn: boolean;
  stripeHref?: string;
  detailHref: string;
  marker?: "justChanged" | "waiting";
};

export type MembersView = {
  rows: MemberRowView[];
  counts: Record<MembersFilter, number>;
  totals: { mrr: string; renewing: number; pastDue: number; pastDueAmount: string; ending: number; endingAmount: string };
  zone: string;
  detail?: MemberDetailView | null;
  notice?: { tone: "success" | "info"; title: string; body: string; rich?: { time: string }; undo?: JustChanged };
};

type Ctx = { t: T; tp: T; loc: Locale; zone: string; now: Date };

function formatters({ t, tp, loc, zone }: Ctx) {
  const money = (cents: number) => formatMoney(cents, business.membershipCurrency, loc);
  const date = (instant: Date) => formatDate(instant, zone, loc);
  const priceLine = (interval: MembershipInterval) =>
    t(interval === "year" ? "plan.perYear" : "plan.perMonth", { price: money(membershipPriceCents(interval)) });
  // The tier only: the price line beside it carries the period (per month, per year).
  const planLine = (interval: MembershipInterval | null) => tp(interval ? "plans.member.name" : "plans.claimed.name");
  const daysLeftLine = (f: Facts) =>
    t("renewal.daysLeft", {
      daysLabel: formatNumber(f.graceLeft, loc),
      grace: f.graceDays,
      graceLabel: formatNumber(f.graceDays, loc),
    });
  return { money, date, priceLine, planLine, daysLeftLine };
}

function rowView(f: Facts, ctx: Ctx, query: MembersQuery, marker?: MemberRowView["marker"]): MemberRowView {
  const { t, loc } = ctx;
  const { date, priceLine, planLine, daysLeftLine } = formatters(ctx);
  let when: string;
  let whenNote: string | undefined;
  if (f.status === "past_due" && f.graceEnd) {
    when = f.graceLeft > 0 ? t("renewal.graceEnds", { date: date(f.graceEnd) }) : t("renewal.graceOver");
    whenNote = f.graceLeft > 0 ? daysLeftLine(f) : undefined;
  } else if (f.status === "active" && f.compUntil && f.interval) {
    when = t("renewal.freeUntil", { date: date(f.compUntil) });
    whenNote = t("renewal.then", { price: priceLine(f.interval) });
  } else if (f.status === "active" && f.periodEnd) {
    when = t("renewal.renews", { date: date(f.periodEnd) });
  } else if (f.status === "cancelled" && f.periodEnd) {
    when = t("renewal.ends", { date: date(f.periodEnd) });
    const cancelledAt = f.row.membership?.cancelledAt;
    whenNote = cancelledAt ? t("renewal.cancelledOn", { date: date(cancelledAt) }) : undefined;
  } else {
    when = t("renewal.none");
  }
  const subscription = f.status === "none" ? undefined : f.row.billing?.stripeSubscriptionId;
  return {
    doctorId: f.row.doctor.id,
    name: name(f.row, loc),
    specialty: specialty(f.row, loc),
    status: f.status,
    statusLabel: t(`status.${f.status}`),
    tone: STATUS_TONE[f.status],
    plan: planLine(f.interval),
    price: f.interval ? priceLine(f.interval) : t("plan.free"),
    when,
    whenNote,
    warn: f.status === "past_due",
    stripeHref: subscription ? stripeDashboardUrl("subscriptions", subscription) : undefined,
    detailHref: membersHref({ status: query.status, tz: query.tz, doctor: f.row.doctor.id }),
    marker,
  };
}

function detailView(f: Facts, ctx: Ctx): MemberDetailView {
  const { t, loc, zone, now } = ctx;
  const { money, date, priceLine, planLine, daysLeftLine } = formatters(ctx);
  const r = f.row;
  const price = f.interval ? membershipPriceCents(f.interval) : 0;
  // Multi-part values go as parts: each renders as its own isolate, so "USD 49 · 18 Oct" cannot merge into one LTR run in Arabic.
  const facts: DetailFact[] = [
    { term: t("detail.plan"), value: [planLine(f.interval), f.interval ? priceLine(f.interval) : t("plan.free")] },
  ];
  if (r.billing && f.status !== "none") facts.push({ term: t("detail.memberSince"), value: date(r.billing.startedAt) });
  if (f.status === "active" && f.compUntil) {
    // Free months: screen 33's "Renews on" pair becomes the end of the free months and the first charge after them.
    facts.push({ term: t("detail.freeUntil"), value: date(f.compUntil) });
    facts.push({ term: t("detail.nextPayment"), value: t("detail.nextPaymentOn", { price: money(price), date: date(f.compUntil) }) });
  } else if (f.status === "active" && f.periodEnd) {
    // The same two lines the doctor reads on their own membership page (screen 33).
    facts.push({ term: t("detail.renewsOn"), value: date(f.periodEnd) });
    facts.push({ term: t("detail.nextPayment"), value: money(price) });
  } else if (f.status === "past_due" && f.graceEnd) {
    facts.push({
      term: t("detail.graceEnds"),
      value: [formatSlotDay(f.graceEnd, zone, loc), formatTimeInZone(f.graceEnd, zone, loc)],
      note: f.graceLeft > 0 ? daysLeftLine(f) : t("renewal.graceOver"),
      warn: true,
    });
  } else if (f.status === "cancelled") {
    const cancelledAt = r.membership?.cancelledAt;
    if (cancelledAt) facts.push({ term: t("detail.cancelledOn"), value: date(cancelledAt) });
    if (f.periodEnd) facts.push({ term: t("detail.endsOn"), value: date(f.periodEnd) });
  }
  const invoice = f.status === "none" ? null : r.billing?.lastInvoice;
  if (invoice && f.interval) {
    const status = t(invoice.status === "paid" ? "detail.invoicePaid" : "detail.invoiceFailed");
    facts.push({ term: t("detail.lastInvoice"), value: [status, money(price), date(invoice.at)], warn: invoice.status === "failed" });
  }
  facts.push({ term: t("detail.doctorZone"), value: formatZone(now, r.doctorTimeZone), ltr: true });

  const body =
    f.status === "past_due"
      ? t(f.graceLeft > 0 ? "detail.body.past_due" : "detail.body.graceOver")
      : f.status === "active" && f.compUntil
        ? t("detail.body.comp")
        : t(`detail.body.${f.status}`);

  const stripeLinks: MemberDetailView["stripeLinks"] = [];
  if (r.billing && f.status !== "none") {
    stripeLinks.push({ label: t("detail.subscription"), href: stripeDashboardUrl("subscriptions", r.billing.stripeSubscriptionId) });
    stripeLinks.push({ label: t("detail.customer"), href: stripeDashboardUrl("customers", r.billing.stripeCustomerId) });
    if (invoice) stripeLinks.push({ label: t("detail.invoice", { number: invoice.number }), href: stripeDashboardUrl("invoices", invoice.id) });
  }

  const changes = changesFor(f.status);
  const view: MemberDetailView = {
    doctorId: r.doctor.id,
    name: name(r, loc),
    specialty: specialty(r, loc),
    status: f.status,
    statusLabel: t(`status.${f.status}`),
    tone: STATUS_TONE[f.status],
    free: !!f.compUntil,
    body,
    facts,
    zone: formatZone(now, zone),
    stripeLinks,
    profileHref: `/doctors/${r.doctor.id}`,
  };
  if (changes.includes("comp")) {
    const start = f.status === "none";
    const from = start ? now : (f.compUntil ?? f.periodEnd ?? now);
    view.comp = {
      start,
      options: membershipAdmin.compMonthsOptions.map((months) => {
        const monthsLabel = formatNumber(months, loc);
        return {
          months,
          label: t("change.comp.months", { months, monthsLabel }),
          until: t("change.comp.until", { date: date(addMonths(from, months)) }),
          submit: t(start ? "change.comp.submitStart" : "change.comp.submit", { months, monthsLabel }),
        };
      }),
    };
  }
  if (changes.includes("extendGrace") && f.graceEnd) {
    const days = membershipAdmin.graceExtendDays;
    view.extend = {
      hint: t("change.extend.hint", { days, daysLabel: formatNumber(days, loc) }),
      submit: t("change.extend.submit", { date: date(new Date(f.graceEnd.getTime() + days * DAY_MS)) }),
    };
  }
  if (changes.includes("cancelAtPeriodEnd") && f.periodEnd) {
    view.cancel = { hint: t("change.cancel.hint", { date: date(f.compUntil ?? f.periodEnd) }) };
  }
  if (changes.includes("resume") && f.periodEnd) {
    view.resume = { hint: t("change.resume.hint", { date: date(f.periodEnd), price: money(price) }) };
  }
  return view;
}

function noticeFor(change: JustChanged, f: Facts, ctx: Ctx): NonNullable<MembersView["notice"]> {
  const { t, loc, zone, now } = ctx;
  const { money, date } = formatters(ctx);
  const n = name(f.row, loc);
  const stub = t("changed.stub");
  switch (change.did) {
    case "comp": {
      const from = f.status === "none" ? now : (f.compUntil ?? f.periodEnd ?? now);
      const until = addMonths(from, change.months ?? 1);
      return { tone: "success", title: t("changed.comp.title", { name: n, date: date(until) }), body: `${t("changed.comp.body")} ${stub}`, undo: change };
    }
    case "extendGrace": {
      const end = f.graceEnd ?? now;
      return {
        tone: "success",
        title: t("changed.extend.title", { name: n, date: formatSlotDay(end, zone, loc) }),
        body: "",
        rich: { time: formatTimeInZone(end, zone, loc) },
        undo: change,
      };
    }
    case "cancelAtPeriodEnd":
      return {
        tone: "success",
        title: t("changed.cancel.title", { name: n, date: date(f.compUntil ?? f.periodEnd ?? now) }),
        body: `${t("changed.cancel.body")} ${stub}`,
        undo: change,
      };
    case "resume":
      return {
        tone: "success",
        title: t("changed.resume.title", { name: n }),
        body: `${t("changed.resume.body", { date: date(f.periodEnd ?? now), price: money(f.interval ? membershipPriceCents(f.interval) : 0) })} ${stub}`,
        undo: change,
      };
  }
}

/** The whole list for one request: rows of the open view, counts per view, totals, and the sheet and notice when asked for. */
export function membersView(sp: SearchParams, t: T, tp: T, loc: Locale, now: Date = new Date()): MembersView {
  const zone = adminZone(sp);
  const ctx: Ctx = { t, tp, loc, zone, now };
  const query = baseQuery(sp);
  const filter = filterFrom(sp);
  const change = justChangedFrom(sp);
  const { money } = formatters(ctx);

  // ?state=empty: the open view has no rows, as if no membership of those statuses existed; counts and totals follow.
  const all = adminMemberRows()
    .map((row) => factsOf(row, now, change?.did === "extendGrace" && change.doctorId === row.doctor.id ? membershipAdmin.graceExtendDays : 0))
    .filter((f) => sp.state !== "empty" || !FILTER_STATUSES[filter].includes(f.status))
    .sort((a, b) => compare(a, b, loc));

  const counts = Object.fromEntries(
    MEMBERS_FILTERS.map((k) => [k, all.filter((f) => FILTER_STATUSES[k].includes(f.status)).length]),
  ) as Record<MembersFilter, number>;

  const value = (f: Facts) => monthlyValueCents({ status: f.status, interval: f.interval, compUntil: f.compUntil }, now);
  const listMonthly = (f: Facts) => (f.interval ? Math.round(membershipPriceCents(f.interval) / (f.interval === "year" ? 12 : 1)) : 0);
  const pastDue = all.filter((f) => f.status === "past_due");
  const ending = all.filter((f) => f.status === "cancelled");
  const totals = {
    mrr: money(all.reduce((sum, f) => sum + value(f), 0)),
    renewing: all.filter((f) => value(f) > 0).length,
    pastDue: pastDue.length,
    pastDueAmount: money(pastDue.reduce((sum, f) => sum + value(f), 0)),
    ending: ending.length,
    endingAmount: money(ending.reduce((sum, f) => sum + listMonthly(f), 0)),
  };

  const visible = all.filter((f) => FILTER_STATUSES[filter].includes(f.status));
  const markerFor = (f: Facts): MemberRowView["marker"] =>
    change?.doctorId === f.row.doctor.id ? (change.did === "extendGrace" ? "justChanged" : "waiting") : undefined;
  const rows = visible.map((f) => rowView(f, ctx, query, markerFor(f)));

  const view: MembersView = { rows, counts, totals, zone: formatZone(now, zone) };

  if (typeof sp.doctor === "string") {
    const f = all.find((x) => x.row.doctor.id === sp.doctor);
    view.detail = f ? detailView(f, ctx) : null;
  }
  const changed = change ? all.find((f) => f.row.doctor.id === change.doctorId) : undefined;
  if (change && changed) {
    view.notice = noticeFor(change, changed, ctx);
  } else if (typeof sp.undone === "string") {
    const undone = all.find((f) => f.row.doctor.id === sp.undone);
    if (undone) view.notice = { tone: "info", title: t("changed.undone.title"), body: t("changed.undone.body", { name: name(undone.row, loc) }) };
  }
  return view;
}
