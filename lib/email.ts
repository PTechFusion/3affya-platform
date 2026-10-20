// The one email check, shared by every form (contact, launch notice, claim, this-is-me, sign-in) on the client (on blur,
// rule F4) and in the server action (the authority). Each problem names the fix, never the word "invalid" (rule F5); the
// page maps the code to its own copy.
export type EmailProblem = "empty" | "spaces" | "noAt" | "manyAt" | "noName" | "noDomain" | "noDot";

export function checkEmail(raw: string): EmailProblem | undefined {
  const value = raw.trim();
  if (!value) return "empty";
  if (/\s/.test(value)) return "spaces";
  const parts = value.split("@");
  if (parts.length === 1) return "noAt";
  if (parts.length > 2) return "manyAt";
  const [local = "", domain = ""] = parts;
  if (!local) return "noName";
  if (!domain) return "noDomain";
  if (!/^[^.]+(\.[^.]+)+$/.test(domain)) return "noDot";
  return undefined;
}
