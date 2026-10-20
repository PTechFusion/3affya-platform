// Filters of the open tab (rules S3, S9, S10, S12; A5). One level down behind a Filters row, since most visits want the whole
// list: a plain GET form, so it works without JavaScript and the filters live in the URL (Back and sharing keep them). Several
// values of one type are checkboxes (OR), types combine (AND), each value shows how many rows it has. Applied filters show as
// removable chips under the row, with Clear filters.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button, CheckCard, Chip, CloseIcon, Disclosure, Field, Select, Surface } from "@/components/ui";
import { adminMoney } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import type { PayoutStatus } from "@/lib/payouts";
import type { SampleDoctor } from "@/lib/sample";
import { BASE, filterCount, paymentsHref, stateFrom, tzOverride, type Filters, type FilterReason, type PaymentStatus, type SearchParams, type Tab } from "./payments";
import { doctorName } from "./view";

export type FilterCounts = {
  status: Partial<Record<PaymentStatus, number>>;
  reason: Partial<Record<FilterReason, number>>;
  account: Partial<Record<PayoutStatus, number>>;
};

type Group = { name: "status" | "reason" | "account"; legend: string; options: Array<{ value: string; label: string; count: number }> };

export async function FilterPanel({
  tab,
  sp,
  locale,
  filters,
  counts,
  doctors,
}: {
  tab: Tab;
  sp: SearchParams;
  locale: Locale;
  filters: Filters;
  counts: FilterCounts;
  doctors: SampleDoctor[];
}) {
  const t = await getTranslations("adminPayments");
  const on = filterCount(tab, filters);
  const n = (v: number) => formatNumber(v, locale);
  const state = stateFrom(sp);
  const tz = tzOverride(sp);

  const group: Group =
    tab === "payments"
      ? {
          name: "status",
          legend: t("filters.status"),
          options: (Object.keys(counts.status) as PaymentStatus[]).map((s) => ({ value: s, label: t(`status.${s}`), count: counts.status[s] ?? 0 })),
        }
      : tab === "refunds"
        ? {
            name: "reason",
            legend: t("filters.reason"),
            options: (Object.keys(counts.reason) as FilterReason[]).map((r) => ({ value: r, label: t(`refunds.reason.${r}`), count: counts.reason[r] ?? 0 })),
          }
        : {
            name: "account",
            legend: t("filters.account"),
            options: (Object.keys(counts.account) as PayoutStatus[]).map((a) => ({ value: a, label: t(`payouts.status.${a}`), count: counts.account[a] ?? 0 })),
          };
  const chosen: string[] = filters[group.name];

  // Applied filters as chips; each one's link is the same view without it.
  const chips: Array<{ label: string; href: string }> = [
    ...chosen.map((v) => ({
      label: group.options.find((o) => o.value === v)?.label ?? v,
      href: paymentsHref(sp, { filters: { [group.name]: chosen.filter((x) => x !== v) } as Partial<Filters> }),
    })),
  ];
  if (tab !== "payouts" && filters.doctor) {
    const d = doctors.find((x) => x.id === filters.doctor);
    chips.push({ label: d ? doctorName(d, locale) : filters.doctor, href: paymentsHref(sp, { filters: { doctor: undefined } }) });
  }
  if (tab !== "payouts" && filters.period) {
    chips.push({ label: t("filters.lastDays", { days: n(filters.period) }), href: paymentsHref(sp, { filters: { period: undefined } }) });
  }

  return (
    <div className="flex flex-col gap-3">
      <Surface className="px-4 py-1 sm:px-5">
        <Disclosure
          summary={
            <span>
              {t("filters.title")}
              {on ? <span className="ms-2 text-sm font-medium text-ink-700">{t("filters.on", { count: on, countLabel: n(on) })}</span> : null}
            </span>
          }
        >
          <form method="get" action={`/${locale}${BASE}`} className="flex flex-col gap-5 pb-2 pt-1">
            {tab !== "payments" ? <input type="hidden" name="tab" value={tab} /> : null}
            {state === "empty" || state === "error" || state === "webhook-pending" ? <input type="hidden" name="state" value={state} /> : null}
            {tz ? <input type="hidden" name="tz" value={tz} /> : null}
            <fieldset className="min-w-0">
              <legend className="mb-2 font-semibold text-ink-900">{group.legend}</legend>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {group.options.map((o) => (
                  <CheckCard
                    key={o.value}
                    name={group.name}
                    value={o.value}
                    defaultChecked={chosen.includes(o.value)}
                    title={`${o.label} (${n(o.count)})`}
                  />
                ))}
              </div>
            </fieldset>
            {tab !== "payouts" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="filter-doctor" label={t("filters.doctor")}>
                  <Select id="filter-doctor" name="doctor" defaultValue={filters.doctor ?? ""}>
                    <option value="">{t("filters.anyDoctor")}</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {doctorName(d, locale)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="filter-period" label={t("filters.period")}>
                  <Select id="filter-period" name="period" defaultValue={filters.period ? String(filters.period) : ""}>
                    <option value="">{t("filters.anyTime")}</option>
                    {adminMoney.periodDaysOptions.map((days) => (
                      <option key={days} value={String(days)}>
                        {t("filters.lastDays", { days: n(days) })}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
            {/* Clear filters sits beside the applied chips under this row, once. */}
            <Button type="submit" className="self-start">
              {t("filters.apply")}
            </Button>
          </form>
        </Disclosure>
      </Surface>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <ul aria-label={t("filters.chipsLabel")} className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.label}>
                <Link href={c.href} aria-label={t("filters.remove", { label: c.label })} className="rounded-[var(--radius-tag)]">
                  <Chip tone="lagoon">
                    {c.label}
                    <CloseIcon className="ms-2 size-3.5" />
                  </Chip>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={paymentsHref(sp, { filters: null })} className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-sea-700 hover:underline">
            {t("filters.clear")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
