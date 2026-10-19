// Search loading state (rule L1), shared by loading.tsx and ?state=loading: the real frame and labels (search bar, Filters,
// Sort, the filter headings) with skeleton rows shaped like DoctorCard size="row". Never a blank spinner.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton } from "@/components/ui";

const GROUPS = ["specialty", "within", "gender", "language"] as const;

export function SearchSkeleton() {
  const t = useTranslations("search");
  const th = useTranslations("home");
  return (
    <>
      <SiteNav />
      <div className="sticky top-16 z-10 border-b border-sand-200 bg-sand-50/95 backdrop-blur sm:top-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:py-3">
          <div className="flex gap-2 lg:max-w-xl lg:flex-1">
            <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-[var(--radius-field)] border border-sand-300 bg-white px-4 text-ink-500/70">
              <span className="truncate">{th("searchPlaceholder")}</span>
            </div>
            <span className="inline-flex min-h-12 items-center rounded-[var(--radius-field)] bg-sea-700/45 px-4 font-semibold text-white sm:px-6">
              {th("search")}
            </span>
          </div>
          <div className="flex items-center gap-2 lg:ms-auto">
            <span className="inline-flex min-h-12 items-center rounded-[var(--radius-field)] border border-sea-700/45 bg-white px-5 font-semibold text-sea-700/60 lg:hidden">
              {t("filters.button")}
            </span>
            <span className="shrink-0 text-sm font-semibold text-ink-700">{t("sortLabel")}</span>
            <Skeleton className="min-h-12 flex-1 rounded-[var(--radius-field)] lg:w-52 lg:flex-none" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-3 sm:px-6 sm:pt-6" aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 sm:mt-2">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
          <p className="text-sm font-semibold text-ink-700">{t("loading")}</p>
        </div>
        <div className="mt-4 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-hidden="true">
            <p className="mb-2 text-lg font-bold text-sea-900">{t("filters.title")}</p>
            <div className="divide-y divide-sand-200">
              {GROUPS.map((g) => (
                <div key={g} className="py-4 first:pt-1">
                  <p className="text-[15px] font-bold text-sea-900">{t(`filters.groups.${g}`)}</p>
                  <div className="mt-3 space-y-3">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <div className="space-y-3 sm:space-y-4">
            <DoctorCardSkeleton size="row" />
            <DoctorCardSkeleton size="row" />
            <DoctorCardSkeleton size="row" />
          </div>
        </div>
      </main>
    </>
  );
}
