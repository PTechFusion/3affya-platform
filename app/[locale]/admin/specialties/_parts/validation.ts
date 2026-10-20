// Specialty editor (screen 40): the rules shared by the sheet (checked on blur, rule F4) and the server action (the authority).
// Each problem is a specific code plus what its message needs (the value at fault, the other specialty, a suggested fix), so the
// copy names the sub-rule and the fix, never "invalid" (rule F5). Lists (search words, codes) are typed comma-separated; an
// Arabic comma works too. No JSON imports here, so the client sheet can use it.

export const SPECIALTY_FIELDS = ["nameAr", "nameEn", "slug", "systemId", "synonymsAr", "synonymsEn", "codes"] as const;
export type SpecialtyField = (typeof SPECIALTY_FIELDS)[number];
/** What the sheet holds: every field as typed. */
export type SpecialtyInput = Record<SpecialtyField, string>;

/** A specialty as stored: names tidied, codes upper-cased, lists split. */
export type SpecialtyValues = {
  nameAr: string;
  nameEn: string;
  slug: string;
  systemId: string;
  synonymsAr: string[];
  synonymsEn: string[];
  taxonomyCodes: string[];
};

/** The other specialties a new value must not clash with, and the body systems a specialty can sit under. */
export type SpecialtyContext = {
  others: Array<{ slug: string; nameAr: string; nameEn: string; taxonomyCodes: string[] }>;
  systemIds: string[];
  /** Editing: the slug is fixed once a specialty exists, so links such as /search?specialty= keep working. */
  slugFixed: boolean;
};

export const SPECIALTY_LIMITS = { nameMax: 60, slugMax: 40, termMax: 40, termsMax: 30, codesMax: 12, codeLength: 10 } as const;

export type SpecialtyErrorCode =
  | "nameArMissing"
  | "nameArLatin"
  | "nameArLong"
  | "nameArTaken"
  | "nameEnMissing"
  | "nameEnArabic"
  | "nameEnLong"
  | "nameEnTaken"
  | "slugMissing"
  | "slugChars"
  | "slugEdges"
  | "slugDoubleHyphen"
  | "slugLong"
  | "slugTaken"
  | "systemMissing"
  | "systemUnknown"
  | "termLatin"
  | "termArabic"
  | "termLong"
  | "termRepeated"
  | "termsMany"
  | "codeLength"
  | "codeChars"
  | "codeEnd"
  | "codeRepeated"
  | "codeTaken"
  | "codesMany";

/** One field's problem. `value` is the item at fault, `other` the specialty that already has it (both names, so the copy can
 *  pick the page language), `suggestion` a fix the copy can offer, `count` and `max` the numbers in the message. */
export type SpecialtyError = {
  code: SpecialtyErrorCode;
  value?: string;
  other?: { nameAr: string; nameEn: string };
  suggestion?: string;
  count?: number;
  max?: number;
};
export type SpecialtyErrors = Partial<Record<SpecialtyField, SpecialtyError>>;

const LATIN = /[A-Za-z]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const tidy = (raw: string) => raw.trim().replace(/\s+/g, " ");
/** Compare names and words without case, Arabic diacritics or tatweel, so "Cardiology" and "cardiology " clash. */
const fold = (raw: string) =>
  tidy(raw)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "");

/** A comma-separated list as items: commas (Latin or Arabic) and line breaks separate, blanks are dropped. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[,،\n]/)
    .map(tidy)
    .filter(Boolean);
}

/** A list back into the text the sheet shows: the Arabic comma between Arabic words, a Latin comma otherwise. */
export function joinList(items: string[], script: "ar" | "latin"): string {
  return items.join(script === "ar" ? "، " : ", ");
}

/** A slug from free text: lowercase a to z and digits, words joined by one hyphen. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SPECIALTY_LIMITS.slugMax)
    .replace(/-+$/g, "");
}

function checkName(raw: string, script: "ar" | "en", ctx: SpecialtyContext): SpecialtyError | undefined {
  const value = tidy(raw);
  const ar = script === "ar";
  if (!value) return { code: ar ? "nameArMissing" : "nameEnMissing" };
  if (ar && LATIN.test(value)) return { code: "nameArLatin" };
  if (!ar && ARABIC.test(value)) return { code: "nameEnArabic" };
  if (value.length > SPECIALTY_LIMITS.nameMax) return { code: ar ? "nameArLong" : "nameEnLong", max: SPECIALTY_LIMITS.nameMax };
  const clash = ctx.others.find((o) => fold(ar ? o.nameAr : o.nameEn) === fold(value));
  if (clash) return { code: ar ? "nameArTaken" : "nameEnTaken", other: clash };
  return undefined;
}

function checkSlug(raw: string, input: SpecialtyInput, ctx: SpecialtyContext): SpecialtyError | undefined {
  if (ctx.slugFixed) return undefined;
  const value = raw.trim();
  const suggestion = slugify(value) || slugify(input.nameEn);
  if (!value) return { code: "slugMissing", suggestion: slugify(input.nameEn) || undefined };
  if (/[^a-z0-9-]/.test(value)) return { code: "slugChars", suggestion };
  if (/^-|-$/.test(value)) return { code: "slugEdges", suggestion };
  if (value.includes("--")) return { code: "slugDoubleHyphen", suggestion };
  if (value.length > SPECIALTY_LIMITS.slugMax) return { code: "slugLong", max: SPECIALTY_LIMITS.slugMax, count: value.length };
  const clash = ctx.others.find((o) => o.slug === value);
  if (clash) return { code: "slugTaken", other: clash };
  return undefined;
}

function checkSystem(raw: string, ctx: SpecialtyContext): SpecialtyError | undefined {
  if (!raw) return { code: "systemMissing" };
  if (!ctx.systemIds.includes(raw)) return { code: "systemUnknown" };
  return undefined;
}

/** Search words in one script. Empty is fine: a new specialty can go live with its names only. */
function checkTerms(raw: string, script: "ar" | "latin"): SpecialtyError | undefined {
  const items = splitList(raw);
  const seen = new Set<string>();
  for (const item of items) {
    if (script === "ar" && LATIN.test(item)) return { code: "termLatin", value: item };
    if (script === "latin" && ARABIC.test(item)) return { code: "termArabic", value: item };
    if (item.length > SPECIALTY_LIMITS.termMax) return { code: "termLong", value: item, max: SPECIALTY_LIMITS.termMax };
    const key = fold(item);
    if (seen.has(key)) return { code: "termRepeated", value: item };
    seen.add(key);
  }
  if (items.length > SPECIALTY_LIMITS.termsMax) return { code: "termsMany", max: SPECIALTY_LIMITS.termsMax, count: items.length };
  return undefined;
}

/** NPPES taxonomy codes: 10 letters and digits ending in X (207RC0000X), each mapped to one specialty only. Empty is fine. */
function checkCodes(raw: string, ctx: SpecialtyContext): SpecialtyError | undefined {
  const items = splitList(raw).map((c) => c.toUpperCase());
  const seen = new Set<string>();
  for (const code of items) {
    if (/[^0-9A-Z]/.test(code)) return { code: "codeChars", value: code };
    if (code.length !== SPECIALTY_LIMITS.codeLength) return { code: "codeLength", value: code, count: code.length, max: SPECIALTY_LIMITS.codeLength };
    if (!code.endsWith("X")) return { code: "codeEnd", value: code };
    if (seen.has(code)) return { code: "codeRepeated", value: code };
    seen.add(code);
    const clash = ctx.others.find((o) => o.taxonomyCodes.includes(code));
    if (clash) return { code: "codeTaken", value: code, other: clash };
  }
  if (items.length > SPECIALTY_LIMITS.codesMax) return { code: "codesMany", max: SPECIALTY_LIMITS.codesMax, count: items.length };
  return undefined;
}

/** One field's check, for blur and for the re-check on each keystroke while an error shows. */
export function checkSpecialtyField(field: SpecialtyField, input: SpecialtyInput, ctx: SpecialtyContext): SpecialtyError | undefined {
  switch (field) {
    case "nameAr":
      return checkName(input.nameAr, "ar", ctx);
    case "nameEn":
      return checkName(input.nameEn, "en", ctx);
    case "slug":
      return checkSlug(input.slug, input, ctx);
    case "systemId":
      return checkSystem(input.systemId, ctx);
    case "synonymsAr":
      return checkTerms(input.synonymsAr, "ar");
    case "synonymsEn":
      return checkTerms(input.synonymsEn, "latin");
    case "codes":
      return checkCodes(input.codes, ctx);
  }
}

/** Every field at once (on save). Returns the stored shape when nothing is wrong. */
export function checkSpecialty(
  input: SpecialtyInput,
  ctx: SpecialtyContext,
): { ok: true; values: SpecialtyValues } | { ok: false; errors: SpecialtyErrors } {
  const errors: SpecialtyErrors = {};
  for (const field of SPECIALTY_FIELDS) {
    const problem = checkSpecialtyField(field, input, ctx);
    if (problem) errors[field] = problem;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    values: {
      nameAr: tidy(input.nameAr),
      nameEn: tidy(input.nameEn),
      slug: input.slug.trim(),
      systemId: input.systemId,
      synonymsAr: splitList(input.synonymsAr),
      synonymsEn: splitList(input.synonymsEn),
      taxonomyCodes: splitList(input.codes).map((c) => c.toUpperCase()),
    },
  };
}

/** A stored specialty back into the sheet's fields. */
export function toSpecialtyInput(v: SpecialtyValues): SpecialtyInput {
  return {
    nameAr: v.nameAr,
    nameEn: v.nameEn,
    slug: v.slug,
    systemId: v.systemId,
    synonymsAr: joinList(v.synonymsAr, "ar"),
    synonymsEn: joinList(v.synonymsEn, "latin"),
    codes: joinList(v.taxonomyCodes, "latin"),
  };
}

export const EMPTY_SPECIALTY_INPUT: SpecialtyInput = { nameAr: "", nameEn: "", slug: "", systemId: "", synonymsAr: "", synonymsEn: "", codes: "" };
