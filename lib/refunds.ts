// The refund rule of the cancellations page (/refunds, rules P5, P13), with the cut-off from config/business.ts (default until
// Q8). The patient cancelling more than fullRefundCutoffHours before the visit, the doctor cancelling, and a problem on our side
// all refund the whole total, all three lines; the patient cancelling later refunds nothing. Money goes back as a refund to the
// card or wallet paid with, never a void. The cancel action (task 3.6) uses this to decide the Stripe refund it creates; what a
// receipt shows afterwards is the refund row the charge.refunded webhook stored.
import { business } from "@/config/business";

export type CancelledBy = "patient" | "doctor" | "platform";
export type RefundReason = "patientEarly" | "patientLate" | "doctor" | "platform";

const HOUR_MS = 3_600_000;

/** The last instant a patient can cancel and still get the whole total back. */
export function fullRefundDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - business.fullRefundCutoffHours * HOUR_MS);
}

/** True while a patient cancelling now still gets the whole total back (strictly before the deadline, as refundFor decides). */
export function refundsInFull(startsAt: Date, now: Date = new Date()): boolean {
  return now.getTime() < fullRefundDeadline(startsAt).getTime();
}

/** What a cancellation refunds, in minor units of the charge, and why. */
export function refundFor(
  totalCents: number,
  startsAt: Date,
  cancelledAt: Date,
  by: CancelledBy,
): { reason: RefundReason; amountCents: number } {
  if (by !== "patient") return { reason: by, amountCents: totalCents };
  return cancelledAt.getTime() < fullRefundDeadline(startsAt).getTime()
    ? { reason: "patientEarly", amountCents: totalCents }
    : { reason: "patientLate", amountCents: 0 };
}
