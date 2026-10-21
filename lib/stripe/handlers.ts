// Webhook handlers by event type (lane L2, task 1.8). The route verifies, records and dispatches; it never changes when a
// handler is added. M3 (tasks 3.1 to 3.5) adds one entry per event it needs, e.g. "account.updated" writing
// professional_private.stripe_* and "charge.refunded" writing refunds.
//
// Rules for every handler (CLAUDE.md, architecture critical flow 4):
//   * A pure function of the event payload plus database state. Money state is written here and nowhere else.
//   * Idempotent: a handler can run again for the same event (the route takes back an event whose earlier attempt threw),
//     so every write is keyed on something stored, e.g. the payment intent id.
//   * Throw to fail. The route records the error on the stripe_events row and answers 500, and Stripe retries.
//   * Never log the event or anything from it except ids; it can carry customer details.
//   * Writes go through `db`, the service client the route built for the "stripe-webhook" caller. System audit rows set
//     actor_system 'stripe' (lib/audit.ts).
import type Stripe from "stripe";
import type { DbClient } from "@/lib/db/client";

export type StripeEventType = Stripe.Event["type"];

/** The event for one type, narrowed so a handler sees its own data.object (a PaymentIntent, an Account, ...). */
export type StripeEventOf<T extends StripeEventType> = Extract<Stripe.Event, { type: T }>;

export type StripeEventHandler<T extends StripeEventType = StripeEventType> = (
  event: StripeEventOf<T>,
  db: DbClient,
) => Promise<void>;

export type StripeHandlerRegistry = { [T in StripeEventType]?: StripeEventHandler<T> };

/**
 * payment_intent.succeeded, the launch stub: no write yet. The route stamps the row's handled_at when this resolves, and
 * the amount stays in the stored payload (event.data.object.amount, in minor units of .currency). Task 3.1 replaces the
 * body with critical flow 1: verify the hold is unexpired, create the booking, consume the hold, write the receipt.
 */
export const paymentIntentSucceeded: StripeEventHandler<"payment_intent.succeeded"> = async () => {
  // Nothing to write until task 3.1. Resolving is what marks the event handled.
};

export const stripeHandlers: StripeHandlerRegistry = {
  "payment_intent.succeeded": paymentIntentSucceeded,
};

/** The handler for an event's type, or null for a type nothing handles yet (stored and acknowledged). */
export function handlerFor(registry: StripeHandlerRegistry, type: string): StripeEventHandler | null {
  if (!Object.hasOwn(registry, type)) return null;
  // The registry's mapped type pairs each type with its own event; the event passed in has this same type.
  return (registry[type as StripeEventType] as StripeEventHandler | undefined) ?? null;
}
