// Content-shaped skeleton for a DoctorCard front (rule L1): same frame, real labels, no bare spinner.
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";

export function DoctorCardSkeleton() {
  const t = useTranslations("card");
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
