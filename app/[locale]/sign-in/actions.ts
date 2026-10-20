"use server";
// Patient sign-in server actions (screen 18). Prototype stubs: they re-check the input (never trust the client) and return the
// { ok, error } union, but send nothing, store nothing, log nothing (the email is PII) and create no session.
// Task 3.6 replaces them: the code goes out through Supabase Auth email OTP (signInWithOtp, shouldCreateUser) with an explicit
// timeout; each send and each wrong code counts against signInLimits per address and per IP in the database, and past a limit
// the action returns "limited" with the instant a new code may be asked for. Every answer is the same whether or not an account
// already exists for the address (rule F6), which is why one form serves both sign-up and sign-in.
import { business } from "@/config/business";
import { checkEmail, type EmailProblem } from "@/lib/email";
import { checkCode, codeDigits, prototypeWrongCode, type CodeProblem } from "@/lib/otp";
import { safeNext } from "./_parts/next";

/** Past a limit: the instant (UTC) from which a new code may be asked for. */
export type LimitedResult = { ok: false; error: "limited"; retryAtUtc: string };

export type SendCodeResult = { ok: true } | { ok: false; error: EmailProblem | "unavailable" } | LimitedResult;
export type VerifyCodeResult =
  | { ok: true; next: string }
  | { ok: false; error: CodeProblem | "wrong" | "expired" | "unavailable" }
  | LimitedResult;

const asText = (v: unknown) => (typeof v === "string" ? v : "");

export async function sendSignInCode(input: { email: unknown }): Promise<SendCodeResult> {
  const problem = checkEmail(asText(input.email));
  if (problem) return { ok: false, error: problem };
  return { ok: true };
}

export async function verifySignInCode(input: { email: unknown; code: unknown; next: unknown }): Promise<VerifyCodeResult> {
  // A code is checked against the address it was sent to; a malformed address cannot match any code.
  if (checkEmail(asText(input.email))) return { ok: false, error: "wrong" };
  const digits = codeDigits(asText(input.code), business.otpDigits);
  const problem = checkCode(digits, business.otpDigits);
  if (problem) return { ok: false, error: problem };
  if (digits === prototypeWrongCode(business.otpDigits)) return { ok: false, error: "wrong" };
  // The destination is decided here, not by the client: only same-site portal and booking paths (no open redirect).
  return { ok: true, next: safeNext(input.next) };
}
