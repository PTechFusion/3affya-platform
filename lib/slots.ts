// Slot generation and zone arithmetic (ADR-7, task 2.6). Weekly hours are ranges on the doctor's wall clock in the doctor's
// IANA zone; every instant that leaves this file is UTC. Offsets are looked up for each date, never cached per zone, so a
// Chicago 9:00 rule shows at 17:00 in Riyadh in October and at 18:00 after the US DST change on 1 Nov 2026 (rule P6).
// Storage keeps UTC instants plus the rule zone: a weekly rule is stored as its first occurrence and repeats at that
// occurrence's wall-clock time; a date exception is stored as the UTC instants it covers. Pure: no I/O, safe on both sides.

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** A day on a wall calendar, with no zone. Month is 1 to 12. */
export type CalendarDate = { year: number; month: number; day: number };
export type ZonedParts = CalendarDate & { weekday: Weekday; minutes: number };

export const MINUTES_PER_DAY = 1440;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/* ---------------- Calendar dates ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-03": the key a date is compared, sorted and sent by. */
export function dateKey(d: CalendarDate): string {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

export function parseDateKey(key: string): CalendarDate | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return undefined;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return dateKey(addDays(d, 0)) === key ? d : undefined; // rejects 2026-02-30
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function weekdayOf(d: CalendarDate): Weekday {
  return WEEKDAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()] ?? "sun";
}

/* ---------------- Zones ---------------- */

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** True when `timeZone` is an IANA zone this runtime knows. */
export function isTimeZone(timeZone: string): boolean {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** What the wall clock and calendar in `timeZone` show at `instant`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday").toLowerCase().slice(0, 3) as Weekday,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

/** The wall clock at `instant`, read as if it were UTC, in ms. */
function wallMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, 0, p.minutes);
}

/** The zone's offset from UTC at `instant`, in minutes (Chicago in winter: -360; Riyadh: 180). */
export function offsetMinutes(instant: Date, timeZone: string): number {
  const whole = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
  return Math.round((wallMs(new Date(whole), timeZone) - whole) / MINUTE_MS);
}

/**
 * The instant the wall clock in `timeZone` reads `minutes` past midnight on `date` (1440 is the next midnight). In the
 * spring-forward gap the time does not exist and the instant lands an hour later; in the repeated fall-back hour the first wins.
 */
export function zonedInstant(date: CalendarDate, minutes: number, timeZone: string): Date {
  const wall = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  const before = wall - offsetMinutes(new Date(wall - DAY_MS), timeZone) * MINUTE_MS;
  const after = wall - offsetMinutes(new Date(wall + DAY_MS), timeZone) * MINUTE_MS;
  const fits = (t: number) => wallMs(new Date(t), timeZone) === wall;
  if (fits(before) && fits(after)) return new Date(Math.min(before, after));
  return new Date(fits(after) ? after : before);
}

/** The first moment after `from`, within `days`, at which `timeZone` changes its offset; undefined for the Gulf zones. */
export function nextOffsetChange(timeZone: string, from: Date, days = 366): { at: Date; deltaMinutes: number } | undefined {
  const base = offsetMinutes(from, timeZone);
  for (let i = 1; i <= days; i++) {
    const t = from.getTime() + i * DAY_MS;
    const offset = offsetMinutes(new Date(t), timeZone);
    if (offset === base) continue;
    let lo = t - DAY_MS;
    let hi = t;
    while (hi - lo > MINUTE_MS) {
      const mid = Math.floor((lo + hi) / 2);
      if (offsetMinutes(new Date(mid), timeZone) === base) lo = mid;
      else hi = mid;
    }
    return { at: new Date(Math.floor(hi / MINUTE_MS) * MINUTE_MS), deltaMinutes: offset - base }; // changes fall on a whole minute
  }
  return undefined;
}

/**
 * An instant whose UTC clock reads `minutes` past midnight on a fixed day. Format it with timeZone "UTC" to label a wall-clock
 * time ("9:00 AM") with no zone arithmetic: the label of a rule, not of an instant. 1440 reads as the next midnight.
 */
export function wallClockInstant(minutes: number): Date {
  return new Date(Date.UTC(2000, 0, 2, 0, minutes));
}

/* ---------------- Schedule and slots ---------------- */

/** A range on the wall clock: minutes past midnight, end exclusive, end at most 1440. */
export type WallRange = { start: number; end: number };

/** A single date that departs from the weekly hours, in the schedule's zone. `date` is a dateKey. */
export type DateException = { kind: "off"; date: string } | { kind: "extra"; date: string; start: number; end: number };

export type Schedule = {
  timeZone: string;
  slotMinutes: number;
  week: Record<Weekday, WallRange[]>;
  exceptions: DateException[];
};

/** How many slots fit wholly inside a range. */
export function slotsInRange(range: WallRange, slotMinutes: number): number {
  return Math.max(0, Math.floor((range.end - range.start) / slotMinutes));
}

/**
 * Slot starts in [from, to), UTC, ascending. Weekly ranges repeat on the doctor's wall clock; a day off removes that date;
 * extra hours add to it. A slot must fit wholly inside its range. Anything before `notBefore` (now plus the lead time,
 * rule P8) is dropped. Holds and bookings are not subtracted here (tasks 3.2 and 3.3).
 */
export function generateSlots(s: Schedule, from: Date, to: Date, notBefore: Date = from): Date[] {
  const off = new Set(s.exceptions.filter((x) => x.kind === "off").map((x) => x.date));
  const extra = new Map<string, WallRange[]>();
  for (const x of s.exceptions) if (x.kind === "extra") extra.set(x.date, [...(extra.get(x.date) ?? []), x]);

  const out = new Map<number, Date>();
  const lastKey = dateKey(zonedParts(to, s.timeZone));
  for (let d: CalendarDate = zonedParts(from, s.timeZone); dateKey(d) <= lastKey; d = addDays(d, 1)) {
    const key = dateKey(d);
    if (off.has(key)) continue;
    for (const r of [...s.week[weekdayOf(d)], ...(extra.get(key) ?? [])]) {
      for (let m = r.start; m + s.slotMinutes <= r.end; m += s.slotMinutes) {
        const t = zonedInstant(d, m, s.timeZone);
        if (t >= from && t < to && t >= notBefore) out.set(t.getTime(), t);
      }
    }
  }
  return [...out.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** One calendar day in the viewer's zone and the slots that start on it. */
export type ViewerDay = { key: string; start: Date; weekday: Weekday; weekend: boolean; slots: Date[]; dayOff: boolean };

/**
 * The next `days` calendar days in the viewer's zone, today first, each with its slots and whether it is the weekend where
 * the viewer is (rule P7: from business.weekend, never hard-coded). `dayOff` marks a day that would have had times but for a
 * day-off exception, so a preview can say why it is empty.
 */
export function slotsByViewerDay(
  s: Schedule,
  viewer: { timeZone: string; weekend: readonly string[] },
  now: Date,
  days: number,
  leadTimeHours: number,
): ViewerDay[] {
  const today: CalendarDate = zonedParts(now, viewer.timeZone);
  const from = zonedInstant(today, 0, viewer.timeZone);
  const to = zonedInstant(addDays(today, days), 0, viewer.timeZone);
  const notBefore = new Date(now.getTime() + leadTimeHours * 60 * MINUTE_MS);
  const slots = generateSlots(s, from, to, notBefore);
  const withoutDaysOff = generateSlots({ ...s, exceptions: s.exceptions.filter((x) => x.kind !== "off") }, from, to, notBefore);

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    const start = zonedInstant(date, 0, viewer.timeZone);
    const end = zonedInstant(addDays(date, 1), 0, viewer.timeZone);
    const inDay = (t: Date) => t >= start && t < end;
    const weekday = weekdayOf(date);
    const own = slots.filter(inDay);
    return {
      key: dateKey(date),
      start,
      weekday,
      weekend: viewer.weekend.includes(weekday),
      slots: own,
      dayOff: own.length === 0 && withoutDaysOff.some(inDay),
    };
  });
}

/** Consecutive slots merged into the ranges they cover, as instants: the doctor's-time line under a preview day. */
export function slotRuns(slots: Date[], slotMinutes: number): Array<{ start: Date; end: Date }> {
  const runs: Array<{ start: Date; end: Date }> = [];
  const step = slotMinutes * MINUTE_MS;
  for (const s of slots) {
    const last = runs[runs.length - 1];
    if (last && last.end.getTime() === s.getTime()) last.end = new Date(s.getTime() + step);
    else runs.push({ start: s, end: new Date(s.getTime() + step) });
  }
  return runs;
}

/* ---------------- Storage: UTC instants plus the rule zone ---------------- */

/** A weekly rule as stored: its first occurrence, repeating every week at that occurrence's wall-clock time in the zone. */
export type StoredRule = { id: string; startsAtUtc: string; endsAtUtc: string };
/** A date exception as stored: the UTC instants it covers (a day off runs from midnight to midnight in the zone). */
export type StoredException = { id: string; kind: "off" | "extra"; startsAtUtc: string; endsAtUtc: string };

/** The weekday and wall-clock range a stored rule repeats on. */
export function ruleFromStored(rule: StoredRule, timeZone: string): { weekday: Weekday; range: WallRange } {
  const start = zonedParts(new Date(rule.startsAtUtc), timeZone);
  const end = zonedParts(new Date(rule.endsAtUtc), timeZone);
  const endMinutes = dateKey(end) > dateKey(start) ? MINUTES_PER_DAY + end.minutes : end.minutes;
  return { weekday: start.weekday, range: { start: start.minutes, end: Math.min(endMinutes, MINUTES_PER_DAY) } };
}

/** A weekly range stored as its first occurrence on or after `effectiveFrom` (a date in the zone). */
export function ruleToStored(id: string, weekday: Weekday, range: WallRange, timeZone: string, effectiveFrom: CalendarDate): StoredRule {
  let d = effectiveFrom;
  while (weekdayOf(d) !== weekday) d = addDays(d, 1);
  return {
    id,
    startsAtUtc: zonedInstant(d, range.start, timeZone).toISOString(),
    endsAtUtc: zonedInstant(d, range.end, timeZone).toISOString(),
  };
}

export function exceptionFromStored(x: StoredException, timeZone: string): DateException {
  const start = zonedParts(new Date(x.startsAtUtc), timeZone);
  if (x.kind === "off") return { kind: "off", date: dateKey(start) };
  const end = zonedParts(new Date(x.endsAtUtc), timeZone);
  const endMinutes = dateKey(end) > dateKey(start) ? MINUTES_PER_DAY : end.minutes;
  return { kind: "extra", date: dateKey(start), start: start.minutes, end: endMinutes };
}

export function exceptionToStored(id: string, x: DateException, timeZone: string): StoredException | undefined {
  const date = parseDateKey(x.date);
  if (!date) return undefined;
  const [start, end] = x.kind === "off" ? [0, MINUTES_PER_DAY] : [x.start, x.end];
  return {
    id,
    kind: x.kind,
    startsAtUtc: zonedInstant(date, start, timeZone).toISOString(),
    endsAtUtc: zonedInstant(date, end, timeZone).toISOString(),
  };
}
