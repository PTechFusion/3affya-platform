"use server";
// Outreach server actions (screen 46). Prototype stubs: they re-check the counsel gate and the input (never trust the client)
// and return the { ok, error } union, but send nothing, store nothing and log nothing (the address is PII).
// Tasks 2.3 and 4.5 replace them. The admin session (with its TOTP factor) is checked here and in RLS, never in the page.
// sendInvite writes the invite row (only a hash of the token; expiry outreach.inviteValidDays) and one Inngest event keyed
// on the invite id, whose job sends the one email through Resend with an explicit timeout; a retry with the same key sends
// nothing twice. The Resend webhook writes delivered and bounced; the claim page writes opened and claimed. resendInvite makes
// a new token and stops the old one. Every action writes an audit row (screen 47). No bulk send exists, by design.
import { outreach } from "@/config/business";
import { checkEmail, type EmailProblem } from "@/lib/email";
import { outreachInvites, outreachIsLive, sampleDoctors } from "@/lib/sample";

type Gate = "notCleared";
/** "gone": the invite changed since the page loaded (claimed, expired or revoked) or does not exist. */
export type InviteActionResult = { ok: true } | { ok: false; error: Gate | "gone" | "unavailable" };
export type SendInviteResult =
  | { ok: true }
  | { ok: false; error: Gate | "doctor" | "tooLong" | "unavailable" | EmailProblem };

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const liveInvite = (id: string) => outreachInvites(outreach.inviteValidDays).find((i) => i.id === id && outreachIsLive(i));

export async function sendInvite(input: { doctorId: unknown; email: unknown; personalLine: unknown; language: unknown }): Promise<SendInviteResult> {
  if (!outreach.sendingCleared) return { ok: false, error: "notCleared" };
  const doctor = sampleDoctors.find((d) => d.id === asText(input.doctorId));
  if (!doctor || doctor.state !== "unclaimed") return { ok: false, error: "doctor" };
  const problem = checkEmail(asText(input.email));
  if (problem) return { ok: false, error: problem };
  if (asText(input.personalLine).trim().length > outreach.personalLineMaxChars) return { ok: false, error: "tooLong" };
  if (input.language !== "ar" && input.language !== "en") return { ok: false, error: "unavailable" };
  return { ok: true };
}

export async function resendInvite(input: { inviteId: unknown }): Promise<InviteActionResult> {
  if (!outreach.sendingCleared) return { ok: false, error: "notCleared" };
  return liveInvite(asText(input.inviteId)) ? { ok: true } : { ok: false, error: "gone" };
}

/** Revoke sends nothing, so it works while sending is off. The token stops working at once. */
export async function revokeInvite(input: { inviteId: unknown }): Promise<InviteActionResult> {
  return liveInvite(asText(input.inviteId)) ? { ok: true } : { ok: false, error: "gone" };
}

/** Undo of a revoke a moment ago (rule B10). Production clears revoked_at only while the link would still be in date. */
export async function restoreInvite(input: { inviteId: unknown }): Promise<InviteActionResult> {
  return liveInvite(asText(input.inviteId)) ? { ok: true } : { ok: false, error: "gone" };
}
