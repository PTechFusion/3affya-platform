"use server";
// This is me / remove me server action (screen 10). Prototype stub: it validates, checks the profile is still unclaimed and
// that the NPI matches the public record, then returns { ok } without storing or sending anything (the input is PII, so it is
// not logged either).
// Task 2.8 replaces the remove branch with an insert into the removal queue (admin screen 41, 48-hour SLA timer, rule A3),
// idempotent on a request id stored in the database; task 2.3 replaces the claim branch with an invite token emailed through an
// Inngest job (Resend, explicit timeout) that lands on /claim/[token]. Nothing slow runs inside the request.
import { sampleDoctors } from "@/lib/sample";
import { isIntent, normaliseNpi, THIS_IS_ME_FIELDS, validateThisIsMe, type ThisIsMeInput, type ThisIsMeResult } from "./validation";

export async function submitThisIsMe(doctorId: string, rawIntent: unknown, raw: unknown): Promise<ThisIsMeResult> {
  const source = (raw ?? {}) as Record<string, unknown>;
  const input = Object.fromEntries(
    THIS_IS_ME_FIELDS.map((field) => {
      const value = source[field];
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as ThisIsMeInput;
  const intent = isIntent(rawIntent) ? rawIntent : undefined;

  const fields = validateThisIsMe(intent, input);
  if (Object.keys(fields).length || !intent) return { ok: false, error: "validation", fields };

  const doctor = sampleDoctors.find((d) => d.id === doctorId);
  if (!doctor || doctor.state !== "unclaimed") return { ok: false, error: "profileUnavailable" };
  // The NPI is public (NPPES), so saying it does not match reveals nothing; it stops a request landing on the wrong profile.
  if (normaliseNpi(input.npi) !== doctor.npi) return { ok: false, error: "validation", fields: { npi: "npiMismatch" } };

  return { ok: true, intent };
}
