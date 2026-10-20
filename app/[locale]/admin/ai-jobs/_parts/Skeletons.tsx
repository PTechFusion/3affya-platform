// Screen 45 loading states (rule L1): the real frame and labels, with content-shaped skeletons where the numbers go. Never
// "No jobs" while loading (rule L3). The pages render these for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { JOB_FILTERS } from "@/lib/ai-jobs";
import { PIPELINE_STEPS } from "@/lib/records";

export function ListHeader({ zoneLine }: { zoneLine?: React.ReactNode }) {
  const t = useTranslations("adminAiJobs");
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-3xl text-ink-700">{t("lead")}</p>
      {zoneLine ? <p className="mt-1 text-sm text-ink-500">{zoneLine}</p> : null}
    </header>
  );
}

function TileSkeleton({ label }: { label: string }) {
  return (
    <Surface className="flex flex-col gap-2 p-4">
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-4 w-32 max-w-full" />
      <Skeleton className="h-4 w-20" />
    </Surface>
  );
}

export function ListSkeleton() {
  const t = useTranslations("adminAiJobs");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ListHeader />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TileSkeleton label={t("spend.today")} />
        <TileSkeleton label={t("spend.week")} />
        <TileSkeleton label={t("spend.month")} />
        <TileSkeleton label={t("spend.alert")} />
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-sea-900">{t("jobs.title")}</h2>
        <ul className="flex flex-wrap gap-2" aria-hidden="true">
          {JOB_FILTERS.map((f) => (
            <li key={f} className="inline-flex min-h-10 items-center rounded-[var(--radius-tag)] bg-sand-100 px-4 text-sm font-medium text-ink-500">
              {t(`filters.${f}`)}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-3 lg:hidden" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Surface className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-16 rounded-[var(--radius-tag)]" />
                </div>
                <Skeleton className="h-4 w-48 max-w-full" />
                <div className="grid grid-cols-4 gap-2 border-t border-sand-200 pt-3">
                  {(["pages", "tokens", "cost", "retries"] as const).map((c) => (
                    <div key={c} className="flex flex-col gap-1">
                      <span className="text-xs text-ink-500">{t(`columns.${c}`)}</span>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </Surface>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white lg:block" aria-hidden="true">
          <div className="grid grid-cols-[1fr_1.8fr_1fr_1fr_1fr_1.2fr_0.6fr] gap-3 bg-sand-100 px-3 py-3 text-sm font-semibold text-ink-700">
            {(["job", "status", "tokensPages", "cost", "price", "times", "retries"] as const).map((c) => (
              <span key={c}>{t(`columns.${c}`)}</span>
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_1.8fr_1fr_1fr_1fr_1.2fr_0.6fr] gap-3 border-t border-sand-200 px-3 py-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </section>
      <Surface className="flex flex-col gap-3">
        <p className="text-xl font-bold text-sea-900">{t("chart.loadingTitle")}</p>
        <Skeleton className="h-40 w-full sm:h-48" />
      </Surface>
    </div>
  );
}

export function DetailSkeleton() {
  const t = useTranslations("adminAiJobs");
  const tp = useTranslations("portal.admin");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p className="text-sm font-semibold text-sea-700">{tp("nav.aiJobs")}</p>
      <p role="status" className="sr-only">
        {t("detail.loading")}
      </p>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>
      <Surface>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(["started", "finished", "pages", "tokens", "cost", "price", "retries", "model"] as const).map((f) => (
            <div key={f} className="flex flex-col gap-1">
              <dt className="text-sm text-ink-500">{t(`detail.facts.${f}`)}</dt>
              <dd>
                <Skeleton className="h-5 w-24" />
              </dd>
            </div>
          ))}
        </dl>
      </Surface>
      <Surface className="flex flex-col gap-3">
        <p className="text-xl font-bold text-sea-900">{t("detail.steps.title")}</p>
        <ol className="flex flex-col gap-2">
          {PIPELINE_STEPS.map((s) => (
            <li key={s} className="flex items-center gap-3">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1 text-ink-500">{t(`steps.${s}`)}</span>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ol>
      </Surface>
    </div>
  );
}
