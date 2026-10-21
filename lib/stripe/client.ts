// The one Stripe client (lane L2, task 1.8). Server only: STRIPE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it is undefined
// in a browser bundle, and stripeClient() refuses to run there. Keys come from env only (.env.example).
//
// The API version is pinned here, not taken from the account default, so a change in the Stripe Dashboard never changes
// what the code receives. It must equal the version stripe@23.0.0 is typed against: the `apiVersion` option only accepts
// that literal, so bumping the package without moving this constant fails the type check, on purpose. The webhook
// endpoint in the Dashboard should be created with the same version, so events arrive in the shape these types describe.
//
// Signature checks need no client and no secret key: lib/stripe/webhook.ts uses the static Stripe.webhooks helpers with
// STRIPE_WEBHOOK_SECRET alone.
import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-09-30.endive" as const;

/** Rigor review: every Stripe call gives up after 20 s. */
export const STRIPE_TIMEOUT_MS = 20_000;

/** Network retries; stripe-node sends an idempotency key with each retried POST, so a retry never charges twice. */
export const STRIPE_MAX_NETWORK_RETRIES = 2;

let client: Stripe | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

/** The shared Stripe client, built on first use. Throws when the secret key is missing: a deployment error. */
export function stripeClient(): Stripe {
  if (typeof window !== "undefined") throw new Error("lib/stripe/client.ts runs on the server only");
  client ??= new Stripe(required("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
    timeout: STRIPE_TIMEOUT_MS,
    maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
    typescript: true,
    appInfo: { name: "3affya-platform" },
  });
  return client;
}

/** The webhook signing secret, or null when it is not configured (the route answers 500 so Stripe retries later). */
export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
