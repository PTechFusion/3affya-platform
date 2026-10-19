"use server";
// "Mark as reviewed" on a shared summary (task 3.10, rules T4 and Q6). Prototype stub: checks that the share exists, is this
// professional's and has not ended, then returns; it stores nothing. The real version writes the reviewer and time on the
// summary (RLS: only the professional the share was made for), adds an audit_log event, and the patient's summary then shows
// "Reviewed by Dr X".
import { sampleProfessionalId, shareFor } from "@/lib/sample";

export type MarkReviewedResult = { ok: true } | { ok: false; error: "unavailable" | "alreadyReviewed" };

export async function markReviewed(_prev: MarkReviewedResult | null, formData: FormData): Promise<MarkReviewedResult> {
  const id = formData.get("shareId");
  const share = typeof id === "string" ? shareFor(id, sampleProfessionalId) : undefined;
  if (!share) return { ok: false, error: "unavailable" };
  if (share.status === "reviewed") return { ok: false, error: "alreadyReviewed" };
  return { ok: true };
}
