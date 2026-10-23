// Shared by the lib unit tests. Not a test file (no .test. in the name), so Vitest never collects it.

/** Arabic-Indic (U+0660..U+0669) and Persian (U+06F0..U+06F9) digits: rule N1 says neither ever appears in output. */
export const EASTERN_DIGITS = /[٠-٩۰-۹]/;

/** Every kind of space (plain, no-break U+00A0, narrow no-break U+202F, thin U+2009) as one plain space, for comparisons
 *  that are about the words and digits, not about which space ICU picked. */
export const spaces = (s: string) => s.replace(/[\s  ]/g, " ");

/** The digits of a formatted value, in order: proves "Western digits" without pinning ICU's separators. */
export const digitsOf = (s: string) => s.replace(/[^0-9]/g, "");

/** A fixed instant from an ISO string with an explicit zone. Tests never read the real clock. */
export const at = (iso: string) => {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(iso)) throw new Error(`at(): ${iso} needs a Z or an offset`);
  return new Date(iso);
};

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
