// Specialty list loading state (rules L1, L3): the real heading, lead, finder label and column names, then two body-system blocks
// shaped like the real ones (order number, name, count, move controls) with stacked rows on phone and table rows from xl up.
// Never "no specialties" while loading.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Skeleton } from "@/components/ui";
import { TABLE_COLUMNS } from "./types";

/** The page heading and lead, shared by the page and its loading frame. `action` sits at the end on wide screens. */
export function SpecialtiesHeader({ action }: { action?: ReactNode }) {
  const t = useTranslations("adminSpecialties");
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
      </div>
      {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
    </header>
  );
}

const GROUPS = [3, 2];
const COLUMNS = ["nameAr", "nameEn", "slugCodes", "words", "doctors", "status"] as const;

export function SpecialtiesSkeleton() {
  const t = useTranslations("adminSpecialties");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <SpecialtiesHeader
        action={
          <Link href="/specialties" className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-4 hover:underline">
            {t("openDirectory")}
          </Link>
        }
      />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Button type="button" disabled className="w-full sm:mt-7 sm:w-auto">
          {t("add")}
        </Button>
        <div className="w-full sm:max-w-sm">
          <p className="mb-1.5 font-semibold text-ink-900">{t("find.label")}</p>
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
          <p className="mt-1.5 text-sm text-ink-500">{t("find.hint")}</p>
        </div>
      </div>
      <Skeleton className="mt-5 h-6 w-56" />
      <p className="mt-1 max-w-3xl text-sm text-ink-700">{t("orderNote")}</p>

      <div className="mt-4 flex flex-col gap-5">
        {GROUPS.map((n, gi) => (
          <div key={gi} className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
            <div className="flex items-center gap-3 border-b border-sand-200 bg-sand-100 px-4 py-2.5 sm:px-5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-24 rounded-[var(--radius-field)]" />
            </div>
            <ul className="divide-y divide-sand-200 xl:hidden" aria-hidden="true">
              {Array.from({ length: n }, (_, i) => (
                <li key={i} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex flex-1 items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-48 max-w-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="me-auto h-6 w-16 rounded-[var(--radius-tag)]" />
                    <Skeleton className="h-12 w-20 rounded-[var(--radius-field)]" />
                    <Skeleton className="h-12 w-16 rounded-[var(--radius-field)]" />
                  </div>
                </li>
              ))}
            </ul>
            <table className="hidden w-full table-fixed text-sm xl:table">
              <colgroup>
                {TABLE_COLUMNS.map((w, i) => (
                  <col key={i} className={w} />
                ))}
              </colgroup>
              <thead>
                <tr className="text-ink-500">
                  {COLUMNS.map((c) => (
                    <th key={c} scope="col" className="px-3 pb-2 pt-3 text-start font-semibold first:ps-5">
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                  <th scope="col" className="px-3 pb-2 pt-3">
                    <span className="sr-only">{t("columns.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody aria-hidden="true">
                {Array.from({ length: n }, (_, i) => (
                  <tr key={i} className="border-t border-sand-200 align-top">
                    <td className="px-3 py-3 ps-5">
                      <span className="flex items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <Skeleton className="h-5 w-28" />
                      </span>
                    </td>
                    <td className="px-3 pt-5">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 pt-5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-4 w-20" />
                    </td>
                    <td className="px-3 pt-5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-2 h-4 w-28" />
                    </td>
                    <td className="px-3 pt-5">
                      <Skeleton className="h-4 w-6" />
                    </td>
                    <td className="px-3 pb-2 pt-4">
                      <Skeleton className="h-6 w-14 rounded-[var(--radius-tag)]" />
                      <Skeleton className="mt-3 h-5 w-12" />
                    </td>
                    <td className="px-3 py-3 pe-5">
                      <Skeleton className="ms-auto h-12 w-16 rounded-[var(--radius-field)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
