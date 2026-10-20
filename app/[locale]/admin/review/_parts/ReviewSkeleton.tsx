// Content-shaped skeletons for the review queue and one claim (rule L1): the real headings and check names, values as
// skeletons. Never "No claims waiting" while loading (rule L3). loading.tsx and ?state=loading render these.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { CHECK_KEYS } from "./model";

export function QueueHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
      {lead ? <p className="mt-1.5 text-ink-700">{lead}</p> : null}
    </header>
  );
}

export function QueueRowsSkeleton({ rows = 4, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <Surface className={compact ? "p-3" : undefined}>
      <ul className={["@container divide-y divide-sand-200", compact ? "" : "-my-3"].join(" ")}>
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className={[
              "grid grid-cols-1 gap-x-4 gap-y-2 py-3",
              compact ? "" : "@2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_auto_auto] @2xl:items-center",
            ].join(" ")}
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
            <div className={["flex gap-1.5", compact ? "" : "@2xl:col-start-4 @2xl:row-start-1 @2xl:justify-end"].join(" ")}>
              <Skeleton className="h-7 w-28 rounded-[var(--radius-tag)]" />
              {compact ? null : <Skeleton className="h-7 w-16 rounded-[var(--radius-tag)]" />}
            </div>
            {compact ? null : <Skeleton className="h-4 w-52 max-w-full @2xl:col-start-2 @2xl:row-start-1" />}
            <Skeleton className={["h-4 w-28", compact ? "" : "@2xl:col-start-3 @2xl:row-start-1"].join(" ")} />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

export function QueueSkeleton() {
  const t = useTranslations("adminReview");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <QueueHeader title={t("title")} lead={t("leadLoading")} />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <QueueRowsSkeleton />
    </div>
  );
}

/** One claim loading: the queue column on desktop, the header, the four checks by name, then the comparison and decision. */
export function ClaimSkeleton() {
  const t = useTranslations("adminReview");
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1">
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-sea-700">{t("title")}</p>
          <Skeleton className="h-8 w-56 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-[var(--radius-tag)]" />
            <Skeleton className="h-7 w-16 rounded-[var(--radius-tag)]" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
        </header>
        <Surface className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-sea-900">{t("checks.title")}</h2>
          <ol className="flex flex-col gap-4">
            {CHECK_KEYS.map((key, i) => (
              <li key={key} className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink-900">
                    <span className="tabular text-ink-500">{i + 1}. </span>
                    {t(`checks.${key}.title`)}
                  </p>
                  <Skeleton className="h-7 w-24 rounded-[var(--radius-tag)]" />
                </div>
                <Skeleton className="mt-2 h-4 w-60 max-w-full" />
                <Skeleton className="mt-3 h-12 w-full max-w-sm rounded-[var(--radius-field)]" />
              </li>
            ))}
          </ol>
        </Surface>
        <Surface>
          <h2 className="text-lg font-bold text-sea-900">{t("compare.title")}</h2>
          <Skeleton className="mt-3 h-24 w-full" />
        </Surface>
        <Surface>
          <h2 className="text-lg font-bold text-sea-900">{t("decision.title")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16 w-full rounded-[var(--radius-field)]" />
            <Skeleton className="h-16 w-full rounded-[var(--radius-field)]" />
          </div>
        </Surface>
      </div>
      <aside className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <QueueRowsSkeleton rows={4} compact />
      </aside>
    </div>
  );
}
