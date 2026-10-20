// The removal queue as a table (screen 41 layout call): listing, who asked, reason, checks, received and the SLA timer column.
// One markup for both widths through container queries: from @3xl it is a six-column table with a header row; narrower (a phone,
// or the list beside an open request on desktop) each row stacks, the timer at the top end. Each row opens the request through
// one stretched link on the doctor's name; nothing else in the row is interactive, so nothing is nested.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, CheckIcon, CloseIcon, Surface } from "@/components/ui";
import { formatNumber, formatSlotDay, formatTime, type Locale } from "@/lib/format";
import { QUEUE_GRID, doctorName, removalsHref, slaTone, type QueueRow, type QueueTab, type Sla } from "./removals";

export type T = Awaited<ReturnType<typeof getTranslations>>;

const GRID = QUEUE_GRID;

const COLUMNS: Record<QueueTab, string[]> = {
  open: ["listing", "askedBy", "reason", "checks", "received", "timeLeft"],
  decided: ["listing", "askedBy", "reason", "decision", "decided", "taken"],
};

/** The SLA timer's words, shared by the row badge and the detail page. */
export function slaLabel(sla: Sla, t: T, locale: Locale): string {
  const n = (count: number) => ({ count, n: formatNumber(count, locale) });
  switch (sla.kind) {
    case "open":
      return t("timer.left", n(sla.hoursLeft));
    case "overdue":
      return t("timer.overdue", n(sla.hoursOver));
    case "paused":
      return t("timer.paused", n(sla.hoursLeft));
    case "decided":
      return sla.inTime ? t("timer.taken", n(sla.hoursTaken)) : t("timer.takenLate", n(sla.hoursTaken));
  }
}

/** "Tue, Oct 20 · 6:20 AM" on one line in a stacked row, day over time in a table cell. The zone is named once above the
 *  table (rule P6), so cells carry the day and the clock time only. */
function dayTime(instant: Date, zone: string, locale: Locale) {
  return (
    <>
      <span className="whitespace-nowrap">{formatSlotDay(instant, zone, locale)}</span>
      <span className="@3xl:hidden"> · </span>
      <span className="whitespace-nowrap @3xl:block">{formatTime(instant, zone, locale)}</span>
    </>
  );
}

export async function RemovalQueue({
  rows,
  tab,
  locale,
  zone,
  tz,
  currentId,
}: {
  rows: QueueRow[];
  tab: QueueTab;
  locale: Locale;
  zone: string;
  tz: string | undefined;
  currentId?: string;
}) {
  const t = await getTranslations("adminRemovals");
  return (
    <Surface className="px-4 py-2 sm:px-5">
      <div className="@container">
        <div aria-hidden="true" className={`hidden gap-x-4 border-b border-sand-200 py-3 text-sm font-semibold text-ink-500 @3xl:grid ${GRID}`}>
          {COLUMNS[tab].map((key) => (
            <span key={key}>{t(`columns.${key}`)}</span>
          ))}
        </div>
        <ul className="divide-y divide-sand-200">
          {rows.map((row) => (
            <Row key={row.id} row={row} tab={tab} locale={locale} zone={zone} tz={tz} current={row.id === currentId} t={t} />
          ))}
        </ul>
      </div>
    </Surface>
  );
}

function Row({
  row: r,
  tab,
  locale,
  zone,
  tz,
  current,
  t,
}: {
  row: QueueRow;
  tab: QueueTab;
  locale: Locale;
  zone: string;
  tz: string | undefined;
  current: boolean;
  t: T;
}) {
  const passed = r.checks.filter((c) => c.passed).length;
  const allPassed = passed === r.checks.length;
  const label = (key: string) => <span className="text-ink-500 @3xl:sr-only">{t(`columns.${key}`)} </span>;

  return (
    <li
      className={[
        "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-3.5 @3xl:items-center @3xl:gap-x-4",
        GRID,
        current ? "-mx-3 rounded-[var(--radius-field)] bg-sea-100 px-3" : "",
      ].join(" ")}
    >
      <div className="col-start-1 row-start-1 min-w-0">
        <Link
          href={removalsHref({ id: r.id, tz })}
          aria-current={current ? "page" : undefined}
          className="font-semibold leading-snug text-sea-900 underline-offset-2 after:absolute after:inset-0 after:rounded-[var(--radius-field)] hover:underline"
        >
          {doctorName(r, locale)}
        </Link>
        <p className="text-sm text-ink-700">
          {t("npi")} <span className="ltr-run tabular">{r.doctor.npi}</span>
        </p>
      </div>

      {/* Phone: each fact on its own line under the name; from @3xl each wrapper dissolves into two table cells. */}
      <div className="col-span-2 flex flex-col gap-0.5 text-sm @3xl:contents">
        <p className="min-w-0 @3xl:col-span-1 @3xl:text-[15px]">
          {label("askedBy")}
          <bdi className="text-ink-900">{r.requesterName}</bdi>
        </p>
        <p className="min-w-0 text-ink-700 @3xl:col-span-1 @3xl:text-[15px]">
          <span className="sr-only">{t("columns.reason")} </span>
          {t(`reasons.${r.reason}`)}
        </p>
      </div>

      <div className="col-span-2 flex flex-col items-start gap-1 text-sm @3xl:contents">
        {tab === "open" ? (
          <p className={["inline-flex items-center gap-1.5 whitespace-nowrap font-semibold", allPassed ? "text-success" : "text-warning"].join(" ")}>
            {allPassed ? <CheckIcon className="size-4" /> : <CloseIcon className="size-3.5" />}
            {t("checksCount", { passed: formatNumber(passed, locale), total: formatNumber(r.checks.length, locale) })}
          </p>
        ) : (
          <p>
            <span className="sr-only">{t("columns.decision")} </span>
            <Badge tone={r.status === "confirmed" ? "success" : "pending"}>{t(`status.${r.status}`)}</Badge>
          </p>
        )}
        <p className="text-ink-700 @3xl:text-[15px]">
          {label(tab === "open" ? "received" : "decided")}
          {dayTime(tab === "open" || !r.decision ? r.receivedAt : r.decision.decidedAt, zone, locale)}
        </p>
      </div>

      <p className="col-start-2 row-start-1 justify-self-end @3xl:col-start-6 @3xl:justify-self-start">
        <span className="sr-only">{t(`columns.${tab === "open" ? "timeLeft" : "taken"}`)} </span>
        <Badge tone={slaTone(r.sla)}>
          <span className="whitespace-nowrap">{slaLabel(r.sla, t, locale)}</span>
        </Badge>
      </p>
    </li>
  );
}
