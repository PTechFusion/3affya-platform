// Membership loading state (rule L1): the heading, the tier card, the billing panel and the plan table keep their real labels;
// what comes from the professional's own row (status, price, dates) and the plan prices are content-shaped skeletons. The page
// renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { SectionHeading, Skeleton, Surface } from "@/components/ui";
import { PLANS } from "@/app/[locale]/for-professionals/plans";

export default function Loading() {
  const t = useTranslations("membership");
  const tp = useTranslations("forProfessionals");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Surface className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-500">{t("current.label")}</p>
            <Skeleton className="h-7 w-20 rounded-[var(--radius-tag)]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40" />
          <div className="divide-y divide-sand-200 border-y border-sand-200">
            {[t("current.renewsOn"), t("current.nextPayment")].map((term) => (
              <div key={term} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-ink-700">{term}</span>
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="flex flex-col gap-3">
          <p className="text-xl font-bold text-sea-900">{t("billing.title")}</p>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-44" />
          <Skeleton className="h-4 w-3/5" />
        </Surface>
      </div>

      <section className="mt-10">
        <SectionHeading title={t("plans.title")} lead={t("plans.lead")} />
        <ol className="grid gap-4 md:grid-cols-3">
          {PLANS.map((id) => (
            <li key={id}>
              <Surface className="h-full space-y-3">
                <p className="text-xl font-bold text-sea-900">{tp(`plans.${id}.name`)}</p>
                <p className="text-sm text-ink-700">{tp(`plans.${id}.tagline`)}</p>
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </Surface>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
