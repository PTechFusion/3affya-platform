// Content-shaped skeleton for a DoctorCard (rule L1): same frame, real labels, no bare spinner. size="row" matches the
// search-results row of DoctorCard size="row".
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";

export function DoctorCardSkeleton({ size = "full" }: { size?: "full" | "row" }) {
  const t = useTranslations("card");
  if (size === "row") {
    return (
      <div
        role="status"
        aria-label={t("loading")}
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-sand-200 border-b-4 border-b-sand-300 bg-white p-4 sm:flex-row sm:gap-5 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3 sm:gap-4">
            <Skeleton className="size-14 shrink-0 rounded-2xl sm:size-24" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-5 w-3/5" />
              <p className="text-sm text-ink-500">{t("specialtyLabel")}</p>
              <p className="text-sm text-ink-500">{t("languages")}</p>
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-2.5 flex gap-3 sm:ps-28">
            <Skeleton className="h-6 w-40 rounded-[var(--radius-tag)]" />
            <Skeleton className="h-6 w-28 rounded-[var(--radius-tag)]" />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--radius-field)] bg-sand-100 p-3 text-ink-500 sm:w-60 sm:shrink-0 sm:flex-col sm:items-stretch sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
            <p className="text-xs font-semibold">{t("nextAvailable")}</p>
            <Skeleton className="h-4 w-36" />
            <p className="text-xs">{t("fee")}</p>
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-12 w-20 rounded-[var(--radius-field)] sm:w-full" />
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="flex h-[356px] w-full max-w-md flex-col rounded-[var(--radius-card)] border-b-[10px] border-sand-300 bg-sand-100 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <p className="pt-1 text-sm text-ink-500">{t("specialtyLabel")}</p>
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-4 pt-4 text-sm text-ink-500">
        <div className="space-y-1.5">
          <p>{t("fee")}</p>
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-1.5">
          <p>{t("nextAvailable")}</p>
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}
