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

/** Time in the viewer's zone with the zone named, e.g. "6:00 PM Riyadh (GMT+3)". Rule P6. */
export function formatTimeInZone(instant: Date, timeZone: string, locale: Locale): string {
  const time = new Intl.DateTimeFormat(tag(locale), { timeZone, hour: "numeric", minute: "2-digit" }).format(instant);
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value ?? "";
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
  return `${time} ${city} (${zoneName})`;
}

/** Gregorian date, Western digits. Hijri display is optional and secondary (rule N3). */
export function formatDate(instant: Date, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone, day: "numeric", month: "short", year: "numeric" }).format(instant);
}

export function formatHijri(instant: Date, timeZone: string, locale: Locale): string {
  const base = locale === "ar" ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-US-u-ca-islamic-umalqura";
  return new Intl.DateTimeFormat(base, { timeZone, day: "numeric", month: "long", year: "numeric" }).format(instant);
}
