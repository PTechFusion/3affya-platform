"use server";
// Admin sign-in server actions (screen 37, task 2.8). Prototype stubs: they re-check the input (never trust the client) and
// return the { ok, error } union, but send nothing, store nothing, log nothing (the email is PII) and create no session.
//
// Task 2.8 replaces them. Three factors, all required ("no TOTP, no access"):
// 1. startAdminSignIn: checks the per-address and per-IP counters first (past adminSignIn.attemptsMax it answers "locked" with
//    the instant the pause ends). If the address is a team account with an authenticator enrolled, the code goes out through
//    Supabase Auth email OTP (shouldCreateUser false, explicit timeout); either way the answer is the same, so the form never
//    reveals whether an address belongs to the team (rule F6). It opens a pending sign-in challenge in the database and hands
//    the browser only its random id, in an httpOnly, Secure, SameSite=Strict cookie.
// 2. checkAdminEmailCode: verifies the emailed code and records the outcome on the challenge, but answers ok either way.
// 3. finishAdminSignIn: reads the challenge (never an email code sent by the client, as this stub does), checks the TOTP code
//    (one step of clock drift allowed, a step already used is refused) or burns one recovery code (stored hashed, compared in
//    constant time), and only when the email code and the second factor both match creates the session at aal2 (Supabase MFA).
//    Any mismatch is one "refused", with no hint which factor failed (brief 37), and counts against the limit. Every outcome
//    writes an audit row (screen 47) without the codes.
import { adminSignIn, business } from "@/config/business";
import { checkEmail, type EmailProblem } from "@/lib/email";
import { checkCode, codeDigits, prototypeWrongCode, type CodeProblem } from "@/lib/otp";
import { checkRecoveryCode, prototypeWrongRecovery, recoveryChars, type RecoveryProblem } from "./_parts/codes";
import { ADMIN_HOME } from "./_parts/limits";

/** Past the limit: the instant (UTC) from which a new sign-in may start. */
export type LockedResult = { ok: false; error: "locked"; retryAtUtc: string };

export type StartResult = { ok: true } | { ok: false; error: EmailProblem | "unavailable" } | LockedResult;
export type EmailCodeResult = { ok: true } | { ok: false; error: CodeProblem | "unavailable" } | LockedResult;
export type SecondFactor = "totp" | "recovery";
export type FinishResult =
  | { ok: true; next: string }
  | { ok: false; error: CodeProblem | RecoveryProblem | "refused" | "unavailable" }
  | LockedResult;

const asText = (v: unknown) => (typeof v === "string" ? v : "");

export async function startAdminSignIn(input: { email: unknown }): Promise<StartResult> {
  const problem = checkEmail(asText(input.email));
  if (problem) return { ok: false, error: problem };
  return { ok: true };
}

export async function checkAdminEmailCode(input: { email: unknown; code: unknown }): Promise<EmailCodeResult> {
  const digits = codeDigits(asText(input.code), business.otpDigits);
  const problem = checkCode(digits, business.otpDigits);
  if (problem) return { ok: false, error: problem };
  // A wrong code is not reported here: the outcome waits for the last step, so a refusal never names the factor.
  return { ok: true };
}

export async function finishAdminSignIn(input: {
  email: unknown;
  emailCode: unknown;
  factor: unknown;
  code: unknown;
}): Promise<FinishResult> {
  const factor: SecondFactor = input.factor === "recovery" ? "recovery" : "totp";
  let wrong: boolean;
  if (factor === "recovery") {
    const chars = recoveryChars(asText(input.code));
    const problem = checkRecoveryCode(chars, adminSignIn.recoveryCodeChars);
    if (problem) return { ok: false, error: problem };
    wrong = chars === prototypeWrongRecovery;
  } else {
    const digits = codeDigits(asText(input.code), adminSignIn.totpDigits);
    const problem = checkCode(digits, adminSignIn.totpDigits);
    if (problem) return { ok: false, error: problem };
    wrong = digits === prototypeWrongCode(adminSignIn.totpDigits);
  }
  // Every earlier factor is checked again here, and any one that fails gives the same answer.
  const emailCode = codeDigits(asText(input.emailCode), business.otpDigits);
  const earlierFails =
    Boolean(checkEmail(asText(input.email))) ||
    Boolean(checkCode(emailCode, business.otpDigits)) ||
    emailCode === prototypeWrongCode(business.otpDigits);
  if (wrong || earlierFails) return { ok: false, error: "refused" };
  // The destination is decided here, not by the client.
  return { ok: true, next: ADMIN_HOME };
}
