"use server";
// Sharing and consent (screen 27, task 3.10). Prototype stubs: each checks what the real version checks, then returns; nothing is
// stored. Every action returns { ok, error } and never throws across the client boundary.
// Real versions (task 3.10): share inserts a record_shares row for one professional with its expires_at, a consents row and an
// audit_log event, and tells the doctor without any health detail in the message (rule T12). Stop sets revoked_at (RLS: only the
// patient who owns the summary), so the professional's list and viewer refuse the link at once; undo of a stop clears revoked_at
// while the share has not run out. The signed link is refused for any other professional and after expiry.
import { shareLengthDaysOptions } from "@/config/business";
import { patientSharing } from "@/lib/sample";

export type ShareResult = { ok: true; id: string } | { ok: false; error: "noSummary" | "notBooked" | "badLength" | "unavailable" };
export type StopResult = { ok: true } | { ok: false; error: "notFound" | "unavailable" };

/**
 * Shares the patient's summary with one doctor they have an upcoming visit with, for one of the offered lengths. The real version
 * also refuses a second live share with the same doctor; the stub stores nothing, so a share stopped on the page would still read
 * as live here, and that check waits for the table.
 */
export async function shareSummary(doctorId: string, days: number): Promise<ShareResult> {
  try {
    const { summary, visits } = patientSharing();
    if (!summary) return { ok: false, error: "noSummary" };
    if (!visits.some((v) => v.doctor.id === doctorId)) return { ok: false, error: "notBooked" };
    if (!shareLengthDaysOptions.includes(days)) return { ok: false, error: "badLength" };
    return { ok: true, id: `sh_${crypto.randomUUID().slice(0, 8)}` };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Only the owner can end or restore a share. A stored sample row (sh_ plus three digits) that is not this patient's is refused;
 * ids made on the page in this session are not stored by the stub, so they pass.
 */
function ownsShare(shareId: string): boolean {
  if (patientSharing().shares.some((s) => s.id === shareId)) return true;
  return !/^sh_\d{3}$/.test(shareId);
}

export async function stopSharing(shareId: string): Promise<StopResult> {
  try {
    return ownsShare(shareId) ? { ok: true } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** The Undo of Stop sharing (rule B10): the share opens again for the same doctor until the same end date. */
export async function undoStopSharing(shareId: string): Promise<StopResult> {
  try {
    return ownsShare(shareId) ? { ok: true } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
