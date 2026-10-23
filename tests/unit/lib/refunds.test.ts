// lib/refunds.ts: the full-refund deadline is elapsed time (fullRefundCutoffHours before the visit), never "the same clock time
// the day before". Checked across the US daylight-time change on Sun 1 Nov 2026 (02:00 Chicago = 07:00 UTC) for the three
// viewers the brief names: Riyadh (no DST), Houston (America/Chicago) and London (already on GMT since 25 Oct).
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatDate, formatTimeInZone, formatZone } from "@/lib/format";
import { fullRefundDeadline, refundFor, refundsInFull } from "@/lib/refunds";
import { HOUR_MS, at, spaces } from "./helpers";

const CUTOFF_MS = business.fullRefundCutoffHours * HOUR_MS;
const HOUSTON = "America/Chicago";
const RIYADH = "Asia/Riyadh";
const LONDON = "Europe/London";
const total = feeLines(25000).totalCents;

/** "Oct 31, 2026 10:00 AM Chicago (GMT−5)" with plain spaces, for readable expectations. */
const local = (d: Date, zone: string) => spaces(`${formatDate(d, zone, "en")} ${formatTimeInZone(d, zone, "en")}`);

describe("fullRefundDeadline", () => {
  it("is the cut-off from config, in elapsed hours", () => {
    expect(business.fullRefundCutoffHours).toBe(24); // (default until Q8); the cases below are written for a 24-hour cut-off
    const visit = at("2026-11-10T15:00:00Z");
    expect(visit.getTime() - fullRefundDeadline(visit).getTime()).toBe(CUTOFF_MS);
  });

  describe("a 9:00 AM Houston visit on Sun 1 Nov, the morning the US clocks go back", () => {
    const visit = at("2026-11-01T15:00:00Z"); // 9:00 AM CST
    const deadline = fullRefundDeadline(visit);

    it("ends exactly 24 elapsed hours earlier, although the Houston day before was 25 hours long", () => {
      expect(deadline.toISOString()).toBe("2026-10-31T15:00:00.000Z");
    });

    it("reads 10:00 AM in Houston, not 9:00 AM: the deadline is still on daylight time", () => {
      expect(local(visit, HOUSTON)).toBe("Nov 1, 2026 9:00 AM Chicago (GMT−6)");
      expect(local(deadline, HOUSTON)).toBe("Oct 31, 2026 10:00 AM Chicago (GMT−5)");
    });

    it("reads the same clock time the day before in Riyadh, which has no DST", () => {
      expect(local(visit, RIYADH)).toBe("Nov 1, 2026 6:00 PM Riyadh (GMT+3)");
      expect(local(deadline, RIYADH)).toBe("Oct 31, 2026 6:00 PM Riyadh (GMT+3)");
    });

    it("reads the same clock time the day before in London, which changed a week earlier", () => {
      expect(local(visit, LONDON)).toBe("Nov 1, 2026 3:00 PM London (GMT)");
      expect(local(deadline, LONDON)).toBe("Oct 31, 2026 3:00 PM London (GMT)");
    });
  });

  it("a 9:00 AM Houston visit on Mon 2 Nov keeps its clock time: both ends are on standard time", () => {
    const visit = at("2026-11-02T15:00:00Z");
    const deadline = fullRefundDeadline(visit);
    expect(local(deadline, HOUSTON)).toBe("Nov 1, 2026 9:00 AM Chicago (GMT−6)");
    expect(local(deadline, RIYADH)).toBe("Nov 1, 2026 6:00 PM Riyadh (GMT+3)");
    expect(local(deadline, LONDON)).toBe("Nov 1, 2026 3:00 PM London (GMT)");
  });

  it("deadlines in Houston's repeated 1 a.m. hour read the same clock time, and the zone label tells them apart", () => {
    const first = fullRefundDeadline(at("2026-11-02T06:30:00Z")); // visit 12:30 AM CST Mon; deadline in the first 1:30
    const second = fullRefundDeadline(at("2026-11-02T07:30:00Z")); // visit 1:30 AM CST Mon; deadline in the second 1:30
    expect(local(first, HOUSTON)).toBe("Nov 1, 2026 1:30 AM Chicago (GMT−5)");
    expect(local(second, HOUSTON)).toBe("Nov 1, 2026 1:30 AM Chicago (GMT−6)");
    expect(second.getTime() - first.getTime()).toBe(HOUR_MS);
    expect(formatZone(first, RIYADH)).toBe(formatZone(second, RIYADH));
  });
});

describe("refundsInFull and refundFor agree on the boundary", () => {
  const visit = at("2026-11-01T15:00:00Z");
  const deadline = fullRefundDeadline(visit);
  const justBefore = new Date(deadline.getTime() - 1);

  it("refunds in full strictly before the deadline", () => {
    expect(refundsInFull(visit, justBefore)).toBe(true);
    expect(refundFor(total, visit, justBefore, "patient")).toEqual({ reason: "patientEarly", amountCents: total });
  });

  it("refunds nothing from the deadline on", () => {
    expect(refundsInFull(visit, deadline)).toBe(false);
    expect(refundFor(total, visit, deadline, "patient")).toEqual({ reason: "patientLate", amountCents: 0 });
    expect(refundFor(total, visit, at("2026-11-01T14:59:00Z"), "patient").amountCents).toBe(0);
  });

  it("the same viewer-independent answer whichever zone the patient is in: the rule reads instants only", () => {
    // Saturday 10:30 AM in Houston is 6:30 PM in Riyadh and 3:30 PM in London: one instant, after the deadline everywhere.
    const cancelledAt = at("2026-10-31T15:30:00Z");
    expect(refundsInFull(visit, cancelledAt)).toBe(false);
  });

  it("refunds the whole total when the doctor or the platform cancels, at any time", () => {
    const late = at("2026-11-01T14:00:00Z");
    expect(refundFor(total, visit, late, "doctor")).toEqual({ reason: "doctor", amountCents: total });
    expect(refundFor(total, visit, late, "platform")).toEqual({ reason: "platform", amountCents: total });
  });

  it("refunds all three fee lines, not the doctor fee alone", () => {
    const lines = feeLines(25000);
    const { amountCents } = refundFor(lines.totalCents, visit, justBefore, "patient");
    expect(amountCents).toBe(lines.doctorFeeCents + lines.platformFeeCents + lines.cardProcessingCents);
  });
});
