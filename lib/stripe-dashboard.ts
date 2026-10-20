// Links from admin pages into the Stripe Dashboard, where Stripe hosts billing, invoices, refunds and payouts (ADR-6): the admin
// reads status here and changes billing there. Test-mode links unless STRIPE_DASHBOARD_LIVE=1 is set on the server; production
// sets it. Sample ids (cus_sample_*, sub_sample_*) are fake, so prototype links open Stripe on a not-found page.

export type StripeDashboardObject = "customers" | "subscriptions" | "invoices" | "payments" | "connect/accounts";

const base = () => (process.env.STRIPE_DASHBOARD_LIVE === "1" ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test");

/** One object in the Stripe Dashboard, e.g. stripeDashboardUrl("subscriptions", "sub_123"). Without an id, the object's list. */
export function stripeDashboardUrl(object: StripeDashboardObject, id?: string): string {
  return id ? `${base()}/${object}/${encodeURIComponent(id)}` : `${base()}/${object}`;
}
