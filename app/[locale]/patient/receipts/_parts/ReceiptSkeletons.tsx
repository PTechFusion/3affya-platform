// Loading frames for screen 23 (rule L1): the real headings, column names and line labels, values as skeletons. Never "No
// receipts" while loading (rule L3). The list and the receipt render these for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";
import { ReceiptHeaderRow, rowCols } from "./ReceiptRows";

export function ReceiptRowsSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useTranslations("receipts");
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
      <ReceiptHeaderRow />
      <ul className="divide-y divide-sand-200">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={`${rowCols} grid py-3.5`}>
            <span className="col-start-1 row-start-1 flex flex-col gap-1.5 sm:col-start-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="hidden h-4 w-52 max-w-full sm:block" />
            </span>
            {/* Phone has no header row, so the date's label shows in the row itself. */}
            <span className="col-start-1 row-start-2 flex items-center gap-2 sm:col-start-1 sm:row-start-1">
              <span className="text-sm text-ink-500 sm:hidden">{t("columns.paidOn")}</span>
              <Skeleton className="h-4 w-24 sm:h-5 sm:w-28" />
            </span>
            <Skeleton className="col-start-2 row-start-1 h-5 w-24 sm:col-start-3" />
            <Skeleton className="col-start-2 row-start-2 h-6 w-16 justify-self-end rounded-[var(--radius-tag)] sm:col-start-4 sm:row-start-1 sm:justify-self-start" />
            <span className="col-start-3 row-span-2 row-start-1 sm:col-start-5 sm:row-span-1" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The receipt's frame: total, payment facts, the three lines under their real names, the download button, the visit card. */
export function ReceiptDetailSkeleton() {
  const t = useTranslations("receipts.detail");
  const lines = ["doctorFee", "platformFee", "cardProcessing"] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <section>
          <h2 className="text-sm font-semibold text-ink-700">{t("totalPaid")}</h2>
          <Skeleton className="mt-1.5 h-10 w-48" />
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-sm">
            {(["paidOn", "method", "number"] as const).map((key) => (
              <div key={key} className="contents">
                <dt className="text-ink-500">{t(key)}</dt>
                <dd>
                  <Skeleton className="h-4 w-44 max-w-full" />
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
          <p className="mb-2 text-sm font-semibold text-ink-500">{t("lines.caption")}</p>
          <ul>
            {lines.map((key) => (
              <li key={key} className="flex items-start justify-between gap-4 border-b border-sand-200 py-3">
                <span className="text-ink-900">{t(`lines.${key}`)}</span>
                <Skeleton className="h-5 w-20" />
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 pt-3">
              <span className="font-bold text-sea-900">{t("lines.total")}</span>
              <Skeleton className="h-5 w-24" />
            </li>
          </ul>
        </div>
        <Skeleton className="h-14 w-full rounded-[var(--radius-field)] sm:w-64" />
      </div>
      <Surface className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-sea-900">{t("visit.title")}</h2>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {(["yourTime", "doctorTime"] as const).map((key) => (
            <div key={key} className="rounded-[var(--radius-field)] bg-sand-100 p-3">
              <p className="text-sm font-semibold text-ink-700">{t(`visit.${key}`)}</p>
              <Skeleton className="mt-1.5 h-5 w-3/4" />
              <Skeleton className="mt-1.5 h-4 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
      </Surface>
    </div>
  );
}
