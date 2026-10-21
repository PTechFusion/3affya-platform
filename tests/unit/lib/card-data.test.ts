// lib/card-data.ts: the one DoctorCard mapping (rules C1, C5) and the prototype's sample clocks. The clock is injected: the
// fake system time for sampleInstant (which reads now itself) and the `now` argument for sampleInstantExact.
import { afterEach, describe, expect, it, vi } from "vitest";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatMoney } from "@/lib/format";
import { sampleInstant, sampleInstantExact, toDoctorCardData } from "@/lib/card-data";
import type { SampleDoctor } from "@/lib/sample";
import { EASTERN_DIGITS, at, spaces } from "./helpers";

const doctor: SampleDoctor = {
  id: "doc_t01",
  npi: "1000000001",
  state: "verified",
  gender: "f",
  nameEn: "Dr Test Doctor",
  nameAr: "د. طبيبة تجريبية",
  specialty: "pediatrics",
  specialtyEn: "Pediatrics",
  specialtyAr: "طب الأطفال",
  cityEn: "Houston, Texas",
  cityAr: "هيوستن، تكساس",
  photoUrl: null,
  languages: [{ code: "ar", dialect: "Gulf" }, { code: "en" }],
  visitTypes: ["video"],
  ages: "children",
  tags: ["Asthma"],
  training: ["Baylor College of Medicine, residency"],
  yearsInPractice: 12,
  boardCertified: true,
  verifiedOn: "2026-10-01",
  feeUsdCents: 25000,
  nextAvailableUtc: "2026-11-10T15:00:00Z",
};
const labels = (key: string) => ({ ar: "Arabic", en: "English", "dialect.Gulf": "Gulf" })[key] ?? key;

afterEach(() => {
  vi.useRealTimers();
});

describe("sample clocks", () => {
  it("sampleInstant shifts whole days so the first authored day (10 Nov 2026) is tomorrow, keeping the clock time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at("2026-10-21T08:00:00Z"));
    expect(sampleInstant("2026-11-10T15:00:00Z").toISOString()).toBe("2026-10-22T15:00:00.000Z");
    vi.setSystemTime(at("2026-10-21T23:59:00Z"));
    expect(sampleInstant("2026-11-10T15:00:00Z").toISOString()).toBe("2026-10-22T15:00:00.000Z");
  });

  it("sampleInstantExact keeps hour-level ages against the injected now", () => {
    const now = at("2026-10-21T12:00:00Z");
    const shifted = sampleInstantExact("2026-11-07T20:00:00Z", "2026-11-09T12:00:00Z", now);
    expect(now.getTime() - shifted.getTime()).toBe(40 * 3_600_000);
  });
});

describe("toDoctorCardData", () => {
  it("shows the all-in total as the card price, never the doctor fee alone (rule C5)", () => {
    const card = toDoctorCardData(doctor, "en", "Asia/Riyadh", labels);
    const total = feeLines(25000).totalCents;
    expect(card.feeLabel).toBe(formatMoney(total, business.currencyPresentment, "en"));
    expect(spaces(card.feeLabel!)).toBe("USD 309");
  });

  it("joins languages with dialects, with the Arabic comma in Arabic", () => {
    expect(toDoctorCardData(doctor, "en", "Asia/Riyadh", labels).languages).toBe("Arabic (Gulf), English");
    expect(toDoctorCardData(doctor, "ar", "Asia/Riyadh", labels).languages).toBe("Arabic (Gulf)، English");
  });

  it("formats verifiedOn as a calendar date, so a viewer west of UTC does not see the day before", () => {
    expect(toDoctorCardData(doctor, "en", "America/Los_Angeles", labels).verifiedOnLabel).toBe("Oct 1, 2026");
    expect(toDoctorCardData(doctor, "en", "Asia/Riyadh", labels).verifiedOnLabel).toBe("Oct 1, 2026");
  });

  it("labels the next open time in the viewer's zone with the zone named", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at("2026-10-21T08:00:00Z"));
    expect(spaces(toDoctorCardData(doctor, "en", "Asia/Riyadh", labels).nextAvailableLabel!)).toBe("Oct 22, 2026 · 6:00 PM Riyadh (GMT+3)");
    expect(spaces(toDoctorCardData(doctor, "en", "America/Chicago", labels).nextAvailableLabel!)).toBe("Oct 22, 2026 · 10:00 AM Chicago (GMT−5)");
    const ar = toDoctorCardData(doctor, "ar", "Asia/Riyadh", labels);
    expect(ar.nextAvailableLabel).not.toMatch(EASTERN_DIGITS);
    expect(ar.feeLabel).not.toMatch(EASTERN_DIGITS);
  });

  it("leaves out what the row does not have", () => {
    const bare = toDoctorCardData({ ...doctor, feeUsdCents: null, nextAvailableUtc: null, verifiedOn: null, yearsInPractice: null }, "en", "Asia/Riyadh", labels);
    expect(bare.feeLabel).toBeUndefined();
    expect(bare.nextAvailableLabel).toBeUndefined();
    expect(bare.verifiedOnLabel).toBeUndefined();
    expect(bare.yearsInPractice).toBeUndefined();
    expect(bare.photoUrl).toBeUndefined();
  });

  it("passes the names in both scripts and the board flag through unchanged", () => {
    const card = toDoctorCardData(doctor, "ar", "Asia/Riyadh", labels);
    expect(card).toMatchObject({ nameEn: doctor.nameEn, nameAr: doctor.nameAr, specialtyAr: doctor.specialtyAr, boardCertified: true, trainingLines: doctor.training });
  });
});
