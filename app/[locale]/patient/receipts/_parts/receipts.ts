// Shared bits of the receipts screen (23): the zone times render in, links that keep ?tz=, and a receipt's money status.
import type { BadgeTone } from "@/components/ui";
import { samplePatient, type SampleReceipt } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;

/** `?tz=` when the prototype viewer sets one (lib/viewer); otherwise the signed-in patient's own zone from her settings. */
export function tzOverride(sp: SearchParams): string | undefined {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : undefined;
}

export const patientZone = (tz: string | undefined) => tz ?? samplePatient.timeZone;

/** Keeps `?tz=` on links between the list and a receipt, so the reviewer's zone survives navigation. */
export function receiptsHref(id: string | undefined, tz: string | undefined): string {
  const path = id ? `/patient/receipts/${id}` : "/patient/receipts";
  return tz ? `${path}?tz=${encodeURIComponent(tz)}` : path;
}

export type ReceiptStatus = "paid" | "refunded" | "partlyRefunded" | "refundPending";

export function refundedCents(r: SampleReceipt): number {
  return r.refunds.reduce((sum, x) => sum + x.amountCents, 0);
}

/** Paid until money goes back; a refund Stripe has not finished reads as on its way. */
export function receiptStatus(r: SampleReceipt): ReceiptStatus {
  if (r.refunds.some((x) => x.status === "pending")) return "refundPending";
  const back = refundedCents(r);
  if (back >= r.totalCents) return "refunded";
  return back > 0 ? "partlyRefunded" : "paid";
}

export const statusTone: Record<ReceiptStatus, BadgeTone> = {
  paid: "success",
  refunded: "info",
  partlyRefunded: "info",
  refundPending: "warning",
};

export const visitTone: Record<SampleReceipt["visitStatus"], BadgeTone> = { upcoming: "info", done: "success", cancelled: "pending" };

/** "Apple Pay · Visa ending 0341" or "Mastercard ending 5520" (rule E3: the last 4 digits). */
export function paymentMethodLabel(r: SampleReceipt, t: (key: string, values?: Record<string, string>) => string): string {
  const { wallet, brand, last4 } = r.paymentMethod;
  const card = t("detail.card", { brand: t(`brand.${brand}`), last4 });
  return wallet ? `${t(`wallet.${wallet}`)} · ${card}` : card;
}
