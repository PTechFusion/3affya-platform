// What the refund drawer needs for each payment that can still be refunded, formatted on the server (lib/format) so the client
// component only holds the choice. The amounts come from the refund rule (lib/refunds.ts via ruleRefund) and the split from
// refundSplit, so the drawer, the action and the detail page say the same numbers.
import { getTranslations } from "next-intl/server";
import { business } from "@/config/business";
import { formatMoney, type Locale } from "@/lib/format";
import { durationLabel } from "@/lib/legal";
import { adminRefundKey, samplePatient, type AdminPayment } from "@/lib/sample";
import type { RefundDrawerPayment, RefundOption } from "./RefundDrawer";
import { canRefund, paymentsHref, refundAmount, refundSplit, ruleRefund, type RefundKind, type RuleBasis, type SearchParams } from "./payments";
import { doctorName, ltr, methodLabel, patientName } from "./view";

type T = (key: string, values?: Record<string, string | number>) => string;

/** The rule's outcome for one payment in one sentence (adminPayments.rule.*). */
export function ruleSentence(p: AdminPayment, basis: RuleBasis, loc: Locale, cutoff: string, t: T): string {
  // Prototype: every payment is Noura's; production reads the patient's gender for the Arabic verb from the profile.
  return t(`rule.${basis}`, { patient: patientName(p, loc), cutoff, gender: samplePatient.gender });
}

export async function drawerPayments(payments: AdminPayment[], loc: Locale, sp: SearchParams, now: Date): Promise<RefundDrawerPayment[]> {
  const t = await getTranslations("adminPayments");
  const cutoff = await durationLabel(loc, "hours", business.fullRefundCutoffHours);
  return payments.filter(canRefund).map((p) => {
    const money = (cents: number) => formatMoney(cents, p.currency, loc);
    const rule = ruleRefund(p, now);
    const ruleAmount = refundAmount(p, "rule", now);
    const fullAmount = refundAmount(p, "full", now);
    const method = methodLabel(p, t);
    const option = (kind: RefundKind, amountCents: number, detail: string): RefundOption => {
      const split = refundSplit(p, amountCents);
      return {
        kind,
        amount: money(amountCents),
        detail,
        doctorShare: money(split.doctorCents),
        platformShare: money(split.platformCents),
        needsNote: amountCents > ruleAmount,
      };
    };
    const options: RefundOption[] = [];
    if (ruleAmount > 0) options.push(option("rule", ruleAmount, ruleSentence(p, rule.basis, loc, cutoff, t)));
    if (fullAmount > 0) options.push(option("full", fullAmount, t("drawer.inFullDetail")));
    return {
      id: p.id,
      number: ltr(p.receiptNumber),
      summary: t("drawer.summary", {
        gender: samplePatient.gender,
        patient: patientName(p, loc),
        total: money(p.totalCents),
        method,
        doctor: doctorName(p.doctor, loc),
      }),
      method,
      doctorName: doctorName(p.doctor, loc),
      ruleNothing: ruleAmount > 0 ? null : ruleSentence(p, rule.basis, loc, cutoff, t),
      options,
      cancelsVisit: !p.cancellation && p.visitStatus === "upcoming" && p.startsAt.getTime() > now.getTime(),
      idempotencyKey: adminRefundKey(p.id),
      doneHref: {
        rule: paymentsHref(sp, { tab: "payments", filters: null, payment: p.id, state: "refund-requested", kind: "rule" }),
        full: paymentsHref(sp, { tab: "payments", filters: null, payment: p.id, state: "refund-requested", kind: "full" }),
      },
    };
  });
}
