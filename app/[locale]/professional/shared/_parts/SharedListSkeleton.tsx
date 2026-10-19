// Loading state for the shared-summaries list (rule L1): the real heading and lead, then rows shaped like the real ones with
// their real labels (Shared on, Expires on) and skeletons where the name, dates and Open go.
import { useLocale, useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";

export function SharedListSkeleton() {
  const t = useTranslations("shared");
  const locale = useLocale() as Locale;
  const days = t("days", { count: business.shareDefaultDays, label: formatNumber(business.shareDefaultDays, locale) });
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead", { days })}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Surface className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] sm:items-center sm:gap-6">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:contents">
                <div>
                  <p className="text-sm text-ink-500">{t("sharedOn")}</p>
                  <Skeleton className="mt-1 h-5 w-24" />
                </div>
                <div>
                  <p className="text-sm text-ink-500">{t("expiresOn")}</p>
                  <Skeleton className="mt-1 h-5 w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-28" />
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
