"use server";
// Admin changes to one membership (screen 42, tasks 3.5 and 3.11). Prototype stubs: each checks what the real version checks,
// then returns; nothing is sent to Stripe and nothing is stored. Every action returns { ok, error } and never throws across the
// client boundary. The real versions first check the admin session and its TOTP factor in server code (the UI never decides
// access), write an audit_log row (actor, action, target, old and new; rule A5's "frequency logged" is read from these rows),
// and then:
// - comp: moves the subscription's next charge back by the chosen months in Stripe Billing (trial_end); with no subscription yet,
//   creates one in trial with no card, set to cancel when the trial ends unless the doctor adds a card;
// - extendGrace: adds membershipAdmin.graceExtendDays to this membership's grace period (3affya's own access setting, no money);
// - cancelAtPeriodEnd / resume: sets cancel_at_period_end to true / false on the subscription.
// Each Stripe call has an explicit timeout and an idempotency key stored with the audit row. The membership row changes only
// when Stripe's customer.subscription.updated webhook arrives (money state is written from webhooks only, ADR-6).
import { membershipAdmin } from "@/config/business";
import { adminMemberRow } from "@/lib/sample";
import { changesFor, MEMBERSHIP_CHANGES, type MembershipChange } from "./_parts/shared";

export type ChangeResult = { ok: true } | { ok: false; error: "notFound" | "notAllowed" | "badMonths" | "unavailable" };

export async function changeMembership(doctorId: string, change: MembershipChange, months?: number): Promise<ChangeResult> {
  try {
    if (!MEMBERSHIP_CHANGES.includes(change)) return { ok: false, error: "notAllowed" };
    const row = adminMemberRow(doctorId);
    if (!row) return { ok: false, error: "notFound" };
    if (!changesFor(row.membership?.status ?? "none").includes(change)) return { ok: false, error: "notAllowed" };
    if (change === "comp" && (months === undefined || !membershipAdmin.compMonthsOptions.includes(months))) {
      return { ok: false, error: "badMonths" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/**
 * The Undo on the just-changed notice (rule B10: undo, not a confirmation). It reverses one change the same admin just made:
 * free months come off, the extra grace goes, a cancel is resumed and a resume is cancelled again. The real version reverses the
 * audit row's change only while nothing newer touched the membership.
 */
export async function undoMembershipChange(doctorId: string, change: MembershipChange): Promise<ChangeResult> {
  try {
    if (!MEMBERSHIP_CHANGES.includes(change)) return { ok: false, error: "notAllowed" };
    return adminMemberRow(doctorId) ? { ok: true } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
