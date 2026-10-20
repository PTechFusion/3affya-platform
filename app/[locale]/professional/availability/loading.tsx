// Availability loading state (rule L1): the real heading, labels and weekday names, with content-shaped skeletons for the
// accepting badge, the two selects, the week grid's seven columns, the exceptions list and the notice select. Never a spinner.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { WEEKDAYS } from "@/lib/slots";

export default function Loading() {
  const t = useTranslations("availability");
  const label = "text-[15px] font-semibold text-ink-900";
  const sectionTitle = "text-xl font-bold text-sea-900";
  return (
    <div aria-busy="true">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>
      <div className="flex flex-col gap-6">
        <div role="status" aria-label={t("loading")} className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-44 rounded-[var(--radius-tag)]" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-3xl">
          {(["timeZone", "slotLength"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <p className={label}>{t(`settings.${k}`)}</p>
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
            </div>
          ))}
        </div>

        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={sectionTitle}>{t("grid.title")}</h2>
              <Skeleton className="mt-1.5 h-4 w-44" />
            </div>
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-64" />
          </div>
          <div aria-hidden="true" className="-mx-5 mt-4 flex gap-2 overflow-hidden px-5 xl:mx-0 xl:grid xl:grid-cols-7 xl:px-0">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className="flex w-36 shrink-0 flex-col gap-2 rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-2 xl:w-auto">
                <div className="px-1">
                  <p className="font-semibold text-ink-900">{t(`days.${d}`)}</p>
                  <Skeleton className="mt-1 h-3 w-14" />
                </div>
                {/* Weekdays carry a range block; Friday sits empty, as most weekly patterns do. */}
                {i === 5 ? (
                  <div className="min-h-24 rounded-[var(--radius-field)] border border-dashed border-sand-300" />
                ) : (
                  <Skeleton className="h-24 w-full rounded-[var(--radius-field)]" />
                )}
                <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
              </div>
            ))}
          </div>
        </Surface>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <Surface>
            <h2 className={sectionTitle}>{t("exceptions.title")}</h2>
            <p className="mt-1 text-sm text-ink-700">{t("exceptions.lead")}</p>
            <div className="mt-3 divide-y divide-sand-200 border-y border-sand-200">
              {[0, 1].map((row) => (
                <div key={row} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-24 rounded-[var(--radius-tag)]" />
                  </div>
                  <Skeleton className="size-11 rounded-[var(--radius-field)]" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-12 w-48 rounded-[var(--radius-field)]" />
          </Surface>
          <Surface>
            <h2 className={sectionTitle}>{t("notice.title")}</h2>
            <div className="mt-3 flex flex-col gap-1.5">
              <p className={label}>{t("notice.label")}</p>
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
              <p className="text-sm text-ink-500">{t("notice.hint")}</p>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
