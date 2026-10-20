"use server";
// Removal request decisions (screen 41). Prototype stubs: each re-checks that the request exists and is still undecided, and
// that a refusal reason or a question is there (never trust the client), then returns the { ok, error } union. Nothing is
// stored or sent, and the note is not logged (it can carry personal details).
// Task 2.8 replaces them. Authorisation: an admin session with a fresh TOTP (screen 37), decided in RLS and server code. Confirm
// sets the listing's removed flag in one transaction with an audit row (the profile then answers 410 Gone through proxy.ts) and
// queues the doctor's email and the search-engine recrawl through Inngest; refuse and ask store the note with an audit row and
// queue the email in the request's language (Resend, explicit timeout). Each is idempotent on the request id plus the action,
// stored in the database, so a double tap or a retried job cannot send two emails.
import { removalRequestById } from "@/lib/sample";
import { validateNote, type NoteErrorCode } from "./_parts/validation";

export type RemovalAction = "confirm" | "refuse" | "askInfo";
export type RemovalActionResult =
  | { ok: true }
  | { ok: false; error: "notFound" | "decided" | "unavailable" }
  | { ok: false; error: "validation"; field: NoteErrorCode };

function check(id: unknown): RemovalActionResult {
  const request = typeof id === "string" ? removalRequestById(id) : undefined;
  if (!request) return { ok: false, error: "notFound" };
  if (request.status === "confirmed" || request.status === "refused") return { ok: false, error: "decided" };
  return { ok: true };
}

function withNote(id: unknown, note: unknown): RemovalActionResult {
  const field = validateNote(note);
  if (field) return { ok: false, error: "validation", field };
  return check(id);
}

export async function confirmRemoval(input: { id: unknown }): Promise<RemovalActionResult> {
  return check(input.id);
}

export async function refuseRemoval(input: { id: unknown; note: unknown }): Promise<RemovalActionResult> {
  return withNote(input.id, input.note);
}

export async function askForMoreInfo(input: { id: unknown; note: unknown }): Promise<RemovalActionResult> {
  return withNote(input.id, input.note);
}
