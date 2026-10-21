// Every call lib/ai makes writes one ai_calls row (task 1.9; architecture observability): job, step, vendor, model, input and
// output tokens, cost, latency, ok or failed with the reason. A retry after invalid output is its own row (attempt 2): it was
// its own request and its own cost. Calls refused before they reach the vendor (bad input, circuit open, token cap) are rows
// too, with no tokens, so a job's failure is explained in the same table. A row never holds document content or model output:
// page references are ids ("d1:p2") and failure details are error classes, statuses and schema paths.
//
// Writers: the database writer (production) inserts with the service client as a named system caller, idempotent on the row
// id the client generates; the JSONL writer and the memory writer serve the spike and the unit tests, which run without a
// database. ai_calls is service role only (supabase/migrations/20261021000200_l3_ai_calls.sql).
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiModelPrice } from "@/config/business";
import { createServiceClient } from "@/lib/db/client";
import type { VendorName } from "./vendors/types";

/** Why a call failed; the ai_calls_failure_reason check in the migration lists the same words. */
export const AI_CALL_FAILURES = [
  "bad_input", // the page or items did not pass the client's own checks; nothing was sent
  "circuit_open", // the circuit was open; nothing was sent
  "token_cap", // the job's token cap left too little for a call; nothing was sent
  "budget_unavailable", // the job's earlier token use could not be read, so the cap could not be checked; nothing was sent
  "timeout", // the vendor did not answer within the call's deadline
  "unavailable", // rate limit, overload, 5xx or network
  "rejected", // the vendor refused the request (4xx)
  "refusal", // the model declined (stop reason refusal)
  "max_tokens", // the output was cut off at max_tokens
  "invalid_output", // not JSON, or it failed the schema or the grounding checks
] as const;
export type AiCallFailure = (typeof AI_CALL_FAILURES)[number];

export type AiStep = "extract" | "summarise";

/** One ai_calls row. Until the orchestrator regenerates lib/db/types.ts after this lane merges, the row type lives here. */
export interface AiCallRow {
  id: string;
  job_id: string;
  step: AiStep;
  page_ref: string | null;
  page_id: string | null;
  attempt: number;
  vendor: VendorName;
  model: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
  /** Millionths of cost_currency (as ai_jobs.cost_micros). A page call costs fractions of a cent, so cents would read 0. */
  cost_micros: number;
  cost_currency: "USD";
  latency_ms: number;
  outcome: "ok" | "failed";
  failure_reason: AiCallFailure | null;
  failure_detail: string | null;
  stop_reason: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AiCallWriter {
  write(row: AiCallRow): Promise<void>;
}

/**
 * Cost in micro-USD, rounded up: one USD per million tokens is one micro-USD per token. A request whose input passes the
 * model's long-context threshold is billed at the long-context rate for the whole request.
 */
export function costMicros(price: AiModelPrice, inputTokens: number, outputTokens: number): number {
  const rate = price.longContext && inputTokens > price.longContext.aboveInputTokens ? price.longContext : price;
  // The small epsilon keeps binary rounding (3,000 x 0.1 is 300.00000000000006) from adding a micro-USD.
  return Math.max(0, Math.ceil(inputTokens * rate.inputUsdPerMTok + outputTokens * rate.outputUsdPerMTok - 1e-6));
}

/** Keeps rows in memory (unit tests, and the spike's report). */
export function memoryWriter(): AiCallWriter & { rows: AiCallRow[] } {
  const rows: AiCallRow[] = [];
  return {
    rows,
    async write(row) {
      rows.push(row);
    },
  };
}

/** Appends one JSON line per row to a file (the spike's log, no database needed). */
export function jsonlWriter(path: string): AiCallWriter {
  let ready: Promise<unknown> | null = null;
  return {
    async write(row) {
      ready ??= mkdir(dirname(path), { recursive: true });
      await ready;
      await appendFile(path, `${JSON.stringify(row)}\n`, "utf8");
    },
  };
}

/** Writes every row to each writer in turn. */
export function teeWriter(...writers: AiCallWriter[]): AiCallWriter {
  return {
    async write(row) {
      for (const writer of writers) await writer.write(row);
    },
  };
}

type SystemCaller = "inngest" | "script";

// ai_calls is not in the generated lib/db/types.ts until the orchestrator regenerates it after this lane merges; until then
// the insert goes through an untyped view of the same client (same key, same timeout).
function untyped(client: unknown): SupabaseClient {
  return client as SupabaseClient;
}

/**
 * Inserts each row into ai_calls with the service client as a named system caller (lib/db/client.ts): "inngest" for the
 * pipeline, "script" for the spike. A retried insert of the same row is ignored (the row id is the key), so the write is
 * idempotent. The ai_calls trigger adds the row's tokens and cost to its ai_jobs totals in the same statement.
 */
export function databaseWriter(caller: SystemCaller = "inngest"): AiCallWriter {
  let client: SupabaseClient | null = null;
  return {
    async write(row) {
      client ??= untyped(createServiceClient({ kind: "system", name: caller }));
      const { error } = await client.from("ai_calls").upsert(row, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(`ai_calls insert failed (${error.code ?? "no code"})`);
    },
  };
}

/** A job's tokens so far, from its ai_jobs totals: the token ledger's starting point when a job resumes in a new process. */
export function jobTokensFromDatabase(caller: SystemCaller = "inngest"): (jobId: string) => Promise<number> {
  return async (jobId) => {
    const db = createServiceClient({ kind: "system", name: caller });
    const { data, error } = await db.from("ai_jobs").select("input_tokens, output_tokens").eq("id", jobId).maybeSingle();
    if (error) throw new Error(`ai_jobs read failed (${error.code ?? "no code"})`);
    return data ? Number(data.input_tokens) + Number(data.output_tokens) : 0;
  };
}
