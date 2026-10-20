// What the admin AI jobs page (screen 45, task 3.11) derives from a records-pipeline job: its status and step (from the same
// stepStates the patient's progress page uses, so both see the same job at the same step), pages, tokens and cost, the price
// it is measured against, and the spend per calendar day for the tiles, the chart and the daily alert. Pure, except aiConfig,
// which reads the environment and so is for server components only. Never reads page content: names, sizes and counts only.
import { aiLimits } from "@/config/business";
import { DAY_MS, dayKeyInZone } from "@/lib/format";
import { quoteFor, stepStates, type PipelineStep, type RecordSetStatus, type StepState } from "@/lib/records";
import type { AiJobStep, AiUsage, SampleAiJob } from "@/lib/sample";

/** A record set's status, plus a failed job whose retry is queued (attempt 2 waits to start again from the failed page). */
export type JobStatus = RecordSetStatus | "retryQueued";

export const JOB_FILTERS = ["all", "inProgress", "failed", "done", "cancelled"] as const;
export type JobFilter = (typeof JOB_FILTERS)[number];

export function filterFrom(value: unknown): JobFilter {
  return typeof value === "string" && (JOB_FILTERS as readonly string[]).includes(value) ? (value as JobFilter) : "all";
}

/** The filter a status belongs to: queued, running and retry queued are all in progress. */
export function filterOf(status: JobStatus): Exclude<JobFilter, "all"> {
  if (status === "queued" || status === "processing" || status === "retryQueued") return "inProgress";
  return status;
}

/**
 * The status shown. Prototype previews: `retryQueued` names a failed job whose Retry was accepted, `cancelled` a queued or
 * running job that was stopped (the rows the retry and cancel actions would write). Anything else shows the stored status.
 */
export function jobStatus(job: SampleAiJob, preview: { retryQueued?: string; cancelled?: string } = {}): JobStatus {
  const status = job.set.status;
  if (preview.retryQueued === job.id && status === "failed") return "retryQueued";
  if (preview.cancelled === job.id && (status === "queued" || status === "processing")) return "cancelled";
  return status;
}

/** The nine steps' states. A queued retry waits at the step that failed; a stopped job shows that step as stopped. */
export function jobStepStates(job: SampleAiJob, status: JobStatus): Record<PipelineStep, StepState> {
  return stepStates(status === "retryQueued" ? "queued" : status, job.set.step);
}

export const NO_USAGE: AiUsage = { calls: 0, retries: 0, inputTokens: 0, outputTokens: 0, costMicros: 0 };

export function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    calls: a.calls + b.calls,
    retries: a.retries + b.retries,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costMicros: a.costMicros + b.costMicros,
  };
}

/** A step's usage: its own row, or the sum of its files (extract). null for steps that make no AI call. */
export function stepUsage(step: AiJobStep): AiUsage | null {
  if (step.usage) return step.usage;
  return step.files ? step.files.reduce(addUsage, NO_USAGE) : null;
}

export function jobUsage(job: SampleAiJob): AiUsage {
  return job.steps.reduce((sum, s) => addUsage(sum, stepUsage(s) ?? NO_USAGE), NO_USAGE);
}

export const tokensOf = (u: AiUsage) => u.inputTokens + u.outputTokens;

/** Millionths of a dollar to cents (formatMoney and formatMoneyFine take minor units). */
export const microsToCents = (micros: number) => micros / 10_000;

/** Pages numbered across the set, as the patient's page numbers them ("page 4 of 10"). */
export type JobPages = { total: number; done: number; unreadable: number; reading: number | null; failedAt: number | null };

export function jobPages(job: SampleAiJob, status: JobStatus): JobPages {
  let n = 0;
  const out: JobPages = { total: 0, done: 0, unreadable: 0, reading: null, failedAt: null };
  for (const file of job.set.files) {
    file.pages.forEach((p, i) => {
      n += 1;
      if (p.status === "read" || p.status === "unreadable") out.done += 1;
      if (p.status === "unreadable") out.unreadable += 1;
      if (p.status === "reading" && out.reading === null && status === "processing") out.reading = n;
      const failure = job.set.failure;
      if (failure && failure.fileId === file.id && failure.filePage === i + 1) out.failedAt = n;
    });
  }
  out.total = n;
  return out;
}

export const jobBytes = (job: SampleAiJob) => job.set.files.reduce((n, f) => n + f.sizeBytes, 0);

/** The quote the job is measured against: the same quoteFor the patient paid (rule C5, all fees included). */
export const jobQuoteCents = (job: SampleAiJob) => quoteFor(jobBytes(job)).totalCents;

/** Screen 25's rule: the price is taken only when the summary is ready; a failed or stopped set is not charged. */
export type PriceState = "taken" | "pending" | "notTaken";
export function priceState(status: JobStatus): PriceState {
  if (status === "done") return "taken";
  if (status === "failed" || status === "cancelled") return "notTaken";
  return "pending";
}

/** When each logged cost landed: a finished extract step spreads its files evenly over the step, in file order; a step still
 *  running counts its calls so far at its start; any other step at its end. */
function costEvents(job: SampleAiJob): Array<{ at: Date; costMicros: number }> {
  return job.steps.flatMap((s) => {
    if (s.files && s.finishedAt) {
      const span = s.finishedAt.getTime() - s.startedAt.getTime();
      return s.files.map((f, i) => ({ at: new Date(s.startedAt.getTime() + (span * (i + 1)) / s.files!.length), costMicros: f.costMicros }));
    }
    const u = stepUsage(s);
    return u && u.costMicros ? [{ at: s.finishedAt ?? s.startedAt, costMicros: u.costMicros }] : [];
  });
}

export type SpendWindow = {
  /** AI cost logged in the window. */
  costMicros: number;
  /** Prices taken in the window (sets finished as done). */
  chargedCents: number;
  /** Prices of sets started in the window and still running, taken when they finish. */
  pendingCents: number;
  /** Jobs started in the window. */
  jobs: number;
};

const inDays = (key: string, from: string, to: string) => key >= from && key <= to;

/** Spend over the last `days` calendar days in `timeZone`, today included (1 is today, 7 the last 7 days). */
export function spendWindow(jobs: SampleAiJob[], days: number, now: Date, timeZone: string, preview?: Parameters<typeof jobStatus>[1]): SpendWindow {
  const to = dayKeyInZone(now, timeZone);
  const from = dayKeyInZone(new Date(now.getTime() - (days - 1) * DAY_MS), timeZone);
  const key = (d: Date) => dayKeyInZone(d, timeZone);
  const out: SpendWindow = { costMicros: 0, chargedCents: 0, pendingCents: 0, jobs: 0 };
  for (const job of jobs) {
    for (const e of costEvents(job)) if (inDays(key(e.at), from, to)) out.costMicros += e.costMicros;
    const status = jobStatus(job, preview);
    const started = inDays(key(job.set.createdAt), from, to);
    if (started) out.jobs += 1;
    if (status === "done" && job.set.finishedAt && inDays(key(job.set.finishedAt), from, to)) out.chargedCents += jobQuoteCents(job);
    if (priceState(status) === "pending" && started) out.pendingCents += jobQuoteCents(job);
  }
  return out;
}

/** AI cost per calendar day in `timeZone`, oldest first, the last entry today. `at` is an instant inside that day. */
export function dailySpend(jobs: SampleAiJob[], days: number, now: Date, timeZone: string): Array<{ key: string; at: Date; costMicros: number }> {
  const totals = new Map<string, number>();
  for (const job of jobs) for (const e of costEvents(job)) {
    const k = dayKeyInZone(e.at, timeZone);
    totals.set(k, (totals.get(k) ?? 0) + e.costMicros);
  }
  return Array.from({ length: days }, (_, i) => {
    const at = new Date(now.getTime() - (days - 1 - i) * DAY_MS);
    const key = dayKeyInZone(at, timeZone);
    return { key, at, costMicros: totals.get(key) ?? 0 };
  });
}

export const alertThresholdMicros = aiLimits.dailySpendAlertCents * 10_000;

/** When the day's running AI cost first reached the daily alert threshold, or null if it did not. */
export function alertCrossing(jobs: SampleAiJob[], dayKey: string, timeZone: string): Date | null {
  const events = jobs
    .flatMap(costEvents)
    .filter((e) => dayKeyInZone(e.at, timeZone) === dayKey)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  let sum = 0;
  for (const e of events) {
    sum += e.costMicros;
    if (sum >= alertThresholdMicros) return e.at;
  }
  return null;
}

/** The job whose cost that day was largest, for the alert's "biggest job" line. */
export function biggestJobOn(jobs: SampleAiJob[], dayKey: string, timeZone: string): { job: SampleAiJob; costMicros: number } | null {
  let best: { job: SampleAiJob; costMicros: number } | null = null;
  for (const job of jobs) {
    const cost = costEvents(job).filter((e) => dayKeyInZone(e.at, timeZone) === dayKey).reduce((n, e) => n + e.costMicros, 0);
    if (cost > 0 && (!best || cost > best.costMicros)) best = { job, costMicros: cost };
  }
  return best;
}

/** Whole hours, minutes and seconds of a duration, for "1 min 52 s". */
export function durationParts(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.round(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/**
 * The model the pipeline is pinned to, as configured: lib/ai (task 1.9) reads AI_VENDOR (anthropic | bedrock) and AI_MODEL from
 * the environment. Shown as configuration, never as a name written into the page. Display only: nothing here calls a model.
 */
export function aiConfig(): { vendor: string | null; model: string | null } {
  const vendor = process.env.AI_VENDOR?.trim();
  const model = process.env.AI_MODEL?.trim();
  // Shown as set; which vendors are valid is lib/ai's business (ADR 3), not this page's.
  return { vendor: vendor || null, model: model || null };
}
