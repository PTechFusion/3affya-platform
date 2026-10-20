// Screen 4 loading state (rule L1): the real nav, title, lead, search label and section headings; the search field, the six
// tiles (face, names, count) and the see-all row are content-shaped skeletons. Also rendered by page.tsx for ?state=loading.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton } from "@/components/ui";
import { DirectoryHeader, TILE_CLASS, TILE_GRID_CLASS, TILE_PHOTO_CLASS, TILE_TOP_CLASS } from "./parts";

const TILE_KEYS = ["a", "b", "c", "d", "e", "f"];

export default function Loading() {
  const t = useTranslations("specialties");
  return (
    <>
      <SiteNav />
      <main role="status" aria-busy="true" aria-label={t("loading")} className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <DirectoryHeader title={t("title")} lead={t("lead")} />
        <div className="mt-5 max-w-2xl sm:mt-8">
          <p className="sr-only">{t("searchLabel")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="min-h-13 flex-1 rounded-[var(--radius-field)]" />
            <Skeleton className="min-h-13 w-full rounded-[var(--radius-field)] sm:w-28" />
          </div>
        </div>
        <section className="mt-7 sm:mt-10">
          <h2 className="text-xl font-bold text-sea-900 sm:text-2xl">{t("curatedTitle")}</h2>
          <ul className={`mt-3 sm:mt-4 ${TILE_GRID_CLASS}`} aria-hidden="true">
            {TILE_KEYS.map((k) => (
              <li key={k} className={TILE_CLASS}>
                <div className={TILE_TOP_CLASS}>
                  <Skeleton className={TILE_PHOTO_CLASS} />
                  <Skeleton className="h-6 w-16 rounded-[var(--radius-tag)]" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-500">{t("countsNote")}</p>
        </section>
        <div className="mt-8 flex min-h-20 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <p className="text-sm text-ink-500">{t("seeAllLead")}</p>
          </div>
          <Skeleton className="size-4 shrink-0" />
        </div>
      </main>
    </>
  );
}
