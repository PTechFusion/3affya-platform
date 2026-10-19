// The three lines of a first-visit price (rule P1): doctor fee, platform fee, card processing. They always sum to the total.
// Every rate comes from config/business.ts. Integer arithmetic in minor units, so the result matches what Stripe charges.
import { business } from "@/config/business";

export type FeeLines = {
  doctorFeeCents: number;
  platformFeeCents: number;
  cardProcessingCents: number;
  totalCents: number;
};

export function feeLines(doctorFeeCents: number): FeeLines {
  const platformFeeCents = Math.round((doctorFeeCents * business.firstVisitPlatformFeePct) / 100);
  const subtotal = doctorFeeCents + platformFeeCents;
  // Card processing is a percentage of the doctor and platform lines together plus a fixed amount, rounded up to the cent.
  const basisPoints = Math.round(business.cardProcessingPct * 100);
  const cardProcessingCents = Math.ceil((subtotal * basisPoints) / 10000) + business.cardProcessingFixedCents;
  return { doctorFeeCents, platformFeeCents, cardProcessingCents, totalCents: subtotal + cardProcessingCents };
}
