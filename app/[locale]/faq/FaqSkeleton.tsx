// FAQ loading frame (rule L1): the real title, lead, search label and group headings; the field and question rows are
// content-shaped skeletons. Shared by loading.tsx and ?state=loading so both show the same thing.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton } from "@/components/ui";
import { FAQ_GROUPS } from "./faq-content";

const ROW_WIDTHS = ["w-4/5", "w-3/5", "w-2/3"];

export function FaqSkeleton() {
  const t = useTranslations("faq");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-lg text-ink-700">{t("lead")}</p>
        <div role="status" aria-label={t("loading")} className="mt-6">
          <p className="text-[15px] font-semibold text-ink-900">{t("searchLabel")}</p>
          <Skeleton className="mt-1.5 h-12 w-full rounded-[var(--radius-field)]" />
          <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
            {FAQ_GROUPS.map((g) => (
              <Skeleton key={g.id} className="h-10 w-28 rounded-[var(--radius-tag)]" />
            ))}
          </div>
          <div className="mt-8 space-y-10">
            {FAQ_GROUPS.slice(0, 2).map((g) => (
              <section key={g.id}>
                <h2 className="text-xl font-bold text-sea-900 sm:text-2xl">{t(`groups.${g.id}`)}</h2>
                <ul className="mt-3 divide-y divide-sand-200 rounded-[var(--radius-card)] border border-sand-200 bg-white px-5">
                  {ROW_WIDTHS.map((w) => (
                    <li key={w} className="flex items-center justify-between gap-3 py-5">
                      <Skeleton className={`h-5 ${w}`} />
                      <Skeleton className="size-4 shrink-0" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
