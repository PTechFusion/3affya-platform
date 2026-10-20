// Screen 47's heading and its loading frame (rule L1): the real title, the read-only line, the filter labels, the zone, the
// column names and the Export button, with rows as skeletons shaped like the real ones. Never "No entries" while loading (L3).
import { useLocale, useTranslations } from "next-intl";
import { Button, ChevronDown, ClockIcon, LockIcon, Skeleton } from "@/components/ui";
import { formatZone, type Locale } from "@/lib/format";
import { sampleAdmin } from "@/lib/sample";
import { AuditHeaderRow, rowCols } from "./AuditRows";
import { isolatedZone } from "./labels";

export function AuditHeader() {
  const t = useTranslations("adminAudit");
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 text-ink-700">{t("lead")}</p>
      <p className="mt-2 flex items-start gap-2 text-sm text-ink-700">
        <LockIcon className="mt-1 size-4 shrink-0 text-sea-700" />
        {t("readOnly")}
      </p>
    </header>
  );
}

/** "Times in Riyadh (GMT+3)", with the clock that never mirrors (rule R2). */
export function ZoneLine({ zone, locale }: { zone: string; locale: Locale }) {
  const t = useTranslations("adminAudit");
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-700">
      <ClockIcon className="size-4 shrink-0 text-ink-500" />
      {t("zone", { zone: isolatedZone(formatZone(new Date(), zone), locale) })}
    </p>
  );
}

export function AuditSkeleton({ zone = sampleAdmin.timeZone }: { zone?: string }) {
  const t = useTranslations("adminAudit");
  const locale = useLocale() as Locale;
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <AuditHeader />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-4 sm:px-5">
        <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:gap-x-4 sm:gap-y-1">
          {(["actor", "action"] as const).map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold text-ink-900">{t(`filters.${key}`)}</span>
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
            </div>
          ))}
          <div className="col-span-full flex items-center justify-between gap-3 py-3 font-semibold text-ink-900">
            {t("filters.more")}
            <ChevronDown className="size-4 shrink-0 text-sea-700" />
          </div>
          <Skeleton className="col-span-full h-12 rounded-[var(--radius-field)] sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:w-36" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Skeleton className="h-6 w-52 max-w-full" />
          <ZoneLine zone={zone} locale={locale} />
        </div>
        <Button type="button" variant="secondary" disabled>
          {t("export.button")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
        <AuditHeaderRow />
        <div className="border-b border-sand-200 bg-sand-100 px-4 py-2.5 sm:px-5">
          <Skeleton className="h-4 w-40" />
        </div>
        <ul className="divide-y divide-sand-200">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className={`${rowCols} min-w-0 flex-1`}>
                <span className="col-start-1 row-start-1 flex flex-col gap-1.5 sm:col-start-3">
                  <Skeleton className="h-5 w-44 max-w-full" />
                  <Skeleton className="hidden h-4 w-32 sm:block" />
                </span>
                <Skeleton className="col-start-2 row-start-1 h-4 w-14 sm:col-start-1 sm:h-5" />
                <span className="col-span-2 col-start-1 row-start-2 mt-1 flex flex-col gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0">
                  <Skeleton className="h-4 w-28 sm:h-5" />
                  <Skeleton className="hidden h-3.5 w-16 sm:block" />
                </span>
                <span className="col-span-2 col-start-1 row-start-3 mt-1 flex flex-col gap-1.5 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:mt-0">
                  <Skeleton className="h-4 w-36 sm:h-5" />
                  <Skeleton className="hidden h-3.5 w-20 sm:block" />
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-sand-400" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
