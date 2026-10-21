#!/usr/bin/env node
// Live check of POST /api/stripe/webhook without the Stripe CLI (lane L2, task 1.8). Signs events the way Stripe does
// (Stripe.webhooks.generateTestHeaderString with STRIPE_WEBHOOK_SECRET), posts them to a running server and counts the
// stripe_events rows through PostgREST with the service key. Local only: it refuses any host but localhost/127.0.0.1,
// because it writes synthetic rows and, once task 3.1 lands, a synthetic payment would reach a real handler.
//
// Env (shell only, never a committed file): STRIPE_WEBHOOK_SECRET (the server's), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (`npx supabase status -o env` prints both), BASE_URL (default http://localhost:3000).
//
//   node scripts/stripe-webhook-replay.mjs               synthetic payment_intent.succeeded: posted twice (both 200,
//                                                        one row, handled), a bad signature (400, no row), a retry
//                                                        after a recorded failure (taken back, handled), a delivery
//                                                        while an attempt is still running (409, untouched), and one
//                                                        after an attempt that died (taken back, handled)
//   node scripts/stripe-webhook-replay.mjs --event f.json [--times 2]
//                                                        re-posts a real test-mode event (e.g. `stripe events retrieve`
//                                                        output) and checks it still has exactly one row
//   node scripts/stripe-webhook-replay.mjs --count evt_x exits 0 when evt_x has exactly one row (add --handled to
//                                                        also require handled_at)
//   add --cleanup to delete the synthetic rows afterwards
//
// The payload is never printed; output names event ids, statuses and row counts only.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";

const TIMEOUT_MS = 20_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set; see the header of scripts/stripe-webhook-replay.mjs`);
    process.exit(2);
  }
  return value;
}

function requireLocal(name, url) {
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    console.error(`${name} points at ${host}; this script runs against a local server and database only`);
    process.exit(2);
  }
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const webhookUrl = `${baseUrl}/api/stripe/webhook`;
const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireLocal("BASE_URL", baseUrl);
requireLocal("SUPABASE_URL", supabaseUrl);

const rest = (path, init = {}) =>
  fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

async function rowsFor(eventId) {
  const response = await rest(
    `stripe_events?event_id=eq.${encodeURIComponent(eventId)}&select=event_id,type,attempted_at,handled_at,error`,
  );
  if (!response.ok) throw new Error(`PostgREST answered ${response.status} reading stripe_events`);
  return response.json();
}

async function deliver(payload, secret) {
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

function syntheticEvent(type = "payment_intent.succeeded") {
  const tag = randomBytes(6).toString("hex");
  return {
    id: `evt_l2replay${tag}`,
    object: "event",
    api_version: "2026-09-30.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: {
      object: { id: `pi_l2replay${tag}`, object: "payment_intent", amount: 18500, currency: "usd", status: "succeeded", metadata: {} },
    },
  };
}

/** Stores a row the way an earlier, unfinished or failed attempt left it (service key, synthetic event). */
async function seedRow(event, fields) {
  const seeded = await rest("stripe_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      event_id: event.id,
      type: event.type,
      created_at: new Date(event.created * 1000).toISOString(),
      payload: event,
      ...fields,
    }),
  });
  if (!seeded.ok) fail(`could not seed ${event.id}: PostgREST ${seeded.status}`);
}

async function expectOneRow(eventId, { handled }) {
  const rows = await rowsFor(eventId);
  if (rows.length !== 1) return fail(`${eventId}: ${rows.length} stripe_events rows, expected exactly 1`);
  const [row] = rows;
  if (handled && !row.handled_at) return fail(`${eventId}: handled_at is null (error: ${row.error ? "set" : "none"})`);
  console.log(`ok   ${eventId}: exactly 1 row; handled_at ${row.handled_at ?? "null"}; error ${row.error === null ? "null" : "set"}`);
}

async function postTimes(event, secret, times) {
  for (let n = 1; n <= times; n += 1) {
    const { status, body } = await deliver(event, secret);
    const line = `delivery ${n} of ${event.id}: HTTP ${status} ${JSON.stringify(body)}`;
    if (status === 200) console.log(`ok   ${line}`);
    else fail(line);
  }
}

async function cleanup(ids) {
  if (!flag("--cleanup")) return;
  for (const id of ids) {
    await rest(`stripe_events?event_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  console.log(`cleaned up ${ids.length} synthetic row(s)`);
}

const countId = option("--count");
const eventFile = option("--event");

if (countId) {
  await expectOneRow(countId, { handled: flag("--handled") });
} else {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  if (eventFile) {
    const event = JSON.parse(readFileSync(eventFile, "utf8"));
    const times = Number(option("--times") ?? 2);
    await postTimes(event, secret, times);
    await expectOneRow(event.id, { handled: false });
  } else {
    // 1. One signed payment_intent.succeeded, delivered twice: both 200, one row, handled.
    const event = syntheticEvent();
    await postTimes(event, secret, 2);
    await expectOneRow(event.id, { handled: true });

    // 2. A bad signature: 400 and nothing stored.
    const forged = syntheticEvent();
    const bad = await deliver(forged, `whsec_${randomBytes(16).toString("hex")}`);
    if (bad.status === 400) console.log(`ok   bad signature: HTTP 400 ${JSON.stringify(bad.body)}`);
    else fail(`bad signature: HTTP ${bad.status}, expected 400`);
    const forgedRows = await rowsFor(forged.id);
    if (forgedRows.length === 0) console.log(`ok   bad signature: no row for ${forged.id}`);
    else fail(`bad signature: ${forgedRows.length} row(s) stored for ${forged.id}`);

    // 3. Stripe's retry after a recorded failure: the row is taken back, the handler runs, handled_at is stamped.
    const retried = syntheticEvent();
    await seedRow(retried, { error: "Error: synthetic earlier failure (stripe-webhook-replay)" });
    await postTimes(retried, secret, 1);
    const [after] = await rowsFor(retried.id);
    if (after?.handled_at && after.error === null) console.log(`ok   retry after a failure: ${retried.id} handled, error cleared`);
    else fail(`retry after a failure: handled_at ${after?.handled_at ?? "null"}, error ${after?.error ? "set" : "null"}`);

    // 4. A delivery while an earlier attempt is still running (unhandled, no error, attempt just started): 409, untouched.
    const running = syntheticEvent();
    await seedRow(running, { attempted_at: new Date().toISOString() });
    const busy = await deliver(running, secret);
    const [stillRunning] = await rowsFor(running.id);
    if (busy.status === 409 && stillRunning && !stillRunning.handled_at) {
      console.log(`ok   attempt still running: HTTP 409 ${JSON.stringify(busy.body)}; ${running.id} left unhandled`);
    } else fail(`attempt still running: HTTP ${busy.status}, handled_at ${stillRunning?.handled_at ?? "null"}`);

    // 5. An attempt that died ten minutes ago without recording anything: the next delivery takes it back and handles it.
    const died = syntheticEvent();
    await seedRow(died, { attempted_at: new Date(Date.now() - 10 * 60_000).toISOString() });
    await postTimes(died, secret, 1);
    const [revived] = await rowsFor(died.id);
    if (revived?.handled_at && Date.parse(revived.attempted_at) > Date.now() - 60_000) {
      console.log(`ok   attempt that died: ${died.id} taken back and handled; attempted_at moved to this delivery`);
    } else fail(`attempt that died: handled_at ${revived?.handled_at ?? "null"}, attempted_at ${revived?.attempted_at ?? "?"}`);

    await cleanup([event.id, retried.id, running.id, died.id]);
  }
}

console.log(process.exitCode ? "stripe-webhook-replay: FAILED" : "stripe-webhook-replay: all checks passed");
