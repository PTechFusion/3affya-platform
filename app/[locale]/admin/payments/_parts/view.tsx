// Small view helpers of the admin money screen (43): names in the page language, the payment method line (rule E3: last 4
// digits), one instant as date and time (the zone is named once per table, rule P6), a number kept left-to-right inside
// Arabic text (rule R3) and the one link style into the Stripe dashboard.
import { ChevronNext } from "@/components/ui";
import { formatDate, formatTime, type Locale } from "@/lib/format";
import { sampleAdmin, type AdminPayment, type AdminRefundBy, type SampleDoctor } from "@/lib/sample";

type T = (key: string, values?: Record<string, string | number>) => string;

export const doctorName = (d: SampleDoctor, loc: Locale) => (loc === "ar" ? d.nameAr : d.nameEn);
export const patientName = (p: AdminPayment, loc: Locale) => (loc === "ar" ? p.patient.nameAr : p.patient.nameEn);
export const specialtyName = (d: SampleDoctor, loc: Locale) => (loc === "ar" ? d.specialtyAr : d.specialtyEn);

/** A left-to-right isolate (U+2066 ... U+2069) for receipt numbers and Stripe ids inside Arabic text (rule R3). */
export const ltr = (s: string) => `⁦${s}⁩`;

/** "Apple Pay · Visa ending 0341" or "Mastercard ending 5520". `t` is the adminPayments namespace. */
export function methodLabel(p: AdminPayment, t: T): string {
  const { wallet, brand, last4 } = p.paymentMethod;
  const card = t("card", { brand: t(`brand.${brand}`), last4 });
  return wallet ? `${t(`wallet.${wallet}`)} · ${card}` : card;
}

/** "20 Oct 2026 · 3:42 PM": the zone is named once above the table or beside the group. */
export function dateTime(at: Date, zone: string, loc: Locale): string {
  return `${formatDate(at, zone, loc)} · ${formatTime(at, zone, loc)}`;
}

/** Who started a refund, in words: the automatic cancel-time refund or the admin's name. */
export function refundByLabel(by: AdminRefundBy, loc: Locale, t: T): string {
  if (by.kind === "automatic") return t(`refunds.by.${by.cancelledBy}`);
  if (by.adminId === sampleAdmin.id) return loc === "ar" ? sampleAdmin.nameAr : sampleAdmin.nameEn;
  return by.adminId;
}

export const linkClass = "inline-flex items-center gap-1 font-semibold text-sea-700 underline-offset-2 hover:underline";

/** A link into the Stripe dashboard, in a new tab, said out loud (rule: links name where they go). */
export function StripeLink({ href, label, newTab, className }: { href: string; label: string; newTab: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? linkClass}>
      {label}
      <span className="sr-only"> {newTab}</span>
      <ChevronNext className="size-3.5" />
    </a>
  );
}
