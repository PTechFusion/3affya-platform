// lib/ai/log.ts: cost from the price table, the JSONL writer the spike uses, and the database writer (service client mocked):
// a named system caller, an idempotent insert into ai_calls, and the ai_jobs totals that seed the token counter.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const upsert = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => ({ upsert, select, table }));
  const createServiceClient = vi.fn(() => ({ from }));
  return { upsert, maybeSingle, eq, select, from, createServiceClient };
});

vi.mock("@/lib/db/client", () => ({ createServiceClient: db.createServiceClient }));

import { aiPricing } from "@/config/business";
import { AI_CALL_FAILURES, costMicros, databaseWriter, jobTokensFromDatabase, jsonlWriter, type AiCallRow } from "@/lib/ai/log";
import { JOB, repoPath } from "./support";

const row = (fields: Partial<AiCallRow> = {}): AiCallRow => ({
  id: "44444444-4444-4444-8444-444444444444",
  job_id: JOB,
  step: "extract",
  page_ref: "d1:p1",
  page_id: null,
  attempt: 1,
  vendor: "anthropic",
  model: "claude-opus-5-5",
  prompt_version: "2026-10-21.1",
  input_tokens: 3_000,
  output_tokens: 1_500,
  cost_micros: 42_000,
  cost_currency: "USD",
  latency_ms: 8_400,
  outcome: "failed",
  failure_reason: "timeout",
  failure_detail: "the Anthropic API did not answer within the call's deadline",
  stop_reason: null,
  request_id: null,
  created_at: "2026-10-21T09:00:00.000Z",
  ...fields,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("costMicros", () => {
  it("prices input and output per million tokens, in micro-USD, rounded up", () => {
    const opus = aiPricing.anthropic["claude-opus-5-5"]!;
    expect(costMicros(opus, 3_000, 1_500)).toBe(42_000); // USD 0.042
    expect(costMicros(aiPricing.anthropic["claude-sonnet-5-5"]!, 3_000, 1_500)).toBe(21_000);
    expect(costMicros(aiPricing.anthropic["claude-haiku-5-5"]!, 3, 1)).toBe(1); // 0.8 micro-USD rounds up
    expect(costMicros(opus, 0, 0)).toBe(0);
    expect(costMicros(aiPricing.anthropic["claude-haiku-5-5"]!, 3_000, 0)).toBe(300); // not 301 from binary rounding
  });

  it("bills a request past a long-context threshold at the long-context rate", () => {
    const haiku = aiPricing.anthropic["claude-haiku-5-5"]!;
    expect(costMicros(haiku, 100_000, 1_000)).toBe(10_500);
    expect(costMicros(haiku, 100_001, 1_000)).toBe(Math.ceil(100_001 * 0.5 + 1_000 * 2.5));
  });

  it("has a first-party price for the four current Claude models and none yet for Bedrock", () => {
    expect(Object.keys(aiPricing.anthropic).sort()).toEqual(["claude-fable-5-1", "claude-haiku-5-5", "claude-opus-5-5", "claude-sonnet-5-5"]);
    expect(aiPricing.bedrock).toEqual({});
  });
});

describe("the failure reasons", () => {
  it("are the ones the migration's check constraint allows", async () => {
    const sql = await readFile(repoPath("supabase/migrations/20261021000200_l3_ai_calls.sql"), "utf8");
    const listed = /failure_reason in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    expect([...listed.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])).toEqual([...AI_CALL_FAILURES]);
  });
});

describe("jsonlWriter", () => {
  it("appends one JSON line per row, creating the folder", async () => {
    const dir = await mkdtemp(join(tmpdir(), "l3-jsonl-"));
    try {
      const path = join(dir, "nested", "calls.jsonl");
      const writer = jsonlWriter(path);
      await writer.write(row());
      await writer.write(row({ attempt: 2, outcome: "ok", failure_reason: null, failure_detail: null }));
      const lines = (await readFile(path, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
      expect(lines.map((l) => `${l.attempt}:${l.outcome}`)).toEqual(["1:failed", "2:ok"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("databaseWriter", () => {
  it("records a failed call in ai_calls as the inngest system caller, idempotent on the row id", async () => {
    db.upsert.mockResolvedValue({ error: null });
    const writer = databaseWriter();
    await writer.write(row());
    await writer.write(row({ id: "55555555-5555-4555-8555-555555555555" }));
    expect(db.createServiceClient).toHaveBeenCalledTimes(1);
    expect(db.createServiceClient).toHaveBeenCalledWith({ kind: "system", name: "inngest" });
    expect(db.from).toHaveBeenCalledWith("ai_calls");
    expect(db.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ outcome: "failed", failure_reason: "timeout", job_id: JOB }), {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  });

  it("is the script caller for the spike", async () => {
    db.upsert.mockResolvedValue({ error: null });
    await databaseWriter("script").write(row());
    expect(db.createServiceClient).toHaveBeenCalledWith({ kind: "system", name: "script" });
  });

  it("throws when the insert fails, naming only the error code", async () => {
    db.upsert.mockResolvedValue({ error: { code: "42501", message: "permission denied for table ai_calls" } });
    await expect(databaseWriter().write(row())).rejects.toThrow("ai_calls insert failed (42501)");
  });
});

describe("jobTokensFromDatabase", () => {
  it("reads the job's input and output totals from ai_jobs", async () => {
    db.maybeSingle.mockResolvedValue({ data: { input_tokens: 120_000, output_tokens: 45_000 }, error: null });
    expect(await jobTokensFromDatabase()(JOB)).toBe(165_000);
    expect(db.from).toHaveBeenCalledWith("ai_jobs");
    expect(db.eq).toHaveBeenCalledWith("id", JOB);
  });

  it("is 0 for a job with no row yet, and throws when the read fails", async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await jobTokensFromDatabase()(JOB)).toBe(0);
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "57014" } });
    await expect(jobTokensFromDatabase()(JOB)).rejects.toThrow("ai_jobs read failed (57014)");
  });
});
