// Records loading state (rule L1): the heading, the Add files card with its accepted formats and limits, the price card and the
// list heading keep their real labels; the buttons and the patient's own sets are content-shaped skeletons. The page renders
// this for ?state=loading too. Never "No records" while loading (rule L3).
import { useLocale, useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { business, recordsLimits } from "@/config/business";
import { formatMoney, formatNumber, type Locale } from "@/lib/format";

export function RecordsSkeleton() {
  const t = useTranslations("records");
  const locale = useLocale() as Locale;
  const limits = { fileMb: formatNumber(recordsLimits.maxFileMb, locale), setGb: formatNumber(recordsLimits.maxSetGb, locale) };
  const block = { price: formatMoney(business.recordsBlockPriceCents, business.currencyPresentment, locale), gb: formatNumber(business.recordsBlockGb, locale) };
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Surface className="flex flex-col gap-3">
          <p className="text-xl font-bold text-sea-900">{t("upload.title")}</p>
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-field)] border-2 border-dashed border-sand-300 bg-sand-50 px-4 py-5 text-center">
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:hidden" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-44" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-ink-900">{t("upload.formats", limits)}</p>
              <p className="text-sm text-ink-700">{t("upload.photoTip")}</p>
            </div>
          </div>
        </Surface>
        <Surface className="flex flex-col gap-2">
          <p className="text-xl font-bold text-sea-900">{t("quote.title")}</p>
          <p className="text-ink-700">{t("quote.none", block)}</p>
        </Surface>
      </div>

      <section className="mt-10">
        <p className="text-xl font-bold text-sea-900 sm:text-2xl">{t("sets.title")}</p>
        <p className="mt-1 max-w-2xl text-ink-700">{t("sets.lead")}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Surface className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-5 w-44 max-w-full" />
                    <Skeleton className="h-6 w-24 rounded-[var(--radius-tag)]" />
                  </div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-52 max-w-full" />
                </div>
                <Skeleton className="size-5 shrink-0" />
              </Surface>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
