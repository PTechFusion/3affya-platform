"use server";
// Listings server actions (screen 39). Prototype stubs: each re-checks that the listing exists and that the change fits its
// current status (never trust the client), validates the input with the drawer's own rules, and returns the { ok, error }
// union. Nothing is stored. Task 2.8 replaces them: the admin role and the TOTP session checked in server code and RLS, the
// change and its audit_log row (actor, target, old, new) written in one transaction, the action name counted for rule A5, and
// /doctors/[id] revalidated so the public profile and search follow at once.
import { sampleListings, sampleSpecialties, type SampleListing } from "@/lib/sample";
import { checkNameAr, checkReason, type NameArError, type ReasonError } from "./_parts/validation";

type Common = "notFound" | "state" | "unavailable";
export type SaveListingResult = { ok: true } | { ok: false; error: Common | NameArError | "specialty" };
export type SuspendResult = { ok: true } | { ok: false; error: Common | ReasonError };
export type ListingResult = { ok: true } | { ok: false; error: Common };

const listing = (id: unknown): SampleListing | undefined =>
  typeof id === "string" ? sampleListings().find((l) => l.doctor.id === id) : undefined;

/** Corrects the Arabic name and the specialty group of any listing that has not been removed. */
export async function saveListing(input: { id: unknown; nameAr: unknown; specialty: unknown }): Promise<SaveListingResult> {
  const l = listing(input.id);
  if (!l) return { ok: false, error: "notFound" };
  if (l.status === "removed") return { ok: false, error: "state" };
  const nameError = checkNameAr(typeof input.nameAr === "string" ? input.nameAr : "");
  if (nameError) return { ok: false, error: nameError };
  if (!sampleSpecialties.some((s) => s.slug === input.specialty)) return { ok: false, error: "specialty" };
  return { ok: true };
}

/** Hides a verified listing from patients (search and profile). Needs a reason for the audit log. */
export async function suspendListing(input: { id: unknown; reason: unknown }): Promise<SuspendResult> {
  const l = listing(input.id);
  if (!l) return { ok: false, error: "notFound" };
  if (l.status !== "verified") return { ok: false, error: "state" };
  const reasonError = checkReason(typeof input.reason === "string" ? input.reason : "");
  if (reasonError) return { ok: false, error: reasonError };
  return { ok: true };
}

/** Lists a suspended listing again. Routine and reversible, so no confirmation: the page offers Undo (rule B10). */
export async function unsuspendListing(input: { id: unknown }): Promise<ListingResult> {
  const l = listing(input.id);
  if (!l) return { ok: false, error: "notFound" };
  if (l.status !== "suspended") return { ok: false, error: "state" };
  return { ok: true };
}

/**
 * Undo from the bar (rule B10): puts the listing back as it was before the last change. The stored row would be restored
 * from the audit_log entry's old value; here the stub checks the change fits the row's status before the change.
 */
export async function undoListingChange(input: { id: unknown; kind: unknown }): Promise<ListingResult> {
  const l = listing(input.id);
  if (!l) return { ok: false, error: "notFound" };
  const before = input.kind === "suspended" ? "verified" : input.kind === "unsuspended" ? "suspended" : input.kind === "saved" ? l.status : null;
  if (!before || l.status !== before) return { ok: false, error: "state" };
  return { ok: true };
}
