"use server";
// Inbox server actions (screen 32). Prototype stubs: each re-checks that the row exists, belongs to the signed-in professional
// and is in a state the action applies to (never trust the client), then returns the { ok, error } union. Nothing is stored
// or sent. Task 3.3 replaces them: authorisation in RLS and server code, the change written in one transaction with an
// audit row, and the patient email queued through Inngest (accept sends the pay-and-confirm link, propose sends the open
// times), each idempotent on a key stored in the database.
import { inboxStatus, introductionById, type InboxStatus } from "@/lib/sample";
import { signedInDoctorId } from "./_parts/inbox";

export type InboxAction = "accept" | "propose" | "markDone";
export type InboxActionResult = { ok: true } | { ok: false; error: "notFound" | "state" | "unavailable" };

const allowedFrom: Record<InboxAction, InboxStatus[]> = {
  accept: ["request"],
  propose: ["request", "upcoming"],
  markDone: ["awaitingDone"],
};

function check(action: InboxAction, id: unknown): InboxActionResult {
  const row = typeof id === "string" ? introductionById(id) : undefined;
  if (!row || row.doctorId !== signedInDoctorId()) return { ok: false, error: "notFound" };
  if (!allowedFrom[action].includes(inboxStatus(row))) return { ok: false, error: "state" };
  return { ok: true };
}

export async function acceptIntroduction(input: { id: unknown }): Promise<InboxActionResult> {
  return check("accept", input.id);
}

export async function proposeAnotherTime(input: { id: unknown }): Promise<InboxActionResult> {
  return check("propose", input.id);
}

export async function markVisitDone(input: { id: unknown }): Promise<InboxActionResult> {
  return check("markDone", input.id);
}
