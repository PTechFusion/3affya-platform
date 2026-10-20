// The refunds table (task 3.11): every refund with its amount, why (the refund rule's reason, or in full above the rule), who
// started it and when, and whether Stripe has confirmed it. A refund still waiting for Stripe is listed (the request is stored)
// but the receipt and the booking do not change until the charge.refunded webhook (ADR-6). Narrow: one card per refund; wide:
// a table. The doctor's name opens the payment.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Surface } from "@/components/ui";
import { formatDate, formatMoney, formatTime, type Locale } from "@/lib/format";
import { paymentsHref, refundTone, type RefundRow, type SearchParams } from "./payments";
import { doctorName, patientName, refundByLabel } from "./view";

export async function RefundList({ rows, locale, zone, sp }: { rows: RefundRow[]; locale: Locale; zone: string; sp: SearchParams }) {
  const t = await getTranslations("adminPayments");
  const note = (r: RefundRow) => (locale === "ar" ? r.noteAr : r.noteEn);
  const detail = (r: RefundRow) => paymentsHref(sp, { payment: r.paymentId });

  return (
    <div className="@container">
      <ul className="flex flex-col gap-3 @4xl:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Surface className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={detail(r)} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                    {doctorName(r.payment.doctor, locale)}
                  </Link>
                  <p className="text-sm text-ink-700">
                    {patientName(r.payment, locale)} · <span className="ltr-run tabular">{r.payment.receiptNumber}</span>
                  </p>
                </div>
                <p className="tabular shrink-0 whitespace-nowrap text-lg font-bold text-sea-900">{formatMoney(r.amountCents, r.payment.currency, locale)}</p>
              </div>
              <p className="text-sm font-semibold text-ink-900">{t(`refunds.reason.${r.reason}`)}</p>
              <p className="tabular text-sm text-ink-700">
                {refundByLabel(r.by, locale, t)} · <span className="whitespace-nowrap">{formatDate(r.at, zone, locale)}</span> ·{" "}
                <span className="whitespace-nowrap">{formatTime(r.at, zone, locale)}</span>
              </p>
              {note(r) ? <p className="text-sm text-ink-700">{t("refunds.note", { note: note(r) ?? "" })}</p> : null}
              <div>
                <Badge tone={refundTone[r.status]}>{t(`refunds.status.${r.status}`)}</Badge>
              </div>
            </Surface>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-sand-200 bg-white @4xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("tabs.refunds")}</caption>
          <thead>
            <tr className="border-b border-sand-200 text-ink-500">
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {t("columns.refundedOn")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.payment")}
              </th>
              <th scope="col" className="px-3 py-3 text-end font-semibold">
                {t("columns.amount")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.reason")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.by")}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {t("columns.status")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="tabular whitespace-nowrap px-4 py-3 text-ink-900">
                  {formatDate(r.at, zone, locale)}
                  <span className="block text-ink-500">{formatTime(r.at, zone, locale)}</span>
                </td>
                <td className="min-w-40 px-3 py-3">
                  <Link href={detail(r)} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                    {doctorName(r.payment.doctor, locale)}
                  </Link>
                  <span className="block text-ink-700">{patientName(r.payment, locale)}</span>
                  <span className="block text-ink-500">
                    <span className="ltr-run tabular">{r.payment.receiptNumber}</span>
                  </span>
                </td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-end font-bold text-sea-900">
                  {formatMoney(r.amountCents, r.payment.currency, locale)}
                </td>
                <td className="px-3 py-3 text-ink-900">
                  {t(`refunds.reason.${r.reason}`)}
                  {note(r) ? <span className="mt-1 block max-w-64 text-ink-700">{t("refunds.note", { note: note(r) ?? "" })}</span> : null}
                </td>
                <td className="px-3 py-3 text-ink-900">{refundByLabel(r.by, locale, t)}</td>
                <td className="px-4 py-3">
                  <Badge tone={refundTone[r.status]}>{t(`refunds.status.${r.status}`)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
