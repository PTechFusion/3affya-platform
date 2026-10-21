// lib/stripe/events.ts against a real supabase-js client whose fetch is a stub: proves the requests PostgREST receives
// (the on-conflict insert, the conditional reclaim) without a database. The live check in scripts/stripe-webhook-replay.mjs
// runs the same calls against the local stack.
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { DbClient } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";
import { createStripeEventStore, StripeEventStoreError } from "@/lib/stripe/events";

interface Seen {
  method: string;
  url: URL;
  prefer: string;
  body: unknown;
}

function stubbedStore(reply: { status: number; body: unknown }) {
  const seen: Seen[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const text = await request.text();
    seen.push({
      method: request.method,
      url: new URL(request.url),
      prefer: request.headers.get("prefer") ?? "",
      body: text ? JSON.parse(text) : null,
    });
    // A 204 carries no body (the Response constructor refuses one).
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  };
  const db: DbClient = createClient<Database>("http://postgrest.stub.invalid", "test-key-not-real", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchStub },
  });
  return { store: createStripeEventStore(db), seen };
}

const row = {
  event_id: "evt_store1",
  type: "payment_intent.succeeded",
  created_at: "2026-10-21T09:30:00.000Z",
  payload: { id: "evt_store1", object: "event" },
};

describe("createStripeEventStore", () => {
  it("inserts with on conflict (event_id) do nothing, returning the id: a row back means inserted", async () => {
    const { store, seen } = stubbedStore({ status: 201, body: [{ event_id: "evt_store1" }] });

    await expect(store.insert(row)).resolves.toBe("inserted");

    const [request] = seen;
    expect(request?.method).toBe("POST");
    expect(request?.url.pathname).toBe("/rest/v1/stripe_events");
    expect(request?.url.searchParams.get("on_conflict")).toBe("event_id");
    expect(request?.url.searchParams.get("select")).toBe("event_id");
    expect(request?.prefer).toContain("resolution=ignore-duplicates");
    expect(request?.prefer).toContain("return=representation");
    expect(request?.body).toEqual(row);
  });

  it("reports a duplicate when the insert returns no row", async () => {
    const { store } = stubbedStore({ status: 201, body: [] });
    await expect(store.insert(row)).resolves.toBe("duplicate");
  });

  it("reclaims only an unhandled row with an error, in one conditional update", async () => {
    const { store, seen } = stubbedStore({ status: 200, body: [{ event_id: "evt_store1" }] });

    await expect(store.reclaimFailed("evt_store1")).resolves.toBe(true);

    const [request] = seen;
    expect(request?.method).toBe("PATCH");
    expect(request?.url.searchParams.get("event_id")).toBe("eq.evt_store1");
    expect(request?.url.searchParams.get("handled_at")).toBe("is.null");
    expect(request?.url.searchParams.get("error")).toBe("not.is.null");
    expect(request?.body).toEqual({ error: null });
  });

  it("does not reclaim when the update matches nothing (handled, in flight, or never failed)", async () => {
    const { store } = stubbedStore({ status: 200, body: [] });
    await expect(store.reclaimFailed("evt_store1")).resolves.toBe(false);
  });

  it("stamps handled_at in UTC and clears the error", async () => {
    const { store, seen } = stubbedStore({ status: 204, body: null });

    await store.markHandled("evt_store1", new Date("2026-10-21T09:31:02.000Z"));

    expect(seen[0]?.method).toBe("PATCH");
    expect(seen[0]?.url.searchParams.get("event_id")).toBe("eq.evt_store1");
    expect(seen[0]?.body).toEqual({ handled_at: "2026-10-21T09:31:02.000Z", error: null });
  });

  it("records a failure only on a row not yet handled", async () => {
    const { store, seen } = stubbedStore({ status: 204, body: null });

    await store.markFailed("evt_store1", "Error: boom");

    expect(seen[0]?.url.searchParams.get("handled_at")).toBe("is.null");
    expect(seen[0]?.body).toEqual({ error: "Error: boom" });
  });

  it("throws a StripeEventStoreError carrying the code but not the database message", async () => {
    const { store } = stubbedStore({
      status: 400,
      body: { code: "23514", message: "new row violates check constraint, Failing row contains (secret value)" },
    });

    const failure = await store.insert(row).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(StripeEventStoreError);
    expect((failure as StripeEventStoreError).code).toBe("23514");
    expect((failure as Error).message).not.toContain("secret value");
  });
});
