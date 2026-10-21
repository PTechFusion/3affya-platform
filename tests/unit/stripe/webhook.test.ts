// POST /api/stripe/webhook end to end, with the database layer mocked (lane L2, task 1.8). Requests are signed the way
// Stripe signs them (Stripe.webhooks.generateTestHeaderString) with a test-only secret; nothing leaves the process.
// The in-memory store mirrors the migration's rules: event_id is the primary key, an insert of a known id is a duplicate,
// and only a row with an error and no handled_at can be taken back.
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { StripeEventInsert, StripeEventRow } from "@/lib/stripe/types";

const memory = vi.hoisted(() => {
  const rows = new Map<string, StripeEventRow>();
  const state = { failInserts: false, failMarks: false, writes: [] as string[] };
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
        payload: row.payload,
        handled_at: null,
        error: null,
      });
      return "inserted" as const;
    },
    async reclaimFailed(eventId: string) {
      state.writes.push(`reclaim ${eventId}`);
      const row = rows.get(eventId);
      if (!row || row.handled_at !== null || row.error === null) return false;
      row.error = null;
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
  memory.state.failMarks = false;
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
});

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
