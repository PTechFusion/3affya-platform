// The extraction spike (task 1.9, ADR-3): runs the five synthetic spike documents (fixtures/README.md) through lib/ai end to
// end, page by page and then one summary, and writes output/spike_report.md: per-document accuracy against the hand-written
// expected items in fixtures/expected/*.json, cost and latency per page, the prompt-injection check, and a drafted verdict on
// whether the pipeline needs a dedicated OCR step before the model. Yasir confirms the verdict after the hand check the
// report lists. The verdict is the riskiest open item of Milestone 1.
//
//   node --env-file=.env scripts/spike_extraction.ts [--log jsonl|db] [--only lab-report-en,scan-lowres] [--skip-summary]
//   node scripts/spike_extraction.ts --check     everything short of calling the model; needs no key
//
// Needs, in the environment (.env.example): AI_VENDOR and AI_MODEL, and ANTHROPIC_API_KEY (anthropic) or AWS_REGION and
// AWS_BEDROCK_MODEL_ID with AWS credentials (bedrock). It stops before any call, with a message, when they are missing.
// --log jsonl (default) appends every ai_calls row to output/spike_ai_calls.jsonl; --log db writes them to ai_calls through
// the service client as the "script" caller, under an ai_jobs row it creates (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// the L3 migration applied). Synthetic documents only: never point this at a real patient's document (CLAUDE.md).
//
// It runs on Node's own TypeScript support (Node 22.18 or later). lib/ai imports "@/..." paths, so main() first registers a
// small resolve hook for "@/" and extensionless imports, then loads lib/ai with a dynamic import. Static imports here are Node
// built-ins, Playwright and types only, so the scoring functions below load anywhere (the unit tests import them).
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { register } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";
import type { AiCallRow, AiCallWriter, PageExtraction, Summary } from "@/lib/ai";

const ROOT = new URL("../", import.meta.url);
const fromRoot = (relative: string) => fileURLToPath(new URL(relative, ROOT));

/** The five spike documents, in report order. The injection page is checked too, reported apart from the five. */
export const SPIKE_DOCUMENTS = ["lab-report-en", "prescription-ar", "discharge-note-mixed", "scan-lowres", "referral-letter"] as const;
export const INJECTION_DOCUMENT = "injection-note";

/** The bar the drafted verdict holds the numbers to. Spike criteria, not business numbers. */
export const BAR = { recall: 0.9, valuesExact: 0.95 } as const;

/* ---------------- expected items ---------------- */

export interface ExpectedItem {
  type: string;
  label: string;
  aliases?: string[];
  value: string | null;
  unit: string | null;
  date: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  frequency?: string;
  reaction?: string;
}

export interface ExpectedPage {
  page: number;
  /** A single-page PDF or an image under fixtures/; null for a DOCX page, which exists only after conversion. */
  input: string | null;
  unreadable: boolean;
  items: ExpectedItem[];
}

export interface ExpectedDocument {
  id: string;
  title: string;
  kind: "pdf" | "image" | "docx";
  locale: "ar" | "en";
  source: string;
  file: string;
  pages: ExpectedPage[];
  /** Phrases no extracted item may carry (the injection page's planted instructions). */
  forbidden: string[];
}

export async function readExpected(id: string): Promise<ExpectedDocument> {
  return JSON.parse(await readFile(fromRoot(`fixtures/expected/${id}.json`), "utf8")) as ExpectedDocument;
}

/* ---------------- text normalisation for matching ---------------- */

export function western(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

const SUPERSCRIPTS: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

/** Arabic letters folded the way people search: no diacritics or tatweel, one alef, ya for alef maqsura, ha for ta marbuta. */
function foldArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/** A label reduced to letters and digits, lower case, Western digits, Arabic folded. */
export function normLabel(text: string | null | undefined): string {
  if (!text) return "";
  return foldArabic(western(text.normalize("NFKC")).toLowerCase()).replace(/[^\p{L}\p{N}]+/gu, "");
}

/** A value as compared: Western digits, no spaces, no thousands separators, lower case. */
export function normValue(text: string | null | undefined): string {
  if (!text) return "";
  return foldArabic(western(text.normalize("NFKC")).toLowerCase())
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\s+/g, "");
}

const ARABIC_UNITS: Array<[RegExp, string]> = [
  [/^(ملغ|مغ|ملجم|مجم)$/, "mg"],
  [/^(كغ|كجم|كيلوغرام)$/, "kg"],
  [/^(غ|جم|غرام)$/, "g"],
  [/^(ملمزيبق|مممزيبق|ملمزئبق)$/, "mmhg"],
  [/^(وحدهدوليه)$/, "iu"],
  [/^(وحده|وحدات)$/, "units"],
  [/^(نبضه\/دقيقه|نبضهفيالدقيقه)$/, "bpm"],
];

/** A unit as compared: lower case, superscripts as digits, x for ×, u for µ, no spaces or carets, common Arabic units in Latin. */
export function normUnit(text: string | null | undefined): string {
  if (!text) return "";
  let unit = foldArabic(western(text).toLowerCase())
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPTS[c] ?? c)
    .replace(/[×✕]/g, "x")
    .replace(/[µμ]/g, "u")
    .replace(/[\s^]/g, "");
  for (const [pattern, latin] of ARABIC_UNITS) if (pattern.test(unit)) unit = latin;
  if (unit === "beats/min" || unit === "/min") unit = "bpm";
  if (unit === "unit") unit = "units";
  return unit;
}

const numbersOf = (text: string | null) => [...western(text ?? "").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
const isNumber = (text: string) => /^[-+]?\d+(?:\.\d+)?$/.test(text);

/* ---------------- matching ---------------- */

export interface ExtractedLike {
  type: string;
  label: string;
  value: string | null;
  unit: string | null;
  date: string | null;
}

function labelScore(expected: ExpectedItem, label: string): 0 | 1 | 2 {
  const got = normLabel(label);
  if (!got) return 0;
  const names = [expected.label, ...(expected.aliases ?? [])].map(normLabel).filter(Boolean);
  if (names.includes(got)) return 2;
  const contains = names.some((name) => {
    const [short, long] = name.length <= got.length ? [name, got] : [got, name];
    return short.length >= 3 && long.includes(short);
  });
  return contains ? 1 : 0;
}

export function valueMatches(expected: ExpectedItem, extracted: ExtractedLike): boolean {
  if (expected.value === null) return true;
  const want = normValue(expected.value);
  if (isNumber(want)) return numbersOf(extracted.value).some((n) => n === Number(want));
  const got = normValue(extracted.value);
  return got === want || (want.length >= 2 && got.includes(want));
}

export const valueExact = (expected: ExpectedItem, extracted: ExtractedLike) =>
  expected.value === null || normValue(expected.value) === normValue(extracted.value);

export interface PageMatch {
  pairs: Array<{ expected: ExpectedItem; extracted: ExtractedLike }>;
  missed: ExpectedItem[];
  extra: ExtractedLike[];
}

/**
 * One-to-one matching on a page: an extracted item matches an expected one when its label is the expected label or an alias
 * (exact first, then one containing the other) and its value carries the expected value. Type, unit and date are scored on
 * the matched pairs, not required for the match, so the accuracy number is about reading the page. `unreadable` items are
 * flags, not facts, and are counted apart.
 */
export function matchPage(expected: ExpectedItem[], extracted: ExtractedLike[]): PageMatch {
  const candidates = extracted.filter((x) => x.type !== "unreadable");
  const used = new Set<number>();
  const pairs: PageMatch["pairs"] = [];
  const pending = new Set(expected);
  for (const wanted of [2, 1] as const) {
    for (const e of expected) {
      if (!pending.has(e)) continue;
      const index = candidates.findIndex((x, i) => !used.has(i) && labelScore(e, x.label) === wanted && valueMatches(e, x));
      if (index >= 0) {
        used.add(index);
        pending.delete(e);
        pairs.push({ expected: e, extracted: candidates[index]! });
      }
    }
  }
  return {
    pairs: expected.flatMap((e) => pairs.filter((p) => p.expected === e)),
    missed: expected.filter((e) => pending.has(e)),
    extra: candidates.filter((_, i) => !used.has(i)),
  };
}

/* ---------------- runs and scores ---------------- */

export interface CallStat {
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  latencyMs: number;
  outcome: "ok" | "failed";
  failureReason: string | null;
}

export interface PageRun {
  page: number;
  pageRef: string;
  ok: boolean;
  error: string | null;
  unreadable: boolean;
  notes: string | null;
  items: ExtractedLike[];
  calls: CallStat[];
}

export interface DocumentRun {
  expected: ExpectedDocument;
  pages: PageRun[];
}

export interface DocumentScore {
  id: string;
  title: string;
  pages: number;
  failedPages: number;
  expectedItems: number;
  extractedItems: number;
  unreadableFlags: number;
  matched: number;
  recall: number;
  precision: number | null;
  valuesExact: number | null;
  typesAgree: number | null;
  datesAgree: number | null;
  unitsAgree: number | null;
  costMicros: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  maxPageLatencyMs: number;
  calls: number;
  failedCalls: number;
  forbiddenHits: string[];
  matches: Array<{ page: number; match: PageMatch }>;
}

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);

export function scoreDocument(run: DocumentRun): DocumentScore {
  const matches = run.expected.pages.map((page) => {
    const got = run.pages.find((p) => p.page === page.page);
    return { page: page.page, match: matchPage(page.items, got?.items ?? []) };
  });
  const pairs = matches.flatMap((m) => m.match.pairs);
  const withDate = pairs.filter((p) => p.expected.date !== null);
  const withUnit = pairs.filter((p) => p.expected.unit !== null);
  const extracted = run.pages.flatMap((p) => p.items);
  const facts = extracted.filter((x) => x.type !== "unreadable");
  const calls = run.pages.flatMap((p) => p.calls);
  const forbidden = run.expected.forbidden.map((f) => ({ phrase: f, norm: normLabel(f) }));
  const forbiddenHits = forbidden
    .filter(({ norm }) => norm && extracted.some((x) => normLabel(x.label).includes(norm) || normLabel(x.value).includes(norm)))
    .map(({ phrase }) => phrase);
  const expectedItems = run.expected.pages.reduce((n, p) => n + p.items.length, 0);
  return {
    id: run.expected.id,
    title: run.expected.title,
    pages: run.expected.pages.length,
    failedPages: run.pages.filter((p) => !p.ok).length,
    expectedItems,
    extractedItems: facts.length,
    unreadableFlags: extracted.length - facts.length,
    matched: pairs.length,
    recall: expectedItems === 0 ? 1 : pairs.length / expectedItems,
    precision: ratio(pairs.length, facts.length),
    valuesExact: ratio(pairs.filter((p) => valueExact(p.expected, p.extracted)).length, pairs.length),
    typesAgree: ratio(pairs.filter((p) => p.expected.type === p.extracted.type).length, pairs.length),
    datesAgree: ratio(withDate.filter((p) => p.extracted.date === p.expected.date).length, withDate.length),
    unitsAgree: ratio(withUnit.filter((p) => normUnit(p.extracted.unit) === normUnit(p.expected.unit)).length, withUnit.length),
    costMicros: calls.reduce((n, c) => n + c.costMicros, 0),
    inputTokens: calls.reduce((n, c) => n + c.inputTokens, 0),
    outputTokens: calls.reduce((n, c) => n + c.outputTokens, 0),
    latencyMs: run.pages.reduce((n, p) => n + p.calls.reduce((m, c) => m + c.latencyMs, 0), 0),
    maxPageLatencyMs: Math.max(0, ...run.pages.map((p) => p.calls.reduce((m, c) => m + c.latencyMs, 0))),
    calls: calls.length,
    failedCalls: calls.filter((c) => c.outcome === "failed").length,
    forbiddenHits,
    matches,
  };
}

/** The five documents together: item-weighted rates, summed cost and tokens. */
export function totalScore(scores: DocumentScore[]): DocumentScore {
  const pairs = scores.flatMap((s) => s.matches.flatMap((m) => m.match.pairs));
  const withDate = pairs.filter((p) => p.expected.date !== null);
  const withUnit = pairs.filter((p) => p.expected.unit !== null);
  const sum = (key: keyof DocumentScore) => scores.reduce((n, s) => n + (s[key] as number), 0);
  const expectedItems = sum("expectedItems");
  const extractedItems = sum("extractedItems");
  return {
    id: "all",
    title: "The five documents",
    pages: sum("pages"),
    failedPages: sum("failedPages"),
    expectedItems,
    extractedItems,
    unreadableFlags: sum("unreadableFlags"),
    matched: pairs.length,
    recall: expectedItems === 0 ? 1 : pairs.length / expectedItems,
    precision: ratio(pairs.length, extractedItems),
    valuesExact: ratio(pairs.filter((p) => valueExact(p.expected, p.extracted)).length, pairs.length),
    typesAgree: ratio(pairs.filter((p) => p.expected.type === p.extracted.type).length, pairs.length),
    datesAgree: ratio(withDate.filter((p) => p.extracted.date === p.expected.date).length, withDate.length),
    unitsAgree: ratio(withUnit.filter((p) => normUnit(p.extracted.unit) === normUnit(p.expected.unit)).length, withUnit.length),
    costMicros: sum("costMicros"),
    inputTokens: sum("inputTokens"),
    outputTokens: sum("outputTokens"),
    latencyMs: sum("latencyMs"),
    maxPageLatencyMs: Math.max(0, ...scores.map((s) => s.maxPageLatencyMs)),
    calls: sum("calls"),
    failedCalls: sum("failedCalls"),
    forbiddenHits: scores.flatMap((s) => s.forbiddenHits),
    matches: [],
  };
}

/* ---------------- the verdict ---------------- */

const pct = (n: number | null) => (n === null ? "n/a" : `${Math.round(n * 100)}%`);

/**
 * The drafted OCR verdict, from the numbers: the low-resolution scan against the typed documents, and the Arabic documents
 * against the bar. Failed calls make the run inconclusive rather than a verdict.
 */
export function ocrVerdict(scores: DocumentScore[]): string {
  const by = (id: string) => scores.find((s) => s.id === id);
  const scan = by("scan-lowres");
  const typed = scores.filter((s) => s.id !== "scan-lowres");
  const arabic = scores.filter((s) => ["prescription-ar", "discharge-note-mixed", "scan-lowres"].includes(s.id));
  const failed = scores.reduce((n, s) => n + s.failedPages, 0);
  if (failed > 0 || !scan) {
    return (
      `Inconclusive: ${failed} page call${failed === 1 ? "" : "s"} failed (see Calls), so the run does not answer the OCR ` +
      `question yet. Fix the cause and run the spike again before deciding task 3.8's shape.`
    );
  }
  const typedTotal = totalScore(typed);
  const meets = (s: DocumentScore) => s.recall >= BAR.recall && (s.valuesExact ?? 1) >= BAR.valuesExact;
  const arabicWeak = arabic.filter((s) => s.id !== "scan-lowres" && !meets(s));
  const numbers =
    `Typed pages: recall ${pct(typedTotal.recall)}, values exact ${pct(typedTotal.valuesExact)}. Low-resolution scan: recall ` +
    `${pct(scan.recall)}, values exact ${pct(scan.valuesExact)}, ${scan.unreadableFlags} unreadable flag${scan.unreadableFlags === 1 ? "" : "s"}. ` +
    `Arabic documents: ${arabic.map((s) => `${s.id} ${pct(s.recall)}`).join(", ")}.`;
  if (meets(typedTotal) && meets(scan) && arabicWeak.length === 0) {
    return (
      `No dedicated OCR step is needed for launch. ${numbers} The model reads typed Arabic and English pages and the ` +
      `low-resolution Arabic scan to the bar (recall ${pct(BAR.recall)}, values exact ${pct(BAR.valuesExact)}) without a text ` +
      `layer from an OCR engine, so task 3.8 sends each page as it is and keeps the "unreadable" flag for pages the model ` +
      `cannot read. Confirm with Dr Ayman's own documents when they arrive (ADR-3 asks for real ones), since synthetic scans are ` +
      `cleaner than phone photos of creased paper.`
    );
  }
  if (meets(typedTotal) && arabicWeak.length === 0) {
    return (
      `A pre-processing step is needed for low-resolution images, not for typed pages. ${numbers} Typed pages meet the bar; ` +
      `the scan does not. Task 3.8 should add, before the model, either an OCR text layer for image pages (sent with the image) ` +
      `or an upscale-and-denoise step, then re-run this spike; and validation (task 3.7) should flag images below a minimum ` +
      `resolution so the patient is asked for a clearer photo (rule L4) instead of paying for a page the model cannot read.`
    );
  }
  return (
    `Extraction is below the bar on typed pages too, so an OCR step alone would not fix it. ${numbers} ` +
    `${arabicWeak.length > 0 ? `Weak Arabic documents: ${arabicWeak.map((s) => s.id).join(", ")}. ` : ""}` +
    `Before deciding on OCR, review the hand check below for the failure pattern (labels, digits, dates or missed rows), ` +
    `adjust the prompt or try a stronger model or higher effort, and run the spike again.`
  );
}

/* ---------------- the report ---------------- */

export interface SpikeRun {
  startedAt: string;
  vendor: string;
  model: string;
  promptVersion: string;
  effort: string;
  structuredOutputs: boolean;
  tokenCapPerJob: number;
  log: string;
  documents: DocumentRun[];
  injection: DocumentRun | null;
  summary: { ok: boolean; error: string | null; data: Summary | null; calls: CallStat[] } | null;
}

const usd = (micros: number) => `${(micros / 1_000_000).toFixed(4)}`;
const seconds = (ms: number) => (ms / 1000).toFixed(1);
const cell = (text: string | null | undefined) => (text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

function describeItem(x: ExtractedLike): string {
  return [x.label, x.value, x.unit].filter(Boolean).join(" ") + (x.date ? ` (${x.date})` : "") + ` [${x.type}]`;
}

export function renderReport(run: SpikeRun, generatedAt = new Date()): string {
  const scores = run.documents.map(scoreDocument);
  const total = totalScore(scores);
  const pages = Math.max(1, total.pages);
  const tokensPerPage = (total.inputTokens + total.outputTokens) / pages;
  const lines: string[] = [];
  lines.push("# Extraction spike report (task 1.9)");
  lines.push("");
  lines.push(
    `Run ${run.startedAt} · vendor ${run.vendor} · model ${run.model} · prompt ${run.promptVersion} · effort ${run.effort} · ` +
      `structured outputs ${run.structuredOutputs ? "on" : "off"} · ai_calls log: ${run.log}`,
  );
  lines.push("");
  lines.push(
    "Documents: the five synthetic spike documents in `fixtures/` (no real patient data); expected items hand-written in " +
      "`fixtures/expected/*.json`. Written by `scripts/spike_extraction.ts`; numbers are this run's measurements.",
  );
  lines.push("");
  lines.push("## Verdict: is a dedicated OCR step needed?");
  lines.push("");
  lines.push(`${ocrVerdict(scores)}`);
  lines.push("");
  lines.push("_Drafted from the numbers below; Yasir confirms or corrects it after the hand check at the end of this report._");
  lines.push("");
  lines.push("## Accuracy, cost and latency per document");
  lines.push("");
  lines.push(
    "| Document | Pages | Expected | Extracted | Matched | Recall | Precision | Values exact | Types agree | Dates agree | Units agree | Unreadable flags | Cost per page (USD) | Latency per page (s, avg / max) |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of [...scores, total]) {
    const name = s.id === "all" ? "**All five**" : `${s.id}`;
    lines.push(
      `| ${name} | ${s.pages} | ${s.expectedItems} | ${s.extractedItems} | ${s.matched} | ${pct(s.recall)} | ${pct(s.precision)} | ` +
        `${pct(s.valuesExact)} | ${pct(s.typesAgree)} | ${pct(s.datesAgree)} | ${pct(s.unitsAgree)} | ${s.unreadableFlags} | ` +
        `${usd(s.costMicros / Math.max(1, s.pages))} | ${seconds(s.latencyMs / Math.max(1, s.pages))} / ${seconds(s.maxPageLatencyMs)} |`,
    );
  }
  lines.push("");
  lines.push(
    "Recall: expected items found (label or alias, and value). Precision: extracted items that match an expected one (the rest " +
      "are listed in the hand check: an extra item is either a reading the expected file missed or an invention). Values exact: " +
      "the value as printed, digits and decimals. Cost and latency include every call a page took, retries included.",
  );
  lines.push("");
  lines.push("## Tokens and the per-job cap");
  lines.push("");
  lines.push(
    `${Math.round(tokensPerPage).toLocaleString("en-US")} tokens a page on average (input ${Math.round(total.inputTokens / pages).toLocaleString("en-US")}, ` +
      `output with thinking ${Math.round(total.outputTokens / pages).toLocaleString("en-US")}); USD ${usd(total.costMicros / pages)} a page. ` +
      `At this rate the per-job cap (aiLimits.jobTokenCap, ${run.tokenCapPerJob.toLocaleString("en-US")} tokens) holds about ` +
      `${tokensPerPage > 0 ? Math.floor(run.tokenCapPerJob / tokensPerPage).toLocaleString("en-US") : "n/a"} pages, and 100 pages cost about USD ` +
      `${usd((total.costMicros / pages) * 100)}. The records price is USD 9.99 per GB block (config/business.ts).`,
  );
  lines.push("");
  lines.push("## Prompt injection (the task 3.8 fixture)");
  lines.push("");
  if (!run.injection) {
    lines.push("Not run (--only left it out).");
  } else {
    const inj = scoreDocument(run.injection);
    const notes = run.injection.pages.map((p) => p.notes).filter(Boolean);
    const passed = inj.failedPages === 0 && inj.forbiddenHits.length === 0 && inj.recall === 1;
    lines.push(
      `${passed ? "Passed" : "FAILED"}: ${inj.matched} of ${inj.expectedItems} real items extracted (the penicillin allergy among them), ` +
        `${inj.forbiddenHits.length === 0 ? "no item carries the planted instructions" : `planted text found: ${inj.forbiddenHits.join(", ")}`}. ` +
        `Notes: ${notes.length ? notes.map((n) => `"${cell(n)}"`).join("; ") : "none"}.`,
    );
  }
  lines.push("");
  lines.push("## The summary call");
  lines.push("");
  if (!run.summary) {
    lines.push("Not run (--skip-summary).");
  } else {
    const calls = run.summary.calls;
    const cost = calls.reduce((n, c) => n + c.costMicros, 0);
    const latency = calls.reduce((n, c) => n + c.latencyMs, 0);
    if (run.summary.ok && run.summary.data) {
      const s = run.summary.data.sections;
      lines.push(
        `Valid on attempt ${calls.length} · USD ${usd(cost)} · ${seconds(latency)} s · ${s.conditions.length} conditions, ` +
          `${s.procedures.length} procedures, ${s.medications.length} medications, ${s.allergies.length} allergies, ` +
          `${s.results.length} results, ${run.summary.data.timeline.length} timeline entries. Flags:`,
      );
      lines.push("");
      for (const flag of run.summary.data.flags) {
        lines.push(`- ${flag.kind}: ${cell(flag.textEn)} (${flag.sources.map((r) => `${r.doc} p${r.page}`).join(", ")})`);
      }
      if (run.summary.data.flags.length === 0) lines.push("- none (the fixtures plant two conflicts and one missing report)");
    } else {
      lines.push(`Failed: ${cell(run.summary.error)} · ${calls.length} call${calls.length === 1 ? "" : "s"} · USD ${usd(cost)}.`);
    }
  }
  lines.push("");
  lines.push("## Calls");
  lines.push("");
  const allCalls = [...run.documents, ...(run.injection ? [run.injection] : [])].flatMap((d) => d.pages.flatMap((p) => p.calls));
  const summaryCalls = run.summary?.calls ?? [];
  const failed = [...allCalls, ...summaryCalls].filter((c) => c.outcome === "failed");
  lines.push(
    `${allCalls.length + summaryCalls.length} calls, ${failed.length} failed` +
      (failed.length ? ` (${[...new Set(failed.map((c) => c.failureReason))].join(", ")}).` : "."),
  );
  for (const d of [...run.documents, ...(run.injection ? [run.injection] : [])]) {
    for (const p of d.pages.filter((page) => !page.ok)) lines.push(`- ${p.pageRef}: ${cell(p.error)}`);
  }
  lines.push("");
  lines.push("## Hand check");
  lines.push("");
  lines.push("Every expected item with what the model wrote for it, then what it wrote that matches nothing expected.");
  for (const s of scores) {
    lines.push("");
    lines.push(`### ${s.id}: ${s.title}`);
    for (const { page, match } of s.matches) {
      lines.push("");
      lines.push(`Page ${page}`);
      lines.push("");
      lines.push("| Expected | Extracted | Value exact | Type | Date |");
      lines.push("|---|---|---|---|---|");
      for (const e of [...match.pairs.map((p) => p.expected), ...match.missed]) {
        const pair = match.pairs.find((p) => p.expected === e);
        const want = describeItem({ type: e.type, label: e.label, value: e.value, unit: e.unit, date: e.date });
        if (!pair) {
          lines.push(`| ${cell(want)} | **missed** | | | |`);
          continue;
        }
        const x = pair.extracted;
        lines.push(
          `| ${cell(want)} | ${cell(describeItem(x))} | ${valueExact(e, x) ? "yes" : "no"} | ${e.type === x.type ? "same" : x.type} | ` +
            `${e.date === null ? "" : x.date === e.date ? "same" : (x.date ?? "none")} |`,
        );
      }
      for (const x of match.extra) lines.push(`| (none expected) | ${cell(describeItem(x))} | | | |`);
    }
  }
  lines.push("");
  lines.push(`_Generated ${generatedAt.toISOString()}._`);
  lines.push("");
  return lines.join("\n");
}

/* ---------------- DOCX to PDF pages ---------------- */

/** The entries of a zip archive (stored or deflated), by name. */
export function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip archive (no end of central directory)");
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const entries = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n += 1) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error("damaged zip central directory");
    const method = buf.readUInt16LE(at + 10);
    const packedSize = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const extraLength = buf.readUInt16LE(at + 30);
    const commentLength = buf.readUInt16LE(at + 32);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLength);
    const dataStart = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const packed = buf.subarray(dataStart, dataStart + packedSize);
    if (method !== 0 && method !== 8) throw new Error(`zip entry ${name} uses compression method ${method}`);
    entries.set(name, method === 8 ? new Uint8Array(inflateRawSync(packed)) : new Uint8Array(packed));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&");

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function paragraphHtml(xml: string): string {
  const rtl = /<w:bidi\/>|<w:bidi w:val="(1|true|on)"\/>/.test(xml);
  const parts: string[] = [];
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>/g)) {
    if (m[0].startsWith("<w:tab")) parts.push("\t");
    else if (m[0].startsWith("<w:br")) parts.push(/w:type="page"/.test(m[0]) ? "\u000c" : "\n");
    else parts.push(decodeXml(m[1] ?? ""));
  }
  const text = escapeHtml(parts.join(""))
    .replace(/\n/g, "<br>")
    .replace(/\u000c/g, '</p><div class="break"></div><p>');
  return `<p${rtl ? ' dir="rtl"' : ""}>${text || "&nbsp;"}</p>`;
}

/**
 * A DOCX as one HTML page for Chromium to print: paragraphs (right to left where Word marks them), line, tab and page breaks,
 * and tables. Enough for the spike's letter; production conversion is task 3.7's call (see fixtures/README.md).
 */
export function docxToHtml(bytes: Uint8Array): string {
  const xml = unzip(bytes).get("word/document.xml");
  if (!xml) throw new Error("not a Word document (no word/document.xml)");
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(Buffer.from(xml).toString("utf8"))?.[1] ?? "";
  const blocks: string[] = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>|<w:p\/>/g)) {
    if (m[0].startsWith("<w:tbl")) {
      const rows = [...m[0].matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)].map(
        (row) =>
          `<tr>${[...(row[1] ?? "").matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)]
            .map((c) => `<td>${[...(c[1] ?? "").matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((p) => paragraphHtml(p[0])).join("")}</td>`)
            .join("")}</tr>`,
      );
      blocks.push(`<table>${rows.join("")}</table>`);
    } else {
      blocks.push(m[0] === "<w:p/>" ? "<p>&nbsp;</p>" : paragraphHtml(m[0]));
    }
  }
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    '@page { size: A4; margin: 20mm; } body { font-family: Calibri, "Segoe UI", Tahoma, "Noto Sans", "Noto Naskh Arabic", Arial, sans-serif; font-size: 11pt; } ' +
    "p { margin: 0 0 6pt; } table { border-collapse: collapse; margin: 4pt 0 8pt; } td { border: 1px solid #999; padding: 2pt 6pt; vertical-align: top; } " +
    "td p { margin: 0; } .break { break-after: page; }" +
    `</style></head><body>${blocks.join("")}</body></html>`
  );
}

/** Pages in a PDF Chromium printed. */
export function pdfPageCount(bytes: Uint8Array): number {
  return (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

/* ---------------- environment ---------------- */

const RUN_COMMAND = "node --env-file=.env scripts/spike_extraction.ts";

/** Why the spike cannot call the model, or null. Checked before anything is loaded or sent. */
export function preflight(env: Record<string, string | undefined>): string | null {
  const set = (name: string) => Boolean(env[name]?.trim());
  const how = `Put it in .env (see .env.example) and run:\n  ${RUN_COMMAND}`;
  if (!set("AI_VENDOR")) return `AI_VENDOR is not set (anthropic or bedrock), so the spike cannot call a model. ${how}`;
  if (!set("AI_MODEL")) return `AI_MODEL is not set (a Claude model id), so the spike cannot call a model. ${how}`;
  if (env.AI_VENDOR?.trim() === "anthropic" && !set("ANTHROPIC_API_KEY")) {
    return `no ANTHROPIC_API_KEY: the spike cannot call the model without a key (a normal key is fine for these synthetic documents). ${how}`;
  }
  if (env.AI_VENDOR?.trim() === "bedrock" && !(set("AWS_REGION") && set("AWS_BEDROCK_MODEL_ID"))) {
    return `AWS_REGION and AWS_BEDROCK_MODEL_ID are needed when AI_VENDOR is bedrock. ${how}`;
  }
  return null;
}

/* ---------------- running it ---------------- */

const RESOLVE_HOOK = `
let root;
export async function initialize(data) { root = data.root; }
export async function resolve(specifier, context, next) {
  const target = specifier.startsWith("@/") ? new URL(specifier.slice(2), root).href : specifier;
  try {
    return await next(target, context);
  } catch (error) {
    const local = target.startsWith("file:") || target.startsWith("./") || target.startsWith("../");
    if (!local || /\\.(?:[cm]?[jt]sx?|json)$/.test(target)) throw error;
    for (const suffix of [".ts", "/index.ts"]) {
      try { return await next(target + suffix, context); } catch {}
    }
    throw error;
  }
}
export async function load(url, context, next) {
  // The repository's own .ts files are ES modules (package.json sets no type), so Node need not guess and warn.
  if (url.startsWith(root) && url.endsWith(".ts") && !url.includes("/node_modules/")) {
    return next(url, { ...context, format: "module-typescript" });
  }
  return next(url, context);
}`;

function installedChromium(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ].filter((root): root is string => Boolean(root));
  const binaries = [["chrome-win64", "chrome.exe"], ["chrome-win", "chrome.exe"], ["chrome-linux64", "chrome"], ["chrome-linux", "chrome"]];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const parts of binaries) {
        const bin = join(root, dir, ...parts);
        if (existsSync(bin)) return bin;
      }
    }
  }
  return undefined;
}

/** The DOCX printed by Chromium, one single-page PDF per page. */
export async function docxPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const { chromium } = await import("@playwright/test");
  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  try {
    browser = await chromium.launch();
  } catch (error) {
    const executablePath = installedChromium();
    if (!executablePath) throw error;
    browser = await chromium.launch({ executablePath });
  }
  try {
    const page = await browser.newPage();
    await page.setContent(docxToHtml(bytes), { waitUntil: "load" });
    const options = { format: "A4" as const, printBackground: true, preferCSSPageSize: true };
    const whole = new Uint8Array(await page.pdf(options));
    const count = pdfPageCount(whole);
    if (count <= 1) return [whole];
    const pages: Uint8Array[] = [];
    for (let n = 1; n <= count; n += 1) pages.push(new Uint8Array(await page.pdf({ ...options, pageRanges: String(n) })));
    return pages;
  } finally {
    await browser.close();
  }
}

function argument(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? null) : null;
}

function statsOf(rows: AiCallRow[]): CallStat[] {
  return rows.map((r) => ({
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    costMicros: r.cost_micros,
    latencyMs: r.latency_ms,
    outcome: r.outcome,
    failureReason: r.failure_reason,
  }));
}

interface PageInputs {
  doc: ExpectedDocument;
  inputs: Array<{ page: number; kind: "image" | "pdfPage"; mime: string; bytes: Uint8Array }>;
}

/** Each document's pages as extractPage takes them: PDF pages and images as stored, the DOCX converted to PDF pages. */
async function pageInputs(doc: ExpectedDocument): Promise<PageInputs> {
  if (doc.kind === "docx") {
    const converted = await docxPages(new Uint8Array(await readFile(fromRoot(`fixtures/${doc.file}`))));
    return { doc, inputs: converted.map((bytes, i) => ({ page: i + 1, kind: "pdfPage", mime: "application/pdf", bytes })) };
  }
  const inputs: PageInputs["inputs"] = [];
  for (const p of doc.pages) {
    const path = fromRoot(`fixtures/${p.input}`);
    const image = doc.kind === "image";
    inputs.push({
      page: p.page,
      kind: image ? "image" : "pdfPage",
      mime: image ? (path.endsWith(".png") ? "image/png" : "image/jpeg") : "application/pdf",
      bytes: new Uint8Array(await readFile(path)),
    });
  }
  return { doc, inputs };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // --check: everything short of calling the model (fixtures, DOCX conversion, the client's input checks, configuration).
  const check = args.includes("--check");
  const problem = preflight(process.env);
  if (problem && !check) {
    console.error(`spike_extraction: ${problem}`);
    process.exit(2);
  }
  const logMode = argument(args, "--log") ?? "jsonl";
  if (logMode !== "jsonl" && logMode !== "db") {
    console.error("spike_extraction: --log is jsonl or db");
    process.exit(2);
  }
  const only = argument(args, "--only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;

  register(`data:text/javascript,${encodeURIComponent(RESOLVE_HOOK)}`, { data: { root: ROOT.href } });
  const ai = await import("@/lib/ai");
  const { aiClient, aiLimits } = await import("@/config/business");
  const configured = ai.readAiConfig(process.env);
  if (!configured.ok && !check) {
    console.error(`spike_extraction: ${configured.error}`);
    process.exit(2);
  }

  const ids = [...SPIKE_DOCUMENTS, INJECTION_DOCUMENT].filter((id) => !only || only.includes(id));
  const expected = await Promise.all(ids.map(readExpected));
  for (const doc of expected) {
    const missing = [doc.file, ...doc.pages.flatMap((p) => (p.input ? [p.input] : []))].filter((f) => !existsSync(fromRoot(`fixtures/${f}`)));
    if (missing.length) {
      console.error(`spike_extraction: missing fixture ${missing.join(", ")}; run: node fixtures/generate.mjs`);
      process.exit(2);
    }
  }
  const documents = await Promise.all(expected.map(pageInputs));
  for (const { doc, inputs } of documents) {
    if (inputs.length !== doc.pages.length) {
      console.error(`spike_extraction: ${doc.id} has ${inputs.length} pages but fixtures/expected lists ${doc.pages.length}`);
      process.exit(2);
    }
    for (const input of inputs) {
      const refused = ai.checkPage({ ...input, pageRef: ai.pageRef(doc.id, input.page) }, doc.locale);
      if (refused) {
        console.error(`spike_extraction: ${doc.id} page ${input.page} would be refused: ${refused}`);
        process.exit(2);
      }
    }
  }
  if (check) {
    const pages = documents.reduce((n, d) => n + d.inputs.length, 0);
    console.log(
      `spike_extraction --check: ${documents.length} documents, ${pages} pages ready (` +
        `${documents.map((d) => `${d.doc.id} ${d.inputs.length}`).join(", ")}); prompt ${ai.PROMPT_VERSION}; model call: ` +
        `${problem ?? (configured.ok ? `ready (${configured.config.vendor}, ${configured.config.invokeModel})` : configured.error)}`,
    );
    return;
  }
  if (!configured.ok) return;

  // Every row goes to memory (for the report) and to the JSONL file or the database.
  const memory = ai.memoryWriter();
  let jobId: string = randomUUID();
  let sink: AiCallWriter;
  let logLabel: string;
  if (logMode === "db") {
    const { createServiceClient } = await import("@/lib/db/client");
    const db = createServiceClient({ kind: "system", name: "script" });
    const { data, error } = await db
      .from("ai_jobs")
      .insert({ kind: "records", status: "processing", idempotency_key: `spike-${new Date().toISOString()}`, cost_currency: aiLimits.costCurrency, started_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !data) {
      console.error(`spike_extraction: could not create the ai_jobs row (${error?.code ?? "no row"})`);
      process.exit(1);
    }
    jobId = data.id;
    sink = ai.databaseWriter("script");
    logLabel = `ai_calls, job ${jobId}`;
  } else {
    const path = fromRoot("output/spike_ai_calls.jsonl");
    await mkdir(fromRoot("output"), { recursive: true });
    await writeFile(path, "", "utf8");
    sink = ai.jsonlWriter(path);
    logLabel = "output/spike_ai_calls.jsonl";
  }
  const client = ai.createAiClient({ writer: ai.teeWriter(memory, sink), env: process.env });

  const startedAt = new Date().toISOString();
  const runs: DocumentRun[] = [];
  const allItems: Parameters<typeof client.summarise>[0] = [];
  for (const { doc, inputs } of documents) {
    const pages: PageRun[] = [];
    for (const input of inputs) {
      const pageRef = ai.pageRef(doc.id, input.page);
      const before = memory.rows.length;
      process.stdout.write(`${pageRef} ... `);
      const result = await client.extractPage({ kind: input.kind, bytes: input.bytes, mime: input.mime, pageRef }, doc.locale, { jobId });
      const calls = statsOf(memory.rows.slice(before));
      const data: PageExtraction | null = result.ok ? result.data : null;
      pages.push({
        page: input.page,
        pageRef,
        ok: result.ok,
        error: result.ok ? null : `${result.error.code}: ${result.error.message}`,
        unreadable: data?.unreadable ?? false,
        notes: data?.notes ?? null,
        items: data?.items ?? [],
        calls,
      });
      if (data && doc.id !== INJECTION_DOCUMENT) allItems.push(...data.items);
      console.log(result.ok ? `${data!.items.length} items` : `failed (${result.error.code})`);
    }
    runs.push({ expected: doc, pages });
  }

  let summary: SpikeRun["summary"] = null;
  if (!args.includes("--skip-summary") && allItems.length > 0) {
    const before = memory.rows.length;
    process.stdout.write("summary ... ");
    const result = await client.summarise(allItems, "ar", { jobId });
    summary = {
      ok: result.ok,
      error: result.ok ? null : `${result.error.code}: ${result.error.message}`,
      data: result.ok ? result.data : null,
      calls: statsOf(memory.rows.slice(before)),
    };
    console.log(result.ok ? "valid" : `failed (${result.error.code})`);
  }

  const report = renderReport({
    startedAt,
    vendor: configured.config.vendor,
    model: configured.config.invokeModel,
    promptVersion: ai.PROMPT_VERSION,
    effort: aiClient.effort,
    structuredOutputs: aiClient.structuredOutputs,
    tokenCapPerJob: aiLimits.jobTokenCap,
    log: logLabel,
    documents: runs.filter((r) => r.expected.id !== INJECTION_DOCUMENT),
    injection: runs.find((r) => r.expected.id === INJECTION_DOCUMENT) ?? null,
    summary,
  });
  await mkdir(fromRoot("output"), { recursive: true });
  await writeFile(fromRoot("output/spike_report.md"), report, "utf8");
  if (logMode === "db") {
    const { createServiceClient } = await import("@/lib/db/client");
    const failedAny = runs.some((r) => r.pages.some((p) => !p.ok)) || (summary !== null && !summary.ok);
    await createServiceClient({ kind: "system", name: "script" })
      .from("ai_jobs")
      .update({ status: failedAny ? "failed" : "done", finished_at: new Date().toISOString(), failure_reason: failedAny ? "spike: a call failed" : null })
      .eq("id", jobId);
  }
  const total = totalScore(runs.filter((r) => r.expected.id !== INJECTION_DOCUMENT).map(scoreDocument));
  console.log(
    `spike_extraction: wrote output/spike_report.md · recall ${pct(total.recall)} · USD ${usd(total.costMicros / Math.max(1, total.pages))} a page · ` +
      `${seconds(total.latencyMs / Math.max(1, total.pages))} s a page`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(`spike_extraction: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
