// Members list loading state (rule L1): the heading, the totals labels, the view chips and the table's column labels are real;
// the figures, counts and rows are content-shaped skeletons. Phone shows three card skeletons, desktop five table rows. The
// page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { MembersHeader } from "./MembersHeader";
import { FilterChips } from "./MembersList";
import type { MembersFilter } from "./shared";

export function MembersSkeleton({ filter = "current", tz }: { filter?: MembersFilter; tz?: string }) {
  const t = useTranslations("adminMembers");
  const tiles = [
    { term: t("totals.mrr"), wide: true },
    { term: t("totals.pastDue") },
    { term: t("totals.ending") },
  ];
  const columns = [t("table.professional"), t("table.plan"), t("table.status"), t("table.renewal")];
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-6">
      <MembersHeader />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.term} className={`rounded-[var(--radius-field)] border border-sand-200 bg-white p-3 sm:p-4 ${tile.wide ? "col-span-2 sm:col-span-1" : ""}`}>
            <dt className="text-sm font-semibold text-ink-700">{tile.term}</dt>
            <dd className="mt-1.5">
              <Skeleton className="h-7 w-24" />
            </dd>
            <dd className="mt-1.5">
              <Skeleton className="h-4 w-32 max-w-full" />
            </dd>
          </div>
        ))}
      </dl>

      <FilterChips current={filter} query={{ tz }} />

      <ul className="flex flex-col gap-3 lg:hidden">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Surface className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-7 w-20 rounded-[var(--radius-tag)]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="border-t border-sand-200 pt-3">
                <Skeleton className="h-5 w-28" />
              </div>
            </Surface>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white lg:block">
        <table className="w-full">
          <thead className="bg-sand-100 text-sm text-ink-700">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 text-start font-semibold">
                  {c}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-end font-semibold">
                {t("table.stripe")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="space-y-2 px-4 py-3.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="space-y-2 px-4 py-3.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-3.5">
                  <Skeleton className="h-7 w-20 rounded-[var(--radius-tag)]" />
                </td>
                <td className="space-y-2 px-4 py-3.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-3.5">
                  <Skeleton className="ms-auto h-5 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
