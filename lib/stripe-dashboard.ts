// Links from the admin screens into the Stripe dashboard (ADR-6: Stripe hosts payouts, invoices and the payment record, so admin
// pages link there instead of rebuilding them). Test mode until live mode is switched on (handoff risk: Stripe live mode); set
// STRIPE_DASHBOARD_URL to https://dashboard.stripe.com for live. Server only: the base comes from env and never ships to the client.

const base = (process.env.STRIPE_DASHBOARD_URL ?? "https://dashboard.stripe.com/test").replace(/\/$/, "");

export type StripeDashboardTarget =
  | { kind: "payment"; id: string } // a PaymentIntent: the charge, its transfer and any refunds on one page
  | { kind: "account"; id: string } // a Connect connected account: its balance, payouts and requirements
  | { kind: "payments" } // the payments list
  | { kind: "accounts" } // the connected accounts list
  | { kind: "webhooks" }; // webhook endpoints and their delivery attempts

export function stripeDashboardUrl(target: StripeDashboardTarget): string {
  switch (target.kind) {
    case "payment":
      return `${base}/payments/${encodeURIComponent(target.id)}`;
    case "account":
      return `${base}/connect/accounts/${encodeURIComponent(target.id)}`;
    case "payments":
      return `${base}/payments`;
    case "accounts":
      return `${base}/connect/accounts/overview`;
    case "webhooks":
      return `${base}/webhooks`;
  }
}
