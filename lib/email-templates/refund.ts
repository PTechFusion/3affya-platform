// Refund (task 3.4): sent when the charge.refunded webhook stores a refund. Mirrors the receipt (rule E3): the refunded total
// first and largest, where it goes (the last 4 digits), the receipt number, the three lines as charged, then the cancelled visit
// in both zones and why the money comes back, in the receipt page's words (lib/refunds decides the amount; a patient cancelling
// late gets no refund and so no email). One button: the receipt.
import { business } from "@/config/business";
import { formatDate, formatMoney } from "@/lib/format";
import type { RefundReason } from "@/lib/refunds";
import { dateAndTime, dayAndTime, defineTemplate, duration, nameIn, paymentMethodLabel, receiptLines, type ChargedLines, type PaymentMethod } from "./parts";
import { translator } from "./messages";
import { ltr, plain, rich, urlLink } from "./rich";
import { emailColors } from "./theme";

export type RefundData = {
  doctor: { nameEn: string; nameAr: string; gender: "f" | "m" };
  visitType: "video" | "phone";
  startsAt: Date;
  patientTimeZone: string;
  doctorTimeZone: string;
  /** Why the money comes back (lib/refunds refundFor); patientLate refunds nothing and sends no email. */
  reason: Exclude<RefundReason, "patientLate">;
  cancelledAt: Date;
  refund: { amountCents: number; at: Date; status: "pending" | "succeeded" };
  receipt: ChargedLines & { number: string; method: PaymentMethod };
  receiptUrl: string;
  /** The cancellation and refund rules page. */
  rulesUrl: string;
};

export const refundEmail = defineTemplate<RefundData>((locale, d) => {
  const t = translator(locale, "email.refund");
  const tr = translator(locale, "receipts");
  const tb = translator(locale, "booking");
  const tc = translator(locale, "email.common");
  const name = nameIn(locale, d.doctor);
  const status = d.refund.status;
  const amount = formatMoney(d.refund.amountCents, d.receipt.currency, locale);
  const method = paymentMethodLabel(locale, d.receipt.method);
  const reason = tr(`detail.refund.reason.${d.reason}`, { cutoff: duration(locale, "hours", business.fullRefundCutoffHours) });
  // Every refund the rules allow is the whole total, so the three lines as charged add up to it. Anything else (a refund an
  // admin set by hand) shows the amount alone rather than lines that would not sum.
  const whole = d.refund.amountCents === d.receipt.totalCents;
  return {
    locale,
    subject: t("subject", { status, amount, name }),
    preheader: `${reason} ${t("preheader", { method })}`,
    headline: t("headline", { status, amount }),
    blocks: [
      { kind: "p", text: plain(reason) },
      {
        kind: "money",
        title: t("moneyTitle", { status }),
        total: { label: t("linesTotal"), amount },
        rows: [
          { label: t("to"), value: plain(method) },
          { label: t("date", { status }), value: plain(formatDate(d.refund.at, d.patientTimeZone, locale)) },
          { label: tr("detail.number"), value: ltr(d.receipt.number) },
        ],
        caption: whole ? t("linesCaption") : undefined,
        lines: whole ? receiptLines(locale, d.receipt) : [],
      },
      {
        kind: "facts",
        title: t("visitTitle"),
        rows: [
          { label: tb("card.yourTime"), value: plain(dayAndTime(d.startsAt, d.patientTimeZone, locale)) },
          { label: tb("card.doctorTime", { gender: d.doctor.gender }), value: plain(dayAndTime(d.startsAt, d.doctorTimeZone, locale)) },
          { label: tc("visit"), value: plain(`${tr(`visitType.${d.visitType}`)} · ${name}`) },
          { label: t("cancelledOn"), value: plain(dateAndTime(d.cancelledAt, d.patientTimeZone, locale)) },
        ],
      },
      { kind: "p", text: plain(tr("detail.refund.bank")) },
      { kind: "button", label: t("button"), href: d.receiptUrl },
      { kind: "p", text: rich(t, "rules", {}, { url: urlLink(d.rulesUrl, emailColors["sea-700"]) }), muted: true },
    ],
    footer: [plain(t("footer"))],
  };
});

export const { subject, preheader, render } = refundEmail;
