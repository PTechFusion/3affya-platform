"use server";
// Payouts setup server actions (screen 35). Prototype stubs: they return the { ok, error } union and touch nothing. Stripe hosts
// onboarding and the payout dashboard (ADR-6); 3affya never builds its own onboarding or payout UI.
// Task 3.1 replaces them. Both first resolve the signed-in professional on the server (never from the client) and return
// "notAllowed" otherwise. Onboarding: create the Express account if the row has none (prefilled with the profile's name, email
// and profile URL, idempotent on a key stored in the database), then stripe.accountLinks.create({ type: "account_onboarding",
// refresh_url, return_url }) with an explicit timeout; the same link resumes a half-finished onboarding. Dashboard:
// stripe.accounts.createLoginLink(accountId). Neither writes account state: charges_enabled, payouts_enabled and the
// requirements arrive only through the account.updated webhook.

export type StripeLinkResult = { ok: true; url: string } | { ok: false; error: "preview" | "unavailable" | "notAllowed" };

/** "Set up payouts with Stripe" and "Continue with Stripe": the Stripe-hosted onboarding link. */
export async function openStripeOnboarding(_prev: StripeLinkResult | null, _formData: FormData): Promise<StripeLinkResult> {
  void _prev;
  void _formData;
  return { ok: false, error: "preview" };
}

/** "Open your Stripe dashboard": a one-time login link to the Express dashboard, where payouts and the bank account live. */
export async function openStripeDashboard(_prev: StripeLinkResult | null, _formData: FormData): Promise<StripeLinkResult> {
  void _prev;
  void _formData;
  return { ok: false, error: "preview" };
}
