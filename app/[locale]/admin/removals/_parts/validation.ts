// The note an admin writes to the doctor (screen 41): the reason for a refusal, or the question when asking for more. Shared by
// the decision panel (checked on submit) and the server actions (never trust the client). Each failure is a specific code so the
// message names the fix (rule F5). Form limits, not business numbers.
export const REMOVAL_NOTE_LIMITS = { min: 20, max: 1000 } as const;

export type NoteErrorCode = "noteMissing" | "noteTooShort" | "noteTooLong";

export function validateNote(raw: unknown): NoteErrorCode | undefined {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "noteMissing";
  if (value.length < REMOVAL_NOTE_LIMITS.min) return "noteTooShort";
  if (value.length > REMOVAL_NOTE_LIMITS.max) return "noteTooLong";
  return undefined;
}
