// The one-page records summary (task 3.10). One component for both sides: the professional's shared-summary viewer (screen 36)
// and the patient's summary (screen 26). The top panel carries the AI label, the reviewed state and the route to a human
// (rules T4, Q6); the body opens with the not-a-diagnosis line (T5), then the five blocks with a source reference on every item
// (T6), the flags and the unreadable pages (never guessed at, CLAUDE.md), and the source documents. Medical values use
// Western digits through lib/format and stay one left-to-right run with their unit (rules N1, R3).
// The page owns the title and its own actions (`actions` slot in the top panel: open in visit notes, download). `sourceHref`
// turns each source reference into a link to the page viewer (screen 26's sheet); without it the reference is plain text.
// Screen 26 switches on three optional parts; screen 36 passes none of them and renders as before:
// - `tabHref` splits the body into the Overview, Timeline and Flags tabs (the open one is `view`). The closed Overview and
//   Flags stay in the page for print only, so Download or print always carries every item, flag and unreadable page.
// - `unreadableAction` puts the fix under each unreadable page (screen 26: upload a clearer photo, rule L4).
// - The patient audience adds plain-words range context to the results (rules T2, T6).
// SummarySourceSheet is the page viewer that `sourceHref` opens: a bottom sheet on phone, a side panel on desktop.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, CheckIcon, ChevronNext, Skeleton, Surface } from "@/components/ui";
import { formatDate, formatNumber, type Locale } from "@/lib/format";

/* ---------------- Data ---------------- */

/** A page in one of the uploaded documents. Every item carries at least one (task 3.9: no item without a source page). */
export type SummarySourceRef = { doc: string; page: number };
/** A measured amount as the document printed it: `decimals` keeps "12.0" from becoming "12". */
export type SummaryQuantity = { amount: number; decimals: number; unit: string };
export type SummaryFrequency = "onceDaily" | "twiceDaily" | "threeTimesDaily" | "asNeeded";

export type SummaryDocument = { id: string; titleEn: string; titleAr: string; datedOn: string | null; pages: number };
export type SummaryCondition = { nameEn: string; nameAr: string; notedOn: string | null; sources: SummarySourceRef[] };
export type SummaryProcedure = { nameEn: string; nameAr: string; doneOn: string | null; sources: SummarySourceRef[] };
export type SummaryMedication = {
  nameEn: string;
  nameAr: string;
  dose: SummaryQuantity | null;
  frequency: SummaryFrequency | null;
  sources: SummarySourceRef[];
};
export type SummaryAllergy = { nameEn: string; nameAr: string; reactionEn: string | null; reactionAr: string | null; sources: SummarySourceRef[] };
/** One result with the reference range the lab printed (`low`/`high`, same unit and decimals as the value). */
export type SummaryResult = {
  nameEn: string;
  nameAr: string;
  value: number;
  decimals: number;
  unit: string;
  low: number | null;
  high: number | null;
  takenOn: string;
  sources: SummarySourceRef[];
};
/** Missing: a document the others refer to was not uploaded. Conflict: two documents disagree; both sources listed. */
export type SummaryFlag = { kind: "missing" | "conflict"; textEn: string; textAr: string; sources: SummarySourceRef[] };
export type SummaryUnreadable = { doc: string; page: number; reason: "blurry" | "handwritten" | "cutOff" };

/** Calendar dates (`notedOn`, `takenOn`, ...) are YYYY-MM-DD as printed on the documents; `generatedAt` is an instant. */
export type SummaryData = {
  id: string;
  generatedAt: Date;
  documents: SummaryDocument[];
  conditions: SummaryCondition[];
  procedures: SummaryProcedure[];
  medications: SummaryMedication[];
  allergies: SummaryAllergy[];
  results: SummaryResult[];
  flags: SummaryFlag[];
  unreadable: SummaryUnreadable[];
};

export type SummaryAudience = "patient" | "professional";

/** The tabs of the tabbed layout (screen 26), in display order. */
export type SummaryView = "overview" | "timeline" | "flags";
export const summaryViews: readonly SummaryView[] = ["overview", "timeline", "flags"];

/** Below or above the range the lab printed; null when inside it or when the lab printed no bound on that side. */
function outsideRange(r: SummaryResult): "below" | "above" | null {
  return r.low != null && r.value < r.low ? "below" : r.high != null && r.value > r.high ? "above" : null;
}

type TimelineEntry =
  | { kind: "document"; key: string; doc: SummaryDocument }
  | { kind: "condition"; key: string; item: SummaryCondition }
  | { kind: "procedure"; key: string; item: SummaryProcedure }
  | { kind: "result"; key: string; item: SummaryResult };

/**
 * The dated items grouped by the day the documents give, newest first; within a day documents, then conditions, procedures and
 * results. Nothing is dated by inference: an item the documents give no date for is listed in `undated` instead (rule T6).
 */
function timelineOf(s: SummaryData) {
  const days = new Map<string, TimelineEntry[]>();
  const add = (date: string, entry: TimelineEntry) => days.set(date, [...(days.get(date) ?? []), entry]);
  for (const d of s.documents) if (d.datedOn) add(d.datedOn, { kind: "document", key: `d-${d.id}`, doc: d });
  for (const c of s.conditions) if (c.notedOn) add(c.notedOn, { kind: "condition", key: `c-${c.nameEn}`, item: c });
  for (const p of s.procedures) if (p.doneOn) add(p.doneOn, { kind: "procedure", key: `p-${p.nameEn}`, item: p });
  for (const r of s.results) add(r.takenOn, { kind: "result", key: `r-${r.nameEn}`, item: r });
  const dated = [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, entries]) => ({ date, entries }));
  const undated = [
    ...s.conditions.filter((c) => !c.notedOn).map((c) => ({ en: c.nameEn, ar: c.nameAr })),
    ...s.procedures.filter((p) => !p.doneOn).map((p) => ({ en: p.nameEn, ar: p.nameAr })),
    ...s.documents.filter((d) => !d.datedOn).map((d) => ({ en: d.titleEn, ar: d.titleAr })),
  ];
  return { dated, undated };
}

/* ---------------- Viewer ---------------- */

const blockTitle = "text-xl font-bold text-sea-900";
// Equal thirds on phone; on wider screens each tab hugs its label.
const tabClass = "-mb-px flex min-h-12 flex-1 items-center justify-center gap-2 border-b-[3px] px-2 text-center font-semibold sm:flex-none sm:px-6";

export function SummaryViewer({
  summary,
  locale,
  timeZone,
  audience,
  patientName,
  review,
  humanHref,
  actions,
  sourceHref,
  view = "overview",
  tabHref,
  unreadableAction,
}: {
  summary: SummaryData;
  locale: Locale;
  timeZone: string;
  audience: SummaryAudience;
  /** First name, for the professional's copy ("from Layla's documents"). */
  patientName: string;
  /** The licensed reviewer, if any (rules T4, Q6). `gender` picks the Arabic verb form. */
  review: { name: string; gender: "f" | "m"; at: Date } | null;
  humanHref: string;
  actions?: ReactNode;
  sourceHref?: (ref: SummarySourceRef) => string;
  /** The open tab when `tabHref` is set. */
  view?: SummaryView;
  /** Turns on the tabbed layout (screen 26): the link for each tab. Without it every block shows on one page (screen 36). */
  tabHref?: (view: SummaryView) => string;
  /** Shown under each unreadable page: the fix the reader can make. */
  unreadableAction?: ReactNode;
}) {
  const t = useTranslations("summary");
  const tc = useTranslations("common");
  const ar = locale === "ar";
  const patient = audience === "patient";
  const pick = (en: string, arText: string) => (ar ? arText : en);
  const num = (n: number, decimals = 0) => formatNumber(n, locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  // A calendar date from a document: format in UTC so every viewer sees the day the document shows.
  const day = (d: string) => formatDate(new Date(`${d}T00:00:00Z`), "UTC", locale);
  const counted = (n: number) => ({ count: n, label: num(n) });
  const sep = t("listSeparator");
  const refSep = t("refSeparator");

  const docs = new Map(summary.documents.map((d) => [d.id, d]));
  const docTitle = (id: string) => {
    const d = docs.get(id);
    return d ? pick(d.titleEn, d.titleAr) : id;
  };
  const pages = summary.documents.reduce((n, d) => n + d.pages, 0);

  const refLabel = (ref: SummarySourceRef) => t("sourceRef", { doc: docTitle(ref.doc), page: num(ref.page) });
  const sources = (refs: SummarySourceRef[]) => (
    <p className="mt-1 text-sm text-ink-500">
      {t("source", { count: refs.length })}{" "}
      {refs.map((ref, i) => (
        <span key={`${ref.doc}-${ref.page}`}>
          {i > 0 ? refSep : null}
          {sourceHref ? (
            <Link href={sourceHref(ref)} scroll={false} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
              {refLabel(ref)}
            </Link>
          ) : (
            refLabel(ref)
          )}
        </span>
      ))}
    </p>
  );
  /** Value and unit as one LTR run with a no-break space, so "10.9 g/dL" never splits or reorders in Arabic (rule R3). */
  const amount = (value: number, decimals: number, unit: string, className?: string) => (
    <span className={`ltr-run tabular ${className ?? ""}`}>{`${num(value, decimals)} ${unit}`}</span>
  );
  /** The range badge: outside the lab's range for every reader; inside it said in words for the patient only (rule T6). */
  const rangeBadge = (r: SummaryResult) => {
    const outside = outsideRange(r);
    if (outside) return <Badge tone="warning">{t(outside)}</Badge>;
    return patient && r.low != null && r.high != null ? <Badge tone="pending">{t("inRange")}</Badge> : null;
  };

  const flagCount = summary.flags.length;
  const unreadableCount = summary.unreadable.length;
  const anyOutside = summary.results.some((r) => outsideRange(r) !== null);
  /** "Check first" links: an anchor on the one-page layout, the Flags tab when tabbed. */
  const jump = (hash: "summary-flags" | "summary-unreadable", label: string) => {
    const className = "whitespace-nowrap font-semibold text-sea-700 underline underline-offset-2";
    return tabHref ? (
      <Link href={`${tabHref("flags")}#${hash}`} scroll={false} className={className}>
        {label}
      </Link>
    ) : (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    );
  };

  /* The blocks, composed below into one page (screen 36) or into tabs (screen 26). */

  const conditionsBlock = (
    <Surface>
      <h2 className={blockTitle}>{t("sections.conditions")}</h2>
      <Items empty={t("notFound")}>
        {summary.conditions.map((c) => (
          <li key={c.nameEn} className="py-3">
            <p className="font-semibold text-ink-900">{pick(c.nameEn, c.nameAr)}</p>
            {c.notedOn ? <p className="text-sm text-ink-700">{t("noted", { date: day(c.notedOn) })}</p> : null}
            {sources(c.sources)}
          </li>
        ))}
      </Items>
    </Surface>
  );

  const proceduresBlock = (
    <Surface>
      <h2 className={blockTitle}>{t("sections.procedures")}</h2>
      <Items empty={t("notFound")}>
        {summary.procedures.map((p) => (
          <li key={p.nameEn} className="py-3">
            <p className="font-semibold text-ink-900">{pick(p.nameEn, p.nameAr)}</p>
            {p.doneOn ? <p className="text-sm text-ink-700">{t("done", { date: day(p.doneOn) })}</p> : null}
            {sources(p.sources)}
          </li>
        ))}
      </Items>
    </Surface>
  );

  const medicationsBlock = (
    <Surface>
      <h2 className={blockTitle}>{t("sections.medications")}</h2>
      <Items empty={t("notFound")}>
        {summary.medications.map((m) => (
          <li key={m.nameEn} className="py-3">
            <p className="font-semibold text-ink-900">{pick(m.nameEn, m.nameAr)}</p>
            {m.dose || m.frequency ? (
              <p className="text-sm text-ink-700">
                {m.dose ? amount(m.dose.amount, m.dose.decimals, m.dose.unit) : null}
                {m.dose && m.frequency ? sep : null}
                {m.frequency ? t(`frequency.${m.frequency}`) : null}
              </p>
            ) : null}
            {sources(m.sources)}
          </li>
        ))}
      </Items>
    </Surface>
  );

  const allergiesBlock = (
    <Surface>
      <h2 className={blockTitle}>{t("sections.allergies")}</h2>
      <Items empty={t("notFound")}>
        {summary.allergies.map((a) => {
          const reaction = ar ? a.reactionAr : a.reactionEn;
          return (
            <li key={a.nameEn} className="py-3">
              <p className="font-semibold text-ink-900">{pick(a.nameEn, a.nameAr)}</p>
              {reaction ? <p className="text-sm text-ink-700">{t("reaction", { reaction })}</p> : null}
              {sources(a.sources)}
            </li>
          );
        })}
      </Items>
    </Surface>
  );

  const resultsBlock = (
    <Surface className="lg:col-span-2">
      <h2 className={blockTitle}>{t("sections.results")}</h2>
      {/* Context for results outside the range, said once (rule T2). */}
      {patient && anyOutside ? <p className="mt-1.5 text-sm text-ink-700">{t("rangeContext")}</p> : null}
      <Items empty={t("notFound")}>
        {summary.results.map((r) => {
          const range =
            r.low != null && r.high != null ? `${num(r.low, r.decimals)}–${num(r.high, r.decimals)} ${r.unit}` : null;
          return (
            <li key={r.nameEn} className="py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{pick(r.nameEn, r.nameAr)}</p>
                <p className="text-sm text-ink-700">{t("taken", { date: day(r.takenOn) })}</p>
                {sources(r.sources)}
              </div>
              <div className="mt-2 flex flex-col gap-1 sm:mt-0 sm:items-end">
                <p className="flex flex-wrap items-center gap-2">
                  {amount(r.value, r.decimals, r.unit, "text-lg font-bold text-ink-900")}
                  {rangeBadge(r)}
                </p>
                {range ? (
                  <p className="text-sm text-ink-700">
                    {t("labRange")} <span className="ltr-run tabular">{range}</span>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </Items>
    </Surface>
  );

  const flagsBlock = (
    <Surface>
      <h2 id="summary-flags" className={blockTitle}>
        {t("sections.flags")}
      </h2>
      <Items empty={t("flagsEmpty")}>
        {summary.flags.map((f) => (
          <li key={f.textEn} className="py-3">
            <Badge tone={f.kind === "conflict" ? "danger" : "warning"}>{t(`flagKind.${f.kind}`)}</Badge>
            <p className="mt-2 text-ink-900">{pick(f.textEn, f.textAr)}</p>
            {sources(f.sources)}
          </li>
        ))}
      </Items>
    </Surface>
  );

  const unreadableBlock = (
    <Surface>
      <h2 id="summary-unreadable" className={blockTitle}>
        {t("sections.unreadable")}
      </h2>
      <Items empty={t("unreadableEmpty")}>
        {summary.unreadable.map((u) => (
          <li key={`${u.doc}-${u.page}`} className="py-3">
            <Badge tone="pending">{t("unreadableLabel")}</Badge>
            <p className="mt-2 font-semibold text-ink-900">
              {sourceHref ? (
                <Link href={sourceHref(u)} scroll={false} className="text-sea-700 underline-offset-2 hover:underline">
                  {refLabel(u)}
                </Link>
              ) : (
                refLabel(u)
              )}
            </p>
            <p className="text-sm text-ink-700">{t(`unreadableReason.${u.reason}`)}</p>
            {unreadableAction ? <div className="mt-3">{unreadableAction}</div> : null}
          </li>
        ))}
      </Items>
    </Surface>
  );

  const sourcesBlock = (
    <Surface className="lg:col-span-2">
      <h2 className={blockTitle}>{t("sections.sources")}</h2>
      <Items empty={t("notFound")}>
        {summary.documents.map((d) => (
          <li key={d.id} className="py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
            <p className="font-semibold text-ink-900">
              {sourceHref ? (
                <Link href={sourceHref({ doc: d.id, page: 1 })} scroll={false} className="text-sea-700 underline-offset-2 hover:underline">
                  {pick(d.titleEn, d.titleAr)}
                </Link>
              ) : (
                pick(d.titleEn, d.titleAr)
              )}
            </p>
            <p className="text-sm text-ink-700">
              {d.datedOn ? (
                <>
                  {t("dated", { date: day(d.datedOn) })}
                  {sep}
                </>
              ) : null}
              {t("pages", counted(d.pages))}
            </p>
          </li>
        ))}
      </Items>
    </Surface>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top of the viewer, never a footer: AI label, reviewed state, the human route (T4, Q6). */}
      <section aria-labelledby="summary-ai-label" className="rounded-[var(--radius-card)] border border-sky-500/40 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="summary-ai-label" className="inline-flex">
              <Badge tone="info">{t("aiLabel")}</Badge>
            </h2>
            {review ? (
              <Badge tone="success">
                <CheckIcon />
                {t("reviewedBy", { name: review.name, gender: review.gender })}
              </Badge>
            ) : (
              <Badge tone="warning">{t("notReviewed")}</Badge>
            )}
          </div>
          <Link href={humanHref} className="inline-flex min-h-11 items-center gap-1 font-semibold text-sea-700 hover:underline">
            {tc("talkToHuman")}
            <ChevronNext className="size-4" />
          </Link>
        </div>
        <p className="mt-2 text-ink-700">
          {t("aiWritten", {
            audience,
            name: patientName,
            date: formatDate(summary.generatedAt, timeZone, locale),
            files: t("files", counted(summary.documents.length)),
            pages: t("pages", counted(pages)),
          })}{" "}
          {review ? `${t("reviewedOn", { date: formatDate(review.at, timeZone, locale) })} ` : null}
          {t("aiCheck")}
        </p>
        <p className="mt-2 text-sm text-ink-700">
          {flagCount || unreadableCount ? (
            <>
              <span className="font-semibold text-ink-900">{t("checkFirst")}</span>{" "}
              {flagCount ? jump("summary-flags", t("flagCount", counted(flagCount))) : null}
              {flagCount && unreadableCount ? sep : null}
              {unreadableCount ? jump("summary-unreadable", t("unreadableCount", counted(unreadableCount))) : null}
            </>
          ) : (
            t("allClear")
          )}
        </p>
        {actions ? <div className="mt-4 border-t border-sand-200 pt-4 print:hidden">{actions}</div> : null}
      </section>

      {/* Not a diagnosis, in the body (T5). */}
      <p className="rounded-[var(--radius-field)] bg-sand-100 px-4 py-3 text-ink-700">{t("notDiagnosis", { audience })}</p>

      {tabHref ? (
        <>
          <nav aria-label={t("tabs.label")} className="print:hidden">
            <ul className="flex border-b border-sand-300">
              {summaryViews.map((v) => {
                const active = v === view;
                const count = v === "flags" ? flagCount + unreadableCount : 0;
                return (
                  <li key={v} className="flex flex-1 sm:flex-none">
                    <Link
                      href={tabHref(v)}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={[tabClass, active ? "border-sea-700 text-sea-900" : "border-transparent text-ink-700 hover:text-sea-900"].join(" ")}
                    >
                      {t(`tabs.${v}`)}
                      {count ? (
                        <span className="tabular rounded-[var(--radius-tag)] bg-gold-100 px-2 text-sm text-warning">{num(count)}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* Closed tabs stay out of sight but print: a download always carries every block, flag and unreadable page. */}
          <div className={view === "overview" ? "" : "hidden print:block"}>
            <div className="grid gap-6 lg:grid-cols-2">
              {conditionsBlock}
              {proceduresBlock}
              {medicationsBlock}
              {allergiesBlock}
              {resultsBlock}
              {sourcesBlock}
            </div>
          </div>
          <div className={view === "timeline" ? "print:hidden" : "hidden"}>
            {view === "timeline" ? (
              <SummaryTimeline
                summary={summary}
                audience={audience}
                day={day}
                pageCount={(n) => t("pages", counted(n))}
                amount={amount}
                rangeBadge={rangeBadge}
                sources={sources}
                docLink={sourceHref}
                pick={pick}
              />
            ) : null}
          </div>
          <div className={view === "flags" ? "" : "hidden print:block"}>
            <div className="grid gap-6 lg:grid-cols-2">
              {flagsBlock}
              {unreadableBlock}
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {conditionsBlock}
          {proceduresBlock}
          {medicationsBlock}
          {allergiesBlock}
          {resultsBlock}
          {flagsBlock}
          {unreadableBlock}
          {sourcesBlock}
        </div>
      )}
    </div>
  );
}

/** A block's item list, or its empty line: what the documents do not show is said, never filled in (rule T6). */
function Items({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (children.length === 0) return <p className="mt-3 text-ink-500">{empty}</p>;
  return <ul className="mt-1 divide-y divide-sand-200">{children}</ul>;
}

/* ---------------- Timeline ---------------- */

/**
 * The Timeline tab: one node per day the documents give, newest first, on a vertical axis at the start edge (right in Arabic,
 * left in English; rule R11). Dates and values keep Western digits in one left-to-right run (rules N1, R3).
 */
function SummaryTimeline({
  summary,
  audience,
  day,
  pageCount,
  amount,
  rangeBadge,
  sources,
  docLink,
  pick,
}: {
  summary: SummaryData;
  audience: SummaryAudience;
  day: (d: string) => string;
  pageCount: (n: number) => string;
  amount: (value: number, decimals: number, unit: string, className?: string) => ReactNode;
  rangeBadge: (r: SummaryResult) => ReactNode;
  sources: (refs: SummarySourceRef[]) => ReactNode;
  docLink?: (ref: SummarySourceRef) => string;
  pick: (en: string, ar: string) => string;
}) {
  const t = useTranslations("summary");
  const { dated, undated } = timelineOf(summary);
  const kind = (k: TimelineEntry["kind"]) => <p className="text-sm font-semibold text-ink-500">{t(`kind.${k}`)}</p>;

  const entry = (e: TimelineEntry) => {
    switch (e.kind) {
      case "document": {
        const title = pick(e.doc.titleEn, e.doc.titleAr);
        return (
          <>
            {kind("document")}
            <p className="font-semibold text-ink-900">
              {docLink ? (
                <Link href={docLink({ doc: e.doc.id, page: 1 })} scroll={false} className="text-sea-700 underline-offset-2 hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </p>
            <p className="text-sm text-ink-700">{pageCount(e.doc.pages)}</p>
          </>
        );
      }
      case "condition":
      case "procedure":
        return (
          <>
            {kind(e.kind)}
            <p className="font-semibold text-ink-900">{pick(e.item.nameEn, e.item.nameAr)}</p>
            {sources(e.item.sources)}
          </>
        );
      case "result":
        return (
          <>
            {kind("result")}
            <p className="font-semibold text-ink-900">{pick(e.item.nameEn, e.item.nameAr)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              {amount(e.item.value, e.item.decimals, e.item.unit, "font-bold text-ink-900")}
              {rangeBadge(e.item)}
            </p>
            {sources(e.item.sources)}
          </>
        );
    }
  };

  return (
    <Surface>
      <h2 className="text-xl font-bold text-sea-900">{t("tabs.timeline")}</h2>
      <p className="mt-1 text-sm text-ink-700">{t("timeline.order", { audience })}</p>
      {dated.length === 0 ? (
        <p className="mt-3 text-ink-500">{t("timeline.empty")}</p>
      ) : (
        <ol className="mt-5">
          {dated.map(({ date, entries }) => (
            <li key={date} className="group relative pb-6 ps-8 last:pb-0">
              {/* The axis and its marker sit at the start edge, so the axis mirrors with the page (rule R11). */}
              <span aria-hidden="true" className="absolute start-[7px] top-[22px] -bottom-1.5 w-0.5 bg-sand-300 group-last:hidden" />
              <span aria-hidden="true" className="absolute start-0 top-1.5 size-4 rounded-full border-4 border-sea-100 bg-sea-700" />
              <h3 className="font-bold text-sea-900">
                <time dateTime={date}>{day(date)}</time>
              </h3>
              <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                {entries.map((e) => (
                  <li key={e.key} className="rounded-[var(--radius-field)] bg-sand-50 px-4 py-3">
                    {entry(e)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {/* What the timeline cannot show, said rather than guessed (rule T6). */}
      <p className="mt-5 border-t border-sand-200 pt-4 text-sm text-ink-700">
        {t("timeline.undated", { audience })}
        {undated.length ? ` ${t("timeline.undatedItems", { items: undated.map((u) => pick(u.en, u.ar)).join(t("listSeparator")) })}` : null}
      </p>
    </Surface>
  );
}

/* ---------------- Source page sheet ---------------- */

/**
 * The page viewer `sourceHref` opens (screen 26 hook: tap any item to see its source page). A bottom sheet on phone and a side
 * panel at the end edge on desktop, rendered by the server from the URL: closing is a link back without the page. Shows the
 * page, what the summary took from it, the flags that cite it, and for an unreadable page the reason and the fix.
 * Prototype: there are no uploaded files, so the page image is a neutral placeholder; production loads the page image from
 * private storage through a short-lived signed link.
 */
export function SummarySourceSheet({
  summary,
  locale,
  source,
  closeHref,
  pageHref,
  unreadableAction,
}: {
  summary: SummaryData;
  locale: Locale;
  source: SummarySourceRef;
  closeHref: string;
  /** Previous and next page of the same document. */
  pageHref: (ref: SummarySourceRef) => string;
  unreadableAction?: ReactNode;
}) {
  const t = useTranslations("summary");
  const tc = useTranslations("common");
  const ar = locale === "ar";
  const pick = (en: string, arText: string) => (ar ? arText : en);
  const num = (n: number, decimals = 0) => formatNumber(n, locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const day = (d: string) => formatDate(new Date(`${d}T00:00:00Z`), "UTC", locale);
  const sep = t("listSeparator");

  const doc = summary.documents.find((d) => d.id === source.doc);
  if (!doc || source.page < 1 || source.page > doc.pages) return null;
  const here = (refs: SummarySourceRef[]) => refs.some((r) => r.doc === source.doc && r.page === source.page);
  const unreadable = summary.unreadable.find((u) => u.doc === source.doc && u.page === source.page);
  const amount = (value: number, decimals: number, unit: string) => (
    <span className="ltr-run tabular">{`${num(value, decimals)} ${unit}`}</span>
  );

  const taken: Array<{ key: string; kind: "condition" | "procedure" | "medication" | "allergy" | "result"; name: string; detail?: ReactNode }> = [
    ...summary.conditions.filter((c) => here(c.sources)).map((c) => ({ key: `c-${c.nameEn}`, kind: "condition" as const, name: pick(c.nameEn, c.nameAr) })),
    ...summary.procedures.filter((p) => here(p.sources)).map((p) => ({ key: `p-${p.nameEn}`, kind: "procedure" as const, name: pick(p.nameEn, p.nameAr) })),
    ...summary.medications
      .filter((m) => here(m.sources))
      .map((m) => ({
        key: `m-${m.nameEn}`,
        kind: "medication" as const,
        name: pick(m.nameEn, m.nameAr),
        detail:
          m.dose || m.frequency ? (
            <>
              {m.dose ? amount(m.dose.amount, m.dose.decimals, m.dose.unit) : null}
              {m.dose && m.frequency ? sep : null}
              {m.frequency ? t(`frequency.${m.frequency}`) : null}
            </>
          ) : undefined,
      })),
    ...summary.allergies
      .filter((a) => here(a.sources))
      .map((a) => {
        const reaction = ar ? a.reactionAr : a.reactionEn;
        return { key: `a-${a.nameEn}`, kind: "allergy" as const, name: pick(a.nameEn, a.nameAr), detail: reaction ? t("reaction", { reaction }) : undefined };
      }),
    ...summary.results
      .filter((r) => here(r.sources))
      .map((r) => {
        const outside = outsideRange(r);
        return {
          key: `r-${r.nameEn}`,
          kind: "result" as const,
          name: pick(r.nameEn, r.nameAr),
          detail: (
            <span className="flex flex-wrap items-center gap-2">
              {amount(r.value, r.decimals, r.unit)}
              {outside ? <Badge tone="warning">{t(outside)}</Badge> : null}
            </span>
          ),
        };
      }),
  ];
  const flagged = summary.flags.filter((f) => here(f.sources));
  const prev = source.page > 1 ? { doc: doc.id, page: source.page - 1 } : null;
  const next = source.page < doc.pages ? { doc: doc.id, page: source.page + 1 } : null;
  const pageLink = "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-field)] px-2 font-semibold text-sea-700 hover:bg-sand-100";

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-stretch md:justify-end print:hidden">
      {/* The dimmed page behind closes the sheet; the Close link is the keyboard route. */}
      <Link href={closeHref} scroll={false} tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-sea-900/40" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-sheet-title"
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-sand-50 shadow-[var(--shadow-card)] md:h-full md:max-h-none md:max-w-md md:rounded-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-sand-200 bg-white px-5 py-3">
          <div className="min-w-0">
            <h2 id="source-sheet-title" className="text-lg font-bold text-sea-900">
              {pick(doc.titleEn, doc.titleAr)}
            </h2>
            <p className="text-sm text-ink-700">
              {t("sheet.pageOf", { page: num(source.page), pages: num(doc.pages) })}
              {doc.datedOn ? ` · ${t("dated", { date: day(doc.datedOn) })}` : null}
            </p>
          </div>
          <Link href={closeHref} scroll={false} className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-field)] px-3 font-semibold text-sea-700 hover:bg-sand-100">
            {tc("close")}
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {unreadable ? (
            <div className="mb-5 rounded-[var(--radius-field)] border border-sand-300 bg-white p-4">
              <Badge tone="pending">{t("unreadableLabel")}</Badge>
              <p className="mt-2 text-ink-900">{t(`unreadableReason.${unreadable.reason}`)}</p>
              {unreadableAction ? <div className="mt-3">{unreadableAction}</div> : null}
            </div>
          ) : null}

          <figure>
            <div
              aria-hidden="true"
              className="mx-auto flex aspect-[3/4] w-full max-w-56 flex-col gap-2.5 rounded-[var(--radius-field)] border border-sand-300 bg-white p-5 shadow-[var(--shadow-nav)]"
            >
              <span className="h-3 w-1/2 rounded-full bg-sand-300" />
              <span className="mt-2 h-2 w-full rounded-full bg-sand-200" />
              <span className="h-2 w-5/6 rounded-full bg-sand-200" />
              <span className="h-2 w-full rounded-full bg-sand-200" />
              <span className="h-2 w-2/3 rounded-full bg-sand-200" />
              <span className="mt-2 h-2 w-full rounded-full bg-sand-200" />
              <span className="h-2 w-3/4 rounded-full bg-sand-200" />
            </div>
            <figcaption className="mt-2 text-center text-sm text-ink-500">{t("sheet.preview")}</figcaption>
          </figure>

          {unreadable ? null : (
            <section aria-labelledby="source-sheet-taken" className="mt-5">
              <h3 id="source-sheet-taken" className="font-bold text-sea-900">
                {t("sheet.taken")}
              </h3>
              {taken.length ? (
                <ul className="mt-1 divide-y divide-sand-200">
                  {taken.map((item) => (
                    <li key={item.key} className="py-2.5">
                      <p className="text-sm font-semibold text-ink-500">{t(`kind.${item.kind}`)}</p>
                      <p className="font-semibold text-ink-900">{item.name}</p>
                      {item.detail ? <div className="text-sm text-ink-700">{item.detail}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ink-500">{t("sheet.takenEmpty")}</p>
              )}
            </section>
          )}

          {flagged.length ? (
            <section aria-labelledby="source-sheet-flags" className="mt-5">
              <h3 id="source-sheet-flags" className="font-bold text-sea-900">
                {t("sheet.flagged")}
              </h3>
              <ul className="mt-1 divide-y divide-sand-200">
                {flagged.map((f) => (
                  <li key={f.textEn} className="py-2.5">
                    <Badge tone={f.kind === "conflict" ? "danger" : "warning"}>{t(`flagKind.${f.kind}`)}</Badge>
                    <p className="mt-1.5 text-ink-900">{pick(f.textEn, f.textAr)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {prev || next ? (
          <nav aria-label={t("sheet.pagesLabel")} className="flex items-center justify-between gap-3 border-t border-sand-200 bg-white px-3 py-1.5">
            {prev ? (
              <Link href={pageHref(prev)} scroll={false} className={pageLink}>
                {/* Back chevron: the flipped wrapper plus ChevronNext's own RTL mirror point it toward the start. */}
                <span className="inline-flex -scale-x-100">
                  <ChevronNext className="size-4" />
                </span>
                {t("sheet.prev")}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={pageHref(next)} scroll={false} className={pageLink}>
                {t("sheet.next")}
                <ChevronNext className="size-4" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </aside>
    </div>
  );
}

/* ---------------- Skeleton ---------------- */

/** Content-shaped loading state (rule L1): the real AI label and block titles, skeleton lines where items go. `tabs` adds the
 *  tab row of the tabbed layout (screen 26). */
export function SummaryViewerSkeleton({ tabs = false }: { tabs?: boolean } = {}) {
  const t = useTranslations("summary");
  const blocks = ["conditions", "procedures", "medications", "allergies"] as const;
  return (
    <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] border border-sky-500/40 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{t("aiLabel")}</Badge>
          <Skeleton className="h-7 w-40 rounded-[var(--radius-tag)]" />
        </div>
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <div className="mt-4 border-t border-sand-200 pt-4">
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-52" />
        </div>
      </section>
      {tabs ? (
        <div className="flex border-b border-sand-300">
          {summaryViews.map((v) => (
            <span key={v} className={[tabClass, v === "overview" ? "border-sea-700 text-sea-900" : "border-transparent text-ink-700"].join(" ")}>
              {t(`tabs.${v}`)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {blocks.map((b) => (
          <Surface key={b}>
            <h2 className={blockTitle}>{t(`sections.${b}`)}</h2>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Surface>
        ))}
        <Surface className="lg:col-span-2">
          <h2 className={blockTitle}>{t("sections.results")}</h2>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Surface>
      </div>
    </div>
  );
}
