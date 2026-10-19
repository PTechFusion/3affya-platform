"use server";
// Records server actions (screens 24 and 25, tasks 3.7 and 3.8). Prototype stubs: they check their input and return the
// { ok, error } union. Nothing is stored, charged, started or stopped, and no file ever reaches the server (uploads stay in
// the browser in the prototype). The real versions first resolve the signed-in patient on the server ("notAllowed" otherwise,
// and a set that is not theirs is a 404 with an audit row), and each is idempotent on the set id:
// - startRecordsCheckout: reads the set records.validate wrote (accepted bytes and pages, rejected files with reasons), writes
//   the two consents to `consents` as separate rows (privacy notice and AI processing, each with its notice version and time),
//   creates a Stripe Checkout Session in payment mode for quoteFor(stored accepted bytes) (never an amount from the client)
//   with an explicit timeout and an idempotency key on set id plus quote id, and returns session.url. Nothing is processed
//   until the payment_intent.succeeded webhook starts Inngest records.process (task 3.7).
// - cancelRecordSet: sends records.cancel; the Inngest function stops at the next step boundary and the patient pays nothing.
// - retryRecordSet: runs records.process again from the failed page with the same quote: no second quote, no new charge
//   (task 3.8). A replacement file goes through records.validate first.
// Money state is written only by the Stripe webhook handler, never here or on the return from Stripe.

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: "preview" | "consentMissing" | "noFiles" | "unavailable" | "notAllowed" };
export type SetActionResult = { ok: true } | { ok: false; error: "invalidRequest" | "unavailable" | "notAllowed" };

const SET_ID = /^rs_[0-9]{3}$/;

/** Pay: both consents ticked and at least one accepted file, then the Stripe-hosted payment page. */
export async function startRecordsCheckout(_prev: CheckoutResult | null, formData: FormData): Promise<CheckoutResult> {
  void _prev;
  if (formData.get("privacy") !== "on" || formData.get("ai") !== "on") return { ok: false, error: "consentMissing" };
  const files = Number(formData.get("files"));
  if (!Number.isInteger(files) || files < 1) return { ok: false, error: "noFiles" };
  return { ok: false, error: "preview" };
}

/** Cancel on the progress page (rules L1, T11: over 10 seconds, offer a cancel). */
export async function cancelRecordSet(setId: string): Promise<SetActionResult> {
  if (!SET_ID.test(setId)) return { ok: false, error: "invalidRequest" };
  return { ok: true };
}

/** Try again after a failure, optionally with the damaged file replaced. The quote is reused. */
export async function retryRecordSet(setId: string, replacement: { name: string; sizeBytes: number } | null): Promise<SetActionResult> {
  if (!SET_ID.test(setId)) return { ok: false, error: "invalidRequest" };
  if (replacement && (typeof replacement.name !== "string" || !(replacement.sizeBytes > 0))) return { ok: false, error: "invalidRequest" };
  return { ok: true };
}
