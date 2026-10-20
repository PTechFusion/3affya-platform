// Listings loading state (rule L1): the real heading, the status chips and field labels, the table's own column headings, and
// rows shaped like the real ones. Never "No listings" while loading (rule L3). loading.tsx cannot read the URL, so no chip
// shows as current. Used by loading.tsx and ?state=loading.
import { useTranslations } from "next-intl";
import { Chip, Skeleton, Surface } from "@/components/ui";
import { statusFilters } from "./listings";

export function ListingsHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{lead}</p>
    </header>
  );
}

export function ListingsSkeleton() {
  const t = useTranslations("adminListings");
  const columns = [t("table.name"), t("table.specialty"), t("table.city"), t("table.verifiedOn"), t("table.nextCheck")];
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ListingsHeader title={t("title")} lead={t("lead")} />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="flex flex-col gap-4">
        <ul aria-label={t("status.label")} className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <li key={s}>
              <Chip>
                {t(`status.${s}`)}
                {/* A span, not the Skeleton div: the chip is inline content. */}
                <span aria-hidden="true" className="skeleton ms-2 inline-block h-4 w-5" />
              </Chip>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-ink-900">{t("filters.search")}</span>
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-[var(--radius-field)]" />
              <Skeleton className="h-12 w-24 rounded-[var(--radius-field)]" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-ink-900">{t("filters.specialty")}</span>
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-5 w-48" />
      <Surface>
        <div className="hidden grid-cols-[30%_16%_16%_12%_15%_11%] border-b border-sand-200 pb-3 text-sm font-semibold text-ink-500 lg:grid">
          {columns.map((c) => (
            <span key={c} className="pe-4">
              {c}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-sand-200">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 lg:grid-cols-[30%_16%_16%_12%_15%_11%] lg:gap-0">
              <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1 lg:pe-4">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-6 w-24 rounded-[var(--radius-tag)]" />
              </div>
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-28 lg:block" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="col-span-2 h-4 w-24 lg:col-span-1 lg:justify-self-end" />
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
