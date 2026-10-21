// lib/stripe/handlers.ts: the registry M3 extends, and the payment_intent.succeeded stub.
import { describe, expect, it } from "vitest";
import type { DbClient } from "@/lib/db/client";
import { handlerFor, paymentIntentSucceeded, stripeHandlers, type StripeEventOf } from "@/lib/stripe/handlers";

// A database that fails the test if the stub touches it.
const untouchable = new Proxy({} as DbClient, {
  get(_target, property) {
    throw new Error(`the payment_intent.succeeded stub must not use the database (read ${String(property)})`);
  },
});

const succeeded = {
  id: "evt_handlers1",
  object: "event",
  type: "payment_intent.succeeded",
  created: 1_792_574_000,
  livemode: false,
  data: { object: { id: "pi_handlers1", object: "payment_intent", amount: 18_500, currency: "usd" } },
} as unknown as StripeEventOf<"payment_intent.succeeded">;

describe("stripe handler registry", () => {
  it("registers payment_intent.succeeded", () => {
    expect(handlerFor(stripeHandlers, "payment_intent.succeeded")).toBe(paymentIntentSucceeded);
  });

  it("has no handler for other types, nor for names inherited from Object", () => {
    for (const type of ["customer.created", "charge.refunded", "constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(handlerFor(stripeHandlers, type), type).toBeNull();
    }
  });

  it("the payment_intent.succeeded stub resolves without a database write", async () => {
    await expect(paymentIntentSucceeded(succeeded, untouchable)).resolves.toBeUndefined();
  });
});
