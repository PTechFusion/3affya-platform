// Sign-in loading state (rule L1): the real frame, the card's real title and field label, and the lead, field, why-we-ask line,
// Continue button and terms line as content-shaped skeletons. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton, Surface } from "@/components/ui";

export default function Loading() {
  const t = useTranslations("signIn");
  return (
    <>
      <SiteNav />
      <main aria-busy="true" className="mx-auto w-full max-w-md px-4 py-6 sm:max-w-lg sm:px-0 sm:py-14">
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
        <Surface className="sm:p-8">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] font-semibold text-ink-900">{t("email.label")}</p>
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
              <Skeleton className="mt-1 h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <Skeleton className="h-14 w-full rounded-[var(--radius-field)]" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </Surface>
      </main>
    </>
  );
}
