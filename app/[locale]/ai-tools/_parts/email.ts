// Email check for the launch-notice form, shared by the client (on blur, rule F4) and the server action (the authority).
// Each problem names the fix, never the word "invalid" (rule F5); copy is aiTools.notify.error.<problem>.
export type EmailProblem = "empty" | "spaces" | "noAt" | "noName" | "noDomain" | "noDot";

export function checkEmail(raw: string): EmailProblem | undefined {
  const value = raw.trim();
  if (!value) return "empty";
  if (/\s/.test(value)) return "spaces";
  const at = value.indexOf("@");
  if (at < 0) return "noAt";
  if (at === 0) return "noName";
  const domain = value.slice(at + 1);
  if (!domain || domain.includes("@")) return "noDomain";
  if (!/^[^.]+(\.[^.]+)+$/.test(domain)) return "noDot";
  return undefined;
}
