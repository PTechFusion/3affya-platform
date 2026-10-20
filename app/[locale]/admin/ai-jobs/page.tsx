// Screen 45, AI jobs and costs (docs/screens/45-ai-jobs-and-costs.md, task 3.11). Phone first: the heading, the spend tile row
// (today, the last 7 and the last 30 days, each against the price charged, and the daily alert), then the jobs with status
// filters and Retry on a failed job, then AI cost per day for 30 days against the alert line (rule R11: LTR numerals, the time
// axis mirrored by hand). A job opens /admin/ai-jobs/[id]: per-step timings, files by name and size, Retry or Stop.
// Data: data/sample/ai-jobs.json through sampleAiJobs (lib/sample.ts); job_001..job_006 run the patient sample sets
// rs_001..rs_006, so job_004 is reading the same page the patient's /patient/records/rs_004 shows. Model and vendor come from
// AI_MODEL and AI_VENDOR (lib/ai-jobs aiConfig), never written into the page. Times in sampleAdmin's zone unless ?tz=.
// States: list (default); ?status=inProgress|failed|done|cancelled (filters); ?state=empty (no jobs yet, one action, rule L3);
// ?state=loading (skeleton, as loading.tsx); ?state=error (the list did not load); ?state=retryQueued (after Retry on job_005,
// or ?job=); ?state=alert (today passed the daily alert: the alertPreview job, job_007, moved to today). Failed job: job_005.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice, Surface } from "@/components/ui";
import { aiLimits } from "@/config/business";
import { formatMoney, formatNumber, formatTime, formatZone, type Locale } from "@/lib/format";
import {
  aiConfig,
  alertCrossing,
  alertThresholdMicros,
  biggestJobOn,
  dailySpend,
  filterOf,
  jobPages,
  jobStatus,
  spendWindow,
} from "@/lib/ai-jobs";
import { sampleAdmin, sampleAiJobs } from "@/lib/sample";
import { JobsList, StatusFilters, type JobRow } from "./_parts/JobsList";
import { ListHeader, ListSkeleton } from "./_parts/Skeletons";
import { SpendChart, SpendTiles } from "./_parts/Spend";
import { adminZone, costLabel, counted, detailHref, isolate, listHref, previewFor, stateOf, statusFilter, type SearchParams } from "./_parts/jobs";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminAiJobs" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function AiJobsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = stateOf(sp);
  if (state === "loading") return <ListSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminAiJobs");
  const timeZone = adminZone(sp);
  const now = new Date();
  const zoneLine = t.rich("zoneLine", { zone: formatZone(now, timeZone), z: (chunks) => <span className="ltr-run">{chunks}</span> });
  const header = <ListHeader zoneLine={zoneLine} />;

  if (state === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Surface className="flex flex-col items-start gap-4">
          <div role="alert">
            <h2 className="text-lg font-bold text-ink-900">{t("error.title")}</h2>
            <p className="mt-1 max-w-xl text-ink-700">{t("error.body")}</p>
          </div>
          <LinkButton href={listHref(sp, { state: undefined })}>{t("error.action")}</LinkButton>
        </Surface>
      </div>
    );
  }

  const jobs = state === "empty" ? [] : sampleAiJobs({ alertPreview: state === "alert" });
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState title={t("empty.title")} body={t("empty.body")} action={<LinkButton href="/admin/payments">{t("empty.action")}</LinkButton>} />
      </div>
    );
  }

  const preview = previewFor(sp, jobs);
  const rows: JobRow[] = jobs.map((job) => ({ job, status: jobStatus(job, preview) }));
  const filter = statusFilter(sp);
  const shown = filter === "all" ? rows : rows.filter((r) => filterOf(r.status) === filter);
  const days = dailySpend(jobs, 30, now, timeZone);
  const todayKey = days[days.length - 1]!.key;
  const crossedToday = alertCrossing(jobs, todayKey, timeZone);
  const lastAlertDay = days.slice(0, -1).reverse().find((d) => d.costMicros >= alertThresholdMicros);
  const biggest = crossedToday ? biggestJobOn(jobs, todayKey, timeZone) : null;
  const retried = preview.retryQueued ? rows.find((r) => r.job.id === preview.retryQueued) : undefined;
  const retriedPages = retried ? jobPages(retried.job, "failed") : null;
  const { model, vendor } = aiConfig();
  const n = (v: number) => formatNumber(v, loc);

  return (
    <div className="flex flex-col gap-6">
      {header}

      {crossedToday ? (
        <Notice
          tone="warning"
          title={t("notices.alert.title")}
          body={t("notices.alert.body", {
            amount: costLabel(days[days.length - 1]!.costMicros, loc),
            time: formatTime(crossedToday, timeZone, loc),
            threshold: formatMoney(aiLimits.dailySpendAlertCents, aiLimits.costCurrency, loc),
            email: isolate(sampleAdmin.email),
            job: biggest ? isolate(biggest.job.id) : "",
            cost: biggest ? costLabel(biggest.costMicros, loc) : "",
          })}
          action={
            biggest ? (
              <LinkButton href={detailHref(sp, biggest.job.id, { state: "alert" })} variant="secondary">
                {t("notices.alert.action", { job: isolate(biggest.job.id) })}
              </LinkButton>
            ) : undefined
          }
        />
      ) : null}

      {retried && retriedPages ? (
        <Notice
          tone="success"
          role="status"
          title={t("notices.retryQueued.title", { job: isolate(retried.job.id) })}
          body={t("notices.retryQueued.body", {
            attempt: n(retried.job.attempt + 1),
            page: n(retriedPages.failedAt ?? retriedPages.done + 1),
            total: n(retriedPages.total),
          })}
        />
      ) : null}

      <SpendTiles
        today={spendWindow(jobs, 1, now, timeZone, preview)}
        week={spendWindow(jobs, 7, now, timeZone, preview)}
        month={spendWindow(jobs, 30, now, timeZone, preview)}
        alert={{ crossedToday, lastDay: lastAlertDay?.at ?? null }}
        locale={loc}
        timeZone={timeZone}
      />

      <section aria-labelledby="jobs-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="jobs-title" className="text-xl font-bold text-sea-900">
            {t("jobs.title")}
          </h2>
          <p className="text-sm text-ink-700">
            {t("config.model")} <span className="ltr-run font-semibold text-ink-900">{model ?? t("config.notSet")}</span>
            {" · "}
            {t("config.vendor")} <span className="ltr-run font-semibold text-ink-900">{vendor ?? t("config.notSet")}</span>
          </p>
          <p className="text-xs text-ink-500">{t("config.source", { model: "AI_MODEL", vendor: "AI_VENDOR" })}</p>
        </div>
        <StatusFilters rows={rows} current={filter} sp={sp} />
        {shown.length ? (
          <JobsList rows={shown} locale={loc} timeZone={timeZone} sp={sp} />
        ) : (
          <EmptyState
            title={t(`emptyFilter.${filter}.title`)}
            body={t(`emptyFilter.${filter}.body`, { attempts: aiLimits.attemptsPerCall, attemptsLabel: n(aiLimits.attemptsPerCall) })}
            action={<LinkButton href={listHref(sp, { status: undefined })}>{t("emptyFilter.action")}</LinkButton>}
          />
        )}
        <p className="text-sm text-ink-500">{t("jobs.count", { ...counted(shown.length, loc), all: n(rows.length) })}</p>
      </section>

      <SpendChart days={days} locale={loc} timeZone={timeZone} />
    </div>
  );
}
