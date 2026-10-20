// This is me / remove me rules (screen 10), shared by the client (validate on blur, rule F4) and the server action (never
// trust the client). Each failure is a specific code so the message names the sub-rule and the fix (rules F5, L4); never
// "invalid". The email rule is the contact form's (one email validator, not a third).
import { CONTACT_LIMITS, validateField as validateContactField, type ContactErrorCode } from "@/app/[locale]/contact/validation";

export const INTENTS = ["claim", "remove"] as const;
export type Intent = (typeof INTENTS)[number];
export const isIntent = (value: unknown): value is Intent => value === "claim" || value === "remove";

/** Removal reasons, in the order the select lists them. The admin queue (screen 41) can group requests by these. */
export const REMOVAL_REASONS = ["notListed", "notPractising", "wrongDetails", "other"] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number];

/** An NPI is a 10-digit US federal identifier that starts with 1 or 2 (CMS NPPES). A format fact, not a business number. */
export const NPI_DIGITS = 10;
export const THIS_IS_ME_LIMITS = { nameMax: 100, emailMax: CONTACT_LIMITS.emailMax, detailsMax: 1000 } as const;

export const THIS_IS_ME_FIELDS = ["name", "npi", "email", "reason", "details"] as const;
export type ThisIsMeField = (typeof THIS_IS_ME_FIELDS)[number];
export type ThisIsMeInput = Record<ThisIsMeField, string>;

type EmailErrorCode = Extract<ContactErrorCode, `email${string}`>;
export type ThisIsMeErrorCode =
  | "intentMissing"
  | "nameMissing"
  | "nameTooLong"
  | "npiMissing"
  | "npiNotDigits"
  | "npiLength"
  | "npiStart"
  | "npiMismatch"
  | EmailErrorCode
  | "reasonMissing"
  | "detailsTooLong";

export type ThisIsMeErrors = Partial<Record<ThisIsMeField | "intent", ThisIsMeErrorCode>>;

/**
 * Server action result: the { ok, error } union every action returns (never throws across the client boundary).
 * `profileUnavailable`: the profile is unknown, already claimed, or already taken down by the time the request arrives.
 */
export type ThisIsMeResult =
  | { ok: true; intent: Intent }
  | { ok: false; error: "validation"; fields: ThisIsMeErrors }
  | { ok: false; error: "profileUnavailable" }
  | { ok: false; error: "unavailable" };

/** Spaces and hyphens are formatting people copy from a letter or a badge; accept them and compare digits only. */
export const normaliseNpi = (raw: string) => raw.replace(/[\s-]/g, "");

export function validateField(field: ThisIsMeField, raw: string, intent: Intent | undefined, reason = ""): ThisIsMeErrorCode | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      if (!value) return "nameMissing";
      if (value.length > THIS_IS_ME_LIMITS.nameMax) return "nameTooLong";
      return undefined;
    case "npi": {
      const npi = normaliseNpi(value);
      if (!npi) return "npiMissing";
      if (!/^\d+$/.test(npi)) return "npiNotDigits";
      if (npi.length !== NPI_DIGITS) return "npiLength";
      if (npi[0] !== "1" && npi[0] !== "2") return "npiStart";
      return undefined;
    }
    case "email":
      return validateContactField("email", value) as EmailErrorCode | undefined;
    case "reason":
      if (intent !== "remove") return undefined;
      return (REMOVAL_REASONS as readonly string[]).includes(value) ? undefined : "reasonMissing";
    case "details":
      // Optional, and only asked for when the reason is "other" (rule F2: rarely used fields stay hidden).
      if (intent !== "remove" || reason !== "other") return undefined;
      return value.length > THIS_IS_ME_LIMITS.detailsMax ? "detailsTooLong" : undefined;
  }
}

export function validateThisIsMe(intent: Intent | undefined, input: ThisIsMeInput): ThisIsMeErrors {
  const errors: ThisIsMeErrors = {};
  if (!intent) errors.intent = "intentMissing";
  for (const field of THIS_IS_ME_FIELDS) {
    const code = validateField(field, input[field], intent, input.reason);
    if (code) errors[field] = code;
  }
  return errors;
}
