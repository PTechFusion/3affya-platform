// The picker's weeks, built on the server (rule P6): days are calendar days in the patient's zone, recomputed on every request
// from UTC instants, so a London viewer's week across the 25 Oct clock change and a Chicago doctor's change on 1 Nov both come
// out right. Every label is formatted here through lib/format (Western digits, N1) and handed to the client as text, so the
// client never formats a date and cannot disagree with the server at hydration.
import { formatNumber, formatSlotDay, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { addDays, dateKey, zonedInstant, zonedParts, weekdayOf, type CalendarDate, type Weekday } from "@/lib/slots";
import { slotParam } from "./booking";

export type SlotView = {
  /** The URL form of the instant, UTC. */
  iso: string;
  time: string;
  /** Day, time and zone in words, for screen readers. */
  label: string;
  /** The doctor's clock time, the short line on the chosen slot. */
  doctorTime: string;
  /** The doctor's day, time and zone, the line under the grid. */
  doctorLine: string;
  /** Day and time for the Continue bar. */
  summary: string;
};

export type DayView = {
  key: string;
  weekday: Weekday;
  short: string;
  number: string;
  label: string;
  /** The patient's zone named at this date (it changes across a DST date for a viewer outside the Gulf). */
  zone: string;
  weekend: boolean;
  slots: SlotView[];
};

export type WeekView = { label: string; days: DayView[]; slotCount: number };

type Translate = (key: string, values?: Record<string, string | number>) => string;

const DAY_MS = 86_400_000;
const daysBetween = (a: CalendarDate, b: CalendarDate) =>
  Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS);

/** Rolling weeks from today in the patient's zone, as many as reach the last open time (at least one, at most `maxWeeks`). */
export function buildWeeks(opts: {
  slots: Date[];
  now: Date;
  timeZone: string;
  weekend: readonly string[];
  doctorTimeZone: string;
  locale: Locale;
  maxWeeks: number;
  t: Translate;
}): WeekView[] {
  const { slots, now, timeZone: tz, weekend, doctorTimeZone: dtz, locale: loc, t } = opts;
  const today = zonedParts(now, tz);
  const last = slots[slots.length - 1];
  const daysToLast = last ? daysBetween(today, zonedParts(last, tz)) : 0;
  const weekCount = Math.min(opts.maxWeeks, Math.max(1, Math.floor(daysToLast / 7) + 1));

  const weeks: WeekView[] = [];
  for (let w = 0; w < weekCount; w++) {
    const days: DayView[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, w * 7 + i);
      const start = zonedInstant(date, 0, tz);
      const end = zonedInstant(addDays(date, 1), 0, tz);
      const midday = zonedInstant(date, 12 * 60, tz);
      const weekday = weekdayOf(date);
      const label = formatSlotDay(midday, tz, loc);
      const own = slots.filter((s) => s >= start && s < end);
      days.push({
        key: dateKey(date),
        weekday,
        short: t(`weekdaysShort.${weekday}`),
        number: formatNumber(date.day, loc),
        label,
        zone: formatZone(own[0] ?? midday, tz),
        weekend: weekend.includes(weekday),
        slots: own.map((s) => {
          const time = formatTime(s, tz, loc);
          return {
            iso: slotParam(s),
            time,
            label: t("calendar.slotLabel", { day: label, time, zone: formatZone(s, tz) }),
            doctorTime: formatTime(s, dtz, loc),
            doctorLine: t("calendar.doctorTime", { day: formatSlotDay(s, dtz, loc), time: formatTimeInZone(s, dtz, loc) }),
            summary: t("summary.selected", { day: label, time }),
          };
        }),
      });
    }
    const first = days[0];
    const lastDay = days[days.length - 1];
    weeks.push({
      label: first && lastDay ? t("calendar.weekLabel", { from: first.label, to: lastDay.label }) : "",
      days,
      slotCount: days.reduce((n, d) => n + d.slots.length, 0),
    });
  }
  return weeks;
}

/** Index of the week holding this instant, or -1. */
export function weekOf(weeks: WeekView[], iso: string | undefined): number {
  if (!iso) return -1;
  return weeks.findIndex((w) => w.days.some((d) => d.slots.some((s) => s.iso === iso)));
}
