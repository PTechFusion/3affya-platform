// The payments table (layout call; task 3.11): every payment with its three lines and total (rule P1, E3: the receipt's lines),
// its money status and the visit's, and a Refund button on each payment that can still be refunded. The doctor's name opens
// the payment. Narrow (phone, and the portal at tablet width): one card per payment with the three lines in a row of three.
// Wide (container from 56rem): a real table. Never a link around the row: the row holds a button (no nested interactive).
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Surface } from "@/components/ui";
import { formatDate, formatMoney, formatTime, type Locale } from "@/lib/format";
import type { AdminPayment } from "@/lib/sample";
import { RefundButton } from "./RefundDrawer";
import { canRefund, paymentStatus, paymentTone, paymentsHref, type SearchParams } from "./payments";
import { doctorName, ltr, patientName } from "./view";

export async function PaymentList({ payments, locale, zone, sp }: { payments: AdminPayment[]; locale: Locale; zone: string; sp: SearchParams }) {
  const t = await getTranslations("adminPayments");
  const money = (p: AdminPayment, cents: number) => formatMoney(cents, p.currency, locale);
  const refund = (p: AdminPayment, className?: string) =>
    canRefund(p) ? (
      <RefundButton
        paymentId={p.id}
        label={t("row.refund")}
        accessibleLabel={t("row.refundLabel", { number: ltr(p.receiptNumber) })}
        className={className}
      />
    ) : null;
  const status = (p: AdminPayment) => {
    const s = paymentStatus(p);
    return <Badge tone={paymentTone[s]}>{t(`status.${s}`)}</Badge>;
  };
  const detail = (p: AdminPayment) => paymentsHref(sp, { payment: p.id });

  return (
    <div className="@container">
      <ul className="flex flex-col gap-3 @4xl:hidden">
        {payments.map((p) => (
          <li key={p.id}>
            <Surface className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={detail(p)} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                    {doctorName(p.doctor, locale)}
                  </Link>
                  <p className="text-sm text-ink-700">{patientName(p, locale)}</p>
                  <p className="tabular text-sm text-ink-500">
                    <span className="whitespace-nowrap">{formatDate(p.paidAt, zone, locale)}</span> ·{" "}
                    <span className="whitespace-nowrap">{formatTime(p.paidAt, zone, locale)}</span> · <span className="ltr-run">{p.receiptNumber}</span>
                  </p>
                </div>
                <p className="tabular shrink-0 whitespace-nowrap text-lg font-bold text-sea-900">{money(p, p.totalCents)}</p>
              </div>
              <dl aria-label={t("row.lines")} className="grid grid-cols-3 gap-2 rounded-[var(--radius-field)] bg-sand-100 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-ink-500">{t("row.doctorFeeShort")}</dt>
                  <dd className="tabular whitespace-nowrap text-ink-900">{money(p, p.doctorFeeCents)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-500">{t("row.platformFeeShort")}</dt>
                  <dd className="tabular whitespace-nowrap text-ink-900">{money(p, p.platformFeeCents)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-500">{t("row.cardShort")}</dt>
                  <dd className="tabular whitespace-nowrap text-ink-900">{money(p, p.cardProcessingCents)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {status(p)}
                  <span className="text-sm text-ink-700">{t(`visit.${p.visitStatus}`)}</span>
                </div>
                {refund(p)}
              </div>
            </Surface>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-sand-200 bg-white @4xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("tabs.payments")}</caption>
          <thead>
            <tr className="border-b border-sand-200 text-ink-500">
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {t("columns.paidOn")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.payment")}
              </th>
              <th scope="col" className="px-3 py-3 text-end font-semibold">
                {t("columns.doctorFee")}
              </th>
              <th scope="col" className="px-3 py-3 text-end font-semibold">
                {t("columns.platformFee")}
              </th>
              <th scope="col" className="px-3 py-3 text-end font-semibold">
                {t("columns.cardProcessing")}
              </th>
              <th scope="col" className="px-3 py-3 text-end font-semibold">
                {t("columns.total")}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">
                {t("columns.status")}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">
                <span className="sr-only">{t("columns.action")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {payments.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="tabular whitespace-nowrap px-4 py-3 text-ink-900">
                  {formatDate(p.paidAt, zone, locale)}
                  <span className="block text-ink-500">{formatTime(p.paidAt, zone, locale)}</span>
                </td>
                <td className="min-w-40 px-3 py-3">
                  <Link href={detail(p)} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                    {doctorName(p.doctor, locale)}
                  </Link>
                  <span className="block text-ink-700">{patientName(p, locale)}</span>
                  <span className="block text-ink-500">
                    <span className="ltr-run tabular">{p.receiptNumber}</span>
                  </span>
                </td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-end text-ink-900">{money(p, p.doctorFeeCents)}</td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-end text-ink-900">{money(p, p.platformFeeCents)}</td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-end text-ink-900">{money(p, p.cardProcessingCents)}</td>
                <td className="tabular whitespace-nowrap px-3 py-3 text-end font-bold text-sea-900">{money(p, p.totalCents)}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {status(p)}
                  <span className="mt-1 block text-ink-700">{t(`visit.${p.visitStatus}`)}</span>
                </td>
                <td className="px-4 py-2 text-end">{refund(p, "px-4")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
