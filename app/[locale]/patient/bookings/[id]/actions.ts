"use server";
// Cancel a booking (screen 21). Prototype stub: re-checks that the booking exists and is still to come (never trust the client),
// decides the refund on the server from fullRefundCutoffHours, and returns the { ok, error } union. Nothing is stored. Task 3.4
// replaces it: authorisation in RLS, the cancellation written with an audit row, the Stripe refund created with
// reverse_transfer and idempotent on a key stored in the database; the refund line reaches the receipt only from the
// charge.refunded webhook.
import { patientBookingById } from "@/lib/sample";
import { refundableAt } from "./_parts/booking";

export type CancelBookingResult = { ok: true; refunded: boolean } | { ok: false; error: "notFound" | "state" | "unavailable" };

export async function cancelBooking(input: { id: unknown }): Promise<CancelBookingResult> {
  const booking = typeof input.id === "string" ? patientBookingById(input.id) : undefined;
  if (!booking) return { ok: false, error: "notFound" };
  const now = new Date();
  if (booking.status !== "upcoming" || booking.startsAt.getTime() <= now.getTime()) return { ok: false, error: "state" };
  return { ok: true, refunded: refundableAt(booking, now) };
}
