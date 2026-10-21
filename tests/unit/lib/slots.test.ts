// lib/slots.ts (ADR-7): weekly hours live on the doctor's wall clock, every instant that leaves the module is UTC, and offsets are
// looked up per date. Checked across the US change on Sun 1 Nov 2026 (02:00 Chicago = 07:00 UTC) as Riyadh, Houston (Chicago)
// and London viewers see it.
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { formatTime, formatZone } from "@/lib/format";
import {
  WEEKDAYS,
  addDays,
  dateKey,
  exceptionFromStored,
  exceptionToStored,
  generateSlots,
  isTimeZone,
  nextOffsetChange,
  offsetMinutes,
  parseDateKey,
  ruleFromStored,
  ruleToStored,
  slotRuns,
  slotsByViewerDay,
  slotsInRange,
  wallClockInstant,
  weekdayOf,
  zonedInstant,
  zonedParts,
  type Schedule,
  type WallRange,
} from "@/lib/slots";
import { HOUR_MS, at, spaces } from "./helpers";

const CHICAGO = "America/Chicago";
const RIYADH = "Asia/Riyadh";
const LONDON = "Europe/London";
const iso = (d: Date) => d.toISOString().replace(".000Z", "Z");
const nineToNoon: WallRange[] = [{ start: 9 * 60, end: 12 * 60 }];

/** A Chicago doctor: 9:00 to 12:00 every day, 30-minute slots. */
const everyDay = (exceptions: Schedule["exceptions"] = []): Schedule => ({
  timeZone: CHICAGO,
  slotMinutes: 30,
  week: Object.fromEntries(WEEKDAYS.map((d) => [d, nineToNoon])) as Schedule["week"],
  exceptions,
});

describe("calendar dates", () => {
  it("keys, parses and rejects impossible dates", () => {
    expect(dateKey({ year: 2026, month: 11, day: 1 })).toBe("2026-11-01");
    expect(parseDateKey("2026-11-01")).toEqual({ year: 2026, month: 11, day: 1 });
    expect(parseDateKey("2026-02-30")).toBeUndefined();
    expect(parseDateKey("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseDateKey("2026-11-1")).toBeUndefined();
  });

  it("adds days over month ends and knows the weekday", () => {
    expect(addDays({ year: 2026, month: 10, day: 31 }, 1)).toEqual({ year: 2026, month: 11, day: 1 });
    expect(weekdayOf({ year: 2026, month: 11, day: 1 })).toBe("sun");
    expect(weekdayOf({ year: 2026, month: 10, day: 30 })).toBe("fri");
  });

  it("counts whole slots in a range", () => {
    expect(slotsInRange({ start: 540, end: 720 }, 30)).toBe(6);
    expect(slotsInRange({ start: 540, end: 735 }, 30)).toBe(6);
    expect(slotsInRange({ start: 720, end: 540 }, 30)).toBe(0);
  });

  it("knows real zones only", () => {
    expect(isTimeZone(CHICAGO)).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("offsets across the change", () => {
  it("reads Chicago at -300 before and -360 after, Riyadh at +180 throughout", () => {
    expect(offsetMinutes(at("2026-10-31T15:00:00Z"), CHICAGO)).toBe(-300);
    expect(offsetMinutes(at("2026-11-02T15:00:00Z"), CHICAGO)).toBe(-360);
    expect(offsetMinutes(at("2026-10-31T15:00:00Z"), RIYADH)).toBe(180);
    expect(offsetMinutes(at("2026-11-02T15:00:00Z"), RIYADH)).toBe(180);
    expect(offsetMinutes(at("2026-10-24T12:00:00Z"), LONDON)).toBe(60);
    expect(offsetMinutes(at("2026-10-26T12:00:00Z"), LONDON)).toBe(0);
  });

  it("finds the next change to the minute, and none for the Gulf", () => {
    expect(nextOffsetChange(CHICAGO, at("2026-10-21T00:00:00Z"))).toEqual({ at: at("2026-11-01T07:00:00Z"), deltaMinutes: -60 });
    expect(nextOffsetChange(LONDON, at("2026-10-21T00:00:00Z"))).toEqual({ at: at("2026-10-25T01:00:00Z"), deltaMinutes: -60 });
    expect(nextOffsetChange(RIYADH, at("2026-10-21T00:00:00Z"))).toBeUndefined();
  });

  it("turns a wall-clock time into the right instant on either side", () => {
    expect(iso(zonedInstant({ year: 2026, month: 10, day: 31 }, 9 * 60, CHICAGO))).toBe("2026-10-31T14:00:00Z");
    expect(iso(zonedInstant({ year: 2026, month: 11, day: 1 }, 9 * 60, CHICAGO))).toBe("2026-11-01T15:00:00Z");
    expect(iso(zonedInstant({ year: 2026, month: 11, day: 1 }, 0, CHICAGO))).toBe("2026-11-01T05:00:00Z");
    expect(iso(zonedInstant({ year: 2026, month: 11, day: 1 }, 1440, CHICAGO))).toBe("2026-11-02T06:00:00Z");
  });

  it("picks the first 1:30 in the repeated hour and moves a time in the spring gap an hour later", () => {
    expect(iso(zonedInstant({ year: 2026, month: 11, day: 1 }, 90, CHICAGO))).toBe("2026-11-01T06:30:00Z"); // 1:30 CDT
    // 2:30 on Sun 14 Mar 2027 does not exist in Chicago; it lands at 3:30 CDT.
    expect(iso(zonedInstant({ year: 2027, month: 3, day: 14 }, 150, CHICAGO))).toBe("2027-03-14T08:30:00Z");
  });

  it("reads wall-clock parts in a zone", () => {
    expect(zonedParts(at("2026-11-01T06:30:00Z"), CHICAGO)).toEqual({ year: 2026, month: 11, day: 1, weekday: "sun", minutes: 90 });
    expect(zonedParts(at("2026-11-01T07:30:00Z"), CHICAGO)).toEqual({ year: 2026, month: 11, day: 1, weekday: "sun", minutes: 90 });
    expect(zonedParts(at("2026-10-31T21:30:00Z"), RIYADH)).toMatchObject({ day: 1, month: 11, weekday: "sun", minutes: 30 });
  });
});

describe("generateSlots across the change", () => {
  const slots = generateSlots(everyDay(), at("2026-10-30T00:00:00Z"), at("2026-11-04T00:00:00Z"));
  const firstOn = (key: string, zone = CHICAGO) => slots.find((s) => dateKey(zonedParts(s, zone)) === key);

  it("keeps 9:00 on the doctor's clock every day: 14:00 UTC before the change, 15:00 UTC after", () => {
    expect(slots).toHaveLength(30); // 30 Oct to 3 Nov, six a day, the 25-hour Sunday included
    expect(iso(firstOn("2026-10-31")!)).toBe("2026-10-31T14:00:00Z");
    expect(iso(firstOn("2026-11-01")!)).toBe("2026-11-01T15:00:00Z");
    expect(iso(firstOn("2026-11-02")!)).toBe("2026-11-02T15:00:00Z");
    for (const s of slots) expect(spaces(formatTime(s, CHICAGO, "en"))).toMatch(/^(9|10|11):(00|30) AM$/);
  });

  it("moves the same rule by an hour for a Riyadh viewer: 5:00 PM before, 6:00 PM after", () => {
    expect(spaces(formatTime(firstOn("2026-10-31")!, RIYADH, "en"))).toBe("5:00 PM");
    expect(spaces(formatTime(firstOn("2026-11-01")!, RIYADH, "en"))).toBe("6:00 PM");
    expect(spaces(formatZone(firstOn("2026-11-01")!, RIYADH))).toBe("Riyadh (GMT+3)");
  });

  it("moves it for a London viewer too: 2:00 PM before, 3:00 PM after", () => {
    expect(spaces(formatTime(firstOn("2026-10-31")!, LONDON, "en"))).toBe("2:00 PM");
    expect(spaces(formatTime(firstOn("2026-11-02")!, LONDON, "en"))).toBe("3:00 PM");
  });

  it("returns UTC instants, ascending, without duplicates, each fitting its range", () => {
    const times = slots.map((s) => s.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
    for (const s of slots) expect(zonedParts(s, CHICAGO).minutes + 30).toBeLessThanOrEqual(12 * 60);
  });

  it("drops anything before notBefore (lead time, rule P8)", () => {
    const now = at("2026-11-01T15:10:00Z");
    const lead = new Date(now.getTime() + business.leadTimeHoursDefault * HOUR_MS);
    const later = generateSlots(everyDay(), at("2026-11-01T00:00:00Z"), at("2026-11-02T00:00:00Z"), lead);
    expect(later.map(iso)).toEqual(["2026-11-01T17:30:00Z"]); // 11:30 AM CST is the only one 2 h out
  });

  it("removes a day off and adds extra hours on a date", () => {
    const s = everyDay([
      { kind: "off", date: "2026-11-01" },
      { kind: "extra", date: "2026-11-02", start: 13 * 60, end: 14 * 60 },
    ]);
    const out = generateSlots(s, at("2026-11-01T00:00:00Z"), at("2026-11-03T12:00:00Z"));
    expect(out.filter((x) => dateKey(zonedParts(x, CHICAGO)) === "2026-11-01")).toHaveLength(0);
    expect(out.filter((x) => dateKey(zonedParts(x, CHICAGO)) === "2026-11-02")).toHaveLength(8);
    expect(out.map(iso)).toContain("2026-11-02T19:30:00Z"); // 1:30 PM CST
  });
});

describe("slotsByViewerDay: the viewer's calendar days", () => {
  const now = at("2026-10-30T12:00:00Z");

  it("groups by Riyadh days, shades the Saudi weekend and shows the hour move after 1 Nov", () => {
    const days = slotsByViewerDay(everyDay(), { timeZone: RIYADH, weekend: business.weekend.SA ?? [] }, now, 5, 0);
    expect(days.map((d) => d.key)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(days.map((d) => d.weekend)).toEqual([true, true, false, false, false]); // Fri and Sat
    expect(days.map((d) => d.slots.length)).toEqual([6, 6, 6, 6, 6]);
    expect(spaces(formatTime(days[1]!.slots[0]!, RIYADH, "en"))).toBe("5:00 PM");
    expect(spaces(formatTime(days[2]!.slots[0]!, RIYADH, "en"))).toBe("6:00 PM");
  });

  it("gives a Houston viewer a 25-hour Sunday that still holds its six slots", () => {
    const days = slotsByViewerDay(everyDay(), { timeZone: CHICAGO, weekend: business.weekend.US ?? [] }, now, 5, 0);
    const sunday = days.find((d) => d.key === "2026-11-01")!;
    expect(sunday.weekend).toBe(true);
    expect(iso(sunday.start)).toBe("2026-11-01T05:00:00Z");
    const monday = days.find((d) => d.key === "2026-11-02")!;
    expect(monday.start.getTime() - sunday.start.getTime()).toBe(25 * HOUR_MS);
    expect(sunday.slots).toHaveLength(6);
  });

  it("gives a London viewer the same instants on London days", () => {
    const days = slotsByViewerDay(everyDay(), { timeZone: LONDON, weekend: ["sat", "sun"] }, now, 5, 0);
    expect(days.map((d) => d.slots.length)).toEqual([6, 6, 6, 6, 6]);
    expect(spaces(formatTime(days[3]!.slots[0]!, LONDON, "en"))).toBe("3:00 PM");
  });

  it("says a day is empty because of a day off", () => {
    const days = slotsByViewerDay(everyDay([{ kind: "off", date: "2026-11-01" }]), { timeZone: RIYADH, weekend: [] }, now, 5, 0);
    const sunday = days.find((d) => d.key === "2026-11-01")!;
    expect(sunday.slots).toHaveLength(0);
    expect(sunday.dayOff).toBe(true);
    expect(days.find((d) => d.key === "2026-11-02")!.dayOff).toBe(false);
  });

  it("applies the lead time to today's slots", () => {
    const morning = at("2026-11-02T15:20:00Z"); // 9:20 AM Chicago
    const [today] = slotsByViewerDay(everyDay(), { timeZone: CHICAGO, weekend: [] }, morning, 1, 2);
    expect(today!.slots.map(iso)).toEqual(["2026-11-02T17:30:00Z"]);
  });
});

describe("storage: UTC instants plus the rule zone", () => {
  it("stores a Monday rule as its first occurrence and still repeats at 9:00 Chicago after the change", () => {
    const stored = ruleToStored("r1", "mon", { start: 540, end: 720 }, CHICAGO, { year: 2026, month: 10, day: 4 });
    expect(stored).toEqual({ id: "r1", startsAtUtc: "2026-10-05T14:00:00.000Z", endsAtUtc: "2026-10-05T17:00:00.000Z" });
    const rule = ruleFromStored(stored, CHICAGO);
    expect(rule).toEqual({ weekday: "mon", range: { start: 540, end: 720 } });
    const s: Schedule = { timeZone: CHICAGO, slotMinutes: 30, week: { sun: [], mon: [rule.range], tue: [], wed: [], thu: [], fri: [], sat: [] }, exceptions: [] };
    const nov2 = generateSlots(s, at("2026-11-02T00:00:00Z"), at("2026-11-03T00:00:00Z"));
    expect(iso(nov2[0]!)).toBe("2026-11-02T15:00:00Z");
  });

  it("reads a rule that ends at midnight as 1440", () => {
    const stored = ruleToStored("r2", "sat", { start: 20 * 60, end: 1440 }, CHICAGO, { year: 2026, month: 10, day: 4 });
    expect(ruleFromStored(stored, CHICAGO)).toEqual({ weekday: "sat", range: { start: 1200, end: 1440 } });
  });

  it("stores a day off on 1 Nov as the 25 hours it covers in Chicago, and reads it back", () => {
    const stored = exceptionToStored("x1", { kind: "off", date: "2026-11-01" }, CHICAGO)!;
    expect(stored).toEqual({ id: "x1", kind: "off", startsAtUtc: "2026-11-01T05:00:00.000Z", endsAtUtc: "2026-11-02T06:00:00.000Z" });
    expect(exceptionFromStored(stored, CHICAGO)).toEqual({ kind: "off", date: "2026-11-01" });
  });

  it("round-trips extra hours and refuses a bad date", () => {
    const extra = { kind: "extra" as const, date: "2026-11-06", start: 13 * 60, end: 15 * 60 };
    const stored = exceptionToStored("x2", extra, CHICAGO)!;
    expect(stored.startsAtUtc).toBe("2026-11-06T19:00:00.000Z");
    expect(exceptionFromStored(stored, CHICAGO)).toEqual(extra);
    expect(exceptionToStored("x3", { kind: "off", date: "2026-13-01" }, CHICAGO)).toBeUndefined();
  });
});

describe("helpers for the preview lines", () => {
  it("merges consecutive slots into runs", () => {
    const s = [at("2026-11-02T15:00:00Z"), at("2026-11-02T15:30:00Z"), at("2026-11-02T17:00:00Z")];
    expect(slotRuns(s, 30).map((r) => [iso(r.start), iso(r.end)])).toEqual([
      ["2026-11-02T15:00:00Z", "2026-11-02T16:00:00Z"],
      ["2026-11-02T17:00:00Z", "2026-11-02T17:30:00Z"],
    ]);
  });

  it("labels a wall-clock rule with no zone arithmetic", () => {
    expect(spaces(formatTime(wallClockInstant(540), "UTC", "en"))).toBe("9:00 AM");
    expect(spaces(formatTime(wallClockInstant(1440), "UTC", "en"))).toBe("12:00 AM");
  });
});
