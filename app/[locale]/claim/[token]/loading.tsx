// Claim invite loading state (rule L1): the real frame and labels, the card as its content-shaped skeleton, the email field and
// Send code button as skeletons under their real label. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton, Surface } from "@/components/ui";

export default function Loading() {
  const t = useTranslations("claim");
  return (
    <>
      <SiteNav />
      <main aria-busy="true" className="mx-auto w-full max-w-md px-4 py-8 sm:px-0 sm:py-12">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("loadingTitle")}</h1>
        <div className="mt-5">
          <DoctorCardSkeleton />
          <Skeleton className="mt-3 h-5 w-3/5" />
        </div>
        <div className="mt-5 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Surface className="mt-5 space-y-3">
          <p className="text-[15px] font-semibold text-ink-900">{t("email.label")}</p>
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
          <Skeleton className="h-14 w-full rounded-[var(--radius-field)]" />
        </Surface>
        <div className="mt-8 flex items-baseline justify-between gap-3">
          <p className="text-lg font-bold text-sea-900">{t("checklist.title")}</p>
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </main>
    </>
  );
}
