// Screen 45 job list: status filter chips, then the jobs as a table on desktop and as one card per job on phone (the same
// facts, in the same order). Each job: id and record set, patient first name only, status with the step line, pages, tokens,
// AI cost with the cost a page, the price it is measured against, started and finished (the zone is named once, above), retries
// and Retry on a failed job. Never a document's content: the detail lists file names and sizes only.
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, Chip, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatMoney, formatNumber, formatSlotDay, formatTime, type Locale } from "@/lib/format";
import { filterOf, jobPages, jobQuoteCents, jobUsage, priceState, tokensOf, JOB_FILTERS, type JobFilter, type JobStatus } from "@/lib/ai-jobs";
import type { SampleAiJob } from "@/lib/sample";
import { RetryJob } from "./JobActions";
import { costLabel, detailHref, firstName, hrefString, listHref, perPageLabel, statusTone, stepLine, type SearchParams } from "./jobs";

export type JobRow = { job: SampleAiJob; status: JobStatus };

export function StatusFilters({ rows, current, sp }: { rows: JobRow[]; current: JobFilter; sp: SearchParams }) {
  const t = useTranslations("adminAiJobs.filters");
  const locale = useLocale() as Locale;
  const count = (f: JobFilter) => (f === "all" ? rows.length : rows.filter((r) => filterOf(r.status) === f).length);
  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-wrap gap-2">
        {JOB_FILTERS.map((f) => (
          <li key={f}>
            <Link
              href={listHref(sp, { status: f === "all" ? undefined : f, state: undefined, job: undefined })}
              scroll={false}
              aria-current={f === current ? "page" : undefined}
              className="block rounded-[var(--radius-tag)]"
            >
              <Chip tone={f === current ? "lagoon" : "sand"}>
                {t(f)}
                <span className="tabular ms-2 text-ink-700">{formatNumber(count(f), locale)}</span>
              </Chip>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function when(d: Date, timeZone: string, locale: Locale) {
  return `${formatSlotDay(d, timeZone, locale)} · ${formatTime(d, timeZone, locale)}`;
}

/** Finished on the same calendar day as it started: the time alone. */
function finishedLabel(start: Date, end: Date, timeZone: string, locale: Locale) {
  return formatSlotDay(start, timeZone, locale) === formatSlotDay(end, timeZone, locale) ? formatTime(end, timeZone, locale) : when(end, timeZone, locale);
}

function useRowFacts(row: JobRow, locale: Locale, timeZone: string) {
  const t = useTranslations("adminAiJobs");
  const { job, status } = row;
  const usage = jobUsage(job);
  const pages = jobPages(job, status);
  const finishedAt = status === "done" || status === "failed" || status === "cancelled" ? job.set.finishedAt : null;
  return {
    usage,
    pages,
    line: stepLine(job, status, t, locale),
    started: when(job.set.createdAt, timeZone, locale),
    finished: finishedAt ? finishedLabel(job.set.createdAt, finishedAt, timeZone, locale) : null,
    // The table's two short lines: the day, then start to finish (each time kept whole).
    day: formatSlotDay(job.set.createdAt, timeZone, locale),
    startTime: formatTime(job.set.createdAt, timeZone, locale),
    endTime: finishedAt ? finishedLabel(job.set.createdAt, finishedAt, timeZone, locale) : null,
    price: formatMoney(jobQuoteCents(job), business.currencyPresentment, locale),
    priceNote: t(`price.${priceState(status)}`),
  };
}

function JobCard({ row, locale, timeZone, sp }: { row: JobRow; locale: Locale; timeZone: string; sp: SearchParams }) {
  const t = useTranslations("adminAiJobs");
  const { job, status } = row;
  const f = useRowFacts(row, locale, timeZone);
  const n = (v: number) => formatNumber(v, locale);
  return (
    <Surface className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-3">
        {/* The name and ids open the job; the row has no other link, so nothing interactive is nested. */}
        <Link
          href={detailHref(sp, job.id)}
          aria-label={t("row.openLabel", { job: job.id })}
          className="group -m-1 flex min-h-11 min-w-0 items-start gap-2 rounded-[var(--radius-field)] p-1"
        >
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-snug text-sea-800 group-hover:underline">{firstName(job, locale)}</span>
            <span className="block text-sm text-ink-700">
              <span className="ltr-run">{job.id}</span> · <span className="ltr-run">{job.set.id}</span>
            </span>
          </span>
          <ChevronNext className="mt-1.5 size-4 shrink-0 text-sea-700" />
        </Link>
        <Badge tone={statusTone(status)}>{t(`status.${status}`)}</Badge>
      </div>
      <p className="text-sm text-ink-900">{f.line}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-sand-200 pt-2.5">
        {[
          [t("columns.pages"), n(f.pages.total)],
          [t("columns.tokens"), n(tokensOf(f.usage))],
          [t("columns.cost"), costLabel(f.usage.costMicros, locale)],
          [t("columns.retries"), n(f.usage.retries)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="tabular whitespace-nowrap text-sm font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-700">
        {t("row.started", { when: f.started })}
        {f.finished ? ` · ${t("row.finished", { when: f.finished })}` : ""}
      </p>
      {status === "failed" ? (
        <RetryJob id={job.id} doneHref={hrefString(listHref(sp, { status: undefined, state: "retryQueued", job: job.id }))} className="mt-0.5" />
      ) : null}
    </Surface>
  );
}

export function JobsList({ rows, locale, timeZone, sp }: { rows: JobRow[]; locale: Locale; timeZone: string; sp: SearchParams }) {
  const t = useTranslations("adminAiJobs");
  const n = (v: number) => formatNumber(v, locale);
  const th = "px-3 py-3 align-bottom font-semibold";
  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => (
          <li key={row.job.id}>
            <JobCard row={row} locale={locale} timeZone={timeZone} sp={sp} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-sand-200 bg-white lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("jobs.caption")}</caption>
          <thead className="bg-sand-100 text-ink-700">
            <tr>
              <th scope="col" className={`${th} text-start`}>{t("columns.job")}</th>
              <th scope="col" className={`${th} text-start`}>{t("columns.status")}</th>
              <th scope="col" className={`${th} text-end`}>{t("columns.tokensPages")}</th>
              <th scope="col" className={`${th} text-end`}>{t("columns.cost")}</th>
              <th scope="col" className={`${th} text-end`}>{t("columns.price")}</th>
              <th scope="col" className={`${th} text-start`}>{t("columns.times")}</th>
              <th scope="col" className={`${th} text-end`}>{t("columns.retries")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.job.id} row={row} locale={locale} timeZone={timeZone} sp={sp} n={n} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TableRow({ row, locale, timeZone, sp, n }: { row: JobRow; locale: Locale; timeZone: string; sp: SearchParams; n: (v: number) => string }) {
  const t = useTranslations("adminAiJobs");
  const { job, status } = row;
  const f = useRowFacts(row, locale, timeZone);
  const td = "px-3 py-3 align-top";
  return (
    <tr className="border-t border-sand-200">
      <td className={td}>
        <Link href={detailHref(sp, job.id)} className="ltr-run font-semibold text-sea-700 underline-offset-4 hover:underline">
          {job.id}
        </Link>
        <span className="block text-ink-700">
          <span className="ltr-run">{job.set.id}</span> · {firstName(job, locale)}
        </span>
      </td>
      <td className={`${td} min-w-44`}>
        <Badge tone={statusTone(status)}>{t(`status.${status}`)}</Badge>
        <span className="mt-1 block text-ink-700">{f.line}</span>
        {status === "failed" ? (
          <RetryJob id={job.id} doneHref={hrefString(listHref(sp, { status: undefined, state: "retryQueued", job: job.id }))} className="mt-2" />
        ) : null}
      </td>
      <td className={`${td} text-end`}>
        <span className="tabular block">{n(tokensOf(f.usage))}</span>
        <span className="tabular block whitespace-nowrap text-xs text-ink-500">{t("counts.pages", { count: f.pages.total, label: n(f.pages.total) })}</span>
      </td>
      <td className={`${td} text-end`}>
        <span className="tabular block font-semibold text-ink-900">{costLabel(f.usage.costMicros, locale)}</span>
        <span className="tabular block whitespace-nowrap text-xs text-ink-500">{t("row.perPage", { amount: perPageLabel(f.usage.costMicros, f.pages.total, locale) })}</span>
      </td>
      <td className={`${td} text-end`}>
        <span className="tabular block">{f.price}</span>
        <span className="block whitespace-nowrap text-xs text-ink-500">{f.priceNote}</span>
      </td>
      <td className={`${td} whitespace-nowrap`}>
        <span className="block">{f.day}</span>
        <span className="block text-ink-700">
          {f.startTime}
          {f.endTime ? ` – ${f.endTime}` : ""}
        </span>
        {f.endTime ? null : <span className="block text-ink-500">{t("row.notFinished")}</span>}
      </td>
      <td className={`${td} tabular text-end`}>{n(f.usage.retries)}</td>
    </tr>
  );
}
