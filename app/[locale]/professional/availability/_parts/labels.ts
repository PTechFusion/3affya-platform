// Labels the editor's parts share: copy, wall-clock times, dates on the doctor's calendar and zone names, all through
// lib/format (Western digits, rule N1; Gregorian, N3). Wall-clock rules are labelled with lib/slots wallClockInstant in "UTC":
// they are clock readings, not instants. Latin zone names inside Arabic copy are isolated so "(GMT-5)" keeps its order (R3).
import { useLocale, useTranslations } from "next-intl";
import { formatClockRange, formatNumber, formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";
import { parseDateKey, wallClockInstant, zonedInstant, type WallRange, type Weekday } from "@/lib/slots";

export function useLabels(now: Date) {
  const t = useTranslations("availability");
  const loc = useLocale() as Locale;
  const isolate = (s: string) => (loc === "ar" ? `⁦${s}⁩` : s);
  return {
    t,
    loc,
    isolate,
    clock: (minutes: number) => formatTime(wallClockInstant(minutes), "UTC", loc),
    range: (r: WallRange) => formatClockRange(wallClockInstant(r.start), wallClockInstant(r.end), "UTC", loc),
    day: (d: Weekday) => t(`days.${d}`),
    /** A dateKey on the doctor's calendar, e.g. "Thu, Oct 22", read at midday there so no zone edge can move it. */
    date: (key: string, timeZone: string) => {
      const d = parseDateKey(key);
      return d ? formatSlotDay(zonedInstant(d, 12 * 60, timeZone), timeZone, loc) : key;
    },
    /** "Chicago (GMT-5)" now. */
    zone: (timeZone: string) => formatZone(now, timeZone),
    /** "Chicago", "Los Angeles": the city in an IANA zone id, Latin as formatZone prints it. */
    city: (timeZone: string) => timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone,
    count: (n: number) => formatNumber(n, loc),
    slots: (n: number) => t("grid.slots", { count: n, countLabel: formatNumber(n, loc) }),
    minutes: (n: number) => t("settings.minutes", { minutes: n, minutesLabel: formatNumber(n, loc) }),
    hours: (n: number) => t("notice.hours", { hours: n, hoursLabel: formatNumber(n, loc) }),
  };
}

export type Labels = ReturnType<typeof useLabels>;
