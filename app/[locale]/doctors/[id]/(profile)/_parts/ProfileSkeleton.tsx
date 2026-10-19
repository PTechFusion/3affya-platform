// Content-shaped skeleton for the profile (rule L1): the real nav, the card skeleton where the card goes, the booking box with
// its real labels, and the first three blocks with their real titles. Shaped like the verified page, the one most patients see.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton, Surface } from "@/components/ui";
import { sectionTitle } from "./bits";

export function ProfileSkeleton() {
  const t = useTranslations("profile");
  const tcard = useTranslations("card");
  const sections = [t("credentials.title"), t("visits.title"), t("availability.title")];
  return (
    <>
      <SiteNav />
      <main aria-busy="true" aria-label={t("loading")} className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-12">
          <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
            <div className="order-1">
              <DoctorCardSkeleton />
            </div>
            <div className="order-3">
              <Surface>
                <p className="text-sm text-ink-500">{t("booking.priceLabel")}</p>
                <Skeleton className="mt-1 h-9 w-36" />
                <p className="mt-4 font-semibold text-ink-900">{tcard("nextAvailable")}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Skeleton className="h-14 rounded-[var(--radius-field)]" />
                  <Skeleton className="h-14 rounded-[var(--radius-field)]" />
                  <Skeleton className="h-14 rounded-[var(--radius-field)]" />
                </div>
                <Skeleton className="mt-4 h-14 w-full rounded-[var(--radius-field)]" />
              </Surface>
            </div>
          </div>
          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
            <div className="order-2 space-y-3">
              <Skeleton className="hidden h-10 w-2/3 lg:block" />
              <Skeleton className="h-7 w-48 rounded-[var(--radius-tag)]" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <div className="order-4 flex flex-col gap-6">
              {sections.map((title) => (
                <Surface key={title}>
                  <h2 className={sectionTitle}>{title}</h2>
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Surface>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
