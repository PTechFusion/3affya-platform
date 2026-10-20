// Payouts loading state (rule L1): the real card frame inside the portal shell, the small practice card as a skeleton, the
// three steps under their real names with their status still loading, and the Stripe button's place. The page renders this
// for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";

const STEPS = ["identity", "bank", "payouts"] as const;

export default function Loading() {
  const t = useTranslations("payouts");
  const tc = useTranslations("card");
  return (
    <div aria-busy="true">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("loadingTitle")}</h1>
        <Skeleton className="h-7 w-28 rounded-[var(--radius-tag)]" />
      </div>
      <Surface className="grid max-w-4xl gap-4 sm:gap-6 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        <div className="flex flex-col gap-3">
          <div
            role="status"
            aria-label={tc("loading")}
            className="flex h-44 w-full max-w-xs flex-col rounded-[var(--radius-card)] border-b-[10px] border-sand-300 bg-sand-100 p-3"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-12 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <p className="text-sm text-ink-500">{tc("specialtyLabel")}</p>
              </div>
            </div>
            <Skeleton className="mt-auto h-6 w-36 rounded-[var(--radius-tag)]" />
          </div>
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:row-span-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <section aria-labelledby="payout-steps-loading-title">
            <h2 id="payout-steps-loading-title" className="sr-only">
              {t("steps.title")}
            </h2>
            <ol className="divide-y divide-sand-200 border-y border-sand-200">
              {STEPS.map((key) => (
                <li key={key} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden="true" className="inline-flex size-6 shrink-0 rounded-full ring-1 ring-inset ring-sand-400" />
                  <span className="min-w-0 flex-1 font-semibold text-ink-900">{t(`steps.${key}`)}</span>
                  <Skeleton className="h-4 w-14" />
                </li>
              ))}
            </ol>
          </section>
          <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-72" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Surface>
    </div>
  );
}
