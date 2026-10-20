// Screen 45 job detail parts: the nine fixed steps with their timings and usage (the same step states the patient's progress
// page shows, from lib/records stepStates), and the cost per file. Files by name and size only; page content never shows.
// Desktop reads as tables; phone as one row per step or file with the same facts in the same order.
import { useTranslations } from "next-intl";
import { CheckIcon, Surface } from "@/components/ui";
import { formatNumber, formatTime, type Locale } from "@/lib/format";
import { jobStepStates, stepUsage, tokensOf, type JobStatus } from "@/lib/ai-jobs";
import { BYTES_PER_MB, PIPELINE_STEPS, type PipelineStep, type StepState } from "@/lib/records";
import type { SampleAiJob } from "@/lib/sample";
import { costLabel, durationLabel, perPageLabel } from "./jobs";

/** The step marker carries its state in text for screen readers, never colour alone. */
function Marker({ state }: { state: StepState }) {
  const base = "flex size-6 shrink-0 items-center justify-center rounded-full";
  if (state === "done")
    return (
      <span aria-hidden="true" className={`${base} bg-sea-700 text-white`}>
        <CheckIcon className="size-3.5" />
      </span>
    );
  if (state === "current")
    return (
      <span aria-hidden="true" className={`${base} bg-white ring-2 ring-lagoon-500`}>
        <span className="size-2.5 rounded-full bg-lagoon-500" />
      </span>
    );
  if (state === "failed")
    return (
      <span aria-hidden="true" className={`${base} bg-danger text-sm font-bold text-white`}>
        !
      </span>
    );
  if (state === "stopped")
    return (
      <span aria-hidden="true" className={`${base} bg-sand-300`}>
        <span className="h-0.5 w-2.5 rounded-full bg-ink-700" />
      </span>
    );
  return <span aria-hidden="true" className={`${base} border-2 border-sand-300 bg-white`} />;
}

type StepView = {
  step: PipelineStep;
  state: StepState;
  stateLabel: string;
  started: string | null;
  took: string | null;
  usage: ReturnType<typeof stepUsage>;
  note: string | null;
};

export function StepTimings({ job, status, locale, timeZone }: { job: SampleAiJob; status: JobStatus; locale: Locale; timeZone: string }) {
  const t = useTranslations("adminAiJobs");
  const states = jobStepStates(job, status);
  const n = (v: number) => formatNumber(v, locale);
  const waiting = status === "queued" || status === "retryQueued";
  const pay = job.steps.find((s) => s.step === "pay");
  const views: StepView[] = PIPELINE_STEPS.map((step) => {
    const row = job.steps.find((s) => s.step === step);
    const state = states[step];
    // A retry or a stop leaves the step that ran before it as it was; the preview shows the step waiting or stopped, untimed.
    const timed = row && !(step === job.set.step && (status === "retryQueued" || status === "cancelled") && !row.finishedAt);
    const gap = step === "extract" && row && pay?.finishedAt ? row.startedAt.getTime() - pay.finishedAt.getTime() : 0;
    return {
      step,
      state,
      stateLabel: t(`detail.steps.state.${state === "current" && waiting ? "queuedHere" : state}`),
      started: timed && row ? formatTime(row.startedAt, timeZone, locale) : null,
      took: timed && row ? (row.finishedAt ? durationLabel(row.finishedAt.getTime() - row.startedAt.getTime(), t, locale) : t("detail.steps.running")) : null,
      usage: row ? stepUsage(row) : null,
      note: gap >= 60_000 ? t("detail.steps.queueWait", { duration: durationLabel(gap, t, locale) }) : null,
    };
  });
  const th = "px-3 py-2.5 font-semibold";

  return (
    <Surface className="flex flex-col gap-4">
      <div>
        <h2 id="steps-title" className="text-xl font-bold text-sea-900">
          {t("detail.steps.title")}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{t("detail.steps.lead")}</p>
      </div>

      <ol aria-labelledby="steps-title" className="flex flex-col divide-y divide-sand-200 lg:hidden">
        {views.map((v) => (
          <li key={v.step} aria-current={v.state === "current" ? "step" : undefined} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
            <Marker state={v.state} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className={v.state === "waiting" ? "text-ink-500" : "font-semibold text-ink-900"}>{t(`steps.${v.step}`)}</span>
                <span className={`text-sm ${v.state === "failed" ? "font-semibold text-danger" : "text-ink-700"}`}>{v.stateLabel}</span>
              </p>
              {v.started ? (
                <p className="tabular text-sm text-ink-700">
                  {v.started} · {v.took}
                </p>
              ) : null}
              {v.note ? <p className="text-sm text-ink-500">{v.note}</p> : null}
              {v.usage ? (
                <p className="tabular text-sm text-ink-700">
                  {t("detail.steps.usageLine", {
                    calls: t("counts.calls", { count: v.usage.calls, label: n(v.usage.calls) }),
                    tokens: n(tokensOf(v.usage)),
                    cost: costLabel(v.usage.costMicros, locale),
                    retries: t("counts.retries", { count: v.usage.retries, label: n(v.usage.retries) }),
                  })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("detail.steps.title")}</caption>
          <thead className="border-b border-sand-300 text-ink-700">
            <tr>
              <th scope="col" className={`${th} text-start`}>{t("detail.steps.columns.step")}</th>
              <th scope="col" className={`${th} text-start`}>{t("detail.steps.columns.started")}</th>
              <th scope="col" className={`${th} text-start`}>{t("detail.steps.columns.took")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.steps.columns.calls")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.steps.columns.tokens")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.steps.columns.cost")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.steps.columns.retries")}</th>
            </tr>
          </thead>
          <tbody>
            {views.map((v) => (
              <tr key={v.step} aria-current={v.state === "current" ? "step" : undefined} className="border-b border-sand-200 last:border-b-0">
                <th scope="row" className="px-3 py-2.5 text-start font-normal">
                  <span className="flex items-start gap-3">
                    <Marker state={v.state} />
                    <span>
                      <span className={`block ${v.state === "waiting" ? "text-ink-500" : "font-semibold text-ink-900"}`}>{t(`steps.${v.step}`)}</span>
                      <span className={`block ${v.state === "failed" ? "font-semibold text-danger" : "text-ink-700"}`}>{v.stateLabel}</span>
                      {v.note ? <span className="block text-ink-500">{v.note}</span> : null}
                    </span>
                  </span>
                </th>
                <td className="tabular px-3 py-2.5 align-top">{v.started ?? "–"}</td>
                <td className="tabular px-3 py-2.5 align-top">{v.took ?? "–"}</td>
                {v.usage ? (
                  <>
                    <td className="tabular px-3 py-2.5 text-end align-top">{n(v.usage.calls)}</td>
                    <td className="tabular px-3 py-2.5 text-end align-top">{n(tokensOf(v.usage))}</td>
                    <td className="tabular px-3 py-2.5 text-end align-top font-semibold text-ink-900">{costLabel(v.usage.costMicros, locale)}</td>
                    <td className="tabular px-3 py-2.5 text-end align-top">{n(v.usage.retries)}</td>
                  </>
                ) : (
                  <td colSpan={4} className="px-3 py-2.5 text-end align-top text-ink-500">
                    {t("detail.steps.noAi")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function FileCosts({ job, locale }: { job: SampleAiJob; locale: Locale }) {
  const t = useTranslations("adminAiJobs");
  const n = (v: number) => formatNumber(v, locale);
  const usageBy = new Map((job.steps.find((s) => s.step === "extract")?.files ?? []).map((f) => [f.fileId, f]));
  const rows = job.set.files.map((file) => {
    const u = usageBy.get(file.id);
    const unreadable = file.pages.filter((p) => p.status === "unreadable").length;
    return {
      file,
      size: t("detail.files.size", { size: formatNumber(Math.max(0.1, file.sizeBytes / BYTES_PER_MB), locale, { maximumFractionDigits: 1 }) }),
      pages: n(file.pages.length),
      unreadable: unreadable ? t("detail.files.unreadable", { count: unreadable, label: n(unreadable) }) : null,
      tokens: u ? n(tokensOf(u)) : n(0),
      cost: costLabel(u?.costMicros ?? 0, locale),
      perPage: perPageLabel(u?.costMicros ?? 0, file.pages.length, locale),
      retries: n(u?.retries ?? 0),
      retriesCount: u?.retries ?? 0,
    };
  });
  const th = "px-3 py-2.5 font-semibold";
  return (
    <Surface className="flex flex-col gap-4">
      <div>
        <h2 id="files-title" className="text-xl font-bold text-sea-900">
          {t("detail.files.title")}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{t("detail.files.lead")}</p>
      </div>
      <ul aria-labelledby="files-title" className="flex flex-col divide-y divide-sand-200 lg:hidden">
        {rows.map((r) => (
          <li key={r.file.id} className="py-2.5 first:pt-0 last:pb-0">
            <p className="break-all font-semibold text-ink-900">
              <bdi>{r.file.name}</bdi>
            </p>
            <p className="tabular text-sm text-ink-700">
              {r.size} · {t("counts.pages", { count: r.file.pages.length, label: r.pages })}
              {r.unreadable ? ` · ${r.unreadable}` : ""}
            </p>
            <p className="tabular text-sm text-ink-700">
              {t("detail.files.usageLine", { tokens: r.tokens, cost: r.cost, perPage: r.perPage, retries: t("counts.retries", { count: r.retriesCount, label: r.retries }) })}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("detail.files.title")}</caption>
          <thead className="border-b border-sand-300 text-ink-700">
            <tr>
              <th scope="col" className={`${th} text-start`}>{t("detail.files.columns.file")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.size")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.pages")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.tokens")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.cost")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.perPage")}</th>
              <th scope="col" className={`${th} text-end`}>{t("detail.files.columns.retries")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.file.id} className="border-b border-sand-200 last:border-b-0">
                <th scope="row" className="px-3 py-2.5 text-start font-semibold text-ink-900">
                  <bdi className="break-all">{r.file.name}</bdi>
                  {r.unreadable ? <span className="block font-normal text-ink-500">{r.unreadable}</span> : null}
                </th>
                <td className="tabular px-3 py-2.5 text-end">{r.size}</td>
                <td className="tabular px-3 py-2.5 text-end">{r.pages}</td>
                <td className="tabular px-3 py-2.5 text-end">{r.tokens}</td>
                <td className="tabular px-3 py-2.5 text-end font-semibold text-ink-900">{r.cost}</td>
                <td className="tabular px-3 py-2.5 text-end">{r.perPage}</td>
                <td className="tabular px-3 py-2.5 text-end">{r.retries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
