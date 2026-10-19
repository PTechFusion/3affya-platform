"use client";
// Screen 30, the editor. Every change applies at once (rule L2: an optimistic change, well inside 400 ms), saves in the
// background and offers Undo instead of a confirmation (B10). The week grid, the patient preview and the exceptions read one
// model, so the preview is recomputed on every change. Saving the first weekly hours turns Accepting new patients on, with a
// one-line notice (B6); the server decides that, the page only shows it. Times are the doctor's wall clock in the doctor's
// zone, named once per group (P6); the server stores UTC instants plus the zone.
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, CheckIcon, EmptyState, Field, Select, Surface, Toast, ToastRegion } from "@/components/ui";
import { business } from "@/config/business";
import type { DateException, WallRange, Weekday } from "@/lib/slots";
import { gulfTimeZones } from "@/lib/viewer";
import { saveAvailability } from "../actions";
import {
  DOCTOR_TIME_ZONES,
  STARTER_DAY,
  exceptionProblem,
  hasWeeklyHours,
  nextRange,
  rangeProblem,
  todayIn,
  type AvailabilityModel,
  type DayException,
  type RangeProblem,
} from "../model";
import { useLabels } from "./labels";
import { Exceptions, EXCEPTION_ADD_ID } from "./Exceptions";
import { PatientPreview, viewerCity, type PreviewViewer } from "./PatientPreview";
import { RANGE_FROM_ID, RangeEditor, WeekGrid, addButtonId, rangeButtonId } from "./WeekGrid";

/** A change the page opens on, so a prototype state can show its Undo bar: the exception or first hours just added. */
export type InitialChange = { kind: "exceptionAdded"; id: string } | { kind: "firstHours"; day: Weekday; id: string };

/** idle: nothing changed since the page opened, so there is nothing to report. */
type SaveState = "idle" | "saved" | "saving" | "failed";
type ToastState = { message: string; undo?: AvailabilityModel };

const FIRST_HOURS_ID = "availability-first-hours";
const TOAST_ID = "availability-toast";

let idSeq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${++idSeq}`;
const byStart = (a: WallRange, b: WallRange) => a.start - b.start;
const byDate = (a: DayException, b: DayException) => a.date.localeCompare(b.date);

export function AvailabilityEditor({
  initialModel,
  initialAccepting,
  initialNotice,
  initialPreview,
  initialViewer,
  initialChange,
  nowIso,
}: {
  initialModel: AvailabilityModel;
  initialAccepting: boolean;
  initialNotice: boolean;
  initialPreview: boolean;
  initialViewer: PreviewViewer;
  initialChange?: InitialChange;
  /** The server's clock, so the first render matches on both sides. */
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const L = useLabels(now);
  const { t } = L;

  const [model, setModel] = useState(initialModel);
  const [accepting, setAccepting] = useState(initialAccepting);
  const [notice, setNotice] = useState(initialNotice);
  const [saveState, setSaveState] = useState<SaveState>(initialChange ? "saved" : "idle");
  const [preview, setPreview] = useState(initialPreview);
  const [viewer, setViewer] = useState(initialViewer);
  const [editing, setEditing] = useState<{ day: Weekday; id: string } | null>(null);
  const [justAddedId, setJustAddedId] = useState(initialChange?.kind === "exceptionAdded" ? initialChange.id : undefined);
  const [toast, setToast] = useState<ToastState | null>(() => {
    if (initialChange?.kind === "exceptionAdded") {
      const x = initialModel.exceptions.find((e) => e.id === initialChange.id);
      if (!x) return null;
      return { message: exceptionAddedText(x), undo: { ...initialModel, exceptions: initialModel.exceptions.filter((e) => e.id !== x.id) } };
    }
    if (initialChange?.kind === "firstHours") {
      const r = initialModel.week[initialChange.day].find((w) => w.id === initialChange.id);
      if (!r) return null;
      return {
        message: t("toast.added", { day: L.day(initialChange.day), range: L.range(r) }),
        undo: { ...initialModel, week: { ...initialModel.week, [initialChange.day]: [] } },
      };
    }
    return null;
  });

  const saveSeq = useRef(0);
  const acceptingRef = useRef(initialAccepting);
  // Focus never drops to the page: after a change it moves to the control the doctor needs next (an id; for the Undo bar, its
  // first button).
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    const target = document.getElementById(focusNext.current);
    (target?.tagName === "DIV" ? target.querySelector<HTMLElement>("button") : target)?.focus();
    focusNext.current = null;
  });

  function exceptionAddedText(x: DateException): string {
    const date = L.date(x.date, initialModel.timeZone);
    return x.kind === "off" ? t("toast.dayOffAdded", { date }) : t("toast.extraAdded", { date, range: L.range(x) });
  }

  /** Saves in the background. Only the newest save's answer counts, so a slow early save cannot overwrite a later one. */
  async function persist(next: AvailabilityModel) {
    const seq = ++saveSeq.current;
    setSaveState("saving");
    let result: Awaited<ReturnType<typeof saveAvailability>>;
    try {
      result = await saveAvailability(next);
    } catch {
      result = { ok: false, error: "unavailable" };
    }
    if (seq !== saveSeq.current) return;
    if (!result.ok) {
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    const was = acceptingRef.current;
    acceptingRef.current = result.acceptingNewPatients;
    setAccepting(result.acceptingNewPatients);
    if (!was && result.acceptingNewPatients) setNotice(true);
    if (!result.acceptingNewPatients) setNotice(false);
  }

  /** One change: applied at once, saved, and undoable from the bar (B10). */
  function commit(next: AvailabilityModel, message: string) {
    setToast({ message, undo: model });
    setModel(next);
    void persist(next);
  }

  function undo() {
    const back = toast?.undo;
    if (!back) return;
    setModel(back);
    setToast({ message: t("toast.undone") });
    if (editing && !back.week[editing.day].some((r) => r.id === editing.id)) setEditing(null);
    focusNext.current = TOAST_ID; // the Undo button is gone; Close in the same bar keeps the focus
    void persist(back);
  }

  const withDay = (day: Weekday, ranges: AvailabilityModel["week"][Weekday]) => ({ ...model, week: { ...model.week, [day]: [...ranges].sort(byStart) } });

  function addRange(day: Weekday) {
    const range = nextRange(model.week[day], model.slotMinutes);
    if (!range) return;
    const id = newId("r");
    commit(withDay(day, [...model.week[day], { id, ...range }]), t("toast.added", { day: L.day(day), range: L.range(range) }));
    setEditing({ day, id });
    focusNext.current = RANGE_FROM_ID;
  }

  function removeRange(day: Weekday, id: string) {
    const range = model.week[day].find((r) => r.id === id);
    if (!range) return;
    const next = withDay(day, model.week[day].filter((r) => r.id !== id));
    commit(next, t("toast.removed", { day: L.day(day), range: L.range(range) }));
    if (editing?.id === id) setEditing(null);
    // Focus stays where the doctor was: that day's Add button, or the empty state's one action once no hours are left.
    focusNext.current = hasWeeklyHours(next) ? addButtonId(day) : FIRST_HOURS_ID;
  }

  function changeRange(day: Weekday, id: string, next: WallRange): RangeProblem | undefined {
    const others = model.week[day].filter((r) => r.id !== id);
    const problem = rangeProblem(next, others);
    if (problem) return problem;
    commit(withDay(day, [...others, { id, ...next }]), t("toast.changed", { day: L.day(day), range: L.range(next) }));
    return undefined;
  }

  function closeEditor() {
    if (editing) focusNext.current = rangeButtonId(editing.id);
    setEditing(null);
  }

  function addException(x: DateException) {
    const problem = exceptionProblem(x, model.exceptions, todayIn(model.timeZone, now));
    if (problem) return problem;
    const id = newId("x");
    commit({ ...model, exceptions: [...model.exceptions, { ...x, id }].sort(byDate) }, exceptionAddedText(x));
    setJustAddedId(id);
    return undefined;
  }

  function removeException(id: string) {
    const x = model.exceptions.find((e) => e.id === id);
    if (!x) return;
    commit({ ...model, exceptions: model.exceptions.filter((e) => e.id !== id) }, t("toast.exceptionRemoved", { date: L.date(x.date, model.timeZone) }));
    if (justAddedId === id) setJustAddedId(undefined);
    focusNext.current = EXCEPTION_ADD_ID;
  }

  const zones = DOCTOR_TIME_ZONES.includes(model.timeZone) ? DOCTOR_TIME_ZONES : [model.timeZone, ...DOCTOR_TIME_ZONES];
  const hours = hasWeeklyHours(model);
  const editingRange = editing ? model.week[editing.day].find((r) => r.id === editing.id) : undefined;
  const city = viewerCity(L, viewer);
  const showPreview = preview && hours;

  return (
    <div className="flex flex-col gap-6">
      {/* Accepting new patients (rule B6) and the save state. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge tone={accepting ? "success" : "pending"}>{accepting ? t("accepting.on") : t("accepting.off")}</Badge>
          {saveState === "failed" ? (
            <p role="alert" className="flex flex-wrap items-center gap-x-2 text-sm text-danger">
              {t("status.failed")}
              <button type="button" onClick={() => void persist(model)} className="inline-flex min-h-11 items-center font-semibold text-sea-700 hover:underline">
                {t("status.retry")}
              </button>
            </p>
          ) : saveState !== "idle" ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              {saveState === "saved" ? <CheckIcon className="size-3.5 text-success" /> : null}
              {saveState === "saving" ? t("status.saving") : t("status.saved")}
            </p>
          ) : null}
        </div>
        {!accepting ? <p className="text-sm text-ink-700">{t("accepting.offHint")}</p> : null}
        {notice && accepting ? (
          <p role="status" className="rounded-[var(--radius-field)] bg-sky-100 px-4 py-3 text-sm font-semibold text-sea-800">
            {t("accepting.turnedOn")}
          </p>
        ) : null}
      </div>

      {/* Layout call: slot length and time zone above the grid, side by side even on phone so the grid stays above the fold.
          The zone is picked by city; its offset is named in the grid heading and the Undo bar (rule P6). */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-3xl">
        <Field id="availability-time-zone" label={t("settings.timeZone")}>
          <Select
            id="availability-time-zone"
            value={model.timeZone}
            onChange={(e) =>
              commit({ ...model, timeZone: e.target.value }, t("toast.zone", { zone: L.isolate(L.zone(e.target.value)) }))
            }
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {L.city(z)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="availability-slot-length" label={t("settings.slotLength")}>
          <Select
            id="availability-slot-length"
            value={model.slotMinutes}
            onChange={(e) => {
              const slotMinutes = Number(e.target.value);
              commit({ ...model, slotMinutes }, t("toast.slotLength", { length: L.minutes(slotMinutes) }));
            }}
          >
            {business.slotLengthMinutesOptions.map((m) => (
              <option key={m} value={m}>
                {L.minutes(m)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <section aria-labelledby="availability-week-title">
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="availability-week-title" className="text-xl font-bold text-sea-900">
                {t("grid.title")}
              </h2>
              {!showPreview ? (
                <p className="text-sm text-ink-700">
                  {t("grid.zoneLead")} <span className="ltr-run font-semibold text-ink-900">{L.zone(model.timeZone)}</span>
                </p>
              ) : null}
            </div>
            {hours ? (
              // The hook: one tap shows the week as a patient in the Gulf sees it.
              <Button
                variant={showPreview ? "primary" : "secondary"}
                aria-pressed={showPreview}
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditing(null);
                  setPreview((p) => !p);
                }}
              >
                {showPreview ? <CheckIcon className="size-4" /> : null}
                {t("preview.toggle", { city })}
              </Button>
            ) : null}
          </div>

          {!hours ? (
            <div className="mt-4">
              <EmptyState
                title={t("empty.title")}
                body={t("empty.body")}
                action={
                  <Button id={FIRST_HOURS_ID} onClick={() => addRange(STARTER_DAY)}>
                    {t("empty.action")}
                  </Button>
                }
              />
            </div>
          ) : showPreview ? (
            <PatientPreview
              L={L}
              model={model}
              viewer={viewer}
              now={now}
              onCountry={(country) => setViewer({ country, timeZone: gulfTimeZones[country] ?? viewer.timeZone })}
            />
          ) : (
            <>
              <WeekGrid
                L={L}
                week={model.week}
                slotMinutes={model.slotMinutes}
                editingId={editing?.id}
                onAdd={addRange}
                onEdit={(day, id) => {
                  if (editing?.id === id) return closeEditor();
                  setEditing({ day, id });
                  focusNext.current = RANGE_FROM_ID;
                }}
                onRemove={removeRange}
              />
              {editing && editingRange ? (
                <RangeEditor
                  key={editing.id}
                  L={L}
                  day={editing.day}
                  range={editingRange}
                  slotMinutes={model.slotMinutes}
                  onChange={(next) => changeRange(editing.day, editing.id, next)}
                  onDone={closeEditor}
                  onRemove={() => removeRange(editing.day, editing.id)}
                />
              ) : null}
            </>
          )}
        </Surface>
      </section>

      {hours ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <Exceptions
            L={L}
            timeZone={model.timeZone}
            exceptions={model.exceptions}
            today={todayIn(model.timeZone, now)}
            justAddedId={justAddedId}
            onAdd={addException}
            onRemove={removeException}
          />
          <section aria-labelledby="availability-notice-title">
            <Surface>
              <h2 id="availability-notice-title" className="text-xl font-bold text-sea-900">
                {t("notice.title")}
              </h2>
              <div className="mt-3">
                <Field id="availability-lead-time" label={t("notice.label")} hint={t("notice.hint")}>
                  <Select
                    id="availability-lead-time"
                    value={model.leadTimeHours}
                    aria-describedby="availability-lead-time-hint"
                    onChange={(e) => {
                      const leadTimeHours = Number(e.target.value);
                      commit({ ...model, leadTimeHours }, t("toast.notice", { notice: L.hours(leadTimeHours) }));
                    }}
                  >
                    {business.leadTimeHoursOptions.map((h) => (
                      <option key={h} value={h}>
                        {L.hours(h)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Surface>
          </section>
        </div>
      ) : null}

      <ToastRegion>
        {toast ? (
          <Toast
            id={TOAST_ID}
            message={toast.message}
            actionLabel={toast.undo ? t("toast.undo") : undefined}
            onAction={toast.undo ? undo : undefined}
            dismissLabel={t("toast.dismiss")}
            onDismiss={() => setToast(null)}
          />
        ) : null}
      </ToastRegion>
    </div>
  );
}
