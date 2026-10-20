"use server";
// "Invite this doctor" from an unclaimed profile (task 2.2, rule U3). Prototype stub: checks the row and returns; it stores
// nothing and asks the patient for nothing. The real version records the request against the doctor, rate-limits per IP and
// feeds the outreach queue (screen 46).
import { doctorById } from "@/lib/sample";

export type InviteResult = { ok: true } | { ok: false; error: "unavailable" };

export async function requestInvite(_prev: InviteResult | null, formData: FormData): Promise<InviteResult> {
  const id = formData.get("doctorId");
  const doctor = typeof id === "string" ? doctorById(id) : undefined;
  if (!doctor || doctor.state !== "unclaimed") return { ok: false, error: "unavailable" };
  return { ok: true };
}
