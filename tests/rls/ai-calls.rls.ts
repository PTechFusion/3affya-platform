// Lane L3 (task 1.9): ai_calls, the cross-tenant test CLAUDE.md asks of every new table (L1's matrix leaves the table to its
// lane: OTHER_LANE_TABLES in support/tables.ts). ai_calls is service role only (supabase/migrations/20261021000200_l3_ai_calls.sql):
// lib/ai's database writer inserts through the service client as a named system caller, and every API role, the TOTP admin
// included, is refused every read and write. Also: the writer's insert is idempotent on the row id, the trigger adds a call's
// tokens and cost to its ai_jobs totals once, and deleting the job takes its calls with it (the fixture world's cleanup).
// Needs the L3 migration applied to the local stack.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { databaseWriter, type AiCallRow } from "../../lib/ai/log";
import { buildWorld, type World } from "./support/fixtures";
import { expectDeleteRefused, expectInsertRefused, expectReadRefused, expectUpdateRefused, readAsService } from "./support/refusal";

let w: World;
let call: AiCallRow;

const ATTACKERS = ["patientA", "patientB", "professionalA", "admin", "anon"] as const;

beforeAll(async () => {
  // lib/db/client.ts reads the stack from the environment; the suite resolved it once (support/env.ts).
  const stack = inject("rlsStack");
  process.env.SUPABASE_URL = stack.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = stack.serviceKey;
  w = await buildWorld("aiCalls");
  call = {
    id: randomUUID(),
    job_id: w.ids.aiJobA,
    step: "extract",
    page_ref: "d1:p1",
    page_id: null,
    attempt: 1,
    vendor: "anthropic",
    model: "rls-test-model",
    prompt_version: "rls-test",
    input_tokens: 3_000,
    output_tokens: 1_500,
    cost_micros: 42_000,
    cost_currency: "USD",
    latency_ms: 8_400,
    outcome: "failed",
    failure_reason: "invalid_output",
    failure_detail: "items.0.date: custom",
    stop_reason: "end_turn",
    request_id: null,
    created_at: new Date().toISOString(),
  };
});

afterAll(async () => {
  await w?.cleanup();
});

async function jobTotals(): Promise<{ input: number; output: number; cost: number }> {
  const row = await readAsService(w.service, "ai_jobs", { id: w.ids.aiJobA });
  return { input: Number(row?.input_tokens), output: Number(row?.output_tokens), cost: Number(row?.cost_micros) };
}

describe("ai_calls: the database writer", () => {
  it("inserts one row as the service role and adds its tokens and cost to the job's totals, once", async () => {
    const before = await jobTotals();
    const writer = databaseWriter("script");
    await writer.write(call);
    await writer.write(call); // a retried insert of the same row
    const { data, error } = await w.service.from("ai_calls").select("id, outcome, failure_reason, cost_micros").eq("job_id", w.ids.aiJobA);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: call.id, outcome: "failed", failure_reason: "invalid_output", cost_micros: 42_000 }]);
    expect(await jobTotals()).toEqual({ input: before.input + 3_000, output: before.output + 1_500, cost: before.cost + 42_000 });
  });

  it("refuses a row whose step makes no AI call, or a failed row without a reason", async () => {
    for (const bad of [{ step: "validate" }, { failure_reason: null }]) {
      const { error } = await w.service.from("ai_calls").insert({ ...call, id: randomUUID(), ...bad });
      expect(error?.code, JSON.stringify(bad)).toBe("23514");
    }
  });
});

describe("ai_calls: service role only", () => {
  for (const who of ATTACKERS) {
    it(`refuses ${who} every read and write`, async () => {
      const client = w.personas[who].client;
      await expectReadRefused(client, "ai_calls", [{ id: call.id }, { job_id: w.ids.aiJobA }], who);
      await expectInsertRefused(client, "ai_calls", { ...call, id: randomUUID() }, who);
      await expectUpdateRefused(client, w.service, "ai_calls", { id: call.id }, { cost_micros: 0 }, who);
      await expectDeleteRefused(client, w.service, "ai_calls", { id: call.id }, who);
    });
  }

  it("answers permission denied, not an empty list, so no API role can even probe it", async () => {
    for (const who of ATTACKERS) {
      const { error } = await w.personas[who].client.from("ai_calls").select("id").limit(1);
      expect(error?.code, who).toBe("42501");
    }
  });
});
