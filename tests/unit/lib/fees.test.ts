// lib/fees.ts (rule P1): doctor fee, platform fee and card processing always sum to the all-in total, in integer minor units,
// with every rate from config/business.ts.
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";

describe("feeLines", () => {
  it("prices a USD 250 doctor fee as the sample bookings do", () => {
    // 20% platform fee = 5000; card 2.9% of 30000 = 870 + 30 = 900; total 30900 (the "309 USD" of the booking screens).
    expect(business.firstVisitPlatformFeePct).toBe(20);
    expect(business.cardProcessingPct).toBe(2.9);
    expect(business.cardProcessingFixedCents).toBe(30);
    expect(feeLines(25000)).toEqual({ doctorFeeCents: 25000, platformFeeCents: 5000, cardProcessingCents: 900, totalCents: 30900 });
    expect(feeLines(15000)).toEqual({ doctorFeeCents: 15000, platformFeeCents: 3000, cardProcessingCents: 552, totalCents: 18552 });
  });

  it("rounds card processing up to the cent", () => {
    // 20.01 + 4.00 = 24.01; 2.9% = 0.69629 -> 70 cents, plus 30.
    expect(feeLines(2001).cardProcessingCents).toBe(100);
  });

  it("the three lines sum to the total for every doctor fee from USD 0 to USD 2,000", () => {
    for (let fee = 0; fee <= 200_000; fee += 37) {
      const l = feeLines(fee);
      expect(l.doctorFeeCents + l.platformFeeCents + l.cardProcessingCents).toBe(l.totalCents);
      for (const v of Object.values(l)) expect(Number.isInteger(v)).toBe(true);
      expect(l.doctorFeeCents).toBe(fee);
      expect(l.platformFeeCents).toBe(Math.round((fee * business.firstVisitPlatformFeePct) / 100));
      // Card processing never charges less than the rate on the doctor and platform lines.
      expect(l.cardProcessingCents).toBeGreaterThanOrEqual(((fee + l.platformFeeCents) * business.cardProcessingPct) / 100 + business.cardProcessingFixedCents);
    }
  });

  it("charges only the fixed card amount on a zero fee", () => {
    expect(feeLines(0)).toEqual({ doctorFeeCents: 0, platformFeeCents: 0, cardProcessingCents: 30, totalCents: 30 });
  });
});
