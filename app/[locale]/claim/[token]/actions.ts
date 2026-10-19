"use server";
// Claim flow server actions (screen 9). Prototype stubs: they re-check the token and the input (never trust the client) and
// return the { ok, error } union, but send nothing, store nothing and log nothing (the email is PII).
// Task 2.3 replaces them: tokens are looked up by hash; every attempt counts against business.inviteRateLimitPerIpPerHour per
// IP (stored in the database, so it holds across instances) and returns "limited" past it; the code goes out through Supabase
// Auth email OTP with an explicit timeout; a correct code marks the row claimed and the token used in one transaction.
// Every answer is the same whether or not an account already exists for the email (rule F6).
import { business } from "@/config/business";
import { inviteByToken } from "@/lib/sample";
import { checkEmail, type EmailProblem } from "@/lib/email";
import { checkCode, codeDigits, prototypeWrongCode, type CodeProblem } from "./_parts/code";

/** "link": the token is no longer valid (expired, used or forged since the page loaded). */
type Common = "link" | "limited" | "unavailable";

export type SendCodeResult = { ok: true } | { ok: false; error: EmailProblem | Common };
export type VerifyCodeResult = { ok: true } | { ok: false; error: CodeProblem | "wrong" | Common };
export type RequestLinkResult = { ok: true } | { ok: false; error: "limited" | "unavailable" };

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const tokenIsValid = (token: string) => inviteByToken(token)?.status === "valid";

export async function sendClaimCode(input: { token: unknown; email: unknown }): Promise<SendCodeResult> {
  if (!tokenIsValid(asText(input.token))) return { ok: false, error: "link" };
  const problem = checkEmail(asText(input.email));
  if (problem) return { ok: false, error: problem };
  return { ok: true };
}

export async function verifyClaimCode(input: { token: unknown; email: unknown; code: unknown }): Promise<VerifyCodeResult> {
  if (!tokenIsValid(asText(input.token))) return { ok: false, error: "link" };
  // A code is checked against the address it was sent to; a malformed address cannot match any code.
  if (checkEmail(asText(input.email))) return { ok: false, error: "wrong" };
  const digits = codeDigits(asText(input.code), business.otpDigits);
  const problem = checkCode(digits, business.otpDigits);
  if (problem) return { ok: false, error: problem };
  if (digits === prototypeWrongCode(business.otpDigits)) return { ok: false, error: "wrong" };
  return { ok: true };
}

/** A new invite goes to the address on file for the token's doctor. The answer never says whether that address exists. */
export async function requestNewInvite(input: { token: unknown }): Promise<RequestLinkResult> {
  void input;
  return { ok: true };
}
