// Inbox detail loading state (rule L1): the detail frame with its real section labels (both time labels, how to join, shared
// summary, reason) and skeleton values; on desktop the list beside it as skeleton rows. The page renders this for ?state=loading.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { SectionsSkeleton } from "../_parts/InboxSkeleton";

const sectionTitle = "text-lg font-bold text-sea-900";

export default function Loading() {
  const t = useTranslations("inbox");
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1">
        <header>
          <p className="text-sm font-semibold text-sea-700">{t("title")}</p>
          <Skeleton className="mt-3 h-9 w-40" />
          <Skeleton className="mt-2 h-5 w-52" />
          <p role="status" className="sr-only">
            {t("detail.loading")}
          </p>
        </header>
        <Surface>
          <h2 className={sectionTitle}>{t("detail.whenTitle")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["yourTime", "patientTime"] as const).map((key) => (
              <div key={key} className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                <p className="text-sm font-semibold text-ink-700">{t(`detail.${key}`)}</p>
                <Skeleton className="mt-1.5 h-5 w-3/4" />
                <Skeleton className="mt-1.5 h-8 w-full" />
              </div>
            ))}
          </div>
          <h3 className="mt-5 border-t border-sand-200 pt-4 font-semibold text-ink-900">{t("detail.joinTitle")}</h3>
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-3 h-14 w-full rounded-[var(--radius-field)] sm:w-56" />
        </Surface>
        <Surface>
          <h2 className={sectionTitle}>{t("detail.summaryTitle")}</h2>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-6 w-28 rounded-[var(--radius-tag)]" />
            <Skeleton className="h-6 w-32 rounded-[var(--radius-tag)]" />
          </div>
          <Skeleton className="mt-3 h-4 w-2/3" />
        </Surface>
        <Surface>
          <h2 className={sectionTitle}>{t("detail.reasonTitle")}</h2>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Surface>
      </div>
      <div className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <SectionsSkeleton labels={[t("sections.requests"), t("sections.upcoming")]} rows={2} />
      </div>
    </div>
  );
}
