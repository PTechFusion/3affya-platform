// Availability editor model (screen 30). What the editor holds, how a change is checked, and how it maps to storage. Pure and
// shared by the client editor and the server action, so both apply the same checks (rules F5, L4). The editor works on the
// doctor's wall clock in the doctor's own zone; storage is UTC instants plus that zone (lib/slots, ADR-7). Nothing here stores
// a local time.
import { business } from "@/config/business";
import {
  MINUTES_PER_DAY,
  WEEKDAYS,
  addDays,
  dateKey,
  exceptionFromStored,
  exceptionToStored,
  isTimeZone,
  parseDateKey,
  ruleFromStored,
  ruleToStored,
  zonedParts,
  type DateException,
  type StoredException,
  type StoredRule,
  type WallRange,
  type Weekday,
} from "@/lib/slots";

/** The professional this prototype edits. Production takes the professional from the Supabase session, never from the client. */
export const PROTOTYPE_DOCTOR_ID = "doc_002";

/** Start and end times move in quarter hours. */
export const TIME_STEP_MINUTES = 15;
export const MAX_RANGES_PER_DAY = 6;
export const MAX_EXCEPTIONS = 60;

/** The zones offered first (the doctors practise in the US); a saved zone outside the list is added to it. */
export const DOCTOR_TIME_ZONES: readonly string[] = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

/** The first weekly hours a doctor adds from the empty state: Monday morning on their own clock. */
export const STARTER_DAY: Weekday = "mon";
export const STARTER_RANGE: WallRange = { start: 9 * 60, end: 12 * 60 };

export type WeekRange = WallRange & { id: string };
export type DayException = DateException & { id: string };
export type WeekHours = Record<Weekday, WeekRange[]>;

export type AvailabilityModel = {
  timeZone: string;
  slotMinutes: number;
  leadTimeHours: number;
  week: WeekHours;
  exceptions: DayException[];
};

export function emptyWeek(): WeekHours {
  return Object.fromEntries(WEEKDAYS.map((d) => [d, []])) as unknown as WeekHours;
}

export const hasWeeklyHours = (m: AvailabilityModel) => WEEKDAYS.some((d) => m.week[d].length > 0);

/** The doctor's calendar date now, as a dateKey: the first date an exception can take. */
export const todayIn = (timeZone: string, now: Date) => dateKey(zonedParts(now, timeZone));
export const lastExceptionDate = (today: string) => {
  const d = parseDateKey(today);
  return d ? dateKey(addDays(d, business.bookingHorizonDays)) : today;
};

const byStart = (a: WallRange, b: WallRange) => a.start - b.start;

/** Stored rows to the editor's wall-clock model. Exceptions before `today` (in the doctor's zone) are history and left out. */
export function modelFromStored(
  s: { timeZone: string; slotMinutes: number; leadTimeHours: number; rules: StoredRule[]; exceptions: StoredException[] },
  today: string,
): AvailabilityModel {
  const week = emptyWeek();
  for (const rule of s.rules) {
    const { weekday, range } = ruleFromStored(rule, s.timeZone);
    week[weekday].push({ id: rule.id, ...range });
  }
  for (const d of WEEKDAYS) week[d].sort(byStart);
  const exceptions = s.exceptions
    .map((x) => ({ id: x.id, ...exceptionFromStored(x, s.timeZone) }))
    .filter((x) => x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { timeZone: s.timeZone, slotMinutes: s.slotMinutes, leadTimeHours: s.leadTimeHours, week, exceptions };
}

/** The editor's model to stored rows: each weekly range as its first occurrence from `today`, each exception as UTC instants. */
export function storedFromModel(m: AvailabilityModel, today: string): { rules: StoredRule[]; exceptions: StoredException[] } {
  const from = parseDateKey(today);
  if (!from) return { rules: [], exceptions: [] };
  const rules = WEEKDAYS.flatMap((d) => m.week[d].map((r) => ruleToStored(r.id, d, r, m.timeZone, from)));
  const exceptions = m.exceptions.flatMap((x) => exceptionToStored(x.id, x, m.timeZone) ?? []);
  return { rules, exceptions };
}

/* ---------------- Checks ---------------- */

export type RangeProblem = { code: "endBeforeStart" } | { code: "overlap"; other: WallRange };

/** A weekly or extra-hours range against the other ranges on the same day. Touching ranges are allowed; overlapping are not. */
export function rangeProblem(candidate: WallRange, others: WallRange[]): RangeProblem | undefined {
  if (candidate.end <= candidate.start) return { code: "endBeforeStart" };
  const other = others.find((o) => candidate.start < o.end && o.start < candidate.end);
  return other ? { code: "overlap", other } : undefined;
}

export type ExceptionProblem = RangeProblem | { code: "dateTaken" } | { code: "dateOutOfRange" };

/** One exception per date, within today and the booking horizon; extra hours need a real range. */
export function exceptionProblem(candidate: DateException, others: DayException[], today: string): ExceptionProblem | undefined {
  if (!parseDateKey(candidate.date) || candidate.date < today || candidate.date > lastExceptionDate(today)) return { code: "dateOutOfRange" };
  if (others.some((o) => o.date === candidate.date)) return { code: "dateTaken" };
  return candidate.kind === "extra" ? rangeProblem(candidate, []) : undefined;
}

/** The next free range after a day's last one, or undefined when the day is full. */
export function nextRange(ranges: WallRange[], slotMinutes: number): WallRange | undefined {
  if (ranges.length >= MAX_RANGES_PER_DAY) return undefined;
  if (!ranges.length) return STARTER_RANGE;
  const lastEnd = Math.max(...ranges.map((r) => r.end));
  const latest = Math.floor((MINUTES_PER_DAY - slotMinutes) / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  const start = Math.min(lastEnd + 60, latest);
  if (start < lastEnd) return undefined;
  return { start, end: Math.min(start + 180, MINUTES_PER_DAY) };
}

/* ---------------- Parsing what the client sent (server side) ---------------- */

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === "string" && /^[\w-]{1,40}$/.test(v);
const isMinute = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max && v % TIME_STEP_MINUTES === 0;

function parseRange(v: unknown): WeekRange | undefined {
  if (!isObject(v) || !isId(v.id) || !isMinute(v.start, 0, MINUTES_PER_DAY) || !isMinute(v.end, 0, MINUTES_PER_DAY)) return undefined;
  return { id: v.id, start: v.start, end: v.end };
}

function parseException(v: unknown): DayException | undefined {
  if (!isObject(v) || !isId(v.id) || typeof v.date !== "string") return undefined;
  if (v.kind === "off") return { id: v.id, kind: "off", date: v.date };
  if (v.kind !== "extra" || !isMinute(v.start, 0, MINUTES_PER_DAY) || !isMinute(v.end, 0, MINUTES_PER_DAY)) return undefined;
  return { id: v.id, kind: "extra", date: v.date, start: v.start, end: v.end };
}

/** The whole model, checked field by field from untrusted input. Undefined when anything fails. */
export function parseModel(raw: unknown, now: Date): AvailabilityModel | undefined {
  if (!isObject(raw) || typeof raw.timeZone !== "string" || !isTimeZone(raw.timeZone)) return undefined;
  if (typeof raw.slotMinutes !== "number" || !business.slotLengthMinutesOptions.includes(raw.slotMinutes)) return undefined;
  if (typeof raw.leadTimeHours !== "number" || !business.leadTimeHoursOptions.includes(raw.leadTimeHours)) return undefined;
  if (!isObject(raw.week) || !Array.isArray(raw.exceptions) || raw.exceptions.length > MAX_EXCEPTIONS) return undefined;

  const week = emptyWeek();
  for (const d of WEEKDAYS) {
    const list = raw.week[d];
    if (!Array.isArray(list) || list.length > MAX_RANGES_PER_DAY) return undefined;
    for (const item of list) {
      const range = parseRange(item);
      if (!range || rangeProblem(range, week[d])) return undefined;
      week[d].push(range);
    }
    week[d].sort(byStart);
  }

  const today = todayIn(raw.timeZone, now);
  const exceptions: DayException[] = [];
  for (const item of raw.exceptions) {
    const x = parseException(item);
    if (!x || exceptionProblem(x, exceptions, today)) return undefined;
    exceptions.push(x);
  }
  return { timeZone: raw.timeZone, slotMinutes: raw.slotMinutes, leadTimeHours: raw.leadTimeHours, week, exceptions };
}
