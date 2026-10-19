// Home loading state (rule L1): the static frame renders for real, the doctor strip is a content-shaped skeleton with labels.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { WaterHero } from "@/components/brand/WaterHero";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { SectionHeading, Skeleton } from "@/components/ui";

export default function Loading() {
  const t = useTranslations("home");
  return (
    <>
      <SiteNav />
      <WaterHero className="min-h-[520px]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-32 pt-14 sm:px-6 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-gold-300 sm:text-6xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-white/90 sm:text-xl">{t("subtitle")}</p>
          <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
            <Skeleton className="min-h-13 flex-1 rounded-[var(--radius-field)]" />
            <Skeleton className="min-h-13 w-28 rounded-[var(--radius-field)]" />
          </div>
        </div>
      </WaterHero>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <SectionHeading title={t("doctorsTitle")} lead={t("doctorsLead")} />
        <div className="grid gap-6 md:grid-cols-2">
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
        </div>
      </main>
    </>
  );
}
