"use server";
// Stripe Billing hand-offs for screen 33 (task 3.5). Prototype stubs: they check the input and return; nothing opens, nothing is
// charged, nothing is stored. The real versions, for the signed-in professional's Stripe customer:
// - startCheckout creates a Checkout Session in subscription mode for the chosen price and redirects to session.url;
// - openBillingPortal creates a Customer Portal session and redirects to its url. "updateCard" opens it straight on the
//   payment-method flow (flow_data payment_method_update); "manage" opens its home (plan, card, invoices, cancel, renew).
// Both return to /professional/membership. Membership state is written only by the webhook handler, never here or on return.
import type { BillingInterval } from "@/lib/sample";

export type BillingResult = { ok: true } | { ok: false; error: "invalidRequest" | "unavailable" };
export type PortalFlow = "manage" | "updateCard";

const INTERVALS: string[] = ["month", "year"] satisfies BillingInterval[];
const FLOWS: string[] = ["manage", "updateCard"] satisfies PortalFlow[];

export async function startCheckout(_prev: BillingResult | null, formData: FormData): Promise<BillingResult> {
  const interval = formData.get("interval");
  if (typeof interval !== "string" || !INTERVALS.includes(interval)) return { ok: false, error: "invalidRequest" };
  return { ok: true };
}

export async function openBillingPortal(_prev: BillingResult | null, formData: FormData): Promise<BillingResult> {
  const flow = formData.get("flow");
  if (typeof flow !== "string" || !FLOWS.includes(flow)) return { ok: false, error: "invalidRequest" };
  return { ok: true };
}
