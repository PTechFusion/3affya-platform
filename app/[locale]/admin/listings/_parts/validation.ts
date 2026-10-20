// Field rules for the listings drawer (screen 39). Pure and client-safe: the drawer checks on blur (rule F4) and the server
// actions check again, so both name the same sub-rule (rule F5).

export const LISTING_LIMITS = { nameArMax: 80, reasonMin: 10, reasonMax: 500 } as const;

export type NameArError = "required" | "notArabic" | "tooLong";
export type ReasonError = "required" | "tooShort" | "tooLong";

const ARABIC_LETTER = /[ء-ي]/;
const LATIN_LETTER = /[A-Za-z]/;

/** The name as patients read it in Arabic: Arabic letters, no Latin letters, at most nameArMax characters. */
export function checkNameAr(value: string): NameArError | null {
  const v = value.trim();
  if (!v) return "required";
  if (v.length > LISTING_LIMITS.nameArMax) return "tooLong";
  if (!ARABIC_LETTER.test(v) || LATIN_LETTER.test(v)) return "notArabic";
  return null;
}

/** The suspension reason kept in the audit log. */
export function checkReason(value: string): ReasonError | null {
  const v = value.trim();
  if (!v) return "required";
  if (v.length < LISTING_LIMITS.reasonMin) return "tooShort";
  if (v.length > LISTING_LIMITS.reasonMax) return "tooLong";
  return null;
}
