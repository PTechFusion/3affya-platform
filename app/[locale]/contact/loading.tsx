// Contact loading state (rule L1). The frame renders for real, and so does the WhatsApp card: it is static, so the quickest
// way to reach us works before the page finishes. The form and the hours card are content-shaped skeletons under real labels.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton, Surface } from "@/components/ui";
import { WhatsAppCard } from "./WhatsAppCard";

export default function Loading() {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const label = "text-[15px] font-semibold text-ink-900";
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-busy="true">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-700">{t("lead")}</p>
          <p className="mt-3 text-sm text-ink-700">{tc("notForEmergencies")}</p>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:grid-rows-[auto_1fr] md:items-start">
          <WhatsAppCard className="md:col-start-1 md:row-start-1" />

          <Surface className="md:col-start-2 md:row-start-1 md:row-span-2">
            <h2 className="text-xl font-bold text-sea-900">{t("form.title")}</h2>
            <Skeleton className="mt-2 h-5 w-56" />
            <div className="mt-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <p className={label}>{t("form.name")}</p>
                <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={label}>{t("form.email")}</p>
                <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
                <p className="text-sm text-ink-500">{t("form.emailHint")}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={label}>{t("form.message")}</p>
                <Skeleton className="h-36 w-full rounded-[var(--radius-field)]" />
                <p className="text-sm text-ink-500">{t("form.messageHint")}</p>
              </div>
              <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-40" />
            </div>
          </Surface>

          <Surface className="md:col-start-1 md:row-start-2">
            <h2 className="text-lg font-bold text-sea-900">{t("visit.title")}</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink-500">{t("visit.hours")}</p>
                <p className="mt-0.5 text-ink-900">{t("visit.days")}</p>
                <Skeleton className="mt-1.5 h-5 w-52" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-500">{t("visit.address")}</p>
                <Skeleton className="mt-1.5 h-5 w-64 max-w-full" />
                <Skeleton className="mt-2 h-5 w-48" />
              </div>
            </div>
          </Surface>
        </div>
      </main>
    </>
  );
}
