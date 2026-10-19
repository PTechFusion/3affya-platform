"use server";
// Contact form server action. Prototype stub: it validates and returns { ok } but sends nothing.
// Task 1.10 replaces the stub with an Inngest event, idempotent on a submission id stored in the database, whose handler
// sends through Resend with an explicit timeout. Nothing is sent inside the request (slow or retried work goes to Inngest).
import { CONTACT_FIELDS, validateContact, type ContactInput, type ContactResult } from "./validation";

export async function sendContactMessage(raw: unknown): Promise<ContactResult> {
  const source = (raw ?? {}) as Record<string, unknown>;
  const input = Object.fromEntries(
    CONTACT_FIELDS.map((field) => {
      const value = source[field];
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as ContactInput;
  const fields = validateContact(input);
  if (Object.keys(fields).length) return { ok: false, error: "validation", fields };
  return { ok: true };
}
