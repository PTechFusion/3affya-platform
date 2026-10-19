// One-time code handling shared by the field (client) and the server action (the authority). Rule F6: one field, paste must
// work, so the field never truncates input; it keeps the digits. Arabic-Indic and Persian digits typed on an Arabic keyboard
// count as the same Western digits (rule N1), and spaces or dashes from a pasted "123 456" are dropped.
const ARABIC_INDIC = /[٠-٩]/g;
const PERSIAN = /[۰-۹]/g;

export function codeDigits(raw: string, length: number): string {
  return raw
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "")
    .slice(0, length);
}

export type CodeProblem = "empty" | "short";

export function checkCode(digits: string, length: number): CodeProblem | undefined {
  if (!digits) return "empty";
  if (digits.length < length) return "short";
  return undefined;
}

/** Prototype only: no code is sent, so any full code is accepted except all zeros, which shows the wrong-code message. */
export const prototypeWrongCode = (length: number) => "0".repeat(length);
