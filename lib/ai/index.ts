// lib/ai: the only way the app reaches a model (CLAUDE.md: never call a model SDK outside lib/ai). Server only.
//
//   extractPage(page, locale, { jobId, pageId? })   one page (a single-page PDF or one image) to a PageExtraction
//   summarise(items, locale, { jobId })             a set's items to a Summary (sections, flags, timeline)
//
// Both return { ok: true, data } or { ok: false, error }. The vendor (AI_VENDOR) and model (AI_MODEL) come from the environment
// (lib/ai/config.ts). The job id is what every call is logged and capped against: one ai_calls row per vendor request, and the
// per-job token cap in config/business.ts (aiLimits.jobTokenCap). This default client logs to the database as the "inngest"
// system caller and starts each job's counter from its ai_jobs totals; the spike and the tests build their own client with
// createAiClient and a JSONL or memory writer.
import { createAiClient, type AiClient, type CallContext, type Locale, type PageInput } from "./client";
import { databaseWriter, jobTokensFromDatabase } from "./log";
import type { RecordItem } from "./schemas";

export { checkPage, createAiClient } from "./client";
export type { AiClient, AiClientDeps, AiError, AiErrorCode, AiResult, AiSettings, CallContext, Locale, PageInput } from "./client";
export { readAiConfig } from "./config";
export type { AiConfig } from "./config";
export { costMicros, databaseWriter, jobTokensFromDatabase, jsonlWriter, memoryWriter, teeWriter } from "./log";
export type { AiCallFailure, AiCallRow, AiCallWriter } from "./log";
export { PROMPT_VERSION } from "./prompts";
export * from "./schemas";

let defaultClient: AiClient | null = null;

function client(): AiClient {
  defaultClient ??= createAiClient({ writer: databaseWriter("inngest"), tokensUsedBefore: jobTokensFromDatabase("inngest") });
  return defaultClient;
}

export function extractPage(input: PageInput, locale: Locale, ctx: CallContext) {
  return client().extractPage(input, locale, ctx);
}

export function summarise(items: RecordItem[], locale: Locale, ctx: CallContext) {
  return client().summarise(items, locale, ctx);
}
