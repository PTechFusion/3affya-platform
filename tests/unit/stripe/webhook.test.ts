// POST /api/stripe/webhook end to end, with the database layer mocked (lane L2, task 1.8). Requests are signed the way
// Stripe signs them (Stripe.webhooks.generateTestHeaderString) with a test-only secret; nothing leaves the process.
// The in-memory store mirrors the migration's rules: event_id is the primary key, an insert of a known id is a duplicate,
// and only an unhandled row whose attempt is over (an error recorded, or attempted_at older than the cut-off) can be
// taken back. Like PostgREST (PGRST102, probed against the local stack), it refuses text holding half a surrogate pair.
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { StripeEventInsert, StripeEventRow } from "@/lib/stripe/types";
import { STALE_ATTEMPT_MS, STORED_ERROR_MAX_CHARS } from "@/lib/stripe/webhook";

const memory = vi.hoisted(() => {
  const rows = new Map<string, StripeEventRow>();
  const state = {
    failInserts: false,
    /** The insert commits, then its response is lost (the request times out after the database wrote the row). */
    loseInsertResponse: false,
    failMarks: false,
    failMarkFailed: false,
    writes: [] as string[],
  };
  const client = { label: "service client for the stripe-webhook caller" };
  const store = {
    async insert(row: StripeEventInsert) {
      state.writes.push(`insert ${row.event_id}`);
      if (state.failInserts) throw new Error("connection refused");
      if (rows.has(row.event_id)) return "duplicate" as const;
      rows.set(row.event_id, {
        event_id: row.event_id,
        type: row.type,
        created_at: row.created_at,
        received_at: new Date().toISOString(),
        attempted_at: row.attempted_at ?? new Date().toISOString(),
        payload: row.payload,
        handled_at: null,
        error: null,
      });
      if (state.loseInsertResponse) throw new Error("The operation was aborted due to timeout");
      return "inserted" as const;
    },
    async isHandled(eventId: string) {
      state.writes.push(`read ${eventId}`);
      return Boolean(rows.get(eventId)?.handled_at);
    },
    async reclaim(eventId: string, attemptAt: Date, staleBefore: Date) {
      state.writes.push(`reclaim ${eventId}`);
      const row = rows.get(eventId);
      if (!row || row.handled_at !== null) return false;
      if (row.error === null && Date.parse(row.attempted_at) >= staleBefore.getTime()) return false;
      Object.assign(row, { error: null, attempted_at: attemptAt.toISOString() });
      return true;
    },
    async markHandled(eventId: string, handledAt: Date) {
      state.writes.push(`handled ${eventId}`);
      if (state.failMarks) throw new Error("connection reset");
      const row = rows.get(eventId);
      if (row) Object.assign(row, { handled_at: handledAt.toISOString(), error: null });
    },
    async markFailed(eventId: string, error: string) {
      state.writes.push(`failed ${eventId}`);
      if (state.failMarkFailed) throw new Error("connection refused");
      if (!error.isWellFormed()) throw new Error("PGRST102 Empty or invalid json");
      const row = rows.get(eventId);
      if (row && row.handled_at === null) row.error = error;
    },
  };
  return { rows, state, client, store };
});

vi.mock("@/lib/db/client", () => ({ createServiceClient: vi.fn(() => memory.client) }));
vi.mock("@/lib/stripe/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe/events")>();
  return { ...actual, createStripeEventStore: vi.fn(() => memory.store) };
});

const { createServiceClient } = await import("@/lib/db/client");
const { createStripeEventStore } = await import("@/lib/stripe/events");
const { stripeHandlers } = await import("@/lib/stripe/handlers");
const route = await import("@/app/api/stripe/webhook/route");

// Test-only values. The secret signs requests inside this process and nowhere else.
const SECRET = "whsec_unit_test_only_not_a_real_secret";
const OTHER_SECRET = "whsec_some_other_endpoint";
// A synthetic customer detail that must never reach a log line.
const PAYLOAD_MARKER = "payload-marker-l2@example.invalid";
const CREATED = Math.floor(Date.UTC(2026, 9, 21, 9, 30) / 1000);

let sequence = 0;

function event(type = "payment_intent.succeeded", overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    id: `evt_unit${sequence}`,
    object: "event",
    api_version: "2026-09-30.endive",
    created: CREATED,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: {
      object: {
        id: `pi_unit${sequence}`,
        object: "payment_intent",
        amount: 18_500,
        currency: "usd",
        status: "succeeded",
        receipt_email: PAYLOAD_MARKER,
        metadata: { hold_id: "00000000-0000-4000-8000-000000000001" },
      },
    },
    ...overrides,
  };
}

function post(body: string, signature: string | null): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", body, headers });
}

function signed(payload: object, options: { secret?: string; timestamp?: number } = {}): Request {
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: options.secret ?? SECRET,
    ...(options.timestamp === undefined ? {} : { timestamp: options.timestamp }),
  });
  return post(body, signature);
}

async function send(request: Request): Promise<{ status: number; body: Record<string, unknown>; text: string }> {
  const response = await route.POST(request);
  const text = await response.text();
  return { status: response.status, body: JSON.parse(text) as Record<string, unknown>, text };
}

let handler: MockInstance;

beforeEach(() => {
  memory.rows.clear();
  memory.state.failInserts = false;
  memory.state.loseInsertResponse = false;
  memory.state.failMarks = false;
  memory.state.failMarkFailed = false;
  memory.state.writes.length = 0;
  vi.mocked(createServiceClient).mockClear();
  vi.mocked(createStripeEventStore).mockClear();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  handler = vi.spyOn(stripeHandlers, "payment_intent.succeeded");
});

afterEach(() => {
  handler.mockRestore();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const T0 = Date.UTC(2026, 9, 21, 10, 0);

/** Moves the clock the route, the signer and the signature check all read (Date only; timers stay real). */
function clockAt(ms: number): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(ms);
}

/** A row left by an earlier attempt that never finished: unhandled, no error, started at `attemptedAt`. */
function seedUnfinished(evt: ReturnType<typeof event>, attemptedAt: number): void {
  memory.rows.set(evt.id, {
    event_id: evt.id,
    type: evt.type,
    created_at: new Date(evt.created * 1000).toISOString(),
    received_at: new Date(attemptedAt).toISOString(),
    attempted_at: new Date(attemptedAt).toISOString(),
    payload: evt,
    handled_at: null,
    error: null,
  });
}

describe("POST /api/stripe/webhook: signature", () => {
  it("accepts an event signed with STRIPE_WEBHOOK_SECRET, records it before the handler runs, then marks it handled", async () => {
    const evt = event();
    handler.mockImplementation(async (received: { id: string }) => {
      // The row is on file before any handler code runs.
      expect(memory.rows.get(received.id)?.handled_at).toBeNull();
    });

    const { status, body } = await send(signed(evt));

    expect(status).toBe(200);
    expect(body).toEqual({ received: true, handled: true });
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(createServiceClient).toHaveBeenCalledWith({ kind: "system", name: "stripe-webhook" });
    expect(createStripeEventStore).toHaveBeenCalledWith(memory.client);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: evt.id, type: evt.type }), memory.client);
    expect(memory.state.writes).toEqual([`insert ${evt.id}`, `handled ${evt.id}`]);

    const row = memory.rows.get(evt.id);
    expect(row).toMatchObject({
      event_id: evt.id,
      type: "payment_intent.succeeded",
      created_at: "2026-10-21T09:30:00.000Z",
      payload: evt,
      error: null,
    });
    expect(Date.parse(row?.handled_at ?? "")).not.toBeNaN();
  });

  it("refuses an event signed with another secret: 400, nothing stored, no database client", async () => {
    const { status, body } = await send(signed(event(), { secret: OTHER_SECRET }));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "invalidSignature" });
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(memory.rows.size).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("refuses a body changed after signing", async () => {
    const evt = event();
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: JSON.stringify(evt), secret: SECRET });
    const tampered = JSON.stringify({ ...evt, data: { object: { ...evt.data.object, amount: 1 } } });

    const { status, body } = await send(post(tampered, signature));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "invalidSignature" });
    expect(memory.rows.size).toBe(0);
  });

  it("refuses a signature older than the five-minute tolerance (a replayed request)", async () => {
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    const { status } = await send(signed(event(), { timestamp: tenMinutesAgo }));

    expect(status).toBe(400);
    expect(memory.rows.size).toBe(0);
  });

  it("refuses a request without a Stripe-Signature header", async () => {
    const { status, body } = await send(post(JSON.stringify(event()), null));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "missingSignature" });
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("answers 500 (so Stripe retries) and touches nothing when STRIPE_WEBHOOK_SECRET is not set", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await send(signed(event()));

    expect(status).toBe(500);
    expect(body).toEqual({ error: "notConfigured" });
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook: idempotency", () => {
  it("answers 200 to a duplicate delivery without calling the handler a second time", async () => {
    const evt = event();

    const first = await send(signed(evt));
    const second = await send(signed(evt));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ received: true, duplicate: true });
    expect(memory.rows.size).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("stores and acknowledges an event type that has no handler, leaving it unhandled", async () => {
    const evt = event("customer.created");

    const { status, body } = await send(signed(evt));

    expect(status).toBe(200);
    expect(body).toEqual({ received: true, handled: false });
    expect(memory.rows.get(evt.id)).toMatchObject({ type: "customer.created", handled_at: null, error: null });
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 200 to a redelivered event of a type with no handler, even long after, without touching the row", async () => {
    clockAt(T0);
    const evt = event("customer.created");
    await send(signed(evt));
    clockAt(T0 + STALE_ATTEMPT_MS * 3);
    memory.state.writes.length = 0;

    const { status, body } = await send(signed(evt));

    expect(status).toBe(200);
    expect(body).toEqual({ received: true, duplicate: true });
    expect(memory.state.writes).toEqual([`insert ${evt.id}`]);
  });

  it("records attempted_at, in UTC, as the time the delivery arrived", async () => {
    clockAt(T0);
    const evt = event();

    await send(signed(evt));

    expect(memory.rows.get(evt.id)?.attempted_at).toBe("2026-10-21T10:00:00.000Z");
  });
});

describe("POST /api/stripe/webhook: an attempt that never finished", () => {
  it("answers 409 (so Stripe retries later) while an earlier attempt is still running, and runs no handler", async () => {
    clockAt(T0);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const evt = event();
    seedUnfinished(evt, T0 - 30_000);

    const { status, body } = await send(signed(evt));

    expect(status).toBe(409);
    expect(body).toEqual({ error: "inProgress" });
    expect(handler).not.toHaveBeenCalled();
    expect(memory.rows.get(evt.id)).toMatchObject({ handled_at: null, error: null, attempted_at: new Date(T0 - 30_000).toISOString() });
  });

  it("takes back an event whose attempt died (no error recorded, started more than STALE_ATTEMPT_MS ago) and handles it", async () => {
    clockAt(T0);
    const evt = event();
    seedUnfinished(evt, T0 - STALE_ATTEMPT_MS - 1_000);

    const { status, body } = await send(signed(evt));

    expect(status).toBe(200);
    expect(body).toEqual({ received: true, handled: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(memory.rows.get(evt.id)).toMatchObject({ attempted_at: new Date(T0).toISOString(), error: null });
    expect(memory.rows.get(evt.id)?.handled_at).not.toBeNull();
  });

  it("recovers when the handler fails and the error cannot be recorded either (database gone)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("connection refused"));
    memory.state.failMarkFailed = true;
    const evt = event();

    clockAt(T0);
    expect((await send(signed(evt))).status).toBe(500);
    expect(memory.rows.get(evt.id)).toMatchObject({ handled_at: null, error: null });
    memory.state.failMarkFailed = false;

    clockAt(T0 + 60_000);
    const early = await send(signed(evt));
    clockAt(T0 + STALE_ATTEMPT_MS + 60_000);
    const later = await send(signed(evt));

    expect(early.status).toBe(409);
    expect(later.status).toBe(200);
    expect(later.body).toEqual({ received: true, handled: true });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(memory.rows.get(evt.id)?.handled_at).not.toBeNull();
  });

  it("recovers when the insert committed but its response was lost", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    memory.state.loseInsertResponse = true;
    const evt = event();

    clockAt(T0);
    const first = await send(signed(evt));
    memory.state.loseInsertResponse = false;
    clockAt(T0 + STALE_ATTEMPT_MS + 60_000);
    const retry = await send(signed(evt));

    expect(first).toMatchObject({ status: 500, body: { error: "storeFailed" } });
    expect(memory.rows.size).toBe(1);
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ received: true, handled: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("lets only one of two concurrent retries take a failed event back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("temporary"));
    const evt = event();
    expect((await send(signed(evt))).status).toBe(500);

    const both = await Promise.all([send(signed(evt)), send(signed(evt))]);

    // One takes it back and handles it; the other finds it taken (409) or, if it looks later, already handled (200).
    expect(both.filter((r) => r.body.handled === true)).toHaveLength(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/stripe/webhook: failures", () => {
  it("records a handler error on the row and answers 500, with no message or stack in the response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("booking insert failed for hold 42"));
    const evt = event();

    const { status, body, text } = await send(signed(evt));

    expect(status).toBe(500);
    expect(body).toEqual({ error: "handlerFailed" });
    expect(text).not.toContain("booking insert failed");
    expect(text).not.toMatch(/\bat\s.+:\d+/);
    expect(memory.rows.get(evt.id)).toMatchObject({ handled_at: null, error: "Error: booking insert failed for hold 42" });
  });

  it("lets Stripe's retry run the handler again after a failure, then treats later deliveries as duplicates", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("temporary"));
    const evt = event();

    expect((await send(signed(evt))).status).toBe(500);
    const retry = await send(signed(evt));
    const later = await send(signed(evt));

    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ received: true, handled: true });
    expect(later.body).toEqual({ received: true, duplicate: true });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(memory.rows.size).toBe(1);
    expect(memory.rows.get(evt.id)?.error).toBeNull();
    expect(memory.rows.get(evt.id)?.handled_at).not.toBeNull();
  });

  it("answers 500 without running a handler when the event cannot be recorded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    memory.state.failInserts = true;

    const { status, body } = await send(signed(event()));

    expect(status).toBe(500);
    expect(body).toEqual({ error: "storeFailed" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 500 and leaves the row retryable when handled_at cannot be stamped", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    memory.state.failMarks = true;
    const evt = event();

    const { status } = await send(signed(evt));

    expect(status).toBe(500);
    expect(memory.rows.get(evt.id)?.handled_at).toBeNull();
    expect(memory.rows.get(evt.id)?.error).toMatch(/stamping handled_at failed/);
  });

  it("records a long handler error cut whole (never half an emoji), so the retry can take the row back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // "Error: " plus 991 characters puts the emoji's first UTF-16 half at index 998, where a naive cut lands.
    handler.mockRejectedValueOnce(new Error(`${"x".repeat(991)}\u{1F600} and more`));
    const evt = event();

    expect((await send(signed(evt))).status).toBe(500);
    const stored = memory.rows.get(evt.id)?.error ?? "";
    const retry = await send(signed(evt));

    expect(stored.isWellFormed()).toBe(true);
    expect(Array.from(stored)).toHaveLength(STORED_ERROR_MAX_CHARS);
    expect(stored.endsWith("…")).toBe(true);
    expect(retry.body).toEqual({ received: true, handled: true });
  });

  it("never logs the payload", async () => {
    const lines: unknown[][] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args);
      });
    }

    handler.mockRejectedValueOnce(new Error("handler failed"));
    await send(signed(event()));
    memory.state.failInserts = true;
    await send(signed(event()));

    expect(lines.length).toBeGreaterThan(0);
    const logged = JSON.stringify(lines);
    expect(logged).not.toContain(PAYLOAD_MARKER);
    expect(logged).not.toContain("18500");
  });
});

describe("app/api/stripe/webhook/route.ts", () => {
  it("runs on Node and exports POST only (Next.js answers 405 to other methods)", () => {
    expect(route.runtime).toBe("nodejs");
    const handlers = Object.keys(route).filter((name) => /^[A-Z]+$/.test(name));
    expect(handlers).toEqual(["POST"]);
  });
});
