// The AI client: extractPage and summarise, behind one module so the vendor is configuration (ADR-3) and every call is bounded,
// validated and logged. One call is:
//   1. check the input (nothing leaves the server that the client did not check);
//   2. the circuit (5 consecutive failures open it for a cool-down) and the job's token cap (a running counter per job);
//   3. one vendor request with a deadline (120 s a page), no tools, the document inline as data in the fixed template;
//   4. parse and validate the output with zod, plus grounding checks (sources the model was given, values its items printed);
//      invalid output is retried once, then the call fails. Never a partial result: the caller gets all of it or an error;
//   5. one ai_calls row per vendor request, and one for a call refused before it (lib/ai/log.ts).
// Results are { ok: true, data } or { ok: false, error }; nothing throws to the caller.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { aiClient as defaults, aiLimits, aiPricing } from "@/config/business";
import { TokenLedger } from "./budget";
import { CircuitBreaker } from "./circuit";
import { readAiConfig, type AiConfig, type AiPricing, type Env } from "./config";
import { costMicros, type AiCallFailure, type AiCallRow, type AiCallWriter, type AiStep } from "./log";
import { extractionPrompt, PROMPT_VERSION, summaryPrompt, type PromptRequest } from "./prompts";
import {
  EMPTY_SUMMARY,
  MAX_ITEMS_PER_SUMMARY,
  ModelPageOutput,
  ModelSummaryOutput,
  numbersIn,
  PAGE_REF_PATTERN,
  PageExtraction,
  parsePageRef,
  RecordItem,
  structuredOutputSchema,
  Summary,
  timelineOf,
  toWesternDigits,
  type ModelSummaryOutput as ModelSummary,
} from "./schemas";
import { anthropicAdapter } from "./vendors/anthropic";
import { bedrockAdapter } from "./vendors/bedrock";
import { VendorError, type Effort, type ImageMime, type VendorAdapter, type VendorResponse } from "./vendors/types";

export type Locale = "ar" | "en";

/** One page to read: a single-page PDF or one image, with its page reference ("<document id>:p<page>"). */
export interface PageInput {
  kind: "image" | "pdfPage";
  bytes: Uint8Array;
  mime: string;
  pageRef: string;
}

/** Which job the call belongs to (ai_jobs.id), and the record_pages row when the pipeline has one. */
export interface CallContext {
  jobId: string;
  pageId?: string | null;
}

export type AiErrorCode = AiCallFailure | "config" | "log_failed";
export interface AiError {
  code: AiErrorCode;
  message: string;
  /** Whether running the step again later may succeed (the pipeline's backoff decides when). */
  retryable: boolean;
}
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

export interface AiClient {
  extractPage(input: PageInput, locale: Locale, ctx: CallContext): Promise<AiResult<PageExtraction>>;
  summarise(items: RecordItem[], locale: Locale, ctx: CallContext): Promise<AiResult<Summary>>;
  /** The job's tokens so far, as this client counts them. */
  tokensUsed(jobId: string): number;
  /** Frees a finished job's counter. */
  forgetJob(jobId: string): void;
  readonly circuit: CircuitBreaker;
}

/** config/business.ts aiClient, plus the per-job cap (aiLimits.jobTokenCap). Tests override single values. */
export interface AiSettings {
  callTimeoutMs: number;
  summaryTimeoutMs: number;
  invalidOutputRetries: number;
  circuitFailuresToOpen: number;
  circuitCooldownMs: number;
  extractMaxOutputTokens: number;
  summaryMaxOutputTokens: number;
  effort: Effort | null;
  structuredOutputs: boolean;
  tokenCapPerJob: number;
}

export interface AiClientDeps {
  /** Where ai_calls rows go: the database in production, a JSONL file in the spike, memory in tests. */
  writer: AiCallWriter;
  env?: Env;
  pricing?: AiPricing;
  /** Replaces the adapter AI_VENDOR picks (tests). */
  adapter?: VendorAdapter;
  /** The job's tokens before this process saw it (the ai_jobs totals); 0 when omitted. */
  tokensUsedBefore?: (jobId: string) => Promise<number>;
  settings?: Partial<AiSettings>;
  /** Milliseconds clock, for latency and the circuit's cool-down (tests). */
  now?: () => number;
}

// API limits (claude-api skill: a request up to 32 MB; an image up to 5 MB). Base64 adds a third, so a PDF page may be up to
// about 23 MB of bytes. A page bigger than that is not a page; task 3.7 rejects such files before any job starts.
const MAX_PDF_PAGE_BYTES = 23 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIMES: readonly ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** A call is refused when the job's cap leaves less output room than this. */
const MIN_CALL_TOKENS = 1_024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (code: AiErrorCode, message: string, retryable: boolean): { ok: false; error: AiError } => ({
  ok: false,
  error: { code, message, retryable },
});

function assertServer(): void {
  if (typeof window !== "undefined") throw new Error("lib/ai runs on the server only");
}

function adapterFor(config: AiConfig): VendorAdapter {
  return config.vendor === "anthropic" ? anthropicAdapter({ apiKey: config.apiKey }) : bedrockAdapter({ region: config.region });
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

/** The page passes the client's own checks, or the reason it does not (nothing that fails them is ever sent). */
export function checkPage(input: PageInput, locale: Locale): string | null {
  if (locale !== "ar" && locale !== "en") return "locale must be ar or en";
  if (typeof input.pageRef !== "string" || !PAGE_REF_PATTERN.test(input.pageRef)) return "pageRef must be <document id>:p<page>";
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0) return "the page has no bytes";
  if (input.kind === "pdfPage") {
    if (input.mime !== "application/pdf") return "a pdfPage is application/pdf";
    if (!startsWith(input.bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "the bytes are not a PDF";
    if (input.bytes.byteLength > MAX_PDF_PAGE_BYTES) return "the PDF page is larger than one request may carry";
    return null;
  }
  if (input.kind === "image") {
    if (!(IMAGE_MIMES as readonly string[]).includes(input.mime)) return "an image is JPEG, PNG, WebP or GIF";
    const signatures: Record<string, number[]> = {
      "image/jpeg": [0xff, 0xd8, 0xff],
      "image/png": [0x89, 0x50, 0x4e, 0x47],
      "image/gif": [0x47, 0x49, 0x46, 0x38],
      "image/webp": [0x52, 0x49, 0x46, 0x46],
    };
    if (!startsWith(input.bytes, signatures[input.mime] ?? [])) return "the bytes are not the image type named";
    if (input.bytes.byteLength > MAX_IMAGE_BYTES) return "the image is larger than 5 MB";
    return null;
  }
  return "kind must be image or pdfPage";
}

/** The JSON object in a response: the whole text, or the text between the first "{" and the last "}" (a stray fence). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no JSON object in the response");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/** Western digits in every string, strings trimmed, empty strings as null: before validation, never after. */
export function normaliseOutput(value: unknown): unknown {
  if (typeof value === "string") {
    const s = toWesternDigits(value).trim();
    return s === "" ? null : s;
  }
  if (Array.isArray(value)) return value.map(normaliseOutput);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normaliseOutput(v)]));
  }
  return value;
}

/** Schema paths of the first few issues, never the values (they may be document content). */
function issuesOf(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`)
    .join("; ");
}

type Parsed<T> = { ok: true; data: T } | { ok: false; detail: string };

function parseWith<T>(text: string, read: (json: unknown) => Parsed<T>): Parsed<T> {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return { ok: false, detail: "the response is not JSON" };
  }
  return read(normaliseOutput(json));
}

/** The model's page output as a PageExtraction, the page reference stamped on every item. */
export function toPageExtraction(json: unknown, pageRef: string): Parsed<PageExtraction> {
  const out = ModelPageOutput.safeParse(json);
  if (!out.success) return { ok: false, detail: `schema: ${issuesOf(out.error)}` };
  const page = out.data;
  const items = page.unreadable
    ? [
        {
          type: "unreadable" as const,
          label: "Unreadable page",
          value: null,
          unit: null,
          date: null,
          ref_low: null,
          ref_high: null,
          frequency: null,
          reaction: null,
          confidence: 0,
          source_page_ref: pageRef,
        },
      ]
    : page.items.map((item) => ({ ...item, source_page_ref: pageRef }));
  const extraction = PageExtraction.safeParse({
    pageRef,
    unreadable: page.unreadable,
    unreadableReason: page.unreadable ? page.unreadable_reason : null,
    language: page.language,
    items,
    notes: page.notes,
  });
  return extraction.success ? { ok: true, data: extraction.data } : { ok: false, detail: `page: ${issuesOf(extraction.error)}` };
}

const sameNumber = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * The model's summary as a Summary, after the grounding checks: every source is a page reference the model was given, every
 * result's value and decimals are printed by a result or vital item on one of its source pages, and every dose amount by a
 * medication item there. A summary that cites a page it was not given, or a number no item printed, is invalid output.
 */
export function toSummary(json: unknown, items: RecordItem[]): Parsed<Summary> {
  const out = ModelSummaryOutput.safeParse(json);
  if (!out.success) return { ok: false, detail: `schema: ${issuesOf(out.error)}` };
  const model: ModelSummary = out.data;
  const refs = new Set(items.map((i) => i.source_page_ref));
  const lists = ["conditions", "procedures", "medications", "allergies", "results", "flags"] as const;
  for (const list of lists) {
    for (const [i, entry] of model[list].entries()) {
      const unknown = entry.sources.find((ref) => !refs.has(ref));
      if (unknown !== undefined) return { ok: false, detail: `grounding: ${list}.${i}.sources cites a page it was not given` };
    }
  }
  const printedOn = (sources: string[], types: RecordItem["type"][]) =>
    items.filter((it) => sources.includes(it.source_page_ref) && types.includes(it.type)).flatMap((it) => numbersIn(it.value));
  for (const [i, r] of model.results.entries()) {
    const found = printedOn(r.sources, ["result", "vital"]).some((n) => sameNumber(n.amount, r.value) && n.decimals === r.decimals);
    if (!found) return { ok: false, detail: `grounding: results.${i}.value is not printed on its source pages` };
  }
  for (const [i, m] of model.medications.entries()) {
    if (m.dose && !printedOn(m.sources, ["medication"]).some((n) => sameNumber(n.amount, m.dose!.amount))) {
      return { ok: false, detail: `grounding: medications.${i}.dose is not printed on its source pages` };
    }
  }
  const toRefs = (sources: string[]) => sources.map((ref) => parsePageRef(ref)!);
  const sections = {
    conditions: model.conditions.map((e) => ({ ...e, sources: toRefs(e.sources) })),
    procedures: model.procedures.map((e) => ({ ...e, sources: toRefs(e.sources) })),
    medications: model.medications.map((e) => ({ ...e, sources: toRefs(e.sources) })),
    allergies: model.allergies.map((e) => ({ ...e, sources: toRefs(e.sources) })),
    results: model.results.map((e) => ({ ...e, sources: toRefs(e.sources) })),
  };
  const summary = Summary.safeParse({
    sections,
    flags: model.flags.map((e) => ({ ...e, sources: toRefs(e.sources) })),
    timeline: timelineOf(sections),
  });
  return summary.success ? { ok: true, data: summary.data } : { ok: false, detail: `summary: ${issuesOf(summary.error)}` };
}

export function createAiClient(deps: AiClientDeps): AiClient {
  assertServer();
  const settings: AiSettings = { ...defaults, tokenCapPerJob: aiLimits.jobTokenCap, ...deps.settings };
  const now = deps.now ?? Date.now;
  const configured = readAiConfig(deps.env ?? process.env, deps.pricing ?? aiPricing);
  const circuit = new CircuitBreaker({ failuresToOpen: settings.circuitFailuresToOpen, cooldownMs: settings.circuitCooldownMs, now });
  const ledger = new TokenLedger({ cap: settings.tokenCapPerJob, seed: deps.tokensUsedBefore });
  let adapter: VendorAdapter | null = deps.adapter ?? null;

  interface Call<T> {
    step: AiStep;
    ctx: CallContext;
    pageRef: string | null;
    prompt: PromptRequest;
    maxTokens: number;
    timeoutMs: number;
    outputSchema: Record<string, unknown> | null;
    parse: (text: string) => Parsed<T>;
  }

  async function run<T>(call: Call<T>): Promise<AiResult<T>> {
    if (!configured.ok) return fail("config", configured.error, false);
    const config = configured.config;
    const { jobId } = call.ctx;
    const base = {
      job_id: jobId,
      step: call.step,
      page_ref: call.pageRef,
      page_id: call.ctx.pageId ?? null,
      vendor: config.vendor,
      model: config.invokeModel,
      prompt_version: PROMPT_VERSION,
      cost_currency: aiLimits.costCurrency,
    };
    const row = (attempt: number, fields: Partial<AiCallRow>): AiCallRow => ({
      id: randomUUID(),
      ...base,
      attempt,
      input_tokens: 0,
      output_tokens: 0,
      cost_micros: 0,
      latency_ms: 0,
      outcome: "failed",
      failure_reason: null,
      failure_detail: null,
      stop_reason: null,
      request_id: null,
      created_at: new Date(now()).toISOString(),
      ...fields,
    });
    const log = async (r: AiCallRow): Promise<boolean> => {
      try {
        await deps.writer.write(r);
        return true;
      } catch {
        return false;
      }
    };
    const refuse = async (attempt: number, reason: AiCallFailure, message: string, retryable: boolean): Promise<AiResult<T>> => {
      const logged = await log(row(attempt, { failure_reason: reason, failure_detail: message.slice(0, 500) }));
      return logged ? fail(reason, message, retryable) : fail("log_failed", `${message}; and the ai_calls row could not be written`, true);
    };

    if (!circuit.tryAcquire()) {
      return refuse(1, "circuit_open", `the AI circuit is open after repeated failures; retry in ${Math.ceil(circuit.retryAfterMs() / 1000)} s`, true);
    }
    adapter ??= adapterFor(config);
    const attempts = 1 + settings.invalidOutputRetries;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let remaining: number;
      try {
        remaining = await ledger.remaining(jobId);
      } catch {
        circuit.release();
        return refuse(attempt, "budget_unavailable", "the job's earlier token use could not be read, so its token cap cannot be checked", true);
      }
      if (remaining < MIN_CALL_TOKENS) {
        circuit.release();
        return refuse(attempt, "token_cap", `the job has reached its token cap (${settings.tokenCapPerJob} tokens)`, false);
      }
      const maxTokens = Math.min(call.maxTokens, remaining);
      ledger.reserve(jobId, maxTokens);
      const started = now();
      let response: VendorResponse;
      try {
        response = await adapter.call({
          model: config.invokeModel,
          system: call.prompt.system,
          content: call.prompt.content,
          maxTokens,
          effort: settings.effort,
          outputSchema: call.outputSchema,
          timeoutMs: call.timeoutMs,
        });
      } catch (error) {
        ledger.settle(jobId, maxTokens, 0);
        circuit.failure();
        const vendorError = error instanceof VendorError ? error : new VendorError("unavailable", "the vendor call failed");
        const logged = await log(
          row(attempt, {
            latency_ms: Math.max(0, now() - started),
            failure_reason: vendorError.kind,
            failure_detail: vendorError.message.slice(0, 500),
          }),
        );
        if (!logged) return fail("log_failed", `${vendorError.message}; and the ai_calls row could not be written`, true);
        return fail(vendorError.kind, vendorError.message, vendorError.kind !== "rejected");
      }
      const latency = Math.max(0, now() - started);
      ledger.settle(jobId, maxTokens, response.inputTokens + response.outputTokens);
      const usage = {
        input_tokens: response.inputTokens,
        output_tokens: response.outputTokens,
        cost_micros: costMicros(config.price, response.inputTokens, response.outputTokens),
        latency_ms: latency,
        stop_reason: response.stopReason,
        request_id: response.requestId,
        model: response.model || config.invokeModel,
      };
      if (response.stopReason === "refusal") {
        circuit.release();
        const detail = `the model declined${response.stopDetail ? ` (${response.stopDetail})` : ""}`;
        const logged = await log(row(attempt, { ...usage, failure_reason: "refusal", failure_detail: detail }));
        return logged ? fail("refusal", detail, false) : fail("log_failed", `${detail}; and the ai_calls row could not be written`, true);
      }
      const parsed: Parsed<T> =
        response.stopReason === "max_tokens" ? { ok: false, detail: "the output was cut off at max_tokens" } : call.parse(response.text);
      if (parsed.ok) {
        circuit.success();
        const logged = await log(row(attempt, { ...usage, outcome: "ok" }));
        return logged ? { ok: true, data: parsed.data } : fail("log_failed", "the call succeeded but its ai_calls row could not be written", true);
      }
      const reason: AiCallFailure = response.stopReason === "max_tokens" ? "max_tokens" : "invalid_output";
      const last = attempt === attempts;
      if (last) circuit.failure();
      const logged = await log(row(attempt, { ...usage, failure_reason: reason, failure_detail: parsed.detail.slice(0, 500) }));
      if (!logged) return fail("log_failed", `${parsed.detail}; and the ai_calls row could not be written`, true);
      if (last) return fail(reason, `the model's output was still invalid after ${attempts} attempts: ${parsed.detail}`, true);
    }
    // Unreachable: the loop returns on its last attempt.
    return fail("invalid_output", "no attempt was made", true);
  }

  /** A call refused before it starts, logged when the job id allows a row. */
  async function refuseInput<T>(step: AiStep, ctx: CallContext, pageRef: string | null, message: string): Promise<AiResult<T>> {
    if (!configured.ok) return fail("config", configured.error, false);
    if (typeof ctx?.jobId !== "string" || !UUID.test(ctx.jobId)) return fail("bad_input", "ctx.jobId must be an ai_jobs id (uuid)", false);
    const config = configured.config;
    const r: AiCallRow = {
      id: randomUUID(),
      job_id: ctx.jobId,
      step,
      page_ref: pageRef !== null && PAGE_REF_PATTERN.test(pageRef) ? pageRef : null,
      page_id: ctx.pageId ?? null,
      attempt: 1,
      vendor: config.vendor,
      model: config.invokeModel,
      prompt_version: PROMPT_VERSION,
      input_tokens: 0,
      output_tokens: 0,
      cost_micros: 0,
      cost_currency: aiLimits.costCurrency,
      latency_ms: 0,
      outcome: "failed",
      failure_reason: "bad_input",
      failure_detail: message,
      stop_reason: null,
      request_id: null,
      created_at: new Date(now()).toISOString(),
    };
    try {
      await deps.writer.write(r);
    } catch {
      return fail("log_failed", `${message}; and the ai_calls row could not be written`, true);
    }
    return fail("bad_input", message, false);
  }

  return {
    circuit,
    tokensUsed: (jobId) => ledger.usedBy(jobId),
    forgetJob: (jobId) => ledger.forget(jobId),

    async extractPage(input, locale, ctx) {
      const problem = typeof ctx?.jobId === "string" && UUID.test(ctx.jobId) ? checkPage(input, locale) : "ctx.jobId must be an ai_jobs id (uuid)";
      if (problem) return refuseInput("extract", ctx, typeof input?.pageRef === "string" ? input.pageRef : null, problem);
      return run({
        step: "extract",
        ctx,
        pageRef: input.pageRef,
        prompt: extractionPrompt(input, locale),
        maxTokens: settings.extractMaxOutputTokens,
        timeoutMs: settings.callTimeoutMs,
        outputSchema: settings.structuredOutputs ? structuredOutputSchema(ModelPageOutput) : null,
        parse: (text) => parseWith(text, (json) => toPageExtraction(json, input.pageRef)),
      });
    },

    async summarise(items, locale, ctx) {
      if (typeof ctx?.jobId !== "string" || !UUID.test(ctx.jobId)) return refuseInput("summarise", ctx, null, "ctx.jobId must be an ai_jobs id (uuid)");
      if (locale !== "ar" && locale !== "en") return refuseInput("summarise", ctx, null, "locale must be ar or en");
      const checked = z.array(RecordItem).max(MAX_ITEMS_PER_SUMMARY).safeParse(items);
      if (!checked.success) return refuseInput("summarise", ctx, null, `items: ${issuesOf(checked.error)}`);
      // Unreadable items are the pages' business (the summary's unreadable list comes from record_pages), not the model's.
      const readable = checked.data.filter((item) => item.type !== "unreadable");
      if (readable.length === 0) return { ok: true, data: structuredClone(EMPTY_SUMMARY) };
      return run({
        step: "summarise",
        ctx,
        pageRef: null,
        prompt: summaryPrompt(readable, locale),
        maxTokens: settings.summaryMaxOutputTokens,
        timeoutMs: settings.summaryTimeoutMs,
        outputSchema: settings.structuredOutputs ? structuredOutputSchema(ModelSummaryOutput) : null,
        parse: (text) => parseWith(text, (json) => toSummary(json, readable)),
      });
    },
  };
}
