// Bookings loading state (rule L1): the real heading, the tabs and the section labels, values as skeletons shaped like the
// next-visit card and the rows. Never "No bookings" while loading (rule L3). Used by loading.tsx and by ?state=loading.
import { useTranslations } from "next-intl";
import { Skeleton, Surface, TabLinks } from "@/components/ui";
import type { BookingsTab } from "./bookings";

export function BookingsHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{lead}</p>
    </header>
  );
}

function RowsSkeleton({ title, rows }: { title: string; rows: number }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-sea-900">{title}</h2>
      <Surface>
        <ul className="@container -my-4 divide-y divide-sand-200">
          {Array.from({ length: rows }, (_, i) => (
            <li
              key={i}
              className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-4 @2xl:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,3fr)_7rem] @2xl:gap-x-4"
            >
              <Skeleton className="col-start-1 row-span-3 row-start-1 size-12 self-start rounded-2xl @2xl:row-span-2 @2xl:row-start-1 @2xl:size-14 @2xl:self-center" />
              <div className="col-start-2 row-start-1 flex items-center gap-2.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-20 rounded-[var(--radius-tag)]" />
              </div>
              <Skeleton className="col-span-2 col-start-2 row-start-2 h-4 w-40 max-w-full @2xl:col-span-1 @2xl:col-start-2" />
              <Skeleton className="col-span-2 col-start-2 row-start-3 h-4 w-56 max-w-full @2xl:col-span-1 @2xl:col-start-3 @2xl:row-span-2 @2xl:row-start-1" />
              <Skeleton className="col-start-3 row-start-1 h-12 w-20 justify-self-end rounded-[var(--radius-field)] @2xl:col-start-4 @2xl:row-span-2 @2xl:row-start-1" />
            </li>
          ))}
        </ul>
      </Surface>
    </section>
  );
}

/** `tab` marks the open tab; loading.tsx cannot read the URL, so it passes none and no tab shows as current. */
export function BookingsSkeleton({ tab }: { tab?: BookingsTab }) {
  const t = useTranslations("bookings");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <BookingsHeader title={t("title")} lead={t("lead")} />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <TabLinks
        label={t("tabs.label")}
        items={[
          { href: "/patient/bookings", label: t("tabs.upcoming"), current: tab === "upcoming" },
          { href: "/patient/bookings?tab=past", label: t("tabs.past"), current: tab === "past" },
        ]}
      />
      {tab === "past" ? (
        <>
          <RowsSkeleton title={t("sections.past")} rows={2} />
          <RowsSkeleton title={t("sections.cancelled")} rows={1} />
        </>
      ) : (
        <>
          <Surface className="sm:p-6">
            <p className="text-sm font-semibold text-lagoon-800">{t("next.title")}</p>
            <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <div className="mt-3 flex items-center gap-3">
                  <Skeleton className="size-14 rounded-2xl" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-56" />
                <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-36" />
              </div>
            </div>
          </Surface>
          <RowsSkeleton title={t("sections.later")} rows={1} />
        </>
      )}
    </div>
  );
}
