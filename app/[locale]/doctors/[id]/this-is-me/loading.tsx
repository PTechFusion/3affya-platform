// This is me / remove me loading state (rule L1). The frame, the heading, the two choices and every field label render for
// real; the mini card and the inputs are content-shaped skeletons. The doctor's name is not known yet, so the heading is the
// generic question.
import { useLocale, useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton, Surface } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { INTENTS, NPI_DIGITS } from "./validation";

export default function Loading() {
  const t = useTranslations("thisIsMe");
  const locale = useLocale() as Locale;
  const tcard = useTranslations("card");
  const label = "text-[15px] font-semibold text-ink-900";
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12" aria-busy="true">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-start md:gap-10">
          <header className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("titleGeneric")}</h1>
              {/* Phone identity line: state badge, specialty and city. */}
              <div role="status" aria-label={tcard("loading")} className="flex items-center gap-2 md:hidden">
                <Skeleton className="h-6 w-28 rounded-[var(--radius-tag)]" />
                <Skeleton className="h-4 w-40" />
              </div>
              <p className="text-ink-700">{t("lead")}</p>
            </div>
            {/* Desktop: mini DoctorCard front (photo, name, specialty, city, state badge). */}
            <div
              aria-hidden="true"
              className="hidden h-40 w-full max-w-xs flex-col rounded-[var(--radius-card)] border-b-[10px] border-sand-300 bg-sand-100 p-3 md:flex"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="size-12 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              </div>
              <Skeleton className="mt-auto h-6 w-32 rounded-[var(--radius-tag)]" />
            </div>
          </header>

          <Surface>
            <div className="flex flex-col gap-5">
              <div>
                <p className={label}>{t("choice.legend")}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {INTENTS.map((intent) => (
                    <div key={intent} className="flex min-h-12 items-start gap-2.5 rounded-[var(--radius-field)] border border-sand-300 bg-white p-3">
                      <Skeleton className="mt-1 size-5 shrink-0 rounded-full" />
                      <div>
                        <p className="font-semibold text-ink-900">{t(`choice.${intent}.title`)}</p>
                        <p className="text-sm text-ink-700">{t(`choice.${intent}.body`)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {(["name", "npi", "email"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <p className={label}>{t(`form.${field}`)}</p>
                  <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
                  {field === "npi" ? <p className="text-sm text-ink-500">{t("form.npiHint", { digits: formatNumber(NPI_DIGITS, locale) })}</p> : null}
                  {field === "email" ? <p className="text-sm text-ink-500">{t("form.emailHint")}</p> : null}
                </div>
              ))}
              <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-44" />
            </div>
          </Surface>
        </div>
      </main>
    </>
  );
}
