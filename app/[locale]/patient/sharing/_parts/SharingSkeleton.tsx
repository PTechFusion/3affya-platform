// Loading state for the sharing page (rules L1, L3): the real heading, lead and "who can see" panel (the patient's own line is
// real; doctors are a skeleton), then a share row with its real labels (Shared on, Expires on) and skeletons for the values and
// Stop sharing. Never "nothing shared" while loading.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { WhoCanSee } from "./WhoCanSee";

export function SharingSkeleton() {
  const t = useTranslations("sharing");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      <div className="mt-5">
        <WhoCanSee people={null} />
      </div>
      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-sea-900">{t("list.title")}</h2>
          <Skeleton className="h-12 w-40 rounded-[var(--radius-field)]" />
        </div>
        <Surface className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_10rem_auto] sm:items-center sm:gap-6">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:contents">
            <div>
              <p className="text-sm text-ink-500">{t("row.sharedOn")}</p>
              <Skeleton className="mt-1 h-5 w-24" />
            </div>
            <div>
              <p className="text-sm text-ink-500">{t("row.expiresOn")}</p>
              <Skeleton className="mt-1 h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-32" />
        </Surface>
      </section>
    </div>
  );
}
