"use server";
// Settings server actions (screen 28). Prototype stubs: each checks what the page sent and returns { ok } without writing.
// Task 3.6 replaces them. The patient always comes from the Supabase session, never from the client; RLS lets a patient
// read and write only their own profiles row. Slow or scheduled work goes to Inngest, never into the request:
//   - saveDetails: an email change sends a code to the new address first; the address changes when the code is entered.
//   - requestDataExport: an Inngest job builds the ZIP, idempotent on an export id stored in the database, then emails a link.
//   - deleteUploads: removes record_files, record_pages, record_items, record_summaries and record_shares for the patient
//     and their Storage objects in one Inngest job keyed on a deletion id; audit_log keeps a row with the date only.
//   - requestAccountDeletion: stores a deletion request and schedules the Inngest job at now + accountData.deletionGraceDays;
//     keepAccount deletes the pending request, and the job re-checks that the request still exists before it runs.
import { accountData } from "@/config/business";
import type { PatientEmailKey } from "@/lib/sample";
import { DETAILS_FIELDS, checkDetails, type DetailsInput, type SaveDetailsResult } from "./_parts/validation";
import { isSettingsZone } from "./_parts/zones";

export type SettingsResult = { ok: true } | { ok: false; error: "validation" | "unavailable" };

const EMAIL_KEYS: PatientEmailKey[] = ["summaryReady", "shareOpened", "news"];

export async function saveDetails(raw: unknown): Promise<SaveDetailsResult> {
  const source = (raw ?? {}) as Record<string, unknown>;
  const input = Object.fromEntries(
    DETAILS_FIELDS.map((field) => [field, typeof source[field] === "string" ? (source[field] as string) : ""]),
  ) as DetailsInput;
  const fields = checkDetails(input);
  if (Object.keys(fields).length) return { ok: false, error: "validation", fields };
  return { ok: true };
}

/** One preference at a time: the language, the zone, Hijri dates or one optional email. Anything else is refused. */
export async function savePreference(raw: unknown): Promise<SettingsResult> {
  const p = (raw ?? {}) as Record<string, unknown>;
  const valid =
    (p.kind === "locale" && (p.value === "ar" || p.value === "en")) ||
    (p.kind === "timeZone" && typeof p.value === "string" && isSettingsZone(p.value)) ||
    (p.kind === "hijri" && typeof p.value === "boolean") ||
    (p.kind === "email" && EMAIL_KEYS.includes(p.key as PatientEmailKey) && typeof p.value === "boolean");
  return valid ? { ok: true } : { ok: false, error: "validation" };
}

export async function requestDataExport(): Promise<SettingsResult> {
  return { ok: true };
}

export async function deleteUploads(): Promise<SettingsResult> {
  return { ok: true };
}

/**
 * Schedules the deletion for now + accountData.deletionGraceDays. The page names that date from the same config value when it
 * renders the confirmation, so the stub returns only { ok }; the real action stores the instant on the deletion request.
 */
export async function requestAccountDeletion(): Promise<SettingsResult> {
  return accountData.deletionGraceDays > 0 ? { ok: true } : { ok: false, error: "unavailable" };
}

export async function keepAccount(): Promise<SettingsResult> {
  return { ok: true };
}
