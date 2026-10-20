"use server";
// Refund a payment (screen 43, tasks 3.4 and 3.11; rules P13, B10). Prototype stub: it re-checks everything on the server (never
// trust the client: the payment exists, nothing is refunded or waiting yet, the amount is above zero, a refund above the rule
// carries a note) and returns the { ok, error } union. Nothing is stored or sent to Stripe.
//
// Task 3.4 replaces the stub, in this order:
//   1. Resolve the signed-in admin on the server (session plus TOTP, screen 37); "notAllowed" otherwise. RLS decides too.
//   2. Insert a refund_requests row keyed by `adminRefundKey(paymentId)` (unique), with the admin, the kind, the amount and the
//      note, plus an audit_log row. A duplicate key means the refund was already asked for: return the stored request.
//   3. stripe.refunds.create({ payment_intent, amount, reverse_transfer: true, refund_application_fee: true, metadata: { booking_id,
//      admin_id, kind } }, { idempotencyKey, timeout }). reverse_transfer takes the doctor's share back from their connected
//      account and refund_application_fee returns 3affya's fee, so all three lines go back to the patient (refund, never void).
//   4. Return ok. No money state is written here (ADR-6): the charge.refunded webhook stores the refund, marks the booking
//      refunded and adds the receipt line, after inserting its event into stripe_events.
import { adminPayments, adminRefundKey } from "@/lib/sample";
import { canRefund, refundAmount, ruleRefund, type RefundKind } from "./_parts/payments";

export type RequestRefundResult =
  | { ok: true; amountCents: number; idempotencyKey: string }
  | { ok: false; error: "notFound" | "alreadyRefunded" | "nothingToRefund" | "noteRequired" | "unavailable" | "notAllowed" };

const NOTE_MAX = 500;

export async function requestRefund(input: { paymentId: unknown; kind: unknown; note: unknown }): Promise<RequestRefundResult> {
  const now = new Date();
  const payment = typeof input.paymentId === "string" ? adminPayments().find((p) => p.id === input.paymentId) : undefined;
  if (!payment) return { ok: false, error: "notFound" };
  if (!canRefund(payment)) return { ok: false, error: "alreadyRefunded" };
  const kind: RefundKind | undefined = input.kind === "rule" || input.kind === "full" ? input.kind : undefined;
  if (!kind) return { ok: false, error: "nothingToRefund" };
  const amountCents = refundAmount(payment, kind, now);
  if (amountCents <= 0) return { ok: false, error: "nothingToRefund" };
  const note = typeof input.note === "string" ? input.note.trim().slice(0, NOTE_MAX) : "";
  // Above the rule is an override: the audit log must say why.
  if (amountCents > ruleRefund(payment, now).amountCents && note.length === 0) return { ok: false, error: "noteRequired" };
  return { ok: true, amountCents, idempotencyKey: adminRefundKey(payment.id) };
}
