"use server";
// Download receipt (screen 23). Prototype stub: it returns the { ok, error } union and touches nothing. Stripe hosts receipts
// (ADR 6), so 3affya never renders its own invoice or receipt PDF. Task 3.6 replaces the stub: resolve the signed-in patient on
// the server (never from the client), load the booking under RLS and return "notAllowed" unless it is theirs, then retrieve the
// PaymentIntent's latest charge from Stripe with an explicit timeout and return its receipt_url. Stripe refreshes that link on
// each retrieve, and the hosted page lists any refund and saves as a PDF. Nothing here writes money state.
import { patientReceiptById } from "@/lib/sample";

export type ReceiptLinkResult = { ok: true; url: string } | { ok: false; error: "preview" | "unavailable" | "notAllowed" };

export async function openStripeReceipt(_prev: ReceiptLinkResult | null, formData: FormData): Promise<ReceiptLinkResult> {
  void _prev;
  const id = formData.get("receiptId");
  if (typeof id !== "string" || !patientReceiptById(id)) return { ok: false, error: "notAllowed" };
  return { ok: false, error: "preview" };
}
