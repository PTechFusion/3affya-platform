// Second-factor code handling for admin sign-in, shared by the card (client) and the server actions (the authority).
// Authenticator codes reuse lib/otp (one field, digits kept, Arabic-Indic digits read as Western, spaces and dashes dropped;
// rules F6, N1). Recovery codes are letters and numbers: the same normalising, plus lower case read as upper case, so a pasted
// "k7qm4 x2w9p" or "K7QM4-X2W9P" both count (rule W4: paste must work, never truncated). Each problem names the fix (rule F5).
import { adminSignIn } from "@/config/business";

const ARABIC_INDIC = /[٠-٩]/g;
const PERSIAN = /[۰-۹]/g;
const GROUP = 5;

/** The recovery code as typed, with the separators people paste (spaces, dashes, dots) removed and letters upper-cased. */
export function recoveryChars(raw: string): string {
  return raw
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-‐-―.·_]/g, "")
    .toUpperCase();
}

export type RecoveryProblem = "empty" | "chars" | "length";

export function checkRecoveryCode(chars: string, length: number = adminSignIn.recoveryCodeChars): RecoveryProblem | undefined {
  if (!chars) return "empty";
  if (!/^[A-Z0-9]+$/.test(chars)) return "chars";
  if (chars.length !== length) return "length";
  return undefined;
}

/** "K7QM4-X2W9P": a code shown the way the setup screen prints it, in groups of five. */
export function groupRecoveryCode(chars: string): string {
  return chars.match(new RegExp(`.{1,${GROUP}}`, "g"))?.join("-") ?? chars;
}

/** A made-up code of the configured length for the field hint (never a real one). */
export const recoveryExample = groupRecoveryCode("K7QM4X2W9PH3TB5R8NJC".slice(0, adminSignIn.recoveryCodeChars));

/** Prototype only: no factor is checked, so any well-formed code passes except all zeros, which shows the refused state. */
export const prototypeWrongRecovery = "0".repeat(adminSignIn.recoveryCodeChars);
