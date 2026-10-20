// Screen 45, one AI job (/admin/ai-jobs/[id]). The heading with the status, the failure or preview notice (Retry on a failed
// job), the facts (when, pages, tokens against the job cap, AI cost against the price, retries, the configured model), the nine
// steps with their timings and usage, then the cost per file. Files by name and size only, never their content. Stop is
// offered while a job is queued or running and asks first (rule B10).
// Sample: job_001..job_010 (data/sample/ai-jobs.json); job_005 failed (damaged page 4), job_004 running, job_006 queued,
// job_010 cancelled by the patient, job_007 the large set that passed the daily alert. States: ?state=retryQueued (job_005
// after Retry), ?state=cancelled (job_004 or job_006 after Stop), ?state=alert (job_007 moved to today, as on the list),
// ?state=loading (skeleton, as loading.tsx). An unknown id is an in-shell empty state with one action (PLAYBOOK §9).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Breadcrumbs, EmptyState, LinkButton, Notice, Surface } from "@/components/ui";
import { aiLimits, business } from "@/config/business";
import { formatMoney, formatNumber, formatPercent, formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";
import { aiConfig, jobBytes, jobPages, jobQuoteCents, jobStatus, jobUsage, priceState, tokensOf } from "@/lib/ai-jobs";
import { BYTES_PER_MB } from "@/lib/records";
import { sampleAiJobById, sampleAiJobs } from "@/lib/sample";
import { CancelJob, RetryJob } from "../_parts/JobActions";
import { FileCosts, StepTimings } from "../_parts/JobDetail";
import { DetailSkeleton } from "../_parts/Skeletons";
import {
  adminZone,
  costLabel,
  counted,
  detailHref,
  firstName,
  hrefString,
  isolate,
  listHref,
  perPageLabel,
  previewFor,
  shareLabel,
  stateOf,
  statusTone,
  stepLine,
  type SearchParams,
} from "../_parts/jobs";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "adminAiJobs" });
  return { title: t("detail.metaTitle", { job: id }), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function AiJobPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = stateOf(sp);
  if (state === "loading") return <DetailSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminAiJobs");
  const tp = await getTranslations("portal.admin");
  const timeZone = adminZone(sp);
  const job = sampleAiJobById(id, { alertPreview: state === "alert" });
  const crumbs = [
    { label: tp("title"), href: "/admin" },
    { label: tp("nav.aiJobs"), href: hrefString(listHref(sp, { status: undefined })) },
  ];

  if (!job) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs label={t("detail.breadcrumbs")} items={[...crumbs, { label: t("detail.notFound.crumb") }]} />
        <EmptyState
          title={t("detail.notFound.title")}
          body={t("detail.notFound.body")}
          action={<LinkButton href={listHref(sp, { status: undefined })}>{t("detail.notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const status = jobStatus(job, previewFor(sp, sampleAiJobs(), job.id));
  const usage = jobUsage(job);
  const pages = jobPages(job, status);
  const quote = jobQuoteCents(job);
  const n = (v: number) => formatNumber(v, loc);
  const when = (d: Date) => `${formatSlotDay(d, timeZone, loc)} · ${formatTime(d, timeZone, loc)}`;
  const finishedAt = status === "done" || status === "failed" || (status === "cancelled" && job.set.status === "cancelled") ? job.set.finishedAt : null;
  const { model, vendor } = aiConfig();
  const failedPage = pages.failedAt ?? pages.done + 1;
  const failedFile = job.set.failure ? job.set.files.find((f) => f.id === job.set.failure?.fileId) : undefined;
  const sizeMb = formatNumber(Math.max(0.1, jobBytes(job) / BYTES_PER_MB), loc, { maximumFractionDigits: 1 });
  const zone = t.rich("zoneLine", { zone: formatZone(job.set.createdAt, timeZone), z: (chunks) => <span className="ltr-run">{chunks}</span> });

  const facts: Array<{ key: string; label: string; value: React.ReactNode; note?: string }> = [
    { key: "started", label: t("detail.facts.started"), value: when(job.set.createdAt) },
    {
      key: "finished",
      label: t("detail.facts.finished"),
      value: finishedAt ? when(finishedAt) : t(status === "cancelled" ? "detail.facts.stoppedNow" : "row.notFinished"),
      note: finishedAt ? t("detail.facts.took", { duration: durationOf(job.set.createdAt, finishedAt) }) : undefined,
    },
    {
      key: "pages",
      label: t("detail.facts.pages"),
      value: t("detail.facts.pagesValue", { done: n(pages.done), total: n(pages.total) }),
      note: pages.unreadable ? t("detail.files.unreadable", { count: pages.unreadable, label: n(pages.unreadable) }) : undefined,
    },
    {
      key: "tokens",
      label: t("detail.facts.tokens"),
      value: n(tokensOf(usage)),
      note: t("detail.facts.tokensNote", {
        input: n(usage.inputTokens),
        output: n(usage.outputTokens),
        pct: formatPercent((tokensOf(usage) / aiLimits.jobTokenCap) * 100, loc, 0),
        cap: n(aiLimits.jobTokenCap),
      }),
    },
    {
      key: "cost",
      label: t("detail.facts.cost"),
      value: costLabel(usage.costMicros, loc),
      note: t("row.perPage", { amount: perPageLabel(usage.costMicros, pages.total, loc) }),
    },
    {
      key: "price",
      label: t("detail.facts.price"),
      value: formatMoney(quote, business.currencyPresentment, loc),
      note: `${t(`price.${priceState(status)}`)} · ${t("detail.facts.share", { pct: shareLabel(usage.costMicros, quote, loc) })}`,
    },
    {
      key: "retries",
      label: t("detail.facts.retries"),
      value: n(usage.retries),
      note: t("detail.facts.attempt", { attempt: n(status === "retryQueued" ? job.attempt + 1 : job.attempt), max: n(aiLimits.attemptsPerCall) }),
    },
    {
      key: "model",
      label: t("detail.facts.model"),
      value: <span className="ltr-run break-all">{model ?? t("config.notSet")}</span>,
      note: t("detail.facts.vendorNote", { vendor: vendor ?? t("config.notSet"), env: "AI_MODEL, AI_VENDOR" }),
    },
  ];

  function durationOf(a: Date, b: Date) {
    const ms = b.getTime() - a.getTime();
    const m = Math.round(ms / 60_000);
    return m >= 1 ? t("duration.m", { m: n(m) }) : t("duration.s", { s: n(Math.round(ms / 1000)) });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs label={t("detail.breadcrumbs")} items={[...crumbs, { label: job.id }]} />
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">
            {t("detail.title")} <span className="ltr-run">{job.id}</span>
          </h1>
          <Badge tone={statusTone(status)}>{t(`status.${status}`)}</Badge>
        </div>
        <p className="mt-1.5 text-ink-700">
          {t("detail.lead", {
            set: isolate(job.set.id),
            name: firstName(job, loc),
            files: t("counts.files", counted(job.set.files.length, loc)),
            pages: t("counts.pages", counted(pages.total, loc)),
            size: sizeMb,
          })}
        </p>
        <p className="mt-1 text-sm text-ink-900">{stepLine(job, status, t, loc)}</p>
        <p className="mt-0.5 text-sm text-ink-500">{zone}</p>
      </header>

      {status === "failed" && job.set.failure ? (
        <Notice
          tone="danger"
          title={t("detail.failure.title", { page: n(failedPage), total: n(pages.total), attempts: n(aiLimits.attemptsPerCall) })}
          body={
            <>
              <p>
                {t(`detail.failure.reason.${job.set.failure.reason}`, {
                  filePage: n(job.set.failure.filePage),
                  file: failedFile ? isolate(failedFile.name) : "",
                })}
              </p>
              <p className="mt-1">{t("detail.failure.charge")}</p>
            </>
          }
          action={<RetryJob id={job.id} size="lg" doneHref={hrefString(detailHref(sp, job.id, { state: "retryQueued" }))} />}
        />
      ) : null}
      {status === "retryQueued" ? (
        <Notice
          tone="success"
          role="status"
          title={t("notices.retryQueued.title", { job: isolate(job.id) })}
          body={t("notices.retryQueued.body", { attempt: n(job.attempt + 1), page: n(failedPage), total: n(pages.total) })}
        />
      ) : null}
      {status === "cancelled" && job.set.status !== "cancelled" ? (
        <Notice tone="info" role="status" title={t("detail.cancelled.title")} body={t("detail.cancelled.body")} />
      ) : null}

      <Surface className="flex flex-col gap-4">
        <h2 className="sr-only">{t("detail.facts.title")}</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.key} className="min-w-0">
              <dt className="text-sm text-ink-500">{f.label}</dt>
              <dd className="tabular font-semibold text-ink-900">{f.value}</dd>
              {f.note ? <dd className="tabular text-sm text-ink-700">{f.note}</dd> : null}
            </div>
          ))}
        </dl>
        {status === "queued" || status === "processing" ? (
          <div className="border-t border-sand-200 pt-4">
            <CancelJob id={job.id} doneHref={hrefString(detailHref(sp, job.id, { state: "cancelled" }))} />
          </div>
        ) : null}
      </Surface>

      <StepTimings job={job} status={status} locale={loc} timeZone={timeZone} />
      <FileCosts job={job} locale={loc} />
    </div>
  );
}

