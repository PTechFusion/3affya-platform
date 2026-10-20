// The receipts list (screen 23): one row per payment, newest first. A row is the date paid, the doctor, the all-in total (rule
// C5) and the money status; the whole row is one link to the receipt, nothing interactive inside it. Phone: name and total on
// the first line, date and status under them. Desktop: four columns under a visual header row.
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext } from "@/components/ui";
import { formatDate, formatMoney, type Locale } from "@/lib/format";
import { doctorById, type SampleReceipt } from "@/lib/sample";
import { receiptStatus, receiptsHref, statusTone } from "./receipts";

/** Phone: name | total | chevron over date | status. Desktop: date | doctor | total | status | chevron. */
export const rowCols =
  "grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-3 gap-y-1 px-4 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto_9.5rem_1rem] sm:gap-x-4 sm:px-5";

/** Column names for the desktop table look. Decorative: every row says the same in its own text for screen readers. */
export function ReceiptHeaderRow() {
  const t = useTranslations("receipts");
  return (
    <div aria-hidden="true" className={`${rowCols} hidden border-b border-sand-200 py-2.5 text-sm font-semibold text-ink-500 sm:grid`}>
      <span>{t("columns.paidOn")}</span>
      <span>{t("columns.doctor")}</span>
      <span className="text-end">{t("columns.total")}</span>
      <span>{t("columns.status")}</span>
      <span />
    </div>
  );
}

export async function ReceiptRows({ receipts, locale, zone, tz }: { receipts: SampleReceipt[]; locale: Locale; zone: string; tz: string | undefined }) {
  const t = await getTranslations("receipts");
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
      <ReceiptHeaderRow />
      <ul className="divide-y divide-sand-200">
        {receipts.map((r) => {
          const doctor = doctorById(r.doctorId);
          const name = doctor ? (locale === "ar" ? doctor.nameAr : doctor.nameEn) : "";
          const specialty = doctor ? (locale === "ar" ? doctor.specialtyAr : doctor.specialtyEn) : "";
          const status = receiptStatus(r);
          const date = formatDate(r.paidAt, zone, locale);
          return (
            <li key={r.id}>
              <Link href={receiptsHref(r.id, tz)} className={`${rowCols} grid py-3.5 transition-colors hover:bg-sand-50`}>
                <span className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
                  <span className="block truncate font-semibold text-ink-900">{name}</span>
                  <span className="hidden text-sm text-ink-700 sm:block">
                    {specialty} · {t(`visitType.${r.visitType}`)}
                  </span>
                </span>
                <span className="tabular col-start-1 row-start-2 text-sm text-ink-700 sm:col-start-1 sm:row-start-1 sm:text-base sm:text-ink-900">
                  <span className="sm:sr-only">{t("row.paid", { date })}</span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    {date}
                  </span>
                </span>
                <span className="tabular col-start-2 row-start-1 whitespace-nowrap text-end font-bold text-sea-900 sm:col-start-3">
                  {formatMoney(r.totalCents, r.currency, locale)}
                </span>
                <span className="col-start-2 row-start-2 justify-self-end sm:col-start-4 sm:row-start-1 sm:justify-self-start">
                  <Badge tone={statusTone[status]}>{t(`status.${status}`)}</Badge>
                </span>
                <ChevronNext className="col-start-3 row-span-2 row-start-1 size-4 text-sea-700 sm:col-start-5 sm:row-span-1" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
