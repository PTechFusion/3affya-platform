// The tier table on the membership page (rule B8): the same three plans, features and copy as the public plan table on
// /for-professionals (plans.ts and the forProfessionals namespace), with the professional's own plan marked instead of a
// recommendation. Static and informational: the actions sit above it. Phone: plans stacked, each listing only what it adds.
// Desktop: one comparison table, plans as columns. Featured is not on sale until the carousel ships (task 3.5).
import { useLocale, useTranslations } from "next-intl";
import { Badge, CheckIcon, SectionHeading, Surface } from "@/components/ui";
import { formatMoney, formatPercent, type Locale } from "@/lib/format";
import { business } from "@/config/business";
import { PLANS, PLAN_FEATURES, planIncludes, type PlanId } from "@/app/[locale]/for-professionals/plans";

export function PlanTable({ current }: { current: PlanId }) {
  const t = useTranslations("membership");
  const tp = useTranslations("forProfessionals");
  const loc = useLocale() as Locale;
  const money = (cents: number) => formatMoney(cents, business.membershipCurrency, loc);

  const monthly = business.membershipMonthlyCents;
  const yearly = business.membershipYearlyCents;
  const banner = business.bannerMonthlyCents;
  const yearlySaving = monthly * 12 - yearly;
  const name = (id: PlanId) => tp(`plans.${id}.name`);
  const plans: Record<PlanId, { price: string; period: string; extra?: string }> = {
    claimed: { price: tp("plans.claimed.price"), period: tp("plans.claimed.period") },
    member: {
      price: money(monthly),
      period: tp("plans.perMonth"),
      extra:
        yearlySaving > 0
          ? tp("plans.member.yearly", { price: money(yearly), saving: money(yearlySaving) })
          : tp("plans.member.yearlyPlain", { price: money(yearly) }),
    },
    featured: {
      price: money(monthly + banner),
      period: tp("plans.perMonth"),
      extra: tp("plans.featured.breakdown", { member: money(monthly), banner: money(banner) }),
    },
  };
  const badge = (id: PlanId) =>
    id === current ? <Badge tone="info">{t("plans.yours")}</Badge> : id === "featured" ? <Badge tone="pending">{tp("plans.fromJanuary")}</Badge> : null;

  return (
    <section aria-label={t("plans.title")} className="mt-10">
      <SectionHeading title={t("plans.title")} lead={t("plans.lead")} />

      <ol className="grid gap-4 md:hidden">
        {PLANS.map((id, i) => {
          const plan = plans[id];
          const previous = PLANS[i - 1];
          return (
            <li key={id} className={id === current ? "rounded-[var(--radius-card)] ring-2 ring-sea-700" : undefined}>
              <Surface className="h-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-sea-900">{name(id)}</h3>
                  {badge(id)}
                </div>
                <p className="text-sm text-ink-700">{tp(`plans.${id}.tagline`)}</p>
                <p className="mt-3">
                  <span className="tabular text-2xl font-bold text-ink-900">{plan.price}</span>{" "}
                  <span className="text-sm text-ink-700">{plan.period}</span>
                </p>
                {plan.extra ? <p className="mt-1 text-sm text-ink-700">{plan.extra}</p> : null}
                {previous ? <p className="mt-4 text-sm font-semibold text-ink-900">{tp("plans.everythingIn", { plan: name(previous) })}</p> : null}
                <ul className={previous ? "mt-2 space-y-2" : "mt-4 space-y-2"}>
                  {PLAN_FEATURES.filter((f) => f.from === id).map((f) => (
                    <li key={f.key} className="flex items-start gap-2.5 text-ink-900">
                      <IncludedMark />
                      <span>{tp(`features.${f.key}`)}</span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </li>
          );
        })}
      </ol>

      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white md:block">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{tp("plans.caption")}</caption>
          <colgroup>
            <col className="w-[34%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <td className="px-5 pb-3 pt-6 align-bottom text-sm font-semibold text-ink-500">{tp("plans.featureColumn")}</td>
              {PLANS.map((id) => (
                <th key={id} scope="col" className={["px-5 pb-3 pt-6 text-start align-top font-normal", id === current ? "bg-sea-100" : ""].join(" ")}>
                  <span className="flex min-h-7 flex-wrap items-center gap-2">
                    <span className="text-xl font-bold text-sea-900">{name(id)}</span>
                    {badge(id)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-700">{tp(`plans.${id}.tagline`)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="px-5 pb-5 pt-3 text-start align-top font-medium text-ink-900">
                {tp("plans.priceRow")}
              </th>
              {PLANS.map((id) => (
                <td key={id} className={["px-5 pb-5 pt-3 align-top text-ink-900", id === current ? "bg-sea-100" : ""].join(" ")}>
                  <p className="tabular text-2xl font-bold">{plans[id].price}</p>
                  <p className="text-sm text-ink-700">{plans[id].period}</p>
                  {plans[id].extra ? <p className="mt-1 text-sm text-ink-700">{plans[id].extra}</p> : null}
                </td>
              ))}
            </tr>
            {PLAN_FEATURES.map((f) => (
              <tr key={f.key} className="border-t border-sand-200">
                <th scope="row" className="px-5 py-3.5 text-start font-medium text-ink-900">
                  {tp(`features.${f.key}`)}
                </th>
                {PLANS.map((id) => (
                  <td key={id} className={["px-5 py-3.5 text-center", id === current ? "bg-sea-100" : ""].join(" ")}>
                    {planIncludes(id, f) ? (
                      <IncludedMark label={tp("plans.included")} />
                    ) : (
                      <span className="text-ink-500">
                        <span aria-hidden="true">–</span>
                        <span className="sr-only">{tp("plans.notIncluded")}</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1 text-sm text-ink-700">
        <p>{tp("plans.feeNote", { pct: formatPercent(business.firstVisitPlatformFeePct, loc) })}</p>
        <p>{tp("plans.priceNote")}</p>
        {business.membershipPricesConfirmed ? null : <p className="text-ink-500">{tp("plans.placeholderNote")}</p>}
      </div>
    </section>
  );
}

/** Lagoon check in a circle; the check never mirrors (rule R2). With a label it also reads as Included to screen readers. */
function IncludedMark({ label }: { label?: string }) {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
      <CheckIcon className="size-3.5" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
