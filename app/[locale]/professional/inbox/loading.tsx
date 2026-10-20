// Inbox loading state (rule L1): the real heading, the next-visit block with its label and the section headings, values as
// skeletons. Never "No bookings" while loading (rule L3). The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { SectionsSkeleton } from "./_parts/InboxSkeleton";

export default function Loading() {
  const t = useTranslations("inbox");
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
      </header>
      <Surface>
        <p className="text-sm font-semibold text-lagoon-800">{t("next.title")}</p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="mt-2 h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-52" />
            <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-32" />
          </div>
        </div>
      </Surface>
      <SectionsSkeleton labels={[t("sections.requests"), t("sections.upcoming")]} />
    </div>
  );
}
