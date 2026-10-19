// What the slot picker (screen 19) asks and checkout (screen 20) reads back: the choices, their checks and the URL that carries
// them between the two pages. Pure: no I/O, so the pages, their client parts and the server actions share one set of rules.
// The reason for the visit never goes in a URL (rule T12); in production it is stored with the hold row (task 3.2).
import { bookingRules } from "@/config/business";

export const VISIT_TYPES = ["video", "phone"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

/** Rule P8: ask who the visit is for, do not assume. "child" is the patient's own child; "family" any other relative. */
export const FOR_WHOM = ["self", "child", "family"] as const;
export type ForWhom = (typeof FOR_WHOM)[number];

export type AgeGroup = (typeof bookingRules.ageGroups)[number]["id"];
export const AGE_GROUPS: readonly AgeGroup[] = bookingRules.ageGroups.map((g) => g.id);

export type DoctorAges = "adults" | "children" | "allAges";

export const REASON_MIN = 3;
export const REASON_MAX = 500;

export type Answers = { visit: VisitType | ""; forWhom: ForWhom | ""; ageGroup: AgeGroup | ""; reason: string };
export type AnswerField = "slot" | "visit" | "forWhom" | "ageGroup" | "reason";
export type AnswerError = "required" | "notSeen" | "tooShort" | "tooLong";
export type AnswerErrors = Partial<Record<AnswerField, AnswerError>>;

/** The order errors are reported and focused in: the order the fields appear on the page. */
export const ANSWER_FIELDS: readonly AnswerField[] = ["visit", "slot", "forWhom", "ageGroup", "reason"];

function pick<T extends string>(list: readonly T[], raw: unknown): T | "" {
  return typeof raw === "string" && (list as readonly string[]).includes(raw) ? (raw as T) : "";
}

/** The visit type from the URL when the doctor offers it; a doctor with one type needs no choice. */
export function parseVisit(raw: unknown, offered: readonly VisitType[]): VisitType | "" {
  const v = pick(VISIT_TYPES, raw);
  if (v && offered.includes(v)) return v;
  return offered.length === 1 ? (offered[0] ?? "") : "";
}

export const parseForWhom = (raw: unknown): ForWhom | "" => pick(FOR_WHOM, raw);
export const parseAgeGroup = (raw: unknown): AgeGroup | "" => pick(AGE_GROUPS, raw);

/** A slot instant from the URL: ISO-8601 with Z or an explicit offset (2026-11-10T15:00:00Z). Anything else is undefined. */
export function parseSlot(raw: unknown): Date | undefined {
  if (typeof raw !== "string") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(raw)) return undefined;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? undefined : new Date(t);
}

/** The URL form of a slot: UTC, whole seconds, "2026-11-10T15:00:00Z". */
export const slotParam = (instant: Date): string => instant.toISOString().replace(/\.\d{3}Z$/, "Z");

/** Whether the doctor's age rule (rule P8) covers this group. */
export function seesAgeGroup(ages: DoctorAges, group: AgeGroup): boolean {
  if (ages === "allAges") return true;
  const g = bookingRules.ageGroups.find((x) => x.id === group);
  if (!g) return false;
  return ages === "adults" ? g.fromYears >= bookingRules.adultFromYears : g.fromYears < bookingRules.adultFromYears;
}

/** Everything the picker must have before it starts the hold (rule P8). `slotChosen: undefined` skips the slot (time request). */
export function validateAnswers(
  a: Answers,
  doctor: { visitTypes: readonly VisitType[]; ages: DoctorAges },
  slotChosen: boolean | undefined,
): AnswerErrors {
  const e: AnswerErrors = {};
  if (slotChosen === false) e.slot = "required";
  if (!a.visit || !doctor.visitTypes.includes(a.visit)) e.visit = "required";
  if (!a.forWhom) e.forWhom = "required";
  if (!a.ageGroup) e.ageGroup = "required";
  else if (!seesAgeGroup(doctor.ages, a.ageGroup)) e.ageGroup = "notSeen";
  const reason = a.reason.trim();
  if (!reason) e.reason = "required";
  else if (reason.length < REASON_MIN) e.reason = "tooShort";
  else if (reason.length > REASON_MAX) e.reason = "tooLong";
  return e;
}

/** Answers out of an untrusted object (a server action's input). */
export function answersFrom(src: Record<string, unknown>, offered: readonly VisitType[]): Answers {
  return {
    visit: parseVisit(src.visit, offered),
    forWhom: parseForWhom(src.forWhom),
    ageGroup: parseAgeGroup(src.ageGroup),
    reason: typeof src.reason === "string" ? src.reason : "",
  };
}

/** "Request a time" (no open time suits): the parts of the day that suit the patient, in the patient's zone. */
export const TIME_WINDOWS = ["mornings", "afternoons", "evenings"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

/** The prototype's viewer switches (lib/viewer.ts) ride along on every booking link, so a ?tz= test survives the flow. */
export const KEEP_PARAMS = ["tz", "country"] as const;
export type Keep = Partial<Record<(typeof KEEP_PARAMS)[number], string>>;

export function keepFrom(sp: Record<string, string | string[] | undefined>): Keep {
  const keep: Keep = {};
  for (const k of KEEP_PARAMS) {
    const v = sp[k];
    if (typeof v === "string" && v) keep[k] = v;
  }
  return keep;
}

/** ?slot=&visit=&for=&age= (+ the hold end and the viewer switches). Colons stay readable; every value is encoded. */
export function bookingQuery(p: {
  slot?: string;
  visit?: string;
  forWhom?: string;
  ageGroup?: string;
  heldUntil?: string;
  extra?: Record<string, string | undefined>;
  keep?: Keep;
}): string {
  const pairs: Array<[string, string | undefined]> = [
    ["slot", p.slot],
    ["visit", p.visit],
    ["for", p.forWhom],
    ["age", p.ageGroup],
    ["heldUntil", p.heldUntil],
    ...Object.entries(p.extra ?? {}),
    ...Object.entries(p.keep ?? {}),
  ];
  const q = pairs
    .filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1] !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%3A/g, ":")}`)
    .join("&");
  return q ? `?${q}` : "";
}

/** The session draft that keeps the reason when the patient goes back from checkout (rule F2: never re-ask). */
export const draftKey = (doctorId: string) => `3affya.book.${doctorId}`;
