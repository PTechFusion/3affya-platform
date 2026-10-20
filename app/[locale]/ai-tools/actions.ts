"use server";
// Launch-notice sign-up for the AI tools page. Prototype stub: validates and returns, stores nothing and logs nothing (the
// address is PII). The real version writes to a launch-notice table with RLS and sends through Resend once the schema lands.
import { checkEmail, type EmailProblem } from "./_parts/email";

export type LaunchNoticeResult = { ok: true } | { ok: false; error: EmailProblem | "unavailable" };

export async function requestLaunchNotice(_prev: LaunchNoticeResult | null, formData: FormData): Promise<LaunchNoticeResult> {
  const email = formData.get("email");
  const problem = checkEmail(typeof email === "string" ? email : "");
  if (problem) return { ok: false, error: problem };
  return { ok: true };
}
