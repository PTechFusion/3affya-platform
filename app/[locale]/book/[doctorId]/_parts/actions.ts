"use server";
// Booking server actions (task 3.2). Prototype stubs: they check what they are sent and answer { ok, error } (never a throw
// across the client boundary), but store nothing and charge nothing.
// Task 3.2 replaces them: holdSlot inserts slot_holds with a unique constraint on (professional_id, slot_start) and an expiry
// of business.slotHoldMinutes, storing the answers with the hold (a conflict answers "taken"); startPayment creates the
// PaymentIntent (destination charge, application_fee_amount, metadata hold_id) for Stripe's own payment form. Money and booking
// state are written only by the payment_intent.succeeded webhook (task 3.3), never here.
import { business } from "@/config/business";
import { bookableSlots, doctorById, type SampleDoctor } from "@/lib/sample";
import { answersFrom, parseSlot, TIME_WINDOWS, validateAnswers, type AnswerErrors, type VisitType } from "./booking";
import { detailsFrom, validateDetails, type DetailErrors } from "./details";

const holdEnd = () => new Date(Date.now() + business.slotHoldMinutes * 60_000).toISOString();

function bookableDoctor(raw: unknown): SampleDoctor | undefined {
  const d = typeof raw === "string" ? doctorById(raw) : undefined;
  return d && d.state === "verified" && d.feeUsdCents != null && d.visitTypes.length > 0 ? d : undefined;
}

const offered = (d: SampleDoctor) => d.visitTypes as readonly VisitType[];

export type HoldResult =
  | { ok: true; heldUntil: string; holdMs: number }
  | { ok: false; error: "validation"; fields: AnswerErrors }
  | { ok: false; error: "notBookable" | "taken" | "passed" };

/** Starts the hold once every answer is in (rule P8: ask before the hold). */
export async function holdSlot(raw: unknown): Promise<HoldResult> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const d = bookableDoctor(src.doctorId);
  if (!d) return { ok: false, error: "notBookable" };
  const slot = parseSlot(src.slot);
  const fields = validateAnswers(answersFrom(src, offered(d)), d, Boolean(slot));
  if (!slot || Object.keys(fields).length) return { ok: false, error: "validation", fields };
  if (slot.getTime() <= Date.now()) return { ok: false, error: "passed" };
  if (!bookableSlots(d.id).some((s) => s.getTime() === slot.getTime())) return { ok: false, error: "taken" };
  return { ok: true, heldUntil: holdEnd(), holdMs: business.slotHoldMinutes * 60_000 };
}

export type RenewResult = { ok: true; heldUntil: string; holdMs: number } | { ok: false; error: "notBookable" | "passed" | "invalid" };

/** Checkout's "hold this time again" after the hold ran out: the answers already sit with the first hold. */
export async function renewHold(raw: unknown): Promise<RenewResult> {
  const src = (raw ?? {}) as Record<string, unknown>;
  if (!bookableDoctor(src.doctorId)) return { ok: false, error: "notBookable" };
  const slot = parseSlot(src.slot);
  if (!slot) return { ok: false, error: "invalid" };
  if (slot.getTime() <= Date.now()) return { ok: false, error: "passed" };
  return { ok: true, heldUntil: holdEnd(), holdMs: business.slotHoldMinutes * 60_000 };
}

export type RequestResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: AnswerErrors & { when?: "required" } }
  | { ok: false; error: "notBookable" };

/** "Request a time" when no open time suits: lands in the doctor's inbox as an introduction request (screen 32). */
export async function requestTime(raw: unknown): Promise<RequestResult> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const d = bookableDoctor(src.doctorId);
  if (!d) return { ok: false, error: "notBookable" };
  const fields: AnswerErrors & { when?: "required" } = validateAnswers(answersFrom(src, offered(d)), d, undefined);
  const when = Array.isArray(src.when) ? src.when.filter((w) => (TIME_WINDOWS as readonly unknown[]).includes(w)) : [];
  if (!when.length) fields.when = "required";
  if (Object.keys(fields).length) return { ok: false, error: "validation", fields };
  return { ok: true };
}

export type PaymentResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "validation"; fields: DetailErrors }
  | { ok: false; error: "notBookable" | "missingAnswers" | "expired" | "passed" | "declined" | "unavailable" };

/** The one Pay action. Prototype: every check passes to the sample booking bk_001 (screen 21 shows it). */
export async function startPayment(raw: unknown): Promise<PaymentResult> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const d = bookableDoctor(src.doctorId);
  if (!d) return { ok: false, error: "notBookable" };
  const slot = parseSlot(src.slot);
  if (!slot) return { ok: false, error: "missingAnswers" };
  if (slot.getTime() <= Date.now()) return { ok: false, error: "passed" };
  const heldUntil = typeof src.heldUntil === "string" ? Date.parse(src.heldUntil) : Number.NaN;
  if (!Number.isNaN(heldUntil) && heldUntil <= Date.now()) return { ok: false, error: "expired" };
  const answers = answersFrom(src, offered(d));
  if (!answers.visit || !answers.forWhom || !answers.ageGroup) return { ok: false, error: "missingAnswers" };
  const fields = validateDetails(detailsFrom(src));
  if (Object.keys(fields).length) return { ok: false, error: "validation", fields };
  return { ok: true, bookingId: "bk_001" };
}
