// Number helpers shared by the records screens. Everything goes through lib/format (Western digits in both locales, rule N1).
import { formatNumber, type Locale } from "@/lib/format";
import { BYTES_PER_MB } from "@/lib/records";

/** "4.7" for a size in MB, one decimal. A file with anything in it shows at least 0.1, so a small Word file does not read as 0. */
export function sizeMb(bytes: number, locale: Locale): string {
  return formatNumber(bytes > 0 ? Math.max(0.1, bytes / BYTES_PER_MB) : 0, locale, { maximumFractionDigits: 1 });
}

/**
 * A file name placed inside a sentence, wrapped in a first-strong isolate (U+2068 ... U+2069, rule R3), so "lab-results.pdf"
 * keeps its own direction in Arabic and the punctuation after it stays on the right side.
 */
export function isolate(name: string): string {
  return `⁨${name}⁩`;
}

/** ICU plural arguments: `count` picks the form, `label` is the number written with Western digits. */
export function counted(n: number, locale: Locale): { count: number; label: string } {
  return { count: n, label: formatNumber(n, locale) };
}
