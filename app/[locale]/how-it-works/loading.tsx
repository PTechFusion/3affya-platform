// Screen 3 loading state (rule L1): the real nav, title and step frames with their real titles; the copy and the fee example
// are content-shaped skeletons, with the fee line labels kept so the box reads as a price breakdown while it loads.
// Also rendered by page.tsx for ?state=loading.
import { useLocale, useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton, Surface } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { BookArt, FindArt, StepFrame, TalkArt } from "./parts";

export default function Loading() {
  const t = useTranslations("howItWorks");
  const loc = useLocale() as Locale;
  const num = (n: number) => formatNumber(n, loc);
  const lines = (widths: string[]) => (
    <div className="space-y-2 pt-1">
      {widths.map((w) => (
        <Skeleton key={w} className={`h-4 ${w}`} />
      ))}
    </div>
  );
  return (
    <>
      <SiteNav />
      <main role="status" aria-busy="true" aria-label={t("loadingLabel")}>
        <header className="mx-auto max-w-3xl px-4 pb-6 pt-8 sm:px-6 sm:pb-10 sm:pt-14">
          <h1 className="text-3xl font-bold leading-tight text-sea-900 sm:text-5xl">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-700 sm:text-xl">{t("lead")}</p>
        </header>
        <ol aria-label={t("stepsLabel")} className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 sm:px-6">
          <StepFrame number={num(1)} title={t("step1.title")} body={lines(["w-full", "w-3/4"])} art={<FindArt />} />
          <StepFrame number={num(2)} title={t("step2.title")} body={lines(["w-full", "w-2/3"])} art={<BookArt />}>
            <div className="rounded-[var(--radius-card)] bg-lagoon-100 p-4 sm:p-6">
              <p className="text-lg font-bold text-sea-900 sm:text-xl">{t("fees.title")}</p>
              <div className="mt-4 rounded-[var(--radius-field)] bg-white p-4 sm:p-5">
                <p className="text-sm font-semibold text-ink-700">{t("fees.youPay")}</p>
                <Skeleton className="mt-2 h-10 w-44" />
                <div className="mt-4 border-t border-sand-200">
                  {(["doctorFee", "platformFee", "cardProcessing"] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between gap-4 border-b border-sand-200 py-3">
                      <span className="font-semibold text-ink-900">{t(`fees.${key}`)}</span>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 pt-3 text-lg font-bold text-sea-900">
                    <span>{t("fees.total")}</span>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </StepFrame>
          <StepFrame number={num(3)} title={t("step3.title")} body={lines(["w-full", "w-1/2"])} art={<TalkArt />}>
            <Surface className="sm:p-6">
              <p className="text-lg font-bold text-sea-900 sm:text-xl">{t("visit.title")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["video", "phone"] as const).map((type) => (
                  <div key={type} className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
                    <p className="font-semibold text-ink-900">{t(`visit.${type}`)}</p>
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                ))}
              </div>
            </Surface>
          </StepFrame>
        </ol>
      </main>
    </>
  );
}
