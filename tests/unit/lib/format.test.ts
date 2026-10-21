// lib/format.ts: Western digits in both locales (rule N1), zone labels that never wrap (rule P6, R3), money in minor units.
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  dayKeyInZone,
  daysLeft,
  formatClockRange,
  formatDate,
  formatHijri,
  formatMinorUnits,
  formatMoney,
  formatMoneyFine,
  formatNumber,
  formatPercent,
  formatSlotDay,
  formatTime,
  formatTimeInZone,
  formatTimeRangeInZone,
  formatZone,
  instantAtHourInZone,
  type Locale,
} from "@/lib/format";
import { EASTERN_DIGITS, at, digitsOf, spaces } from "./helpers";

const LOCALES: Locale[] = ["ar", "en"];
const NBSP = " ";
const MINUS = "−";
const LRI = "⁦";
const PDI = "⁩";

// The US leaves daylight time at 2:00 on Sun 1 Nov 2026 (07:00 UTC); the UK left it on Sun 25 Oct 2026 (01:00 UTC).
const BEFORE_US_CHANGE = at("2026-10-31T15:00:00Z");
const AFTER_US_CHANGE = at("2026-11-02T15:00:00Z");

describe("Western digits in both locales (rule N1)", () => {
  const instant = at("2026-11-01T15:00:00Z");
  const outputs = (locale: Locale) => [
    formatNumber(1234567.89, locale),
    formatMoney(30900, "USD", locale),
    formatMoney(1500, "KWD", locale),
    formatMoneyFine(3.35, "USD", locale),
    formatPercent(12.5, locale),
    formatTimeInZone(instant, "Asia/Riyadh", locale),
    formatDate(instant, "Asia/Riyadh", locale),
    formatHijri(instant, "Asia/Riyadh", locale),
    formatSlotDay(instant, "Asia/Riyadh", locale),
    formatTime(instant, "Asia/Riyadh", locale),
    formatClockRange(at("2026-11-01T06:00:00Z"), at("2026-11-01T09:00:00Z"), "Asia/Riyadh", locale),
    formatTimeRangeInZone(at("2026-11-01T06:00:00Z"), at("2026-11-01T18:00:00Z"), "Asia/Riyadh", locale).range,
  ];

  it.each(LOCALES)("%s output never contains Arabic-Indic or Persian digits", (locale) => {
    for (const out of outputs(locale)) expect(out, out).not.toMatch(EASTERN_DIGITS);
  });

  it("Arabic numbers carry the same digits as English", () => {
    expect(digitsOf(formatNumber(1234567.89, "ar"))).toBe("123456789");
    expect(formatNumber(1234567.89, "en")).toBe("1,234,567.89");
    expect(digitsOf(formatDate(instant, "Asia/Riyadh", "ar"))).toBe("12026");
    expect(formatDate(instant, "Asia/Riyadh", "en")).toBe("Nov 1, 2026");
  });

  it("Hijri dates (secondary, rule N3) also use Western digits", () => {
    const hijri = formatHijri(instant, "Asia/Riyadh", "ar");
    expect(hijri).toMatch(/1448/);
    expect(hijri).not.toMatch(EASTERN_DIGITS);
  });
});

describe("money in minor units", () => {
  it("drops the cents of a whole amount and keeps all of them otherwise", () => {
    expect(spaces(formatMoney(15000, "USD", "en"))).toBe("USD 150");
    expect(spaces(formatMoney(15050, "USD", "en"))).toBe("USD 150.50");
    expect(spaces(formatMoney(30, "USD", "en"))).toBe("USD 0.30"); // never "USD 0.3"
    expect(spaces(formatMoney(1, "USD", "en"))).toBe("USD 0.01");
  });

  it("uses three decimals for KWD, OMR and BHD", () => {
    expect(spaces(formatMoney(1500, "KWD", "en"))).toBe("KWD 1.500");
    expect(spaces(formatMoney(1, "OMR", "en"))).toBe("OMR 0.001");
    expect(spaces(formatMoney(12345, "BHD", "en"))).toBe("BHD 12.345");
  });

  it("names the currency by code in Arabic too, with Western digits", () => {
    const ar = formatMoney(30900, "USD", "ar");
    expect(ar).toContain("USD");
    expect(digitsOf(ar)).toBe("309");
    expect(digitsOf(formatMoney(30950, "USD", "ar"))).toBe("30950");
  });

  it("formats sub-cent internal costs with at least the currency's decimals", () => {
    expect(spaces(formatMoneyFine(3.35, "USD", "en"))).toBe("USD 0.0335");
    expect(spaces(formatMoneyFine(100, "USD", "en"))).toBe("USD 1.00");
    expect(spaces(formatMoneyFine(1, "KWD", "en"))).toBe("KWD 0.001");
  });

  it("writes plain file amounts with a dot, no grouping and no code (CSV export)", () => {
    expect(formatMinorUnits(30900, "USD")).toBe("309.00");
    expect(formatMinorUnits(5, "USD")).toBe("0.05");
    expect(formatMinorUnits(-1234, "USD")).toBe("-12.34");
    expect(formatMinorUnits(300, "KWD")).toBe("0.300");
    expect(formatMinorUnits(123456789, "USD")).toBe("1234567.89");
  });
});

describe("percentages (rule N2)", () => {
  it("puts the sign after the digits in English and before them in Arabic", () => {
    expect(formatPercent(20, "en")).toBe("20%");
    expect(formatPercent(12.5, "en")).toBe("12.5%");
    expect(formatPercent(20, "ar")).toBe("٪20");
    expect(formatPercent(2.94, "en", 1)).toBe("2.9%");
  });
});

describe("zone labels (rules P6, R3)", () => {
  it("names the city and the offset at that instant", () => {
    expect(formatZone(BEFORE_US_CHANGE, "Asia/Riyadh")).toBe(`Riyadh${NBSP}(GMT+3)`);
    expect(formatZone(at("2026-12-01T12:00:00Z"), "Europe/London")).toBe(`London${NBSP}(GMT)`);
    expect(formatZone(at("2026-12-01T12:00:00Z"), "Asia/Kolkata")).toBe(`Kolkata${NBSP}(GMT+5:30)`);
  });

  it("writes a negative offset with a real minus sign and no-break spaces, so it cannot wrap", () => {
    const la = formatZone(at("2026-12-01T12:00:00Z"), "America/Los_Angeles");
    expect(la).toBe(`Los${NBSP}Angeles${NBSP}(GMT${MINUS}8)`);
    const stJohns = formatZone(at("2026-12-01T12:00:00Z"), "America/St_Johns");
    expect(stJohns).toBe(`St${NBSP}Johns${NBSP}(GMT${MINUS}3:30)`);
    for (const label of [la, stJohns, formatZone(BEFORE_US_CHANGE, "America/Chicago")]) {
      expect(label).not.toContain("-"); // a hyphen-minus is a line-break opportunity
      expect(label).not.toMatch(/[ \t\n]/); // only no-break spaces
    }
  });

  it("follows the US change: Chicago is GMT-5 before 1 Nov 2026 and GMT-6 after", () => {
    expect(formatZone(BEFORE_US_CHANGE, "America/Chicago")).toBe(`Chicago${NBSP}(GMT${MINUS}5)`);
    expect(formatZone(AFTER_US_CHANGE, "America/Chicago")).toBe(`Chicago${NBSP}(GMT${MINUS}6)`);
    // London had already changed on 25 Oct, Riyadh never changes.
    expect(formatZone(BEFORE_US_CHANGE, "Europe/London")).toBe(`London${NBSP}(GMT)`);
    expect(formatZone(AFTER_US_CHANGE, "Asia/Riyadh")).toBe(`Riyadh${NBSP}(GMT+3)`);
  });

  it("keeps the time on one line and isolates the Latin zone in Arabic", () => {
    const en = formatTimeInZone(at("2026-11-01T15:00:00Z"), "Asia/Riyadh", "en");
    expect(spaces(en)).toBe("6:00 PM Riyadh (GMT+3)");
    const [time] = en.split(" Riyadh");
    expect(time).not.toContain(" "); // the time and its marker are joined by a no-break space

    const ar = formatTimeInZone(at("2026-11-01T15:00:00Z"), "Asia/Riyadh", "ar");
    expect(ar).toContain(`${LRI}Riyadh${NBSP}(GMT+3)${PDI}`);
    expect(ar.startsWith(`6:00${NBSP}`)).toBe(true);
    expect(ar).not.toMatch(EASTERN_DIGITS);
  });

  it("names the zone once for a range and returns it apart from the range", () => {
    const { range, zone } = formatTimeRangeInZone(at("2026-11-02T15:00:00Z"), at("2026-11-02T18:00:00Z"), "America/Chicago", "en");
    expect(zone).toBe(`Chicago${NBSP}(GMT${MINUS}6)`);
    expect(spaces(range)).toMatch(/^9:00 AM\s*[–-]\s*12:00 PM$/);
  });

  it("builds clock ranges from two times, never formatRange's thin spaces", () => {
    // Each time is held together by no-break spaces; the dash keeps to the first time and the line may break after it.
    const r = formatClockRange(at("2026-11-02T15:00:00Z"), at("2026-11-02T18:00:00Z"), "America/Chicago", "en");
    expect(r).toBe(`9:00${NBSP}AM${NBSP}– 12:00${NBSP}PM`);
    expect(r).not.toMatch(/[  ]/);
    // A range that ends at midnight stays a clock range, no dates.
    const late = formatClockRange(at("2026-11-02T03:00:00Z"), at("2026-11-02T06:00:00Z"), "America/Chicago", "en");
    expect(late).toBe(`9:00${NBSP}PM${NBSP}– 12:00${NBSP}AM`);
  });
});

describe("calendar arithmetic in a zone", () => {
  it("finds the instant a wall clock reads an hour, on either side of the US change", () => {
    expect(instantAtHourInZone(9, "America/Chicago", at("2026-10-31T18:00:00Z")).toISOString()).toBe("2026-10-31T14:00:00.000Z");
    expect(instantAtHourInZone(9, "America/Chicago", at("2026-11-01T18:00:00Z")).toISOString()).toBe("2026-11-01T15:00:00.000Z");
    expect(instantAtHourInZone(9, "Asia/Riyadh", at("2026-11-01T18:00:00Z")).toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });

  it("groups instants by the calendar day of the zone", () => {
    const lateEvening = at("2026-10-31T22:30:00Z");
    expect(dayKeyInZone(lateEvening, "Asia/Riyadh")).toBe("2026-11-01");
    expect(dayKeyInZone(lateEvening, "America/Chicago")).toBe("2026-10-31");
    expect(dayKeyInZone(lateEvening, "Europe/London")).toBe("2026-10-31");
  });

  it("formats the slot day without the year", () => {
    expect(formatSlotDay(at("2026-11-01T15:00:00Z"), "Asia/Riyadh", "en")).toBe("Sun, Nov 1");
  });

  it("counts whole days left against an injected now, 0 in the last 24 hours", () => {
    const now = at("2026-11-01T12:00:00Z");
    expect(DAY_MS).toBe(86_400_000);
    expect(daysLeft(new Date(now.getTime() + 5 * DAY_MS + 1), now)).toBe(5);
    expect(daysLeft(new Date(now.getTime() + DAY_MS - 1), now)).toBe(0);
    expect(daysLeft(new Date(now.getTime() - DAY_MS), now)).toBe(0);
  });
});
