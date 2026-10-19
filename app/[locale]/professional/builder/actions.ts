"use server";
// Profile builder server actions (screen 29). Prototype stubs: they rebuild the draft from untrusted input, re-check it with
// the same rules the form uses, and return the { ok, error } union; nothing is stored, nothing is uploaded, nothing is logged
// (the draft holds PII).
// Task 2.4 replaces saveBuilderStep with an update of the doctor's own row under RLS and signed-URL uploads to the private
// `credentials` bucket (20 MB, PDF and images); submitForReview sets review_status = pending and queues the "claim received"
// email through Inngest, idempotent on the submission id. Task 2.5 writes fee changes to audit_log.
import { doctorById, upcomingSlots } from "@/lib/sample";
import {
  LIMITS,
  draftFromPayload,
  isStepId,
  missingRequired,
  validateAll,
  validateStep,
  type ChecklistKey,
  type DraftPayload,
  type FieldErrors,
} from "./_parts/model";

export type SaveResult = { ok: true } | { ok: false; error: "validation"; fields: FieldErrors } | { ok: false; error: "unavailable" };
export type SubmitResult =
  | { ok: true; submittedAtUtc: string }
  | { ok: false; error: "incomplete"; missing: ChecklistKey[] }
  | { ok: false; error: "unavailable" };

const thisYear = () => new Date().getUTCFullYear();

/** `step` is one step id, or "all" when a live profile saves every change at once. */
export async function saveBuilderStep(doctorId: string, step: unknown, payload: DraftPayload): Promise<SaveResult> {
  const doctor = doctorById(doctorId);
  if (!doctor || !(isStepId(step) || step === "all")) return { ok: false, error: "unavailable" };
  const draft = draftFromPayload(payload);
  const fields = step === "all" ? validateAll(draft, thisYear()) : validateStep(step, draft, thisYear());
  if ((step === "all" || step === "expertise") && draft.tags.some((t) => !t.trim() || t.trim().length > LIMITS.tagMaxChars)) fields.tag = "tagTooLong";
  if (Object.keys(fields).length) return { ok: false, error: "validation", fields };
  return { ok: true };
}

export async function submitForReview(doctorId: string, payload: DraftPayload): Promise<SubmitResult> {
  const doctor = doctorById(doctorId);
  if (!doctor) return { ok: false, error: "unavailable" };
  const draft = draftFromPayload(payload);
  const missing = missingRequired(draft, { npi: doctor.npi, hasAvailability: upcomingSlots(doctor.id).length > 0, thisYear: thisYear() });
  if (missing.length) return { ok: false, error: "incomplete", missing };
  return { ok: true, submittedAtUtc: new Date().toISOString() };
}
