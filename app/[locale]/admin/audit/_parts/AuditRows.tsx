// The log itself (screen 47): entries newest first, grouped by day in the admin's zone. A row is one <details>: the summary
// line names the time, the actor, the action and the target, and opening it shows the before and after of every field, the
// verification checks (source, date, who checked, reviewer: rule A1), the note and the record's ids. Nothing in a row edits
// anything: there are no controls but the row's own toggle (append only). Phone: action and time, then actor, then target.
// From sm up: four columns under a visual header row, plus the first change as a hint under the action.
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Badge, ChevronNext, Disclosure } from "@/components/ui";
import { auditCheckPassed } from "@/lib/audit";
import { DAY_MS, formatDate, formatTime, formatTimeInZone, type Locale } from "@/lib/format";
import type { SampleAuditEntry } from "@/lib/sample";
import { dayKey } from "./audit";
import { actorName, actorRole, AuditValueView, doctorName, targetName, type T } from "./labels";

/** Phone: action | time, then actor and target full width. sm up: time | actor | action | target. */
export const rowCols =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 sm:grid-cols-[5.5rem_minmax(0,10rem)_minmax(0,1.25fr)_minmax(0,1fr)] sm:gap-x-4";

/** Column names for the table look from sm up. Decorative: each row says the same in its own text. pe-12 clears the chevron. */
export function AuditHeaderRow() {
  const t = useTranslations("adminAudit.columns");
  return (
    <div aria-hidden="true" className={`${rowCols} hidden border-b border-sand-200 py-2.5 ps-5 pe-12 text-sm font-semibold text-ink-500 sm:grid`}>
      <span>{t("time")}</span>
      <span>{t("actor")}</span>
      <span>{t("action")}</span>
      <span>{t("target")}</span>
    </div>
  );
}

function iso(instant: Date) {
  return instant.toISOString().replace(".000Z", "Z");
}

export async function AuditRows({
  entries,
  locale,
  zone,
  openId,
  now,
}: {
  entries: SampleAuditEntry[];
  locale: Locale;
  zone: string;
  openId: string | undefined;
  now: Date;
}) {
  const t = (await getTranslations("adminAudit")) as unknown as T;
  const groups: Array<{ key: string; first: Date; entries: SampleAuditEntry[] }> = [];
  for (const e of entries) {
    const key = dayKey(e.at, zone);
    const last = groups.at(-1);
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, first: e.at, entries: [e] });
  }
  const today = dayKey(now, zone);
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS), zone);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
      <AuditHeaderRow />
      {groups.map((g) => {
        const date = formatDate(g.first, zone, locale);
        const relative = g.key === today ? t("today") : g.key === yesterday ? t("yesterday") : undefined;
        const headingId = `audit-day-${g.entries[0]?.id ?? g.key}`;
        return (
          <section key={g.key} aria-labelledby={headingId} className="border-t border-sand-200 first-of-type:border-t-0">
            <h2 id={headingId} className="border-b border-sand-200 bg-sand-100 px-4 py-2 text-sm font-semibold text-ink-700 sm:px-5">
              {relative ? t("dayHeading", { relative, date }) : date}
            </h2>
            <ul className="divide-y divide-sand-200">
              {g.entries.map((e) => (
                <li key={e.id} className="px-4 sm:px-5">
                  <AuditRow entry={e} locale={locale} zone={zone} open={openId === e.id} t={t} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The one-line hint under the action (sm up): the first field's old and new value, only the new one when nothing was there
 * before, or a lone check's result. The full before and after is in the open row.
 */
function ChangeHint({ entry: e, locale, t }: { entry: SampleAuditEntry; locale: Locale; t: T }) {
  const first = e.changes[0];
  const check = e.verification?.checks.length === 1 ? e.verification.checks[0] : undefined;
  if (!first && !check) return null;
  return (
    <span className="hidden min-w-0 items-center gap-1.5 text-sm text-ink-700 sm:flex">
      {first ? (
        <>
          {first.old !== null ? (
            <>
              <span className="min-w-0 truncate">
                <AuditValueView kind={first.kind} value={first.old} currency={first.currency} lang={first.lang} locale={locale} t={t} />
              </span>
              <ChevronNext className="size-3.5 shrink-0 text-ink-500" />
            </>
          ) : null}
          <span className="min-w-0 truncate">
            <AuditValueView kind={first.kind} value={first.new} currency={first.currency} lang={first.lang} locale={locale} t={t} />
          </span>
        </>
      ) : check ? (
        <span className="min-w-0 truncate">
          {t(`checks.${check.kind}`)} · {t(`checks.result.${check.result}`)}
        </span>
      ) : null}
    </span>
  );
}

function AuditRow({ entry: e, locale, zone, open, t }: { entry: SampleAuditEntry; locale: Locale; zone: string; open: boolean; t: T }) {
  const target = targetName(e.target, locale, t);
  return (
    <Disclosure
      id={e.id}
      open={open}
      summary={
        <span className={`${rowCols} min-w-0 flex-1 font-normal`}>
          <span className="col-start-1 row-start-1 min-w-0 sm:col-start-3">
            <span className="block font-semibold text-ink-900">{t(`actions.${e.action}`)}</span>
            <ChangeHint entry={e} locale={locale} t={t} />
          </span>
          <span className="tabular col-start-2 row-start-1 whitespace-nowrap text-sm text-ink-700 sm:col-start-1 sm:text-[15px] sm:text-ink-900">
            {formatTime(e.at, zone, locale)}
          </span>
          <span className="col-span-2 col-start-1 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-[15px]">
            <span className="font-medium text-ink-900">{actorName(e.actorId, locale, t)}</span>
            <span className="text-ink-500">
              <span aria-hidden="true" className="sm:hidden">
                {" · "}
              </span>
              <span className="sm:block sm:text-sm">{actorRole(e.actorId, t)}</span>
            </span>
          </span>
          <span className="col-span-2 col-start-1 row-start-3 flex min-w-0 flex-wrap gap-x-1.5 text-sm sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:flex-col-reverse sm:text-[15px]">
            <span className="text-ink-500 sm:text-sm">{t(`targets.${e.target.type}`)}</span>
            {target ? (
              <>
                <span aria-hidden="true" className="text-ink-500 sm:hidden">
                  ·
                </span>
                <span className="min-w-0 text-ink-900">{target}</span>
              </>
            ) : null}
          </span>
        </span>
      }
    >
      <EntryDetail entry={e} locale={locale} zone={zone} t={t} />
    </Disclosure>
  );
}

const h3 = "mb-1.5 text-sm font-semibold text-ink-900";

function EntryDetail({ entry: e, locale, zone, t }: { entry: SampleAuditEntry; locale: Locale; zone: string; t: T }) {
  const note = e.note ? (locale === "ar" ? e.note.ar : e.note.en) : undefined;
  const professional = e.target.doctorId ? doctorName(e.target.doctorId, locale) : undefined;
  return (
    <div className="mb-2 grid gap-5 rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4 text-[15px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <section>
          <h3 className={h3}>{t("detail.change")}</h3>
          {e.changes.length ? (
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="text-sm text-ink-500">
                  <th scope="col" className="w-[34%] pb-1 pe-3 text-start font-semibold">
                    {t("detail.field")}
                  </th>
                  <th scope="col" className="pb-1 pe-3 text-start font-semibold">
                    {t("detail.before")}
                  </th>
                  <th scope="col" className="pb-1 text-start font-semibold">
                    {t("detail.after")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.changes.map((c) => (
                  <tr key={c.field} className="border-t border-sand-200 align-top">
                    <th scope="row" className="py-1.5 pe-3 text-start font-medium text-ink-900">
                      {t(`fields.${c.field}`)}
                    </th>
                    <td className="break-words py-1.5 pe-3 text-ink-700">
                      <AuditValueView kind={c.kind} value={c.old} currency={c.currency} lang={c.lang} locale={locale} t={t} />
                    </td>
                    <td className="break-words py-1.5 font-medium text-ink-900">
                      <AuditValueView kind={c.kind} value={c.new} currency={c.currency} lang={c.lang} locale={locale} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-ink-700">{t("detail.noChange")}</p>
          )}
        </section>

        {e.details.length ? (
          <section>
            <h3 className={h3}>{t("detail.details")}</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
              {e.details.map((d) => (
                <div key={d.field} className="contents">
                  <dt className="text-ink-500">{t(`fields.${d.field}`)}</dt>
                  <dd className="text-ink-900">
                    <AuditValueView kind={d.kind} value={d.value} currency={d.currency} lang={d.lang} locale={locale} t={t} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {e.verification ? (
          <section>
            <h3 className={h3}>{t("checks.title")}</h3>
            <ul className="flex flex-col gap-2">
              {e.verification.checks.map((c) => (
                <li key={c.kind} className="rounded-[var(--radius-field)] border border-sand-200 bg-white px-3 py-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{t(`checks.${c.kind}`)}</span>
                    <Badge tone={auditCheckPassed(c.result) ? "success" : "warning"}>{t(`checks.result.${c.result}`)}</Badge>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-700">
                    {t("checks.source")}{" "}
                    <span lang="en" dir="ltr" className="font-medium text-ink-900">
                      {c.source}
                    </span>
                  </p>
                  <p className="text-sm text-ink-700">
                    {t("checks.checked", {
                      date: `${formatDate(c.checkedAt, zone, locale)} · ${formatTime(c.checkedAt, zone, locale)}`,
                      name: actorName(c.by, locale, t),
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              <span className="text-ink-500">{t("checks.reviewer")}</span>{" "}
              <span className="font-semibold text-ink-900">
                {e.verification.reviewer ? actorName(e.verification.reviewer, locale, t) : t("checks.awaitingReview")}
              </span>
            </p>
          </section>
        ) : null}

        {note ? (
          <section>
            <h3 className={h3}>{t("detail.note")}</h3>
            <p className="text-ink-900">{note}</p>
          </section>
        ) : null}
      </div>

      <section className="min-w-0">
        <h3 className={h3}>{t("detail.record")}</h3>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <Fact label={t("detail.recordedAt")}>
            {formatDate(e.at, zone, locale)} · {formatTimeInZone(e.at, zone, locale)}
          </Fact>
          <Fact label={t("detail.recordedUtc")}>
            <span className="ltr-run tabular">{iso(e.at)}</span>
          </Fact>
          <Fact label={t("detail.entryId")}>
            <span className="ltr-run">{e.id}</span>
          </Fact>
          <Fact label={t("detail.requestId")}>
            <span className="ltr-run break-all">{e.requestId}</span>
          </Fact>
          {e.stripeEventId ? (
            <Fact label={t("detail.stripeEvent")}>
              <span className="ltr-run break-all">{e.stripeEventId}</span>
            </Fact>
          ) : null}
          <Fact label={t("detail.actorId")}>
            <span className="ltr-run">{e.actorId}</span>
          </Fact>
          <Fact label={t("detail.targetId")}>
            <span className="ltr-run">{e.target.id}</span>
          </Fact>
          {professional ? (
            <Fact label={t("detail.professional")}>
              {professional} <span className="ltr-run text-ink-500">{e.target.doctorId}</span>
            </Fact>
          ) : null}
        </dl>
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 text-ink-900">{children}</dd>
    </div>
  );
}
