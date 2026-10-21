// Copy lookups for the e2e suite: the journeys find headings and buttons by the same message keys the pages render, so one
// test reads both locales and never hard-codes a string in either language.
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import doctors from "../../../data/sample/doctors.json";

export type Locale = "ar" | "en";
export const LOCALES: readonly Locale[] = ["ar", "en"];
export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

const MESSAGES: Record<Locale, unknown> = { ar, en };

/** The message at a dotted key, with {name} placeholders filled. Throws on a missing key, so a renamed key fails loudly. */
export function t(locale: Locale, key: string, values: Record<string, string | number> = {}): string {
  const found = key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
    MESSAGES[locale],
  );
  if (typeof found !== "string") throw new Error(`No message "${key}" in ${locale}`);
  return found.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** The words of a message before its first placeholder: enough to find "Suspend {name}?" without knowing the name's form. */
export function lead(locale: Locale, key: string): string {
  return t(locale, key).split("{")[0]!.trim();
}

type SampleDoctorName = { id: string; nameEn: string; nameAr: string };

/** A sample doctor's display name in the page language (data/sample/doctors.json). */
export function doctorName(locale: Locale, id: string): string {
  const d = (doctors as SampleDoctorName[]).find((x) => x.id === id);
  if (!d) throw new Error(`No sample doctor ${id}`);
  return locale === "ar" ? d.nameAr : d.nameEn;
}
