// Screen 45 helpers: the query string (zone, filter, previews), the hrefs that keep it, and the label lines the list and the
// detail share, so a job reads the same in both. Numbers only through lib/format (Western digits, rule N1).
import { aiLimits } from "@/config/business";
import { formatMoneyFine, formatNumber, formatPercent, type Locale } from "@/lib/format";
import { durationParts, filterFrom, jobPages, microsToCents, type JobFilter, type JobStatus } from "@/lib/ai-jobs";
import { PIPELINE_STEPS } from "@/lib/records";
import { sampleAdmin, type SampleAiJob } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export const LIST_PATH = "/admin/ai-jobs";
export const jobPath = (id: string) => `${LIST_PATH}/${id}`;
const ID = /^job_[0-9]{3}$/;

/** Admin pages render in the signed-in admin's zone (sampleAdmin, Riyadh) unless ?tz= names another IANA zone. */
export function adminZone(sp: SearchParams): string {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : sampleAdmin.timeZone;
}

export const stateOf = (sp: SearchParams) => (typeof sp.state === "string" ? sp.state : undefined);
export const statusFilter = (sp: SearchParams): JobFilter => filterFrom(sp.status);

/**
 * The previews the prototype can show without a database: ?state=retryQueued (the failed job named by ?job=, else the first
 * failed one, as the Retry action would leave it) and, on a detail page, ?state=cancelled (a queued or running job after Stop).
 */
export function previewFor(sp: SearchParams, jobs: SampleAiJob[], detailId?: string): { retryQueued?: string; cancelled?: string } {
  const state = stateOf(sp);
  if (state === "retryQueued") {
    const named = typeof sp.job === "string" && ID.test(sp.job) ? sp.job : undefined;
    return { retryQueued: detailId ?? named ?? jobs.find((j) => j.set.status === "failed")?.id };
  }
  if (state === "cancelled" && detailId) return { cancelled: detailId };
  return {};
}

/** The list URL with the zone and filter kept; `extra` adds or replaces params (undefined drops one). */
export function listHref(sp: SearchParams, extra: Record<string, string | undefined> = {}) {
  const query: Record<string, string> = {};
  if (typeof sp.tz === "string") query.tz = sp.tz;
  const status = statusFilter(sp);
  if (status !== "all") query.status = status;
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete query[k];
    else query[k] = v;
  }
  return { pathname: LIST_PATH, query };
}

export function detailHref(sp: SearchParams, id: string, extra: Record<string, string> = {}) {
  const query: Record<string, string> = { ...extra };
  if (typeof sp.tz === "string") query.tz = sp.tz;
  return { pathname: jobPath(id), query };
}

/** The same href as a string, for client components that navigate after an action. */
export function hrefString(href: { pathname: string; query: Record<string, string> }): string {
  const q = new URLSearchParams(href.query).toString();
  return q ? `${href.pathname}?${q}` : href.pathname;
}

/** A Latin id, file name or address inside a sentence, in a first-strong isolate (rule R3), so Arabic punctuation stays put. */
export const isolate = (s: string) => `${String.fromCharCode(0x2068)}${s}${String.fromCharCode(0x2069)}`;

export const firstName = (job: SampleAiJob, locale: Locale) => (locale === "ar" ? job.patientFirstNameAr : job.patientFirstNameEn);

/** ICU plural arguments: `count` picks the form, `label` is the number in Western digits. */
export const counted = (n: number, locale: Locale) => ({ count: n, label: formatNumber(n, locale) });

/** AI cost: to the cent from a cent up ("USD 11.32", "USD 0.07"), up to four decimals below it ("USD 0.0042"). */
export function costLabel(micros: number, locale: Locale): string {
  const cents = microsToCents(micros);
  return cents >= 1 || cents === 0
    ? formatMoneyFine(Math.round(cents), aiLimits.costCurrency, locale, 2)
    : formatMoneyFine(cents, aiLimits.costCurrency, locale, 4);
}

/** Cost a page: always four decimals at most, so pages compare at a glance. */
export const perPageLabel = (micros: number, pages: number, locale: Locale) =>
  formatMoneyFine(pages > 0 ? microsToCents(micros) / pages : 0, aiLimits.costCurrency, locale, 4);

export const shareLabel = (micros: number, cents: number, locale: Locale) =>
  formatPercent(cents > 0 ? (microsToCents(micros) / cents) * 100 : 0, locale, 1);

/** "1 min 52 s", "38 s", "13 min", "1 h 4 min". */
export function durationLabel(ms: number, t: Translate, locale: Locale): string {
  const { h, m, s } = durationParts(ms);
  const n = (v: number) => formatNumber(v, locale);
  if (h > 0) return t("duration.hm", { h: n(h), m: n(m) });
  if (m >= 10 || (m > 0 && s === 0)) return t("duration.m", { m: n(m) });
  if (m > 0) return t("duration.ms", { m: n(m), s: n(s) });
  return t("duration.s", { s: n(s) });
}

/** The one line under a job's status: where it is in the nine steps, in the same page numbers the patient sees. */
export function stepLine(job: SampleAiJob, status: JobStatus, t: Translate, locale: Locale): string {
  const p = jobPages(job, status);
  const n = (v: number) => formatNumber(v, locale);
  const step = t(`steps.${job.set.step ?? "extract"}`);
  switch (status) {
    case "queued":
      return t("stepLine.queued", { pages: t("counts.pages", counted(p.total, locale)) });
    case "processing":
      return t("stepLine.processing", { step, done: n(p.done), total: n(p.total) });
    case "failed":
      return t("stepLine.failed", { step, page: n(p.failedAt ?? p.done + 1), total: n(p.total) });
    case "retryQueued":
      return t("stepLine.retryQueued", { page: n(p.failedAt ?? p.done + 1), total: n(p.total) });
    case "cancelled":
      return t("stepLine.cancelled", { step, done: n(p.done), total: n(p.total) });
    case "done": {
      const first = job.steps[0]?.startedAt;
      const last = job.steps.at(-1)?.finishedAt;
      return t("stepLine.done", { steps: n(PIPELINE_STEPS.length), duration: first && last ? durationLabel(last.getTime() - first.getTime(), t, locale) : "" });
    }
  }
}

/** Badge tone per status: running is information, failed is danger, done is success, the waiting ones are neutral. */
export const statusTone = (status: JobStatus) =>
  status === "failed" ? "danger" : status === "done" ? "success" : status === "processing" ? "info" : "pending";

