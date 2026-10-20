// Links from the admin screens into the Stripe Dashboard (ADR-6: Stripe hosts billing, invoices, refunds and payouts, so admin
// pages read status here and change things there). Test mode until live mode is switched on (handoff risk: Stripe live mode):
// set STRIPE_DASHBOARD_URL=https://dashboard.stripe.com (or STRIPE_DASHBOARD_LIVE=1) on the server for live; STRIPE_DASHBOARD_URL wins. Server only: the base
// comes from env and never ships to the client. Sample ids (cus_sample_*, pi_sample_*) are fake, so prototype links open Stripe on
// a not-found page.

const base = () =>
  (process.env.STRIPE_DASHBOARD_URL ?? (process.env.STRIPE_DASHBOARD_LIVE === "1" ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test")).replace(/\/$/, "");

/** A Dashboard list or one object in it, by its Stripe path segment (screen 42: billing). */
export type StripeDashboardObject = "customers" | "subscriptions" | "invoices" | "payments" | "connect/accounts";

/** The same, named by what the admin is looking for (screen 43: money). */
export type StripeDashboardTarget =
  | { kind: "payment"; id: string } // a PaymentIntent: the charge, its transfer and any refunds on one page
  | { kind: "account"; id: string } // a Connect connected account: its balance, payouts and requirements
  | { kind: "payments" } // the payments list
  | { kind: "accounts" } // the connected accounts list
  | { kind: "webhooks" }; // webhook endpoints and their delivery attempts

/** One place in the Stripe Dashboard: stripeDashboardUrl("subscriptions", "sub_123"), or stripeDashboardUrl({ kind: "webhooks" }). */
export function stripeDashboardUrl(object: StripeDashboardObject, id?: string): string;
export function stripeDashboardUrl(target: StripeDashboardTarget): string;
export function stripeDashboardUrl(arg: StripeDashboardObject | StripeDashboardTarget, id?: string): string {
  if (typeof arg === "string") return id ? `${base()}/${arg}/${encodeURIComponent(id)}` : `${base()}/${arg}`;
  switch (arg.kind) {
    case "payment":
      return `${base()}/payments/${encodeURIComponent(arg.id)}`;
    case "account":
      return `${base()}/connect/accounts/${encodeURIComponent(arg.id)}`;
    case "payments":
      return `${base()}/payments`;
    case "accounts":
      return `${base()}/connect/accounts/overview`;
    case "webhooks":
      return `${base()}/webhooks`;
  }
}
