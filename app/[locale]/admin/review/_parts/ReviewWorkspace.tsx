"use client";
// The working part of a claim (screen 38): the verification checklist first (above the fold, layout call), then the registry
// comparison the page renders on the server (`comparison`), then the decision. Each check shows the doctor's entry, the
// documents that back it (thumbnails opening the viewer), the primary sources to open, and the result with its source; the
// time and the reviewer are stamped when a result is set (rule A1). Approve opens only when every check that applies matches
// and the licence expiry is in (rule A2); reject needs what to fix and a reason, previewed exactly as the doctor's builder
// shows it. Neither outcome asks for confirmation: both are reversible, so the result offers Undo instead (rule B10), and the
// buttons name the outcome. Dates on first render come formatted from the server; the page formats only after a tap.
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DoctorCardData } from "@/components/brand/DoctorCard";
import { Badge, Button, Field, Input, Notice, RadioCard, SegmentedControl, Select, Surface, Textarea, Toast, ToastRegion } from "@/components/ui";
import { formatDate, formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { decideClaim, undoDecision, type DecisionResult as ActionResult } from "../actions";
import { BuilderPreview, DecisionResult, resultTone, type DecidedRow, type DecidedView } from "./DecisionResult";
import { DocumentThumb, type ThumbFile } from "./DocumentThumb";
import {
  CHECK_KEYS,
  CHECK_SOURCES,
  FIX_KINDS,
  REASON,
  boardCheckApplies,
  checkGap,
  checkGaps,
  checksDone,
  firstMismatch,
  fixKindFor,
  reasonError,
  reverification,
  type BoardClaim,
  type CheckResult,
  type CheckState,
  type Checks,
  type FixKind,
  type ReasonError,
  type ReviewCheckKey,
} from "./model";

/** What one check shows, formatted on the server. */
export type CheckItemView = {
  entry: string;
  /** True where the doctor should have uploaded a file (licence, board): an empty list then says so. */
  expectsFiles: boolean;
  files: ThumbFile[];
  links: Array<{ href: string; label: string }>;
  sourceLabels: Record<string, string>;
  /** Short list under the entry (the photo guidance, rule C4). */
  points?: string[];
};

type Props = {
  doctorId: string;
  doctorName: string;
  reviewer: string;
  zone: string;
  doctorZone: string;
  todayIso: string;
  todayLabel: string;
  cycleMonths: number;
  board: BoardClaim;
  items: Record<ReviewCheckKey, CheckItemView>;
  initialChecks: Checks;
  initialStamps: Partial<Record<ReviewCheckKey, string>>;
  initialOutcome?: "approve" | "reject";
  initialError?: "unavailable";
  initialReverifyLabel?: string;
  decided?: DecidedView;
  card: DoctorCardData;
  next?: { href: string; name: string };
  queueHref: string;
  builderHref?: string;
  comparison: ReactNode;
};

type ErrorState = Extract<ActionResult, { ok: false }>;
type Toasting = { message: string; undo: boolean } | null;

const sectionTitle = "text-lg font-bold text-sea-900 outline-none";

export function ReviewWorkspace(props: Props) {
  const { doctorId, doctorName, reviewer, zone, doctorZone, todayIso, todayLabel, cycleMonths, board, items } = props;
  const t = useTranslations("adminReview");
  // The card's own wording (card.verifiedOn), so the promise here is word for word what the card will show.
  const tCard = useTranslations("card");
  const locale = useLocale() as Locale;
  const [checks, setChecks] = useState<Checks>(props.initialChecks);
  const [stamps, setStamps] = useState<Partial<Record<ReviewCheckKey, string>>>(props.initialStamps);
  const [touched, setTouched] = useState(false);
  const [outcome, setOutcome] = useState<"approve" | "reject" | null>(props.initialOutcome ?? null);
  const [fix, setFix] = useState<FixKind>(() => {
    const m = firstMismatch(props.initialChecks);
    return m ? fixKindFor(m) : "licence";
  });
  const [reasonEn, setReasonEn] = useState("");
  const [reasonAr, setReasonAr] = useState("");
  const [showReasonError, setShowReasonError] = useState(false);
  const [error, setError] = useState<ErrorState | { ok: false; error: "unavailable" } | null>(props.initialError ? { ok: false, error: "unavailable" } : null);
  const [decided, setDecided] = useState<DecidedView | undefined>(props.decided);
  const [fromPage, setFromPage] = useState(false);
  const [toast, setToast] = useState<Toasting>(null);
  const [pending, startTransition] = useTransition();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const decisionRef = useRef<HTMLHeadingElement>(null);

  const now = () => new Date();
  const stampFor = (at: Date) => `${formatDate(at, zone, locale)} · ${formatTimeInZone(at, zone, locale)}`;
  const calendar = (iso: string) => formatDate(new Date(`${iso}T00:00:00Z`), "UTC", locale);
  // Numbers reach ICU as formatted strings (Western digits, rule N1); the raw number only picks the plural form.
  const n = (v: number) => formatNumber(v, locale);
  const limits = { min: n(REASON.minChars), max: n(REASON.maxChars) };
  const months = { months: cycleMonths, monthsLabel: n(cycleMonths) };

  const gaps = checkGaps(checks, board, todayIso);
  const progress = checksDone(checks, board, todayIso);
  const ready = gaps.length === 0;
  const anyMismatch = CHECK_KEYS.some((k) => (k !== "board" || boardCheckApplies(board)) && checks[k].result === "mismatch");
  const reverify = ready ? reverification(touched ? now() : new Date(`${todayIso}T12:00:00Z`), checks.licence.expiresOn, cycleMonths) : null;
  const reverifyLabel = reverify ? (touched || !props.initialReverifyLabel ? calendar(reverify.on.toISOString().slice(0, 10)) : props.initialReverifyLabel) : undefined;
  const reasonProblem: ReasonError | undefined = reasonError(reasonEn, reasonAr);

  const update = (key: ReviewCheckKey, patch: Partial<CheckState>) => {
    setTouched(true);
    setError(null);
    setChecks((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  };

  const setResult = (key: ReviewCheckKey, result: CheckResult) => {
    const at = now();
    update(key, { result, checkedAtUtc: result === "unchecked" ? null : at.toISOString() });
    setStamps((s) => ({ ...s, [key]: result === "unchecked" ? undefined : stampFor(at) }));
    if (result === "mismatch") {
      setOutcome("reject");
      setFix(fixKindFor(key));
    }
  };

  const rowsFor = (c: Checks, s: Partial<Record<ReviewCheckKey, string>>): DecidedRow[] =>
    CHECK_KEYS.map((key) =>
      key === "board" && !boardCheckApplies(board)
        ? { key, result: "eligible" }
        : {
            key,
            result: c[key].result,
            sourceLabel: items[key].sourceLabels[c[key].source],
            stampLabel: s[key],
            expiryLabel: key === "licence" && c.licence.expiresOn ? calendar(c.licence.expiresOn) : undefined,
          },
    );

  const submit = (which: "approve" | "reject") => {
    if (which === "reject" && reasonProblem) {
      setShowReasonError(true);
      document.getElementById("reason-en")?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await decideClaim({ doctorId, outcome: which, checks, fix, reasonEn, reasonAr }).catch(
        (): ActionResult => ({ ok: false, error: "unavailable" }),
      );
      if (!result.ok) {
        setError(result);
        return;
      }
      const at = new Date(result.decidedAtUtc);
      setDecided({
        outcome: result.outcome,
        decidedLabel: stampFor(at),
        verifiedOnLabel: formatDate(at, zone, locale),
        reverifyLabel: result.outcome === "approve" ? calendar(result.reverifyOn) : undefined,
        reverifyBy: result.outcome === "approve" ? result.reverifyBy : undefined,
        fix: result.outcome === "reject" ? fix : undefined,
        reasonEn,
        reasonAr,
        reviewedDateLabel: formatDate(at, doctorZone, locale),
        rows: rowsFor(checks, stamps),
      });
      setFromPage(true);
      setToast({ message: t(result.outcome === "approve" ? "toast.approved" : "toast.rejected", { name: doctorName }), undo: true });
      requestAnimationFrame(() => resultRef.current?.focus());
    });
  };

  const undo = () => {
    startTransition(async () => {
      const result = await undoDecision({ doctorId }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
      if (!result.ok) {
        setToast({ message: t("toast.undoFailed"), undo: false });
        return;
      }
      setDecided(undefined);
      setFromPage(false);
      setToast({ message: t("toast.undone", { name: doctorName }), undo: false });
      requestAnimationFrame(() => decisionRef.current?.focus());
    });
  };

  const toastRegion = (
    <ToastRegion>
      {toast ? (
        <Toast
          message={toast.message}
          actionLabel={toast.undo ? t("toast.undo") : undefined}
          onAction={toast.undo ? undo : undefined}
          dismissLabel={t("toast.dismiss")}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ToastRegion>
  );

  if (decided) {
    return (
      <>
        <DecisionResult
          view={decided}
          doctorName={doctorName}
          reviewer={reviewer}
          card={props.card}
          boardCertified={board.status === "certified"}
          next={props.next}
          queueHref={props.queueHref}
          builderHref={fromPage ? undefined : props.builderHref}
          headingRef={resultRef}
        />
        {props.comparison}
        {toastRegion}
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="checklist-title">
        <Surface className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="checklist-title" className={sectionTitle}>
              {t("checks.title")}
            </h2>
            <Badge tone={progress.done === progress.of ? "success" : "pending"}>
              <span className="tabular">{t("checks.progress", { done: n(progress.done), of: n(progress.of) })}</span>
            </Badge>
          </div>
          <p className="-mt-2 text-sm text-ink-700">{t("checks.lead", { name: reviewer })}</p>
          <ol className="flex flex-col gap-4">
            {CHECK_KEYS.map((key, i) => (
              <CheckItem
                key={key}
                index={i + 1}
                checkKey={key}
                view={items[key]}
                check={checks[key]}
                stamp={stamps[key]}
                board={board}
                todayIso={todayIso}
                cycleMonths={cycleMonths}
                reviewer={reviewer}
                onResult={(r) => setResult(key, r)}
                onChange={(patch) => update(key, patch)}
              />
            ))}
          </ol>
        </Surface>
      </section>

      {props.comparison}

      <section aria-labelledby="decision-title">
        <Surface className="flex flex-col gap-4">
          <h2 id="decision-title" ref={decisionRef} tabIndex={-1} className={sectionTitle}>
            {t("decision.title")}
          </h2>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">{t("decision.legend")}</legend>
            <RadioCard
              name="outcome"
              value="approve"
              checked={outcome === "approve"}
              onChange={() => setOutcome("approve")}
              title={t("decision.approve.title")}
              description={t("decision.approve.description", { line: tCard("verifiedOn", { date: todayLabel }) })}
            />
            <RadioCard
              name="outcome"
              value="reject"
              checked={outcome === "reject"}
              onChange={() => setOutcome("reject")}
              title={t("decision.reject.title")}
              description={t("decision.reject.description")}
            />
          </fieldset>

          {outcome === "approve" ? (
            <div className="flex flex-col gap-4">
              {anyMismatch ? (
                <Notice tone="danger" title={t("decision.approve.mismatchTitle")} body={t("decision.approve.mismatchBody")} />
              ) : !ready ? (
                <Notice tone="warning" title={t("decision.approve.notReady")}>
                  <ul className="mt-1 list-disc ps-5 text-ink-700">
                    {gaps.map((g) => (
                      <li key={g.key}>
                        {t(`checks.${g.key}.title`)}: {t(`gap.${g.gap}`)}
                      </li>
                    ))}
                  </ul>
                </Notice>
              ) : (
                <Notice tone="info" body={<p>{t(`decision.approve.ready.${reverify?.by ?? "cycle"}`, { date: reverifyLabel ?? "", ...months })}</p>}>
                  {board.status === "eligible" ? <p className="mt-1 text-ink-700">{t("decision.approve.eligible")}</p> : null}
                </Notice>
              )}
              <div>
                <Button type="button" size="lg" disabled={!ready || pending} onClick={() => submit("approve")} className="w-full sm:w-auto">
                  {pending ? t("decision.working") : t("decision.approve.button", { name: doctorName })}
                </Button>
              </div>
            </div>
          ) : outcome === "reject" ? (
            <div className="flex flex-col gap-4">
              <fieldset>
                <legend className="mb-2 text-[15px] font-semibold text-ink-900">{t("decision.reject.fixLegend")}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {FIX_KINDS.map((k) => (
                    <RadioCard key={k} name="fix" value={k} checked={fix === k} onChange={() => setFix(k)} title={t(`decision.reject.fix.${k}`)} />
                  ))}
                </div>
              </fieldset>
              <Field
                id="reason-en"
                label={t("decision.reject.reasonEn")}
                hint={t("decision.reject.reasonEnHint", limits)}
                error={showReasonError && reasonProblem ? t(`errors.${reasonProblem}`, limits) : undefined}
              >
                <Textarea
                  id="reason-en"
                  lang="en"
                  dir="ltr"
                  value={reasonEn}
                  maxLength={REASON.maxChars}
                  invalid={showReasonError && !!reasonProblem}
                  aria-describedby={showReasonError && reasonProblem ? "reason-en-error" : "reason-en-hint"}
                  onChange={(e) => setReasonEn(e.currentTarget.value)}
                  className="min-h-28"
                />
              </Field>
              <Field id="reason-ar" label={t("decision.reject.reasonAr")} hint={t("decision.reject.reasonArHint")}>
                <Textarea
                  id="reason-ar"
                  lang="ar"
                  dir="rtl"
                  value={reasonAr}
                  maxLength={REASON.maxChars}
                  aria-describedby="reason-ar-hint"
                  onChange={(e) => setReasonAr(e.currentTarget.value)}
                  className="min-h-28"
                />
              </Field>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink-700">{t("decision.reject.previewTitle", { name: doctorName })}</h3>
                <BuilderPreview fix={fix} reasonEn={reasonEn} reasonAr={reasonAr} dateLabel={todayLabel} emptyLabel={t("decision.reject.previewEmpty")} />
              </div>
              <div>
                <Button type="button" size="lg" variant="danger" disabled={pending} onClick={() => submit("reject")} className="w-full sm:w-auto">
                  {pending ? t("decision.working") : t("decision.reject.button")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-700">{t("decision.choose")}</p>
          )}

          {error ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error.error === "reason" ? t(`errors.${error.reason}`, limits) : t(`errors.${error.error}`)}
            </p>
          ) : null}
        </Surface>
      </section>
      {toastRegion}
    </>
  );
}

function CheckItem({
  index,
  checkKey: key,
  view,
  check,
  stamp,
  board,
  todayIso,
  cycleMonths,
  reviewer,
  onResult,
  onChange,
}: {
  index: number;
  checkKey: ReviewCheckKey;
  view: CheckItemView;
  check: CheckState;
  stamp?: string;
  board: BoardClaim;
  todayIso: string;
  cycleMonths: number;
  reviewer: string;
  onResult: (r: CheckResult) => void;
  onChange: (patch: Partial<CheckState>) => void;
}) {
  const t = useTranslations("adminReview");
  const locale = useLocale() as Locale;
  const applies = key !== "board" || boardCheckApplies(board);
  const gap = checkGap(key, check, board, todayIso);
  const status: DecidedRow["result"] = applies ? check.result : "eligible";
  const notNamed = gap === "boardNotNamed";
  const expiryError = key === "licence" && check.result === "match" && gap === "expiryPast" ? t("checks.licence.expiryPast") : undefined;

  return (
    <li id={`check-${key}`} className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-ink-900">
          <span className="tabular text-ink-500">{index}. </span>
          {t(`checks.${key}.title`)}
        </h3>
        <Badge tone={resultTone[status]}>{t(`checkResult.${status}`)}</Badge>
      </div>
      {applies ? <p className="mt-1 text-sm text-ink-700">{t(`checks.${key}.where`)}</p> : null}
      <p className="mt-2 text-ink-900">{view.entry}</p>
      {view.points?.length ? (
        <ul className="mt-1 list-disc ps-5 text-sm text-ink-700">
          {view.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {notNamed ? <Notice tone="danger" className="mt-3" body={t("checks.board.notNamed")} /> : null}
      {!applies ? <Notice tone="info" className="mt-3" body={t("checks.board.eligibleNote")} /> : null}

      {view.files.length || view.links.length ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {view.files.length ? (
            <ul className="flex flex-wrap gap-2" aria-label={t("checks.filesLabel")}>
              {view.files.map((f) => (
                <li key={f.id}>
                  <DocumentThumb file={f} />
                </li>
              ))}
            </ul>
          ) : view.expectsFiles ? (
            <p className="text-sm text-ink-500">{t("checks.noFiles")}</p>
          ) : null}
          {view.links.length ? (
            <ul className="flex flex-col gap-1 sm:items-end">
              {view.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 font-semibold text-sea-700 underline-offset-2 hover:underline"
                  >
                    {l.label}
                    <span className="sr-only"> {t("checks.newTab")}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {applies && !notNamed ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-sand-200 pt-3">
          {/* Two choices; "not checked" is simply neither chosen yet (the badge above says so). */}
          <SegmentedControl<CheckResult>
            legend={t("checks.result")}
            name={`result-${key}`}
            value={check.result}
            onChange={onResult}
            options={(["match", "mismatch"] as const).map((r) => ({ value: r, label: t(`checkResult.${r}`) }))}
          />
          {check.result !== "unchecked" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id={`source-${key}`} label={t("checks.source")}>
                <Select id={`source-${key}`} value={check.source} onChange={(e) => onChange({ source: e.currentTarget.value })}>
                  {CHECK_SOURCES[key].map((s) => (
                    <option key={s} value={s}>
                      {view.sourceLabels[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              {key === "licence" && check.result === "match" ? (
                <Field id="licence-expiry" label={t("checks.licence.expiry")} hint={t("checks.licence.expiryHint", { months: cycleMonths, monthsLabel: formatNumber(cycleMonths, locale) })} error={expiryError}>
                  <Input
                    id="licence-expiry"
                    type="date"
                    dir="ltr"
                    min={todayIso}
                    value={check.expiresOn}
                    invalid={!!expiryError}
                    aria-describedby={expiryError ? "licence-expiry-error" : "licence-expiry-hint"}
                    onChange={(e) => onChange({ expiresOn: e.currentTarget.value })}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          {stamp ? <p className="text-sm text-ink-500">{t("checks.stamp", { when: stamp, name: reviewer })}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
