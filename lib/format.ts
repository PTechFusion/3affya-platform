// Formatting helpers. Western digits in both locales (rule N1): ar-SA and ar-AE default to Arabic-Indic digits in CLDR,
// so every Intl call goes through here with the nu-latn extension.

export type Locale = "ar" | "en";

const tag = (locale: Locale) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-US");

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(tag(locale), options).format(value);
}

const THREE_DECIMAL = new Set(["KWD", "OMR", "BHD"]);

export function formatMoney(amountMinor: number, currency: string, locale: Locale): string {
  const fraction = THREE_DECIMAL.has(currency) ? 3 : 2;
  const amount = amountMinor / 10 ** fraction;
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency,
    currencyDisplay: "code",
    // Whole amounts drop the cents (USD 150); any other amount shows all of them (USD 0.30, never USD 0.3).
    minimumFractionDigits: fraction === 3 ? 3 : Number.isInteger(amount) ? 0 : fraction,
    maximumFractionDigits: fraction,
  }).format(amount);
}

/** Percentage with the sign placed per rule N2: "20%" in English, "٪20" in Arabic (sign before the digits, no space). */
export function formatPercent(pct: number, locale: Locale, maximumFractionDigits = 1): string {
  const n = formatNumber(pct, locale, { maximumFractionDigits });
  return locale === "ar" ? `\u066A${n}` : `${n}%`;
}

/** Time in the viewer's zone with the zone named, e.g. "6:00 PM Riyadh (GMT+3)". Rule P6. */
export function formatTimeInZone(instant: Date, timeZone: string, locale: Locale): string {
  const time = new Intl.DateTimeFormat(tag(locale), { timeZone, hour: "numeric", minute: "2-digit" })
    .format(instant)
    .replace(/ /g, " "); // "6:00 م" never splits from its marker
  // The zone never breaks across lines (zoneLabel uses no-break spaces). In Arabic it is also wrapped in a left-to-right isolate
  // (U+2066 ... U+2069, rule R3); without it the closing parenthesis of "(GMT+3)" joins the right-to-left run and is drawn
  // mirrored at the far end of the line.
  const zone = zoneLabel(instant, timeZone);
  return `${time} ${locale === "ar" ? `⁦${zone}⁩` : zone}`;
}

/** "Riyadh (GMT+3)": the city from the IANA id plus the offset at that instant. */
function zoneLabel(instant: Date, timeZone: string): string {
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value ?? "";
  const city = timeZone.split("/").pop()?.replace(/_/g, "\u00A0") ?? timeZone;
  // A real minus sign (U+2212) for negative offsets: browsers may break a line after a hyphen-minus, which split "GMT-" from "5)".
  // No-break spaces keep "Los Angeles (GMT−8)" on one line wherever it is used.
  return `${city}\u00A0(${zoneName.replace("-", "\u2212")})`;
}

/** Gregorian date, Western digits. Hijri display is optional and secondary (rule N3). */
export function formatDate(instant: Date, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone, day: "numeric", month: "short", year: "numeric" }).format(instant);
}

export function formatHijri(instant: Date, timeZone: string, locale: Locale): string {
  const base = locale === "ar" ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-US-u-ca-islamic-umalqura";
  return new Intl.DateTimeFormat(base, { timeZone, day: "numeric", month: "long", year: "numeric" }).format(instant);
}

/**
 * A time range in one zone with the zone named once (rule P6): { range: "9:00 AM – 9:00 PM", zone: "Riyadh (GMT+3)" }.
 * Two parts so the caller renders the range in the page direction and the Latin zone as its own LTR run (rule R3);
 * forcing the whole Arabic range LTR scrambles the ص / م markers.
 */
export function formatTimeRangeInZone(start: Date, end: Date, timeZone: string, locale: Locale): { range: string; zone: string } {
  const range = new Intl.DateTimeFormat(tag(locale), { timeZone, hour: "numeric", minute: "2-digit" }).formatRange(start, end);
  return { range, zone: zoneLabel(start, timeZone) };
}

/** The instant at which the wall clock in `timeZone` reads `hour`:00 on the calendar day `ref` falls on there. */
export function instantAtHourInZone(hour: number, timeZone: string, ref: Date = new Date()): Date {
  const wall = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  };
  const day = new Date(wall(ref));
  const guess = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour);
  return new Date(guess - (wall(new Date(guess)) - guess));
}

/** Weekday and date without the year, e.g. "Sun, Nov 15": the day line of a slot (profile preview, slot picker). */
export function formatSlotDay(instant: Date, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone, weekday: "short", day: "numeric", month: "short" }).format(instant);
}

/** Clock time only, e.g. "6:00 PM". Use it where the zone is named once for the group with formatZone (rule P6). */
export function formatTime(instant: Date, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone, hour: "numeric", minute: "2-digit" }).format(instant);
}

/** The zone named, e.g. "Riyadh (GMT+3)", at that instant (rule P6). Latin: render it as its own LTR run (rule R3). */
export function formatZone(instant: Date, timeZone: string): string {
  return zoneLabel(instant, timeZone);
}

/**
 * Clock times only, e.g. "9:00 AM – 12:00 PM", safe in client components and for ranges that end at midnight. Built from two
 * formatTime calls, not formatRange: formatRange prints both dates once the ends fall on different days, and its spacing
 * differs between Node and Chromium (U+2009 and U+202F against plain spaces), which fails hydration. Each time stays on one
 * line; the line may break after the dash. Name the zone once beside the group with formatZone (rule P6). With timeZone "UTC"
 * and lib/slots wallClockInstant it labels a wall-clock rule rather than an instant.
 */
export function formatClockRange(start: Date, end: Date, timeZone: string, locale: Locale): string {
  const one = (instant: Date) => formatTime(instant, timeZone, locale).replace(/\s/g, " ");
  return `${one(start)} – ${one(end)}`;
}
