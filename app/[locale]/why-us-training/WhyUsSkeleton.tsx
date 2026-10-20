// Loading frame for screen 2 (rule L1), shared by loading.tsx and ?state=loading: the real headings render, the paragraphs and
// the credential strip are content-shaped skeletons in the same grid as the page.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton } from "@/components/ui";

export function WhyUsSkeleton() {
  const t = useTranslations("whyUs");
  const tt = useTranslations("trust");
  const sections = [t("training.title"), t("verify.title"), t("cost.title")];
  return (
    <>
      <SiteNav />
      <main aria-busy="true" aria-label={t("loading")}>
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_340px]">
          <header className="max-w-2xl lg:col-start-1 lg:row-start-1">
            <h1 className="text-3xl font-bold leading-tight text-sea-900 sm:text-5xl">{t("title")}</h1>
            <div className="mt-5 space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="mt-6 h-14 w-48 rounded-[var(--radius-field)]" />
          </header>
          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
              <p className="text-lg font-bold text-sea-900">{tt("label")}</p>
              <ul className="mt-4 grid gap-4">
                {[tt("licence"), tt("board"), tt("priceUnknown")].map((label) => (
                  <li key={label} className="flex items-start gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex-1">
                      <p className="font-semibold text-ink-900">{label}</p>
                      <Skeleton className="mt-1.5 h-3.5 w-full" />
                      <Skeleton className="mt-1.5 h-3.5 w-2/3" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="max-w-2xl space-y-12 lg:col-start-1 lg:row-start-2">
            {sections.map((title) => (
              <section key={title}>
                <h2 className="text-2xl font-bold text-sea-900 sm:text-3xl">{title}</h2>
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="mt-5 divide-y divide-sand-200 overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
                  {["a", "b", "c"].map((row) => (
                    <div key={row} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3.5 w-full" />
                      </div>
                    </div>
                  ))}
                  <div className="bg-sand-100 px-4 py-4 sm:px-5">
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
