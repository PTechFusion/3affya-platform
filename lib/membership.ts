// Membership arithmetic for both views of one membership: the professional's own page (screen 33) and the admin members list
// (screen 42). One place, so the doctor and the admin read the same grace end, the same days left and the same price. Screen 33
// still computes the grace end inline (same formula); move it here when that page is next touched. Pure functions, no sample
// data, so a client component may import this file. Stripe Billing holds the subscription itself (ADR-6); nothing here writes.
import { business } from "@/config/business";
import { DAY_MS } from "@/lib/format";

export type MembershipInterval = "month" | "year";

/** The list price of one renewal, from config/business.ts (never stored on the membership row). */
export function membershipPriceCents(interval: MembershipInterval): number {
  return interval === "year" ? business.membershipYearlyCents : business.membershipMonthlyCents;
}

/**
 * When booking pauses for a past-due membership: membershipGraceDays after the first failed renewal (task 3.5), plus any days an
 * admin added for this membership.
 */
export function graceEndsAt(paymentFailedAt: Date, extraDays = 0): Date {
  return new Date(paymentFailedAt.getTime() + (business.membershipGraceDays + extraDays) * DAY_MS);
}

/** Days of grace left, a part day counting as a day, as screen 33 says it ("5 more days"); 0 once the grace period is over. */
export function graceDaysLeft(endsAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS));
}

/** The same day of the month `months` later, at the same UTC time; a day the month lacks becomes its last (31 Jan + 1 = 28 Feb). */
export function addMonths(instant: Date, months: number): Date {
  const d = new Date(instant);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/**
 * What one membership adds to monthly recurring revenue at list price: a yearly plan at a twelfth of its price, nothing while
 * an admin's free months run, nothing once it is set to end (cancelled at period end). Past due still counts: it is at risk,
 * not lost, until the grace period runs out and Stripe gives up.
 */
export function monthlyValueCents(m: {
  status: "none" | "active" | "past_due" | "cancelled";
  interval: MembershipInterval | null;
  compUntil: Date | null;
}, now: Date = new Date()): number {
  if (!m.interval || (m.status !== "active" && m.status !== "past_due")) return 0;
  if (m.compUntil && m.compUntil.getTime() > now.getTime()) return 0;
  const price = membershipPriceCents(m.interval);
  return m.interval === "year" ? Math.round(price / 12) : price;
}
