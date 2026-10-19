// For professionals loading state (rule L1): the static frame renders for real; the profile search, the practice card and the
// plan prices are content-shaped skeletons under their real labels. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { WaterHero } from "@/components/brand/WaterHero";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { SectionHeading, Skeleton, Surface } from "@/components/ui";
import { PLANS } from "./plans";

const STEPS = ["claim", "verify", "live"] as const;

export default function Loading() {
  const t = useTranslations("forProfessionals");
  return (
    <>
      <SiteNav />
      <div className="relative">
        <WaterHero className="md:min-h-[600px]">
          <div className="mx-auto max-w-6xl px-4 pb-40 pt-8 sm:px-6 sm:pt-14 md:pb-32">
            <div className="flex flex-col gap-4 md:max-w-[52%] md:gap-5">
              <p className="self-start rounded-[var(--radius-tag)] bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/40">
                {t("eyebrow")}
              </p>
              <h1 className="text-3xl font-bold leading-tight text-gold-300 sm:text-5xl">{t("title")}</h1>
              <p className="text-white/90 sm:text-lg">{t("subtitle")}</p>
              <div>
                <p className="mb-2 text-lg font-bold text-white">{t("findTitle")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Skeleton className="min-h-13 flex-1 rounded-[var(--radius-field)]" />
                  <Skeleton className="min-h-13 w-28 rounded-[var(--radius-field)]" />
                </div>
                <p className="mt-2 text-sm text-white/90">{t("searchHint")}</p>
              </div>
            </div>
          </div>
        </WaterHero>
        <div className="relative mx-auto -mt-28 max-w-6xl px-4 sm:px-6 md:absolute md:inset-x-0 md:top-14 md:mt-0">
          <div className="flex flex-col items-start gap-3 md:ms-auto md:w-[44%]">
            <Skeleton className="h-7 w-28 rounded-[var(--radius-tag)]" />
            <DoctorCardSkeleton />
          </div>
        </div>
      </div>

      <main>
        <section className="mt-12 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <SectionHeading title={t("stepsTitle")} lead={t("stepsLead")} />
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((key) => (
                <li key={key}>
                  <Surface className="h-full space-y-2">
                    <p className="text-lg font-bold text-sea-900">{t(`steps.${key}.title`)}</p>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </Surface>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" role="status" aria-label={t("plans.loading")}>
          <SectionHeading title={t("plans.title")} lead={t("plans.lead")} />
          <ol className="grid gap-5 md:grid-cols-3">
            {PLANS.map((id) => (
              <li key={id}>
                <Surface className="h-full space-y-3">
                  <p className="text-xl font-bold text-sea-900">{t(`plans.${id}.name`)}</p>
                  <p className="text-sm text-ink-500">{t("plans.priceRow")}</p>
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
                </Surface>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
