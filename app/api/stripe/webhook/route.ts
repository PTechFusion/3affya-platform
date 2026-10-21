// POST /api/stripe/webhook (task 1.8): the only way money state enters the database (ADR-6). POST only: Next.js answers
// 405 for every other method. The steps are in lib/stripe/webhook.ts; this file wires them to env, the service client
// for the "stripe-webhook" caller and the handler registry. No stack trace or payload ever leaves in a response.
import { createServiceClient } from "@/lib/db/client";
import { stripeWebhookSecret } from "@/lib/stripe/client";
import { createStripeEventStore } from "@/lib/stripe/events";
import { stripeHandlers } from "@/lib/stripe/handlers";
import { receiveStripeWebhook } from "@/lib/stripe/webhook";

// Node, not the edge: the signature check uses node:crypto through the stripe package, and the raw body must reach it
// byte for byte (request.text(), never a parsed body).
export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await request.text();
    const result = await receiveStripeWebhook(rawBody, request.headers.get("stripe-signature"), {
      secret: stripeWebhookSecret(),
      openDb: () => createServiceClient({ kind: "system", name: "stripe-webhook" }),
      openStore: createStripeEventStore,
      handlers: stripeHandlers,
    });
    return Response.json(result.body, { status: result.status, headers: NO_STORE });
  } catch (error) {
    // Nothing above should throw; if something does, Stripe gets a plain 500 and retries.
    console.error("[stripe-webhook] unexpected failure", { error: error instanceof Error ? error.name : typeof error });
    return Response.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
}
