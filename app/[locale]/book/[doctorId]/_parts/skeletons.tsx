// Content-shaped loading states (rule L1): the real nav and frame, real headings and labels, grey blocks only where data goes.
// The picker shows the card, the visit type, the week strip and a grid of times; checkout shows the hold bar, the review rows
// and the three fee lines with their labels.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Skeleton } from "@/components/ui";

function MiniCardSkeleton() {
  const t = useTranslations("card");
  return (
    <div role="status" aria-label={t("loading")} className="flex h-48 w-full max-w-xs flex-col rounded-[var(--radius-card)] border-b-[10px] border-sand-300 bg-sand-100 p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-3/4" />
          <p className="text-sm text-ink-500">{t("specialtyLabel")}</p>
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-auto h-6 w-40 rounded-[var(--radius-tag)]" />
    </div>
  );
}

export function PickerSkeleton() {
  const t = useTranslations("book");
  const tc = useTranslations("common");
  return (
    <>
      <SiteNav />
      <main aria-busy="true" aria-label={t("loading")} className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-4 w-48" />
        <h1 className="sr-only sm:not-sr-only sm:mt-2 sm:block sm:text-3xl sm:font-bold sm:text-sea-900">{t("title")}</h1>
        <div className="mt-3 grid gap-6 sm:mt-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
          <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
            <MiniCardSkeleton />
            <div className="hidden rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 lg:block">
              <p className="text-sm text-ink-500">{t("summary.price")}</p>
              <Skeleton className="mt-1 h-8 w-28" />
              <Skeleton className="mt-4 h-14 w-full rounded-[var(--radius-field)]" />
            </div>
          </aside>
          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-700">{t("visit.legend")}</p>
              <Skeleton className="h-12 w-52 rounded-[var(--radius-tag)]" />
              <Skeleton className="mt-2 h-4 w-full max-w-md" />
            </div>
            <section className="border-t border-sand-200 pt-5">
              <h2 className="text-xl font-bold text-sea-900">{t("calendar.title")}</h2>
              <p className="mt-1 text-sm text-ink-700">{t("calendar.zoneLead")}</p>
              <Skeleton className="mx-auto mt-4 h-5 w-56" />
              <div className="mt-3 grid grid-cols-7 gap-0.5 sm:gap-2">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="h-16 rounded-[var(--radius-field)]" />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-12 rounded-[var(--radius-field)]" />
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-300 bg-white/95 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-ink-700">{t("summary.price")}</p>
            <Skeleton className="mt-1 h-5 w-20" />
          </div>
          <span className="inline-flex min-h-12 items-center rounded-[var(--radius-field)] bg-sand-200 px-6 font-semibold text-ink-500">{tc("continue")}</span>
        </div>
      </div>
    </>
  );
}

export function CheckoutSkeleton() {
  const t = useTranslations("checkout");
  const rows = [t("review.time"), t("review.visitType"), t("review.forWhom")];
  const lines = [t("pay.doctorFee"), t("pay.platformFee"), t("pay.cardFee")];
  return (
    <>
      <SiteNav />
      <div className="sticky top-16 z-10 border-b border-lagoon-300 bg-lagoon-100 text-lagoon-900 sm:top-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <p className="text-sm font-semibold">{t("hold.label")}</p>
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <main aria-busy="true" aria-label={t("loading")} className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12">
          <section className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
            <h2 className="text-xl font-bold text-sea-900">{t("review.title")}</h2>
            <div className="mt-4">
              <MiniCardSkeleton />
            </div>
            <dl className="mt-4 divide-y divide-sand-200 border-t border-sand-200">
              {rows.map((label) => (
                <div key={label} className="py-3">
                  <dt className="text-sm text-ink-500">{label}</dt>
                  <dd className="mt-1">
                    <Skeleton className="h-5 w-3/4" />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-sea-900">{t("pay.title")}</h2>
            <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
              <dl className="divide-y divide-sand-200">
                {lines.map((label) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-ink-900">{label}</dt>
                    <dd>
                      <Skeleton className="h-5 w-20" />
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-3">
                  <dt className="font-bold text-sea-900">{t("pay.total")}</dt>
                  <dd>
                    <Skeleton className="h-6 w-24" />
                  </dd>
                </div>
              </dl>
            </div>
            <Skeleton className="h-14 w-full rounded-[var(--radius-field)]" />
          </section>
        </div>
      </main>
    </>
  );
}
