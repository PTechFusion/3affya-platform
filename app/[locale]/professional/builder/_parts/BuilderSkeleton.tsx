// Builder loading state (rule L1): the real title, the progress bar's label, the mini card's place on phone, every step with
// its real heading (the first one open with its real field labels), and the card skeleton where the pinned preview goes.
import { useTranslations } from "next-intl";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton } from "@/components/ui";
import { STEPS } from "./model";

export function BuilderSkeleton() {
  const t = useTranslations("builder");
  const fieldLabels = [t("photo.label"), t("fields.nameEn.label"), t("fields.nameAr.label")];
  return (
    <div aria-busy="true" aria-label={t("loading")} className="xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start xl:gap-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 hidden text-ink-700 sm:block">{t("lead")}</p>
        <div className="mt-3">
          <p className="text-sm font-semibold text-ink-500">{t("progressLabel")}</p>
          <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
        </div>
        <div className="mt-4 flex gap-2 xl:hidden">
          <Skeleton className="h-40 min-w-0 max-w-xs flex-1 rounded-[var(--radius-card)]" />
          <div className="flex w-[4.75rem] flex-col gap-2">
            <Skeleton className="flex-1 rounded-[var(--radius-field)]" />
            <Skeleton className="flex-1 rounded-[var(--radius-field)]" />
          </div>
        </div>
        <Skeleton className="mt-4 h-24 w-full rounded-[var(--radius-card)]" />
        <ol className="mt-5 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className={["rounded-[var(--radius-card)] border bg-white p-4 sm:px-5", i === 0 ? "border-sea-700" : "border-sand-200"].join(" ")}>
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-snug text-sea-900">{t(`steps.${step}`)}</p>
                  <Skeleton className="mt-1 h-4 w-40" />
                </div>
              </div>
              {i === 0 ? (
                <div className="mt-4 flex flex-col gap-5 border-t border-sand-200 pt-4">
                  {fieldLabels.map((label) => (
                    <div key={label} className="flex flex-col gap-1.5">
                      <p className="text-[15px] font-semibold text-ink-900">{label}</p>
                      <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      <aside className="hidden xl:block">
        <p className="mb-4 text-lg font-bold text-sea-900">{t("preview.title")}</p>
        <DoctorCardSkeleton />
      </aside>
    </div>
  );
}
