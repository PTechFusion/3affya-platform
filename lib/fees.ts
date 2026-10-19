// First-visit price breakdown (rules C5, P5): the doctor's fee, 3affya's platform fee and card processing, which sum to the
// all-in total the patient pays. Integer maths in minor units; every rate comes from config/business.ts. Checkout (task 3.2)
// must charge exactly `total`; the sample bookings in data/sample/bookings.json follow the same formula.
import { business } from "@/config/business";

export type FeeBreakdown = { doctorFee: number; platformFee: number; cardProcessing: number; total: number };

export function firstVisitBreakdown(doctorFeeMinor: number): FeeBreakdown {
  const platformFee = Math.round((doctorFeeMinor * business.firstVisitPlatformFeePct) / 100);
  const subtotal = doctorFeeMinor + platformFee;
  const processingBps = Math.round(business.cardProcessingPct * 100); // 2.9% -> 290 basis points, no float drift
  const cardProcessing = Math.ceil((subtotal * processingBps) / 10_000) + business.cardProcessingFixedCents;
  return { doctorFee: doctorFeeMinor, platformFee, cardProcessing, total: subtotal + cardProcessing };
}
