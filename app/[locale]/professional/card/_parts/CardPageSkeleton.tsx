// Loading state for screen 31 (rule L1): the real heading, the card skeleton where the card goes, and the controls, the
// download box and the verification box with their real labels.
import { useTranslations } from "next-intl";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton, Surface } from "@/components/ui";

export function CardPageSkeleton() {
  const t = useTranslations("idCard");
  return (
    <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-ink-700">{t("lead")}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="flex justify-center">
          <DoctorCardSkeleton />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            {[t("side"), t("language")].map((legend) => (
              <div key={legend}>
                <p className="mb-1.5 text-sm font-semibold text-ink-700">{legend}</p>
                <Skeleton className="h-14 w-52 rounded-[var(--radius-tag)]" />
              </div>
            ))}
          </div>
          <Surface>
            <h2 className="text-xl font-bold text-sea-900">{t("download.title")}</h2>
            <p className="mt-1 text-sm text-ink-700">{t("download.hint")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12 rounded-[var(--radius-field)]" />
              <Skeleton className="h-12 rounded-[var(--radius-field)]" />
              <Skeleton className="h-12 rounded-[var(--radius-field)] sm:col-span-2" />
            </div>
          </Surface>
          <Surface>
            <h2 className="text-xl font-bold text-sea-900">{t("verify.title")}</h2>
            <Skeleton className="mt-3 h-7 w-56 rounded-[var(--radius-tag)]" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </Surface>
        </div>
      </div>
    </div>
  );
}
