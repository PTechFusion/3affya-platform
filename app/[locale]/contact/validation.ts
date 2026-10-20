import { checkEmail, type EmailProblem } from "@/lib/email";
// Contact form rules, shared by the client (validate on blur, rule F4) and the server action (never trust the client).
// Each failure is a specific code so the message can name the sub-rule and the fix (rules F5, L4); never "invalid".

export const CONTACT_LIMITS = { nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 2000 } as const;

export const CONTACT_FIELDS = ["name", "email", "message"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactInput = Record<ContactField, string>;

export type ContactErrorCode =
  | "nameMissing"
  | "nameTooLong"
  | "emailMissing"
  | "emailTooLong"
  | "emailSpace"
  | "emailNoAt"
  | "emailManyAt"
  | "emailNoLocal"
  | "emailNoDomain"
  | "emailNoDot"
  | "messageMissing"
  | "messageTooShort"
  | "messageTooLong";

export type ContactErrors = Partial<Record<ContactField, ContactErrorCode>>;

/** Server action result: the { ok, error } union every action returns (never throws across the client boundary). */
export type ContactResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: ContactErrors }
  | { ok: false; error: "unavailable" };

const EMAIL_CODES: Record<EmailProblem, ContactErrorCode> = {
  empty: "emailMissing",
  spaces: "emailSpace",
  noAt: "emailNoAt",
  manyAt: "emailManyAt",
  noName: "emailNoLocal",
  noDomain: "emailNoDomain",
  noDot: "emailNoDot",
};

export function validateField(field: ContactField, raw: string): ContactErrorCode | undefined {
  const value = raw.trim();
  if (field === "name") {
    if (!value) return "nameMissing";
    if (value.length > CONTACT_LIMITS.nameMax) return "nameTooLong";
    return undefined;
  }
  if (field === "email") {
    if (!value) return "emailMissing";
    if (value.length > CONTACT_LIMITS.emailMax) return "emailTooLong";
    const problem = checkEmail(value);
    return problem ? EMAIL_CODES[problem] : undefined;
  }
  if (!value) return "messageMissing";
  if (value.length < CONTACT_LIMITS.messageMin) return "messageTooShort";
  if (value.length > CONTACT_LIMITS.messageMax) return "messageTooLong";
  return undefined;
}

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of CONTACT_FIELDS) {
    const code = validateField(field, input[field]);
    if (code) errors[field] = code;
  }
  return errors;
}
