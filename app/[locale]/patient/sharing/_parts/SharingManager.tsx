"use client";
// The live part of the sharing page (screen 27): the "who can see" panel, the shares, Stop sharing and the share sheet. Stop
// applies at once and offers Undo in the bar instead of a confirmation (rule B10); revoke is one tap (T7). Share opens a sheet
// that lists only the doctors of the patient's upcoming visits, with a length picker and the consent line naming the doctor and
// the end date, and the submit button names the outcome. Everything shown was formatted on the server (see types.ts).
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, EmptyState, LinkButton, RadioCard, Sheet, Surface, Toast, ToastRegion, type BadgeTone } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import type { ShareStatus } from "@/lib/sample";
import { shareSummary, stopSharing, undoStopSharing, type ShareResult, type StopResult } from "../actions";
import type { InitialChange, LengthView, ShareRowView, VisitView } from "./types";
import { WhoCanSee } from "./WhoCanSee";

// The patient reads "not opened yet" as neutral, "opened" as information, "reviewed" as done.
const STATUS_TONE: Record<ShareStatus, BadgeTone> = { new: "pending", viewed: "info", reviewed: "success" };
const TOAST_ID = "sharing-toast";
const SHEET_ID = "sharing-sheet";
const FORM_ID = "sharing-form";

type Undo = { kind: "stop" | "share"; id: string };
type ToastState = { message: string; undo?: Undo };

export function SharingManager({
  initialRows,
  visits,
  lengths,
  defaultDays,
  hasSummary,
  summaryLine,
  summaryCounts,
  today,
  initialChange,
  openOnLoad,
}: {
  initialRows: ShareRowView[];
  visits: VisitView[];
  lengths: LengthView[];
  defaultDays: number;
  hasSummary: boolean;
  /** "Records summary · 3 files · 12 pages". */
  summaryLine: string;
  summaryCounts: { files: string; pages: string };
  /** Today's date in the patient's zone, for a share made or stopped now. */
  today: string;
  initialChange: InitialChange;
  /** Open the share sheet on load (?state=sheet), so it can be reviewed from a URL. */
  openOnLoad: boolean;
}) {
  const t = useTranslations("sharing");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const days = (n: number) => t("days", { count: n, label: formatNumber(n, loc) });

  const [rows, setRows] = useState(initialRows);
  const [toast, setToast] = useState<ToastState | null>(() => {
    const row = initialChange ? initialRows.find((r) => r.id === initialChange.shareId) : undefined;
    if (!initialChange || !row) return null;
    return initialChange.kind === "shared"
      ? { message: t("toast.shared", { name: row.name, date: row.expiresOn }), undo: { kind: "share", id: row.id } }
      : { message: t("toast.stopped", { name: row.name }), undo: { kind: "stop", id: row.id } };
  });

  const live = rows.filter((r) => !r.ended);
  const ended = rows.filter((r) => r.ended);
  const liveUntil = new Map(live.map((r) => [r.doctorId, r.expiresOn]));
  const available = visits.filter((v) => !liveUntil.has(v.doctorId));
  const alreadyShared = visits.filter((v) => liveUntil.has(v.doctorId));

  // Focus never drops to the page: when the control the patient used goes away (Stop sharing, Undo), it moves to the bar.
  const focusToast = useRef(false);
  useEffect(() => {
    if (!focusToast.current) return;
    focusToast.current = false;
    document.getElementById(TOAST_ID)?.querySelector<HTMLElement>("button")?.focus();
  });

  /* ---------------- Stop sharing, and its Undo ---------------- */

  const patch = (id: string, change: Partial<ShareRowView>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));

  async function call(action: () => Promise<StopResult | ShareResult>): Promise<boolean> {
    try {
      return (await action()).ok;
    } catch {
      return false;
    }
  }

  async function stop(row: ShareRowView) {
    patch(row.id, { ended: { reason: "stopped", on: today }, fresh: false });
    setToast({ message: t("toast.stopped", { name: row.name }), undo: { kind: "stop", id: row.id } });
    focusToast.current = true;
    if (!(await call(() => stopSharing(row.id)))) {
      patch(row.id, { ended: null });
      setToast({ message: t("toast.failed") });
    }
  }

  async function undo() {
    const target = toast?.undo;
    const row = target ? rows.find((r) => r.id === target.id) : undefined;
    if (!target || !row) return;
    focusToast.current = true; // the Undo button goes; Close in the same bar keeps the focus
    if (target.kind === "stop") {
      patch(row.id, { ended: null });
      setToast({ message: t("toast.stopUndone", { name: row.name, date: row.expiresOn }) });
      if (!(await call(() => undoStopSharing(row.id)))) {
        patch(row.id, { ended: { reason: "stopped", on: today } });
        setToast({ message: t("toast.failed") });
      }
      return;
    }
    // Undo of a share made a moment ago: it ends at once and leaves the list, as if it had not been made.
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setToast({ message: t("toast.shareUndone", { name: row.name }) });
    if (!(await call(() => stopSharing(row.id)))) {
      setRows((rs) => [row, ...rs]);
      setToast({ message: t("toast.failed") });
    }
  }

  /* ---------------- Share sheet ---------------- */

  const sheetRef = useRef<HTMLDialogElement>(null);
  const [doctorId, setDoctorId] = useState<string | null>(available[0]?.doctorId ?? null);
  const [length, setLength] = useState(defaultDays);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = available.find((v) => v.doctorId === doctorId);
  const chosenLength = lengths.find((l) => l.days === length);

  function openSheet() {
    setDoctorId(available[0]?.doctorId ?? null);
    setLength(defaultDays);
    setError(null);
    sheetRef.current?.showModal();
  }

  useEffect(() => {
    if (openOnLoad) sheetRef.current?.showModal();
  }, [openOnLoad]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen || !chosenLength) {
      setError(t("sheet.pickDoctor"));
      return;
    }
    setError(null);
    startTransition(async () => {
      let result: ShareResult;
      try {
        result = await shareSummary(chosen.doctorId, chosenLength.days);
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (!result.ok) {
        setError(t(`sheet.errors.${result.error}`));
        return;
      }
      const row: ShareRowView = {
        id: result.id,
        doctorId: chosen.doctorId,
        name: chosen.name,
        specialty: chosen.specialty,
        sharedOn: today,
        expiresOn: chosenLength.until,
        daysLeft: chosenLength.days,
        status: "new",
        viewedOn: null,
        ended: null,
        fresh: true,
      };
      setRows((rs) => [row, ...rs.map((r) => ({ ...r, fresh: false }))]);
      sheetRef.current?.close();
      setToast({ message: t("toast.shared", { name: row.name, date: row.expiresOn }), undo: { kind: "share", id: row.id } });
    });
  }

  const shareButton = (
    <Button type="button" variant="secondary" onClick={openSheet} aria-haspopup="dialog" className="shrink-0">
      {t("list.share")}
    </Button>
  );

  return (
    <>
      {hasSummary ? <WhoCanSee people={live.map((r) => ({ id: r.id, name: r.name, until: r.expiresOn }))} /> : null}

      <section aria-labelledby="sharing-list-title" className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sharing-list-title" className="text-xl font-bold text-sea-900">
            {t("list.title")}
          </h2>
          {hasSummary && rows.length ? shareButton : null}
        </div>

        <div className="mt-4">
          {!hasSummary ? (
            <EmptyState
              title={t("noRecords.title")}
              body={t("noRecords.body")}
              action={<LinkButton href="/patient/records">{t("noRecords.action")}</LinkButton>}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t("empty.title")}
              body={t("empty.body", { days: days(Math.max(...lengths.map((l) => l.days))) })}
              action={
                <Button type="button" onClick={openSheet} aria-haspopup="dialog">
                  {t("empty.action")}
                </Button>
              }
            />
          ) : live.length === 0 ? (
            <p className="rounded-[var(--radius-field)] bg-sand-100 px-4 py-3 text-ink-700">{t("list.noneLive")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {live.map((row) => (
                <li key={row.id}>
                  <Surface className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_10rem_auto] sm:items-center sm:gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-lg font-bold text-sea-900">{row.name}</h3>
                        {row.fresh ? (
                          <Badge tone="info">{t("row.justShared")}</Badge>
                        ) : (
                          <Badge tone={STATUS_TONE[row.status]}>{t(`row.status.${row.status}`)}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-700">{row.specialty}</p>
                      <p className="text-sm text-ink-700">{summaryLine}</p>
                      {row.viewedOn ? <p className="text-sm text-ink-500">{t("row.viewedOn", { date: row.viewedOn })}</p> : null}
                    </div>
                    <dl className="grid grid-cols-2 gap-4 sm:contents">
                      <div>
                        <dt className="text-sm text-ink-500">{t("row.sharedOn")}</dt>
                        <dd className="font-semibold text-ink-900">{row.sharedOn}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink-500">{t("row.expiresOn")}</dt>
                        <dd className="font-semibold text-ink-900">{row.expiresOn}</dd>
                        <dd className="text-sm text-ink-700">{t("daysLeft", { count: row.daysLeft, label: formatNumber(row.daysLeft, loc) })}</dd>
                      </div>
                    </dl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void stop(row)}
                      aria-label={t("row.stopLabel", { name: row.name })}
                      className="w-full sm:w-auto"
                    >
                      {t("row.stop")}
                    </Button>
                  </Surface>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {ended.length ? (
        <section aria-labelledby="sharing-ended-title" className="mt-7">
          <h2 id="sharing-ended-title" className="text-xl font-bold text-sea-900">
            {t("list.endedTitle")}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {ended.map((row) => (
              <li key={row.id}>
                <Surface className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_10rem] sm:items-center sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-lg font-bold text-ink-900">{row.name}</h3>
                      <Badge tone="unclaimed">{t("row.ended")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">
                      {t(row.ended?.reason === "stopped" ? "row.endedStopped" : "row.endedExpired", { name: row.name })}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 sm:contents">
                    <div>
                      <dt className="text-sm text-ink-500">{t("row.sharedOn")}</dt>
                      <dd className="font-semibold text-ink-900">{row.sharedOn}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-500">{t("row.endedOn")}</dt>
                      <dd className="font-semibold text-ink-900">{row.ended?.on}</dd>
                    </div>
                  </dl>
                </Surface>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Sheet
        ref={sheetRef}
        id={SHEET_ID}
        title={t("sheet.title")}
        closeLabel={tc("close")}
        footer={
          available.length ? (
            // The consent line sits right above the button it describes, so it is read before the tap, never scrolled past.
            <div className="flex flex-col gap-3">
              {chosen && chosenLength ? (
                <p className="text-sm text-ink-900">{t("sheet.consent", { name: chosen.name, date: chosenLength.until })}</p>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" className="px-3" onClick={() => sheetRef.current?.close()}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" form={FORM_ID} className="flex-1" disabled={pending}>
                  {pending ? t("sheet.submitting") : chosen ? t("sheet.submit", { name: chosen.name }) : t("list.share")}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-5">
          <p className="text-sm text-ink-700">{t("sheet.what", summaryCounts)}</p>

          {visits.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-ink-900">{t("sheet.noVisits")}</p>
              <LinkButton href="/search">{tc("findDoctor")}</LinkButton>
            </div>
          ) : (
            <>
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-1 font-semibold text-ink-900">{t("sheet.doctorLegend")}</legend>
                <p className="-mt-1 text-sm text-ink-500">{t("sheet.doctorHint")}</p>
                {available.map((v) => (
                  <RadioCard
                    key={v.doctorId}
                    name="doctor"
                    value={v.doctorId}
                    title={v.name}
                    description={t("sheet.visitOn", { specialty: v.specialty, date: v.visitOn })}
                    checked={doctorId === v.doctorId}
                    onChange={() => setDoctorId(v.doctorId)}
                    invalid={!!error && !chosen}
                  />
                ))}
                {available.length === 0 ? <p className="text-ink-900">{t("sheet.allShared")}</p> : null}
                {alreadyShared.map((v) => (
                  <p key={v.doctorId} className="text-sm text-ink-700">
                    {t("sheet.alreadyShared", { name: v.name, date: liveUntil.get(v.doctorId) ?? "" })}
                  </p>
                ))}
              </fieldset>

              {available.length ? (
                <fieldset className="grid min-w-0 gap-2 sm:grid-cols-3">
                  <legend className="mb-3 font-semibold text-ink-900">{t("sheet.lengthLegend")}</legend>
                  {lengths.map((l) => (
                    <RadioCard
                      key={l.days}
                      name="length"
                      value={l.days}
                      title={l.days === defaultDays ? t("sheet.default", { days: days(l.days) }) : days(l.days)}
                      description={t("sheet.until", { date: l.until })}
                      checked={length === l.days}
                      onChange={() => setLength(l.days)}
                    />
                  ))}
                </fieldset>
              ) : null}
            </>
          )}
        </form>
      </Sheet>

      <ToastRegion>
        {toast ? (
          <Toast
            id={TOAST_ID}
            message={toast.message}
            actionLabel={toast.undo ? t("toast.undo") : undefined}
            onAction={toast.undo ? () => void undo() : undefined}
            dismissLabel={t("toast.dismiss")}
            onDismiss={() => setToast(null)}
          />
        ) : null}
      </ToastRegion>
    </>
  );
}
