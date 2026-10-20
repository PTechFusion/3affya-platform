// Your details (screen 28): the rules shared by the form (on blur, rule F4) and the server action (the authority). Each problem
// is a specific code plus the numbers its message needs, so the copy names the sub-rule and the fix, never "invalid" (rule F5).
// Email goes through lib/email checkEmail, the one email check.
import { checkEmail, type EmailProblem } from "@/lib/email";

export const DETAILS_FIELDS = ["nameAr", "nameEn", "email", "phone"] as const;
export type DetailsField = (typeof DETAILS_FIELDS)[number];
export type DetailsInput = Record<DetailsField, string>;

export const DETAILS_LIMITS = { nameMin: 2, nameMax: 80, emailMax: 254, phoneMinDigits: 7, phoneMaxDigits: 15 } as const;

export type DetailsErrorCode =
  | "nameMissing"
  | "nameShort"
  | "nameLong"
  | "nameDigits"
  | "nameSymbols"
  | "nameNotArabic"
  | "nameNotLatin"
  | "emailMissing"
  | "emailLong"
  | "emailSpace"
  | "emailNoAt"
  | "emailManyAt"
  | "emailNoLocal"
  | "emailNoDomain"
  | "emailNoDot"
  | "phoneChars"
  | "phoneNoCode"
  | "phoneLength"
  | "phoneShort"
  | "phoneLong";

/** One field's problem. `phoneLength` carries the country, its dialling code and the digits expected and found. */
export type DetailsError = { code: DetailsErrorCode; country?: string; dialCode?: string; min?: number; max?: number; count?: number };
export type DetailsErrors = Partial<Record<DetailsField, DetailsError>>;

/** Server action result: the { ok, error } union every action returns (never throws across the client boundary). */
export type SaveDetailsResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: DetailsErrors }
  | { ok: false; error: "unavailable" };

const EMAIL_CODES: Record<EmailProblem, DetailsErrorCode> = {
  empty: "emailMissing",
  spaces: "emailSpace",
  noAt: "emailNoAt",
  manyAt: "emailManyAt",
  noName: "emailNoLocal",
  noDomain: "emailNoDomain",
  noDot: "emailNoDot",
};

const DIGITS = /[0-9٠-٩۰-۹]/;
const LATIN = /[A-Za-zÀ-ɏ]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
// Letters of each script plus the separators names use: spaces and hyphens; in Latin also apostrophes and full stops.
const ARABIC_NAME = /^[ء-غـ-ٰٟ-ۓەﭐ-﷿ﹰ-﻿ \-]+$/;
const LATIN_NAME = /^[A-Za-zÀ-ɏ '’.\-]+$/;
const NOT_LETTER = /[\s'’.\-ـً-ٟ]/g;

const tidy = (raw: string) => raw.trim().replace(/\s+/g, " ");

/** A name in one script. Empty is fine here; the pair rule (one of the two names) lives in checkDetails. */
export function checkName(raw: string, script: "ar" | "en"): DetailsError | undefined {
  const value = tidy(raw);
  if (!value) return undefined;
  if (value.length > DETAILS_LIMITS.nameMax) return { code: "nameLong", max: DETAILS_LIMITS.nameMax };
  if (DIGITS.test(value)) return { code: "nameDigits" };
  if (script === "ar" && LATIN.test(value)) return { code: "nameNotArabic" };
  if (script === "en" && ARABIC.test(value)) return { code: "nameNotLatin" };
  if (!(script === "ar" ? ARABIC_NAME : LATIN_NAME).test(value)) return { code: "nameSymbols" };
  if (value.replace(NOT_LETTER, "").length < DETAILS_LIMITS.nameMin) return { code: "nameShort", min: DETAILS_LIMITS.nameMin };
  return undefined;
}

export function checkDetailsEmail(raw: string): DetailsError | undefined {
  const problem = checkEmail(raw);
  if (problem) return { code: EMAIL_CODES[problem] };
  if (raw.trim().length > DETAILS_LIMITS.emailMax) return { code: "emailLong", max: DETAILS_LIMITS.emailMax };
  return undefined;
}

// Digits after the dialling code for the six Gulf countries (mobile and landline). Elsewhere only the E.164 bounds apply.
const GULF_PHONE: Array<{ dialCode: string; country: string; min: number; max: number }> = [
  { dialCode: "966", country: "SA", min: 9, max: 9 },
  { dialCode: "971", country: "AE", min: 8, max: 9 },
  { dialCode: "965", country: "KW", min: 8, max: 8 },
  { dialCode: "974", country: "QA", min: 8, max: 8 },
  { dialCode: "973", country: "BH", min: 8, max: 8 },
  { dialCode: "968", country: "OM", min: 8, max: 8 },
];

/** Arabic-Indic and Persian digits typed on an Arabic keyboard become Western digits (rule N1). */
const westernDigits = (raw: string) =>
  raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** The number as stored: "+966501234567" (E.164), or "" when the field is empty. Only call it on a number checkPhone passed. */
export function normalisePhone(raw: string): string {
  const compact = westernDigits(raw).replace(/[\s().\-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

/** The optional phone: empty is fine; otherwise international format, with a Gulf length check that names the country. */
export function checkPhone(raw: string): DetailsError | undefined {
  const value = westernDigits(raw).trim();
  if (!value) return undefined;
  if (/[^\d\s().+\-]/.test(value)) return { code: "phoneChars" };
  const compact = normalisePhone(value);
  if (!compact.startsWith("+")) return { code: "phoneNoCode" };
  const digits = compact.slice(1);
  if (!/^\d+$/.test(digits)) return { code: "phoneChars" };
  const gulf = GULF_PHONE.find((g) => digits.startsWith(g.dialCode));
  if (gulf) {
    const count = digits.length - gulf.dialCode.length;
    if (count < gulf.min || count > gulf.max)
      return { code: "phoneLength", country: gulf.country, dialCode: `+${gulf.dialCode}`, min: gulf.min, max: gulf.max, count };
    return undefined;
  }
  if (digits.length < DETAILS_LIMITS.phoneMinDigits) return { code: "phoneShort" };
  if (digits.length > DETAILS_LIMITS.phoneMaxDigits) return { code: "phoneLong", max: DETAILS_LIMITS.phoneMaxDigits };
  return undefined;
}

/** One field, given the whole form (the two names share the "at least one" rule). */
export function checkDetailsField(field: DetailsField, input: DetailsInput): DetailsError | undefined {
  switch (field) {
    case "nameAr":
    case "nameEn": {
      const own = checkName(input[field], field === "nameAr" ? "ar" : "en");
      if (own) return own;
      return !tidy(input.nameAr) && !tidy(input.nameEn) ? { code: "nameMissing" } : undefined;
    }
    case "email":
      return checkDetailsEmail(input.email);
    case "phone":
      return checkPhone(input.phone);
  }
}

/** The whole form. With both names empty the error sits on the Arabic field only, the first of the pair. */
export function checkDetails(input: DetailsInput): DetailsErrors {
  const errors: DetailsErrors = {};
  for (const field of DETAILS_FIELDS) {
    const problem = checkDetailsField(field, input);
    if (problem) errors[field] = problem;
  }
  if (errors.nameAr?.code === "nameMissing" && errors.nameEn?.code === "nameMissing") delete errors.nameEn;
  return errors;
}
