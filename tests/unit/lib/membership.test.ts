// lib/membership.ts: one grace end, one "days left", one price for the doctor's page (33) and the admin list (42).
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { DAY_MS } from "@/lib/format";
import { addMonths, graceDaysLeft, graceEndsAt, membershipPriceCents, monthlyValueCents } from "@/lib/membership";
import { HOUR_MS, at } from "./helpers";

const failedAt = at("2026-11-01T10:00:00Z");

describe("prices come from config", () => {
  it("monthly and yearly list prices", () => {
    expect(membershipPriceCents("month")).toBe(business.membershipMonthlyCents);
    expect(membershipPriceCents("year")).toBe(business.membershipYearlyCents);
  });
});

describe("grace period", () => {
  it("ends membershipGraceDays after the failed renewal, plus any days an admin added", () => {
    expect(graceEndsAt(failedAt).getTime() - failedAt.getTime()).toBe(business.membershipGraceDays * DAY_MS);
    expect(graceEndsAt(failedAt, 7).toISOString()).toBe(new Date(failedAt.getTime() + (business.membershipGraceDays + 7) * DAY_MS).toISOString());
  });

  it("is elapsed days, so the US change on 1 Nov does not shorten it by an hour", () => {
    expect(graceEndsAt(at("2026-10-30T15:00:00Z")).toISOString()).toBe("2026-11-06T15:00:00.000Z");
  });

  it("counts a part day as a day and stops at 0", () => {
    const ends = graceEndsAt(failedAt);
    expect(graceDaysLeft(ends, failedAt)).toBe(business.membershipGraceDays);
    expect(graceDaysLeft(ends, new Date(ends.getTime() - 4 * DAY_MS - HOUR_MS))).toBe(5); // "5 more days"
    expect(graceDaysLeft(ends, new Date(ends.getTime() - 1))).toBe(1);
    expect(graceDaysLeft(ends, ends)).toBe(0);
    expect(graceDaysLeft(ends, new Date(ends.getTime() + DAY_MS))).toBe(0);
  });
});

describe("addMonths", () => {
  it("keeps the day of the month and the UTC time", () => {
    expect(addMonths(at("2026-10-15T09:30:00Z"), 1).toISOString()).toBe("2026-11-15T09:30:00.000Z");
    expect(addMonths(at("2026-11-15T09:30:00Z"), 12).toISOString()).toBe("2027-11-15T09:30:00.000Z");
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addMonths(at("2027-01-31T00:00:00Z"), 1).toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(addMonths(at("2028-01-31T00:00:00Z"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(addMonths(at("2026-08-31T12:00:00Z"), 1).toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });
});

describe("monthlyValueCents (MRR at list price)", () => {
  const now = at("2026-11-01T00:00:00Z");

  it("counts a monthly plan at its price and a yearly one at a twelfth", () => {
    expect(monthlyValueCents({ status: "active", interval: "month", compUntil: null }, now)).toBe(business.membershipMonthlyCents);
    expect(monthlyValueCents({ status: "active", interval: "year", compUntil: null }, now)).toBe(Math.round(business.membershipYearlyCents / 12));
  });

  it("still counts past due (at risk, not lost)", () => {
    expect(monthlyValueCents({ status: "past_due", interval: "month", compUntil: null }, now)).toBe(business.membershipMonthlyCents);
  });

  it("counts nothing while free months run, and the price again once they end", () => {
    const m = { status: "active" as const, interval: "month" as const, compUntil: at("2026-12-01T00:00:00Z") };
    expect(monthlyValueCents(m, now)).toBe(0);
    expect(monthlyValueCents(m, at("2026-12-01T00:00:00Z"))).toBe(business.membershipMonthlyCents);
  });

  it("counts nothing for no membership, a cancelled one, or no interval", () => {
    expect(monthlyValueCents({ status: "none", interval: null, compUntil: null }, now)).toBe(0);
    expect(monthlyValueCents({ status: "cancelled", interval: "year", compUntil: null }, now)).toBe(0);
    expect(monthlyValueCents({ status: "active", interval: null, compUntil: null }, now)).toBe(0);
  });
});
