// The one-page records summary (task 3.10). One component for both sides: the professional's shared-summary viewer (screen 36)
// and the patient's summary (screen 26). The top panel carries the AI label, the reviewed state and the route to a human
// (rules T4, Q6); the body opens with the not-a-diagnosis line (T5), then the five blocks with a source reference on every item
// (T6), the flags and the unreadable pages (never guessed at, CLAUDE.md), and the source documents. Medical values use
// Western digits through lib/format and stay one left-to-right run with their unit (rules N1, R3).
// The page owns the title and its own actions (`actions` slot in the top panel: open in visit notes, download). `sourceHref`
// turns each source reference into a link to the page viewer (screen 26's sheet); without it the reference is plain text.
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

/* ---------------- Viewer ---------------- */

const blockTitle = "text-xl font-bold text-sea-900";

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
}) {
  const t = useTranslations("summary");
  const tc = useTranslations("common");
  const ar = locale === "ar";
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
            <Link href={sourceHref(ref)} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
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
    <span className={`ltr-run tabular ${className ?? ""}`}>{`${num(value, decimals)} ${unit}`}</span>
  );

  const flagCount = summary.flags.length;
  const unreadableCount = summary.unreadable.length;

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
              {flagCount ? (
                <a href="#summary-flags" className="whitespace-nowrap font-semibold text-sea-700 underline underline-offset-2">
                  {t("flagCount", counted(flagCount))}
                </a>
              ) : null}
              {flagCount && unreadableCount ? sep : null}
              {unreadableCount ? (
                <a href="#summary-unreadable" className="whitespace-nowrap font-semibold text-sea-700 underline underline-offset-2">
                  {t("unreadableCount", counted(unreadableCount))}
                </a>
              ) : null}
            </>
          ) : (
            t("allClear")
          )}
        </p>
        {actions ? <div className="mt-4 border-t border-sand-200 pt-4">{actions}</div> : null}
      </section>

      {/* Not a diagnosis, in the body (T5). */}
      <p className="rounded-[var(--radius-field)] bg-sand-100 px-4 py-3 text-ink-700">{t("notDiagnosis", { audience })}</p>

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Surface className="lg:col-span-2">
          <h2 className={blockTitle}>{t("sections.results")}</h2>
          <Items empty={t("notFound")}>
            {summary.results.map((r) => {
              const outside = r.low != null && r.value < r.low ? "below" : r.high != null && r.value > r.high ? "above" : null;
              const range =
                r.low != null && r.high != null ? `${num(r.low, r.decimals)}–${num(r.high, r.decimals)} ${r.unit}` : null;
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
                      {outside ? <Badge tone="warning">{t(outside)}</Badge> : null}
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
                    <Link href={sourceHref(u)} className="text-sea-700 underline-offset-2 hover:underline">
                      {refLabel(u)}
                    </Link>
                  ) : (
                    refLabel(u)
                  )}
                </p>
                <p className="text-sm text-ink-700">{t(`unreadableReason.${u.reason}`)}</p>
              </li>
            ))}
          </Items>
        </Surface>

        <Surface className="lg:col-span-2">
          <h2 className={blockTitle}>{t("sections.sources")}</h2>
          <Items empty={t("notFound")}>
            {summary.documents.map((d) => (
              <li key={d.id} className="py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                <p className="font-semibold text-ink-900">{pick(d.titleEn, d.titleAr)}</p>
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
      </div>
    </div>
  );
}

/** A block's item list, or its empty line: what the documents do not show is said, never filled in (rule T6). */
function Items({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (children.length === 0) return <p className="mt-3 text-ink-500">{empty}</p>;
  return <ul className="mt-1 divide-y divide-sand-200">{children}</ul>;
}

/* ---------------- Skeleton ---------------- */

/** Content-shaped loading state (rule L1): the real AI label and block titles, skeleton lines where items go. */
export function SummaryViewerSkeleton() {
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
