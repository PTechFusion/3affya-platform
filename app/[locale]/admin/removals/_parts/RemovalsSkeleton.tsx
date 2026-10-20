// Removal queue loading states (rule L1): the real heading, tabs, column labels and section titles, values as skeletons shaped
// like the rows and the detail sections. Never "No requests" while loading (rule L3). Used by both loading.tsx files and by
// ?state=loading.
import { useLocale, useTranslations } from "next-intl";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Breadcrumbs, Skeleton, Surface, TabLinks } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { QUEUE_GRID, type QueueTab } from "./removals";

const COLUMNS = ["listing", "askedBy", "reason", "checks", "received", "timeLeft"] as const;

export function RemovalsHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{lead}</p>
    </header>
  );
}

/** The promise in words ("within 48 hours"), from business.removalSlaHours. */
export function useSlaWords() {
  const t = useTranslations("adminRemovals");
  const locale = useLocale() as Locale;
  return t("sla", { hours: business.removalSlaHours, count: formatNumber(business.removalSlaHours, locale) });
}

export function QueueTabs({ tab, openCount, decidedCount, hrefs }: { tab?: QueueTab; openCount?: string; decidedCount?: string; hrefs: Record<QueueTab, string> }) {
  const t = useTranslations("adminRemovals");
  return (
    <TabLinks
      label={t("tabs.label")}
      items={[
        { href: hrefs.open, label: t("tabs.open"), count: openCount, current: tab === "open" },
        { href: hrefs.decided, label: t("tabs.decided"), count: decidedCount, current: tab === "decided" },
      ]}
    />
  );
}

export function QueueRowsSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useTranslations("adminRemovals");
  return (
    <Surface className="px-4 py-2 sm:px-5">
      <div className="@container">
        <div className={`hidden gap-x-4 border-b border-sand-200 py-3 text-sm font-semibold text-ink-500 @3xl:grid ${QUEUE_GRID}`}>
          {COLUMNS.map((key) => (
            <span key={key}>{t(`columns.${key}`)}</span>
          ))}
        </div>
        <ul className="divide-y divide-sand-200">
          {Array.from({ length: rows }, (_, i) => (
            <li
              key={i}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 py-3.5 @3xl:items-center @3xl:gap-x-4 ${QUEUE_GRID}`}
            >
              <div className="col-start-1 row-start-1 flex flex-col gap-1.5">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-36 max-w-full" />
              </div>
              <Skeleton className="col-span-2 h-4 w-56 max-w-full @3xl:col-span-1 @3xl:w-28" />
              <Skeleton className="hidden h-4 w-32 @3xl:block" />
              <Skeleton className="col-span-2 h-4 w-44 max-w-full @3xl:col-span-1 @3xl:w-24" />
              <Skeleton className="hidden h-4 w-28 @3xl:block" />
              <Skeleton className="col-start-2 row-start-1 h-7 w-24 rounded-[var(--radius-tag)] @3xl:col-start-6" />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}

/** The list. `tab` marks the open tab; loading.tsx cannot read the URL, so it passes none and no tab shows as current. */
export function RemovalsSkeleton({ tab }: { tab?: QueueTab }) {
  const t = useTranslations("adminRemovals");
  const sla = useSlaWords();
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <RemovalsHeader title={t("title")} lead={t("lead", { sla })} />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <QueueTabs tab={tab} hrefs={{ open: "/admin/removals", decided: "/admin/removals?tab=decided" }} />
      <Skeleton className="h-4 w-full max-w-lg" />
      <QueueRowsSkeleton />
    </div>
  );
}

/** One request: the trail, the timer, the request, the checks, the matching profile and the decision, each with its title.
 *  On desktop the queue column sits beside it, as on the loaded page, so nothing moves when the request arrives. */
export function RemovalDetailSkeleton() {
  const t = useTranslations("adminRemovals");
  const section = (title: string, lines: number) => (
    <Surface>
      <h2 className="text-lg font-bold text-sea-900">{title}</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={i % 2 ? "h-4 w-3/5" : "h-4 w-4/5"} />
        ))}
      </div>
    </Surface>
  );
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1">
        <p role="status" className="sr-only">
          {t("detail.loading")}
        </p>
        <header>
          <Breadcrumbs label={t("detail.breadcrumb")} items={[{ label: t("title"), href: "/admin/removals" }, { label: t("detail.loading") }]} />
          <Skeleton className="mt-3 h-8 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </header>
        <Surface>
          <p className="text-sm font-semibold text-ink-700">{t("detail.timer.title")}</p>
          <Skeleton className="mt-2 h-10 w-32" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        </Surface>
        {section(t("detail.request.title"), 5)}
        {section(t("detail.checks.title"), 4)}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-sea-900">{t("detail.profile.title")}</h2>
          <DoctorCardSkeleton size="row" />
        </section>
        <Surface>
          <h2 className="text-lg font-bold text-sea-900">{t("decision.title")}</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-40" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-52" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-40" />
          </div>
        </Surface>
      </div>
      <div className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <Skeleton className="mb-3 h-4 w-20" />
        <QueueRowsSkeleton />
      </div>
    </div>
  );
}
