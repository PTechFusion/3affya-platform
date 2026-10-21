// The design tokens an email needs, as literal values. Email clients do not read CSS custom properties, so the layout inlines
// these; each one is the value of the token it names in app/globals.css (@theme), and tests/unit/emails checks that they still
// match, so a token change cannot drift. No other colour, radius or font is used in an email.
import type { Locale } from "@/lib/format";

export const emailColors = {
  "sea-900": "#062f52",
  "sea-700": "#0b5a9c",
  "lagoon-900": "#065e78",
  "lagoon-600": "#0194be",
  "lagoon-100": "#ddf6fa",
  "gold-700": "#82590a",
  "gold-100": "#f8ebc4",
  "sand-50": "#f8f6f1",
  "sand-100": "#efebe2",
  "sand-200": "#e2dcce",
  "ink-900": "#14202e",
  "ink-700": "#34404e",
  "ink-500": "#5e6a77",
} as const;

/** White is not a token: it is Tailwind's bg-white, the card surface of every page. */
export const white = "#ffffff";

export const emailRadius = { card: "22px", field: "12px", tag: "999px" } as const;

/** --font-sans. Readex Pro shows where the reader has it (Apple Mail with it installed); Segoe UI and Tahoma carry Arabic well. */
export const emailFont = "'Readex Pro','Segoe UI',Tahoma,Arial,sans-serif";

/**
 * Type sizes from the site's scale (Tailwind text-sm, text-base, text-lg, text-2xl, text-3xl and the Arabic body size from
 * globals.css). Arabic is never under 16 px (rules E4, R5): its small size is 16 and its body 17.
 */
export function emailType(locale: Locale) {
  const ar = locale === "ar";
  return {
    body: ar ? "17px" : "16px",
    small: ar ? "16px" : "14px",
    lead: "18px",
    headline: "24px",
    display: "30px",
    lineHeight: ar ? "1.7" : "1.55",
  } as const;
}

export const dirFor = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");
export const startFor = (locale: Locale): "right" | "left" => (locale === "ar" ? "right" : "left");
export const endFor = (locale: Locale): "right" | "left" => (locale === "ar" ? "left" : "right");
