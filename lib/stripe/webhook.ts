// What POST /api/stripe/webhook does, in order (architecture critical flow 4; CLAUDE.md Stripe rules):
//   1. Verify the Stripe-Signature header against the raw body with STRIPE_WEBHOOK_SECRET. Failure: 400, nothing stored.
//   2. Insert the event into stripe_events BEFORE any handler runs. Already on file and handled (or of a type nothing
//      handles): 200 and stop, so a redelivered event never reaches a handler twice. An event on file but never handled is
//      taken back, atomically, for one more attempt when its last attempt is over: it failed (error recorded), which is
//      what makes "500 so Stripe retries" do anything, or it started more than STALE_ATTEMPT_MS ago and died (process
//      killed, the insert's response lost, or neither handled_at nor the error could be written). Otherwise an earlier
//      attempt is still running: 409, so Stripe tries again later instead of being told the event was handled.
//   3. Dispatch to the handler for the event's type (lib/stripe/handlers.ts). A type with no handler is stored and
//      acknowledged, and stays unhandled (handled_at null) so a later handler can replay it from the stored payload.
//   4. Handler resolved: stamp handled_at, 200. Handler threw: record the error on the row, 500, and Stripe retries.
// The payload is never logged (it can carry customer details); log lines carry the event id, type and error class only.
// The database is opened only after the signature checks out, so an unsigned request costs no connection.
import Stripe from "stripe";
import type { DbClient } from "@/lib/db/client";
import type { Json } from "@/lib/db/types";
import { StripeEventStoreError, type StripeEventStore } from "@/lib/stripe/events";
import { handlerFor, type StripeHandlerRegistry } from "@/lib/stripe/handlers";

/** Longest error text kept on a row, in characters (code points; the column allows 2000). */
export const STORED_ERROR_MAX_CHARS = 1000;

/**
 * How long an attempt may run before the next delivery may take its event back. No attempt lives this long (every database
 * call gives up after 8 s, and the host ends a request well before five minutes), so an unhandled row with no error whose
 * attempt started earlier belongs to an attempt that died. Handlers are idempotent, so the rare overlap is safe.
 */
export const STALE_ATTEMPT_MS = 5 * 60_000;

export type WebhookFailure =
  | "notConfigured"
  | "missingSignature"
  | "invalidSignature"
  | "inProgress"
  | "storeFailed"
  | "handlerFailed";

export type WebhookResponseBody =
  | { received: true; duplicate: true }
  | { received: true; handled: boolean }
  | { error: WebhookFailure };

export interface WebhookResult {
  status: 200 | 400 | 409 | 500;
  body: WebhookResponseBody;
}

export type WebhookLog = (message: string, fields: Record<string, string>) => void;

export interface WebhookDeps {
  /** STRIPE_WEBHOOK_SECRET; null when unset. */
  secret: string | null;
  /** The service client for the "stripe-webhook" caller. Called once, after the signature checks out. */
  openDb: () => DbClient;
  openStore: (db: DbClient) => StripeEventStore;
  handlers: StripeHandlerRegistry;
  now?: () => Date;
  log?: WebhookLog;
}

const defaultLog: WebhookLog = (message, fields) => {
  console.error(`[stripe-webhook] ${message}`, fields);
};

/** The error's class (and a database code when there is one), safe to log: no message, no row values. */
function errorClass(error: unknown): string {
  if (error instanceof StripeEventStoreError) return `${error.name}:${error.operation}:${error.code ?? "unknown"}`;
  if (error instanceof Error) return error.name;
  return typeof error;
}

/**
 * The text kept on the row, for whoever looks into a failed event with the service role. Well formed and cut by code
 * points: PostgREST refuses a body holding half a surrogate pair (PGRST102), and an unrecorded error leaves the row
 * looking like an attempt still running until STALE_ATTEMPT_MS has passed.
 */
function storedError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : `Non-error thrown: ${String(error)}`;
  const characters = Array.from(text.toWellFormed());
  if (characters.length <= STORED_ERROR_MAX_CHARS) return characters.join("");
  return `${characters.slice(0, STORED_ERROR_MAX_CHARS - 1).join("")}…`;
}

export async function receiveStripeWebhook(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? (() => new Date());

  if (!deps.secret) {
    log("STRIPE_WEBHOOK_SECRET is not set; answering 500 so Stripe retries once it is", {});
    return { status: 500, body: { error: "notConfigured" } };
  }
  if (!signature) return { status: 400, body: { error: "missingSignature" } };

  let event: Stripe.Event;
  try {
    // Checks the HMAC and the timestamp (default tolerance, 300 s) before parsing a byte of the body.
    event = Stripe.webhooks.constructEvent(rawBody, signature, deps.secret);
  } catch {
    return { status: 400, body: { error: "invalidSignature" } };
  }

  const ids = { eventId: event.id, type: event.type };
  const handler = handlerFor(deps.handlers, event.type);
  const attemptAt = now();
  let db: DbClient;
  let store: StripeEventStore;
  try {
    db = deps.openDb();
    store = deps.openStore(db);
    const outcome = await store.insert({
      event_id: event.id,
      type: event.type,
      created_at: new Date(event.created * 1000).toISOString(),
      attempted_at: attemptAt.toISOString(),
      payload: event as unknown as Json,
    });
    if (outcome === "duplicate") {
      // Nothing to run for a type no handler takes, and a handled event is done: 200 and stop.
      if (!handler || (await store.isHandled(event.id))) {
        return { status: 200, body: { received: true, duplicate: true } };
      }
      const staleBefore = new Date(attemptAt.getTime() - STALE_ATTEMPT_MS);
      if (!(await store.reclaim(event.id, attemptAt, staleBefore))) {
        log("an earlier attempt is still running; answering 409 so Stripe retries later", ids);
        return { status: 409, body: { error: "inProgress" } };
      }
    }
  } catch (error) {
    log("could not record the event", { ...ids, error: errorClass(error) });
    return { status: 500, body: { error: "storeFailed" } };
  }

  if (!handler) return { status: 200, body: { received: true, handled: false } };

  try {
    await handler(event, db);
  } catch (error) {
    log("handler failed", { ...ids, error: errorClass(error) });
    try {
      await store.markFailed(event.id, storedError(error));
    } catch (markError) {
      // The row stays unhandled with no error; a delivery after STALE_ATTEMPT_MS takes it back.
      log("could not record the handler error on the event", { ...ids, error: errorClass(markError) });
    }
    return { status: 500, body: { error: "handlerFailed" } };
  }

  try {
    await store.markHandled(event.id, now());
  } catch (error) {
    log("handler finished but handled_at could not be stamped", { ...ids, error: errorClass(error) });
    // Leave the row reclaimable, so Stripe's retry runs the (idempotent) handler again and stamps it.
    try {
      await store.markFailed(event.id, "handled, but stamping handled_at failed; the retry runs the handler again");
    } catch {
      // The database is unreachable; the row is taken back once STALE_ATTEMPT_MS has passed.
    }
    return { status: 500, body: { error: "storeFailed" } };
  }
  return { status: 200, body: { received: true, handled: true } };
}
