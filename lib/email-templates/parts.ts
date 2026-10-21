// Pieces several templates share: how a template is declared, instants in a named zone, durations, the payment method line and
// the three receipt lines. Every number, money amount, date and time goes through lib/format (Western digits in both locales,
// the zone named; rules N1, P6). Nothing here reads the clock: a template is a pure function of (locale, data), so a retried
// send with the same idempotency key carries the same bytes (Resend refuses a reused key with a different payload).
import { formatDate, formatMoney, formatNumber, formatPercent, formatSlotDay, formatTimeInZone, type Locale } from "@/lib/format";
import { renderEmail, type EmailContent, type MoneyLine, type RenderedEmail, type RenderOptions } from "./layout";
import { translator } from "./messages";

/** A file sent with the email, e.g. the booking's .ics. Content is text (UTF-8). */
export type EmailAttachment = { filename: string; content: string; contentType: string };

export type EmailTemplate<D> = {
  subject(locale: Locale, data: D): string;
  preheader(locale: Locale, data: D): string;
  render(locale: Locale, data: D, options?: RenderOptions): RenderedEmail;
  attachments(locale: Locale, data: D): EmailAttachment[];
};

/** Declares a template from the function that lays out its content. */
export function defineTemplate<D>(
  content: (locale: Locale, data: D) => EmailContent,
  attachments: (locale: Locale, data: D) => EmailAttachment[] = () => [],
): EmailTemplate<D> {
  return {
    subject: (locale, data) => content(locale, data).subject,
    preheader: (locale, data) => content(locale, data).preheader,
    render: (locale, data, options) => renderEmail(content(locale, data), options),
    attachments,
  };
}

const comma = (locale: Locale) => (locale === "ar" ? "، " : ", ");

/** "Wed, Nov 11, 8:00 PM Riyadh (GMT+3)": a visit time, with its weekday, in one named zone. */
export const dayAndTime = (instant: Date, zone: string, locale: Locale) =>
  `${formatSlotDay(instant, zone, locale)}${comma(locale)}${formatTimeInZone(instant, zone, locale)}`;

/** "Nov 8, 2026, 6:30 PM Chicago (GMT−6)": when something happened, with the year. */
export const dateAndTime = (instant: Date, zone: string, locale: Locale) =>
  `${formatDate(instant, zone, locale)}${comma(locale)}${formatTimeInZone(instant, zone, locale)}`;

/** "10 minutes", "24 hours", pluralised per locale with Western digits (legal.units, as the legal pages say it). */
export function duration(locale: Locale, unit: "minutes" | "hours" | "days", count: number): string {
  return translator(locale, "legal.units")(unit, { count, n: formatNumber(count, locale) });
}

export type PaymentMethod = { wallet: "applePay" | "googlePay" | null; brand: "visa" | "mastercard"; last4: string };

/** "Apple Pay · Visa ending 0341", as the receipt page writes it (rule E3: the last 4 digits). */
export function paymentMethodLabel(locale: Locale, method: PaymentMethod): string {
  const t = translator(locale, "receipts");
  const card = t("detail.card", { brand: t(`brand.${method.brand}`), last4: method.last4 });
  return method.wallet ? `${t(`wallet.${method.wallet}`)} · ${card}` : card;
}

/** The three lines as charged, never recomputed from today's rates (rule P1). Minor units of `currency`. */
export type ChargedLines = {
  currency: string;
  doctorFeeCents: number;
  platformFeeCents: number;
  cardProcessingCents: number;
  totalCents: number;
};

/**
 * The receipt's three lines with the receipt page's own labels (receipts.detail.lines), so the email mirrors what the patient
 * reviewed and paid (rule E3). The platform share is read from the lines themselves, as the receipt page does.
 */
export function receiptLines(locale: Locale, lines: ChargedLines): MoneyLine[] {
  const t = translator(locale, "receipts.detail.lines");
  const money = (cents: number) => formatMoney(cents, lines.currency, locale);
  const pct = lines.doctorFeeCents > 0 ? Math.round((lines.platformFeeCents * 1000) / lines.doctorFeeCents) / 10 : 0;
  return [
    { label: t("doctorFee"), detail: t("doctorFeeDetail"), amount: money(lines.doctorFeeCents) },
    { label: t("platformFee"), detail: t("platformFeeDetail", { pct: formatPercent(pct, locale) }), amount: money(lines.platformFeeCents) },
    { label: t("cardProcessing"), detail: t("cardProcessingDetail"), amount: money(lines.cardProcessingCents) },
  ];
}

/** A name in the reader's script. */
export const nameIn = (locale: Locale, names: { nameEn: string; nameAr: string }) => (locale === "ar" ? names.nameAr : names.nameEn);
