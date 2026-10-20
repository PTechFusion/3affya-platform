"use server";
// Credential review server actions (screen 38). Prototype stubs: they re-check that the claim is in the queue, rebuild the
// checks from untrusted input and apply the same rules the page shows (model.ts), then return the { ok, error } union.
// Nothing is stored, sent or logged (the reason and the checks name a real-looking person).
// Task 2.8 replaces them: admin role and TOTP checked in server code and RLS; in one transaction the professionals row moves to
// verified (with verified_on and reverify_on) or rejected (with the reason, resubmittable), each check is stored with its
// source, time and reviewer (rule A1), and an audit_log row records actor, target, old and new; the approved or rejected email
// is queued through Inngest, idempotent on the decision id, after the undo window. Undo deletes the pending email job and
// writes its own audit row.
import { business } from "@/config/business";
import { sampleAdmin } from "@/lib/sample";
import { claimFor } from "./_parts/queue";
import {
  checkGaps,
  checksFromPayload,
  isoDateInZone,
  reasonError,
  reverification,
  FIX_KINDS,
  type FixKind,
  type ReasonError,
  type ReviewCheckKey,
} from "./_parts/model";

export type DecisionInput = {
  doctorId: unknown;
  outcome: unknown;
  checks: unknown;
  fix?: unknown;
  reasonEn?: unknown;
  reasonAr?: unknown;
};

export type DecisionResult =
  | { ok: true; outcome: "approve"; decidedAtUtc: string; reverifyOn: string; reverifyBy: "licence" | "cycle" }
  | { ok: true; outcome: "reject"; decidedAtUtc: string }
  | { ok: false; error: "notFound" | "unavailable" }
  | { ok: false; error: "checks"; missing: ReviewCheckKey[] }
  | { ok: false; error: "reason"; reason: ReasonError };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max * 2) : "");

export async function decideClaim(input: DecisionInput): Promise<DecisionResult> {
  const claim = typeof input.doctorId === "string" ? claimFor(input.doctorId) : undefined;
  if (!claim) return { ok: false, error: "notFound" };
  const now = new Date();
  const checks = checksFromPayload(input.checks);

  if (input.outcome === "approve") {
    const gaps = checkGaps(checks, claim.board, isoDateInZone(now, sampleAdmin.timeZone));
    if (gaps.length) return { ok: false, error: "checks", missing: gaps.map((g) => g.key) };
    const re = reverification(now, checks.licence.expiresOn, business.verifiedReverifyMonths);
    return { ok: true, outcome: "approve", decidedAtUtc: now.toISOString(), reverifyOn: re.on.toISOString().slice(0, 10), reverifyBy: re.by };
  }

  if (input.outcome === "reject") {
    const fix = FIX_KINDS.find((k): k is FixKind => k === input.fix);
    if (!fix) return { ok: false, error: "unavailable" };
    const reason = reasonError(text(input.reasonEn, 1000), text(input.reasonAr, 1000));
    if (reason) return { ok: false, error: "reason", reason };
    return { ok: true, outcome: "reject", decidedAtUtc: now.toISOString() };
  }

  return { ok: false, error: "unavailable" };
}

export type UndoResult = { ok: true } | { ok: false; error: "notFound" | "unavailable" };

/** Undo of a decision made in this session (rule B10: undo instead of a confirmation dialog). */
export async function undoDecision(input: { doctorId: unknown }): Promise<UndoResult> {
  return typeof input.doctorId === "string" && claimFor(input.doctorId) ? { ok: true } : { ok: false, error: "notFound" };
}
