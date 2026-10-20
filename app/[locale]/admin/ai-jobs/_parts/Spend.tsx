// Screen 45 spend: the tile row (today, the last 7 and 30 days against the price charged, and the daily alert) and the chart
// of AI cost per day. Server components. Chart numerals stay Western and LTR, and the time axis is mirrored by hand (rule R11):
// the days are laid out in reading order with logical flex, so in Arabic the oldest day sits on the right and today on the left,
// with the value axis on the start side; no chart library decides it.
import { useTranslations } from "next-intl";
import { Badge, Surface } from "@/components/ui";
import { aiLimits, business } from "@/config/business";
import { formatDate, formatMoney, formatSlotDay, formatTime, type Locale } from "@/lib/format";
import { microsToCents, type SpendWindow } from "@/lib/ai-jobs";
import { costLabel, counted, shareLabel } from "./jobs";

const money = (cents: number, locale: Locale) => formatMoney(cents, aiLimits.costCurrency, locale);
/** What patients paid, in the presentment currency (the AI vendor bills USD; both are USD today). */
const price = (cents: number, locale: Locale) => formatMoney(cents, business.currencyPresentment, locale);

function WindowTile({ label, w, locale }: { label: string; w: SpendWindow; locale: Locale }) {
  const t = useTranslations("adminAiJobs.spend");
  return (
    <Surface className="flex flex-col gap-1 p-4">
      <h3 className="text-sm font-semibold text-ink-700">{label}</h3>
      <p className="tabular text-2xl font-bold leading-tight text-ink-900">{costLabel(w.costMicros, locale)}</p>
      <p className="tabular text-sm text-ink-700">
        {w.chargedCents > 0
          ? t("chargedShare", { pct: shareLabel(w.costMicros, w.chargedCents, locale), amount: price(w.chargedCents, locale) })
          : t("nothingCharged")}
      </p>
      {w.pendingCents > 0 ? <p className="tabular text-sm text-ink-500">{t("pending", { amount: price(w.pendingCents, locale) })}</p> : null}
    </Surface>
  );
}

export function SpendTiles({
  today,
  week,
  month,
  alert,
  locale,
  timeZone,
}: {
  today: SpendWindow;
  week: SpendWindow;
  month: SpendWindow;
  alert: { crossedToday: Date | null; lastDay: Date | null };
  locale: Locale;
  timeZone: string;
}) {
  const t = useTranslations("adminAiJobs.spend");
  const threshold = aiLimits.dailySpendAlertCents;
  return (
    <section aria-labelledby="spend-title">
      <h2 id="spend-title" className="sr-only">
        {t("title")}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WindowTile label={t("today")} w={today} locale={locale} />
        <WindowTile label={t("week")} w={week} locale={locale} />
        <WindowTile label={t("month")} w={month} locale={locale} />
        <Surface className="flex flex-col gap-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-ink-700">{t("alert")}</h3>
            {alert.crossedToday ? <Badge tone="warning">{t("alertBadge")}</Badge> : null}
          </div>
          <p className="tabular text-2xl font-bold leading-tight text-ink-900">{money(threshold, locale)}</p>
          <p className="tabular text-sm text-ink-700">
            {alert.crossedToday
              ? t("alertPassed", { time: formatTime(alert.crossedToday, timeZone, locale) })
              : t("alertToday", { pct: shareLabel(today.costMicros, threshold, locale) })}
          </p>
          <p className="text-sm text-ink-500">
            {alert.lastDay ? t("alertLast", { date: formatSlotDay(alert.lastDay, timeZone, locale) }) : t("alertNever")}
          </p>
        </Surface>
      </div>
    </section>
  );
}

/** Whole dollars above the larger of the busiest day and the alert, so the alert line always shows with room above it. */
function scaleCents(maxDayCents: number): number {
  const top = Math.max(maxDayCents * 1.1, aiLimits.dailySpendAlertCents * 1.25);
  const step = top > 2000 ? 500 : 100;
  return Math.ceil(top / step) * step;
}

export function SpendChart({ days, locale, timeZone }: { days: Array<{ key: string; at: Date; costMicros: number }>; locale: Locale; timeZone: string }) {
  const t = useTranslations("adminAiJobs.chart");
  const threshold = aiLimits.dailySpendAlertCents;
  const max = scaleCents(Math.max(0, ...days.map((d) => microsToCents(d.costMicros))));
  const pct = (cents: number) => `${Math.min(100, (cents / max) * 100)}%`;
  const first = days[0];
  const middle = days[Math.floor(days.length / 2)];
  return (
    <Surface className="flex flex-col gap-4">
      <div>
        <h2 id="chart-title" className="text-xl font-bold text-sea-900">
          {t("title", counted(days.length, locale))}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{t("legend", { amount: money(threshold, locale) })}</p>
      </div>
      <figure aria-labelledby="chart-title" className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          {/* Value axis on the start side; labels Western and LTR (rule R11). */}
          <div aria-hidden="true" className="relative w-16 shrink-0 text-xs text-ink-500">
            <span className="tabular absolute end-0 top-0 -translate-y-1/2">{money(max, locale)}</span>
            <span className="tabular absolute end-0 -translate-y-1/2 font-semibold text-warning" style={{ top: `calc(100% - ${pct(threshold)})` }}>
              {money(threshold, locale)}
            </span>
            <span className="tabular absolute end-0 bottom-0 translate-y-1/2">{money(0, locale)}</span>
          </div>
          <div className="relative h-40 min-w-0 flex-1 border-b border-sand-400 sm:h-48">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 border-t-2 border-dashed border-warning"
              style={{ bottom: pct(threshold) }}
            />
            <ol className="relative flex h-full items-end gap-px sm:gap-1">
              {days.map((d) => {
                const cents = microsToCents(d.costMicros);
                const over = cents >= threshold;
                return (
                  <li key={d.key} className="flex h-full min-w-0 flex-1 items-end">
                    <span
                      aria-hidden="true"
                      className={`block w-full ${cents === 0 ? "bg-sand-300" : over ? "bg-warning" : "bg-lagoon-600"}`}
                      style={{ height: cents === 0 ? "2px" : `max(3px, ${pct(cents)})` }}
                    />
                    <span className="sr-only">
                      {t("bar", { date: formatDate(d.at, timeZone, locale), amount: costLabel(d.costMicros, locale) })}
                      {over ? ` ${t("over")}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        {/* Day axis: oldest at the start edge, today at the end, in both directions. */}
        <div aria-hidden="true" className="flex justify-between gap-2 ps-18 text-xs text-ink-500">
          <span>{first ? formatSlotDay(first.at, timeZone, locale) : null}</span>
          <span>{middle ? formatSlotDay(middle.at, timeZone, locale) : null}</span>
          <span className="font-semibold text-ink-700">{t("today")}</span>
        </div>
      </figure>
    </Surface>
  );
}
