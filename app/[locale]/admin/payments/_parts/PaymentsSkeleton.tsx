// Loading state of the money screen (rule L1): the real heading, Export CSV, the three tabs and the Filters row, then the open
// tab's table with its real column names (wide) or card labels (narrow) and the values as skeletons. Never "No payments" while
// loading (rule L3). Used by loading.tsx (which cannot read the URL, so no tab is marked) and by ?state=loading.
import { useTranslations } from "next-intl";
import { LinkButton, Skeleton, Surface, TabLinks } from "@/components/ui";
import type { Tab } from "./payments";

const ROWS = 5;

/** `exportHref` is left out when there is nothing to export (the list did not load, or has no rows). */
export function PaymentsHeader({ title, lead, exportLabel, exportHref }: { title: string; lead: string; exportLabel: string; exportHref?: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
        {/* A file, not a page: `download` keeps the click out of client-side navigation. */}
        {exportHref ? (
          <LinkButton href={exportHref} download prefetch={false} variant="secondary" className="shrink-0 px-4">
            {exportLabel}
          </LinkButton>
        ) : null}
      </div>
      <p className="max-w-2xl text-ink-700">{lead}</p>
    </header>
  );
}

const COLUMNS: Record<Tab, string[]> = {
  payments: ["paidOn", "payment", "doctorFee", "platformFee", "cardProcessing", "total", "status"],
  refunds: ["refundedOn", "payment", "amount", "reason", "by", "status"],
  payouts: ["doctor", "account", "bank", "nextPayout", "lastPayout"],
};

export function PaymentsSkeleton({ tab }: { tab?: Tab }) {
  const t = useTranslations("adminPayments");
  const open = tab ?? "payments";
  const columns = COLUMNS[open];
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <PaymentsHeader title={t("title")} lead={t("lead")} exportLabel={t("export")} exportHref="/admin/payments/export.csv" />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <TabLinks
        label={t("tabs.label")}
        items={[
          { href: "/admin/payments", label: t("tabs.payments"), current: tab === "payments" },
          { href: "/admin/payments?tab=refunds", label: t("tabs.refunds"), current: tab === "refunds" },
          { href: "/admin/payments?tab=payouts", label: t("tabs.payouts"), current: tab === "payouts" },
        ]}
      />
      <Surface className="px-4 py-4 sm:px-5">
        <p className="font-semibold text-ink-900">{t("filters.title")}</p>
      </Surface>

      <div className="@container">
        <ul className="flex flex-col gap-3 @4xl:hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Surface className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                {open === "payments" ? (
                  <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-field)] bg-sand-100 px-3 py-2 text-sm">
                    {(["doctorFeeShort", "platformFeeShort", "cardShort"] as const).map((k) => (
                      <div key={k} className="flex flex-col gap-1">
                        <span className="text-ink-500">{t(`row.${k}`)}</span>
                        <Skeleton className="h-4 w-14" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-4 w-56 max-w-full" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-6 w-24 rounded-[var(--radius-tag)]" />
                  {open === "payments" ? <Skeleton className="h-12 w-24 rounded-[var(--radius-field)]" /> : null}
                </div>
              </Surface>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white @4xl:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-ink-500">
                {columns.map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 text-start font-semibold">
                    {t(`columns.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {Array.from({ length: ROWS }, (_, i) => (
                <tr key={i}>
                  {columns.map((c, j) => (
                    <td key={c} className="px-4 py-4">
                      <Skeleton className={j === 1 ? "h-4 w-32" : "h-4 w-16"} />
                      {j < 2 ? <Skeleton className="mt-2 h-3 w-20" /> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
