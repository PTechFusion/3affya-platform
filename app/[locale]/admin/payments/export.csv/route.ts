// Export CSV (screen 43, task 3.11): the open tab with its filters as a file for the accountant. Payments carry the receipt's
// three lines and total (rule E3: the export mirrors the receipt), then what was refunded and kept, the status and the Stripe
// ids; refunds carry the reason, who and the idempotency key; payouts carry each connected account's status and payouts.
// Amounts are bare decimals in a currency column (lib/format formatMinorUnits), instants are UTC ISO 8601, headers and labels
// are in the page's language. A UTF-8 byte order mark lets spreadsheet apps read Arabic names. Cells that start like a formula
// are prefixed with an apostrophe (CSV injection). Production: the admin session (TOTP) is checked on the server and the rows
// are read under RLS, exactly as the page reads them; this handler never writes anything.
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { formatMinorUnits, type Locale } from "@/lib/format";
import { payoutNeeds, payoutStatus } from "@/lib/payouts";
import { adminPayments, adminPayoutAccounts } from "@/lib/sample";
import {
  filterAccounts,
  filterPayments,
  filterRefunds,
  filtersFrom,
  paymentStatus,
  refundRows,
  refundedCents,
  sortAccounts,
  stateFrom,
  tabFrom,
  type SearchParams,
} from "../_parts/payments";
import { doctorName, methodLabel, patientName, refundByLabel } from "../_parts/view";

const iso = (d: Date | null | undefined) => (d ? d.toISOString().replace(/\.\d{3}Z$/, "Z") : "");

function cell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: Array<Array<string | number>>) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = (hasLocale(routing.locales, requested) ? requested : routing.defaultLocale) as Locale;
  const url = new URL(request.url);
  const sp: SearchParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0];
  }
  const tab = tabFrom(sp);
  const state = stateFrom(sp);
  const filters = filtersFrom(sp);
  const now = new Date();
  const t = await getTranslations({ locale, namespace: "adminPayments" });
  const payments = state === "empty" ? [] : adminPayments({ withPendingSample: state === "webhook-pending" });

  let rows: Array<Array<string | number>>;
  if (tab === "payments") {
    const h = (k: string) => t(`csv.payments.${k}`);
    rows = [
      ["receipt", "paidAtUtc", "patient", "email", "doctor", "visitType", "visitAtUtc", "currency", "doctorFee", "platformFee", "cardProcessing", "total", "refunded", "net", "status", "method", "paymentIntent", "transfer"].map(h),
      ...filterPayments(payments, filters, now).map((p) => {
        const back = refundedCents(p);
        return [
          p.receiptNumber,
          iso(p.paidAt),
          patientName(p, locale),
          p.patient.email,
          doctorName(p.doctor, locale),
          t(`visitType.${p.visitType}`),
          iso(p.startsAt),
          p.currency,
          formatMinorUnits(p.doctorFeeCents, p.currency),
          formatMinorUnits(p.platformFeeCents, p.currency),
          formatMinorUnits(p.cardProcessingCents, p.currency),
          formatMinorUnits(p.totalCents, p.currency),
          formatMinorUnits(back, p.currency),
          formatMinorUnits(p.totalCents - back, p.currency),
          t(`status.${paymentStatus(p)}`),
          methodLabel(p, t),
          p.stripe.paymentIntentId,
          p.stripe.transferId,
        ];
      }),
    ];
  } else if (tab === "refunds") {
    const h = (k: string) => t(`csv.refunds.${k}`);
    rows = [
      ["refund", "atUtc", "receipt", "patient", "doctor", "currency", "amount", "reason", "by", "note", "status", "key", "paymentIntent"].map(h),
      ...filterRefunds(refundRows(payments), filters, now).map((r) => [
        r.status === "succeeded" ? r.id : "",
        iso(r.at),
        r.payment.receiptNumber,
        patientName(r.payment, locale),
        doctorName(r.payment.doctor, locale),
        r.payment.currency,
        formatMinorUnits(r.amountCents, r.payment.currency),
        t(`refunds.reason.${r.reason}`),
        refundByLabel(r.by, locale, t),
        (locale === "ar" ? r.noteAr : r.noteEn) ?? "",
        t(`refunds.status.${r.status}`),
        r.idempotencyKey,
        r.payment.stripe.paymentIntentId,
      ]),
    ];
  } else {
    const h = (k: string) => t(`csv.payouts.${k}`);
    const accounts = state === "empty" ? [] : sortAccounts(adminPayoutAccounts());
    const yes = (v: boolean) => t(v ? "csv.yes" : "csv.no");
    rows = [
      ["doctor", "account", "status", "charges", "payouts", "needs", "bank", "nextAtUtc", "nextAmount", "lastAtUtc", "lastAmount", "lastStatus", "currency"].map(h),
      ...filterAccounts(accounts, filters).map((a) => {
        const last = a.recentPayouts[0];
        const currency = a.nextPayout?.currency ?? last?.currency ?? "";
        return [
          doctorName(a.doctor, locale),
          a.stripeAccountId ?? "",
          t(`payouts.status.${payoutStatus(a)}`),
          yes(a.chargesEnabled),
          yes(a.payoutsEnabled),
          payoutNeeds(a)
            .map((n) => t(`payouts.need.${n.key}`))
            .join("; "),
          a.bankLast4 ?? "",
          iso(a.nextPayout?.arrivesAt),
          a.nextPayout ? formatMinorUnits(a.nextPayout.amountCents, a.nextPayout.currency) : "",
          iso(last?.arrivesAt),
          last ? formatMinorUnits(last.amountCents, last.currency) : "",
          last ? t(`payouts.record.${last.status}`) : "",
          currency,
        ];
      }),
    ];
  }

  const day = now.toISOString().slice(0, 10);
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="3affya-${tab}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
