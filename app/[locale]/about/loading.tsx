// About loading state (rule L1): the real frame and every heading and label, with content-shaped skeletons for the paragraphs,
// the founder photo and the values. The page renders this same component for ?state=loading.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { SectionHeading, Skeleton, Surface } from "@/components/ui";

export default function Loading() {
  const t = useTranslations("about");
  return (
    <>
      <SiteNav />
      <main aria-busy="true" className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
        <section className="md:grid md:grid-cols-[1fr_13rem] md:items-start md:gap-8">
          <div>
            <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
            <div className="mt-5 space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="mt-6 space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <Surface className="mt-6 flex items-center gap-4 p-4 md:mt-2 md:flex-col md:items-stretch">
            <Skeleton className="size-20 shrink-0 rounded-2xl md:aspect-square md:size-auto md:w-full" />
            <div className="flex-1 space-y-2">
              <p className="font-bold text-sea-900">{t("founderName")}</p>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Surface>
        </section>

        <section>
          <SectionHeading title={t("verifyTitle")} lead={t("verifyLead")} />
          <Surface>
            <ol className="space-y-6">
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n} className="flex items-start gap-4">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <p className="font-bold text-sea-900">{t(`verify${n}Title`)}</p>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </li>
              ))}
            </ol>
          </Surface>
        </section>

        <section>
          <SectionHeading title={t("companyTitle")} />
          <Surface>
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-ink-900">{t("entityLabel")}</dt>
              <dd className="mb-3 sm:mb-0">
                <Skeleton className="mt-1 h-4 w-full" />
              </dd>
              <dt className="font-semibold text-ink-900">{t("addressLabel")}</dt>
              <dd>
                <Skeleton className="mt-1 h-4 w-1/2" />
              </dd>
            </dl>
          </Surface>
        </section>
      </main>
    </>
  );
}
