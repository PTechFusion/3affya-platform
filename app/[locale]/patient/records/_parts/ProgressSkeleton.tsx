// Progress page loading state (rule L1): the frame with the nine pipeline steps named (they are fixed, ADR-4), the price and
// time-left labels, the three lines of what you will get, and content-shaped skeletons for this set's status, counts and
// files. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { PIPELINE_STEPS } from "@/lib/records";
import { WhatYouGet } from "./WhatYouGet";

export function ProgressSkeleton() {
  const t = useTranslations("recordSet");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      <Skeleton className="h-5 w-48 max-w-full" />
      <header className="mb-5 mt-3 flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <Surface className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-[var(--radius-tag)]" />
          <ol className="flex flex-col gap-1.5">
            {PIPELINE_STEPS.map((step) => (
              <li key={step} className="flex items-center gap-3">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <span className="leading-6 text-ink-500">{t(`steps.${step}.title`)}</span>
              </li>
            ))}
          </ol>
          <dl className="border-t border-sand-200">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-700">{t("facts.price")}</dt>
              <dd>
                <Skeleton className="h-5 w-32" />
              </dd>
            </div>
          </dl>
        </Surface>

        <WhatYouGet done={false} className="lg:col-start-2 lg:row-start-1" />

        <section className="lg:col-start-1 lg:row-start-2">
          <p className="text-xl font-bold text-sea-900">{t("files.title")}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-[var(--radius-field)]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-40 max-w-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {[0, 1, 2].map((j) => (
                    <Skeleton key={j} className="size-8 rounded-full" />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
