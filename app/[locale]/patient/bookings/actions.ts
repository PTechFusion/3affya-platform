"use server";
// Bookings server actions (screen 22; the booking page, screen 21, can call the same one). Prototype stub: it re-checks that
// the booking exists, belongs to the signed-in patient and can still be cancelled (never trust the client), then returns the
// { ok, error } union. Nothing is stored, refunded or sent. Task 3.6 replaces it: authorisation in RLS and server code, the
// cancellation written in one transaction with an audit row, the refund asked of Stripe with an idempotency key stored in the
// database (the money state itself is written only by the webhook handler), and both emails queued through Inngest.
import { bookingsForPatient, samplePatient } from "@/lib/sample";

export type CancelBookingResult = { ok: true } | { ok: false; error: "notFound" | "state" | "unavailable" };

export async function cancelBooking(input: { id: unknown }): Promise<CancelBookingResult> {
  const now = new Date();
  const booking =
    typeof input.id === "string" ? bookingsForPatient(samplePatient.firstNameEn, now).find((b) => b.id === input.id) : undefined;
  if (!booking) return { ok: false, error: "notFound" };
  if (booking.status !== "upcoming" || booking.startsAt.getTime() <= now.getTime()) return { ok: false, error: "state" };
  return { ok: true };
}
