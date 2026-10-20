// One payment (?payment=<booking id>), laid out like the patient's receipt (screen 23) so the two agree line for line (rule
// E3): the total first, when and how it was paid with the last 4 digits, the three lines, then where the money went (the
// destination charge's transfer to the doctor and 3affya's application fee), the refunds with who and when, and the two
// refund actions (by the rule, in full) that open the drawer. Beside it on desktop, under it on phone: the visit in both
// zones and the Stripe ids with links to the dashboard.
import { getTranslations } from "next-intl/server";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { Badge, Breadcrumbs, Surface, nowrap } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatMoney, formatPercent, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { durationLabel } from "@/lib/legal";
import { adminRefundKey, type AdminPayment } from "@/lib/sample";
import { stripeDashboardUrl } from "@/lib/stripe-dashboard";
import { ruleSentence } from "./drawer-data";
import { RefundButton } from "./RefundDrawer";
import {
  canRefund,
  fullRefundDeadlineFor,
  paymentStatus,
  paymentTone,
  paymentsHref,
  refundAmount,
  refundTone,
  refundedCents,
  ruleRefund,
  visitTone,
  type SearchParams,
} from "./payments";
import { StripeLink, dateTime, doctorName, ltr, methodLabel, patientName, refundByLabel, specialtyName } from "./view";

const HOUR_MS = 3_600_000;

/** One instant as three short lines: the date, the clock time, the zone named (rule P6; the zone as its own LTR run, rule R3). */
function Moment({ instant, timeZone, locale }: { instant: Date; timeZone: string; locale: Locale }) {
  return (
    <>
      <span className="block text-ink-900">{formatDate(instant, timeZone, locale)}</span>
      <span className="tabular block text-lg font-bold text-sea-900">{formatTime(instant, timeZone, locale)}</span>
      <span className="ltr-run text-xs font-medium text-ink-500">{formatZone(instant, timeZone)}</span>
    </>
  );
}

export async function PaymentDetail({
  payment: p,
  locale,
  zone,
  sp,
  now,
  notice,
}: {
  payment: AdminPayment;
  locale: Locale;
  zone: string;
  sp: SearchParams;
  now: Date;
  /** The refund-requested or webhook-pending notice, rendered by the page. */
  notice?: React.ReactNode;
}) {
  const t = await getTranslations("adminPayments");
  const tp = await getTranslations("portal");
  const money = (cents: number) => formatMoney(cents, p.currency, locale);
  const status = paymentStatus(p);
  const method = methodLabel(p, t);
  const name = doctorName(p.doctor, locale);
  const cutoff = await durationLabel(locale, "hours", business.fullRefundCutoffHours);
  // The platform line's share as charged, read from the payment itself (as the receipt does), never from today's rate.
  const platformPct = p.doctorFeeCents > 0 ? Math.round((p.platformFeeCents * 1000) / p.doctorFeeCents) / 10 : 0;
  const rule = ruleRefund(p, now);
  const ruleAmount = refundAmount(p, "rule", now);
  const refundable = canRefund(p);
  const back = refundedCents(p);
  const upcoming = !p.cancellation && p.visitStatus === "upcoming" && p.startsAt.getTime() > now.getTime();
  const deadline = fullRefundDeadlineFor(p);

  let cancelledLine: string | null = null;
  if (p.cancellation) {
    const before = Math.max(0, p.startsAt.getTime() - p.cancellation.at.getTime());
    const hours = Math.floor(before / HOUR_MS);
    const span = hours < 48 ? await durationLabel(locale, "hours", hours) : await durationLabel(locale, "days", Math.floor(hours / 24));
    cancelledLine = t("detail.visit.cancelled", { by: p.cancellation.by, date: formatDate(p.cancellation.at, zone, locale), hours: span });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        label={t("detail.breadcrumb")}
        items={[
          { label: tp("admin.title"), href: "/admin" },
          { label: tp("admin.nav.payments"), href: paymentsHref(sp) },
          { label: t("detail.crumb", { number: ltr(p.receiptNumber) }) },
        ]}
      />
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("detail.title", { number: ltr(p.receiptNumber) })}</h1>
          <Badge tone={paymentTone[status]}>{t(`status.${status}`)}</Badge>
        </div>
        <p className="mt-1.5 text-ink-700">
          {name} · {specialtyName(p.doctor, locale)} · {t(`visitType.${p.visitType}`)}
        </p>
      </header>

      {notice}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="payment-total">
            <h2 id="payment-total" className="text-sm font-semibold text-ink-700">
              {t("detail.totalPaid")}
            </h2>
            <p className="tabular text-4xl font-bold leading-tight text-sea-900">{money(p.totalCents)}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-500">{t("detail.paidOn")}</dt>
              <dd className="text-ink-900">
                <span className="whitespace-nowrap">{formatDate(p.paidAt, zone, locale)}</span> ·{" "}
                <span className="whitespace-nowrap">{formatTime(p.paidAt, zone, locale)}</span> <span className="ltr-run">{formatZone(p.paidAt, zone)}</span>
              </dd>
              <dt className="text-ink-500">{t("detail.method")}</dt>
              <dd className="text-ink-900">{method}</dd>
              <dt className="text-ink-500">{t("detail.receipt")}</dt>
              <dd className="text-ink-900">
                <span className="ltr-run tabular">{p.receiptNumber}</span>
              </dd>
              <dt className="text-ink-500">{t("detail.patient")}</dt>
              <dd className="min-w-0 text-ink-900">
                {patientName(p, locale)} · <span className="ltr-run break-all">{p.patient.email}</span>
              </dd>
            </dl>
          </section>

          <FeeBreakdown
            caption={t("detail.lines.caption")}
            lines={[
              { label: t("detail.lines.doctorFee"), detail: t("detail.lines.doctorFeeDetail"), amount: money(p.doctorFeeCents) },
              {
                label: t("detail.lines.platformFee"),
                detail: t("detail.lines.platformFeeDetail", { pct: formatPercent(platformPct, locale) }),
                amount: money(p.platformFeeCents),
              },
              { label: t("detail.lines.cardProcessing"), detail: t("detail.lines.cardProcessingDetail"), amount: money(p.cardProcessingCents) },
            ]}
            total={{ label: t("detail.lines.total"), amount: money(p.totalCents) }}
          />

          <section aria-labelledby="payment-refunds" className="flex flex-col gap-3">
            <h2 id="payment-refunds" className="text-lg font-bold text-sea-900">
              {t("detail.refunds.title")}
            </h2>
            {p.refunds.length ? (
              <ul className="divide-y divide-sand-200 rounded-[var(--radius-card)] border border-sand-200 bg-white">
                {p.refunds.map((r) => {
                  const note = locale === "ar" ? r.noteAr : r.noteEn;
                  return (
                    <li key={r.id} className="flex flex-col gap-1.5 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="tabular text-lg font-bold text-sea-900">{money(r.amountCents)}</span>
                        <Badge tone={refundTone[r.status]}>{t(`refunds.status.${r.status}`)}</Badge>
                      </div>
                      <p className="font-semibold text-ink-900">{t(`refunds.reason.${r.reason}`)}</p>
                      <p className="text-sm text-ink-700">
                        {refundByLabel(r.by, locale, t)} · <span className="tabular">{dateTime(r.at, zone, locale)}</span>{" "}
                        <span className="ltr-run">{formatZone(r.at, zone)}</span>
                      </p>
                      {note ? <p className="text-sm text-ink-700">{t("refunds.note", { note })}</p> : null}
                    </li>
                  );
                })}
                {back > 0 ? (
                  <li className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 font-bold text-sea-900">
                    <span>{t("detail.refunds.net")}</span>
                    <span className="tabular">{money(p.totalCents - back)}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-ink-700">{t("detail.refunds.none")}</p>
            )}

            {refundable ? (
              <div className="flex flex-col gap-3">
                {ruleAmount === 0 ? <p className="text-sm text-ink-700">{ruleSentence(p, rule.basis, locale, cutoff, t)}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {ruleAmount > 0 ? (
                    <RefundButton paymentId={p.id} kind="rule" variant="primary" label={`${t("detail.refunds.byRule")} · ${money(ruleAmount)}`} />
                  ) : null}
                  <RefundButton paymentId={p.id} kind="full" label={`${t("detail.refunds.inFull")} · ${money(refundAmount(p, "full", now))}`} />
                </div>
              </div>
            ) : status === "refundPending" ? (
              <p className="text-sm text-ink-700">{t("detail.refunds.inProgress")}</p>
            ) : null}
          </section>

          <section aria-labelledby="payment-flow" className="flex flex-col gap-2">
            <h2 id="payment-flow" className="text-lg font-bold text-sea-900">
              {t("detail.flow.title")}
            </h2>
            <FeeBreakdown
              lines={[
                {
                  label: t("detail.flow.doctor", { name }),
                  detail: t("detail.flow.doctorDetail", { id: ltr(p.stripe.transferId) }),
                  amount: money(p.doctorFeeCents),
                },
                {
                  label: t("detail.flow.platform"),
                  detail: t("detail.flow.platformDetail"),
                  amount: money(p.platformFeeCents + p.cardProcessingCents),
                },
              ]}
              total={{ label: t("detail.flow.total"), amount: money(p.totalCents) }}
            />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="payment-visit">
            <Surface className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="payment-visit" className="text-lg font-bold text-sea-900">
                  {t("detail.visit.title")}
                </h2>
                <Badge tone={visitTone[p.visitStatus]}>{t(`visit.${p.visitStatus}`)}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <div className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                  <dt className="text-sm font-semibold text-ink-700">{t("detail.visit.patientTime")}</dt>
                  <dd className="mt-1">
                    <Moment instant={p.startsAt} timeZone={zone} locale={locale} />
                  </dd>
                </div>
                <div className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                  <dt className="text-sm font-semibold text-ink-700">{t("detail.visit.doctorTime")}</dt>
                  <dd className="mt-1">
                    <Moment instant={p.startsAt} timeZone={p.doctorTimeZone} locale={locale} />
                  </dd>
                </div>
              </dl>
              {cancelledLine ? <p className="text-sm text-ink-700">{cancelledLine}</p> : null}
              {upcoming ? (
                <p className="text-sm text-ink-700">
                  {t.rich("detail.visit.deadline", { day: formatDate(deadline, zone, locale), time: formatTimeInZone(deadline, zone, locale), nowrap })}
                </p>
              ) : null}
            </Surface>
          </section>

          <section aria-labelledby="payment-stripe">
            <Surface className="flex flex-col gap-3">
              <h2 id="payment-stripe" className="text-lg font-bold text-sea-900">
                {t("detail.stripe.title")}
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-ink-500">{t("detail.stripe.payment")}</dt>
                  <dd className="flex flex-col items-start gap-0.5">
                    <span className="ltr-run break-all text-ink-900">{p.stripe.paymentIntentId}</span>
                    <StripeLink href={stripeDashboardUrl({ kind: "payment", id: p.stripe.paymentIntentId })} label={t("openStripe")} newTab={t("newTab")} />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">{t("detail.stripe.transfer")}</dt>
                  <dd>
                    <span className="ltr-run break-all text-ink-900">{p.stripe.transferId}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">{t("detail.stripe.account")}</dt>
                  <dd className="flex flex-col items-start gap-0.5">
                    {p.stripe.accountId ? (
                      <>
                        <span className="ltr-run break-all text-ink-900">{p.stripe.accountId}</span>
                        <StripeLink href={stripeDashboardUrl({ kind: "account", id: p.stripe.accountId })} label={t("openStripe")} newTab={t("newTab")} />
                      </>
                    ) : (
                      <span className="text-ink-700">{t("detail.stripe.noAccount")}</span>
                    )}
                  </dd>
                </div>
                {/* Only refunds the webhook stored carry a Stripe refund id; a request still waiting is known by its key. */}
                {p.refunds.filter((r) => r.status === "succeeded").map((r) => (
                  <div key={r.id}>
                    <dt className="text-ink-500">{t("detail.stripe.refund")}</dt>
                    <dd>
                      <span className="ltr-run break-all text-ink-900">{r.id}</span>
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-ink-500">{t("detail.stripe.key")}</dt>
                  <dd>
                    <span className="ltr-run break-all text-ink-900">{adminRefundKey(p.id)}</span>
                  </dd>
                </div>
              </dl>
            </Surface>
          </section>
        </div>
      </div>
    </div>
  );
}
