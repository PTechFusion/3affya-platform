"use client";
// The week grid (layout call: seven columns, swipeable on phone, tap to add). One column per weekday on the doctor's own clock.
// Each range is a button that opens the range editor under the grid; its slot count and a remove control sit beside it, never
// inside it (no nested interactive elements). Seven fixed columns from xl; below that the row scrolls sideways with snap, and
// in RTL it starts at the right, Sunday first.
import { useState } from "react";
import { Button, CloseIcon, Field, IconButton, Select } from "@/components/ui";
import { MINUTES_PER_DAY, WEEKDAYS, slotsInRange, type WallRange, type Weekday } from "@/lib/slots";
import { TIME_STEP_MINUTES, nextRange, type RangeProblem, type WeekHours, type WeekRange } from "../model";
import type { Labels } from "./labels";

export const addButtonId = (d: Weekday) => `availability-add-${d}`;
export const rangeButtonId = (id: string) => `availability-range-${id}`;
export const RANGE_EDITOR_ID = "availability-range-editor";
export const RANGE_FROM_ID = "availability-range-from";

/** Quarter-hour options between two wall-clock minutes, labelled through lib/format. */
export function TimeOptions({ L, from, to }: { L: Labels; from: number; to: number }) {
  const options: number[] = [];
  for (let m = from; m <= to; m += TIME_STEP_MINUTES) options.push(m);
  return (
    <>
      {options.map((m) => (
        <option key={m} value={m}>
          {L.clock(m)}
        </option>
      ))}
    </>
  );
}

export function rangeProblemText(L: Labels, problem: RangeProblem): string {
  return problem.code === "overlap" ? L.t("errors.overlap", { range: L.range(problem.other) }) : L.t("errors.endBeforeStart");
}

export function WeekGrid({
  L,
  week,
  slotMinutes,
  editingId,
  onAdd,
  onEdit,
  onRemove,
}: {
  L: Labels;
  week: WeekHours;
  slotMinutes: number;
  editingId?: string;
  onAdd: (day: Weekday) => void;
  onEdit: (day: Weekday, id: string) => void;
  onRemove: (day: Weekday, id: string) => void;
}) {
  const { t } = L;
  return (
    <>
      {/* Below xl the third column is cut at the card edge: that cut is the cue to swipe. */}
      <ol className="-mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 pb-2 xl:mx-0 xl:grid xl:grid-cols-7 xl:overflow-visible xl:px-0 xl:pb-0">
        {WEEKDAYS.map((d) => {
          const ranges = week[d];
          const day = L.day(d);
          const total = ranges.reduce((n, r) => n + slotsInRange(r, slotMinutes), 0);
          return (
            <li key={d} className="flex w-36 shrink-0 snap-start flex-col gap-2 rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-2 xl:w-auto">
              <div className="px-1">
                <h3 className="font-semibold text-ink-900">{day}</h3>
                <p className="text-xs text-ink-500">{L.slots(total)}</p>
              </div>
              {ranges.length ? (
                <ul className="flex flex-col gap-2">
                  {ranges.map((r) => {
                    const label = L.range(r);
                    const count = slotsInRange(r, slotMinutes);
                    const active = r.id === editingId;
                    return (
                      <li key={r.id} className={["rounded-[var(--radius-field)] bg-sea-100", active ? "ring-2 ring-sea-700" : ""].join(" ")}>
                        <button
                          id={rangeButtonId(r.id)}
                          type="button"
                          aria-expanded={active}
                          aria-controls={active ? RANGE_EDITOR_ID : undefined}
                          aria-label={t("grid.editLabel", { day, range: label })}
                          onClick={() => onEdit(d, r.id)}
                          className="block min-h-12 w-full rounded-[var(--radius-field)] px-2 pt-2 text-start text-sm font-semibold text-sea-900 transition-colors hover:bg-white/60"
                        >
                          {label}
                        </button>
                        <div className="flex items-center justify-between gap-1 ps-2">
                          <span className={count ? "text-xs text-ink-700" : "text-xs font-semibold text-gold-700"}>
                            {count ? L.slots(count) : t("grid.tooShortBadge")}
                          </span>
                          <IconButton label={t("grid.removeLabel", { day, range: label })} onClick={() => onRemove(d, r.id)}>
                            <CloseIcon />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                // A day with no weekly hours: an empty, dashed slot that reads as room to add (the count above says "No slots").
                <div aria-hidden="true" className="min-h-12 rounded-[var(--radius-field)] border border-dashed border-sand-300" />
              )}
              <Button
                id={addButtonId(d)}
                variant="ghost"
                className="w-full"
                disabled={!nextRange(ranges, slotMinutes)}
                aria-label={t("grid.addLabel", { day })}
                onClick={() => onAdd(d)}
              >
                {t("grid.add")}
              </Button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * The editor for one weekly range, under the grid. Every valid pick applies at once (rule L2); an invalid pick stays on screen
 * with the reason and the fix, and is not applied (F5, L4). No confirmation anywhere: Remove has Undo (B10).
 */
export function RangeEditor({
  L,
  day,
  range,
  slotMinutes,
  onChange,
  onDone,
  onRemove,
}: {
  L: Labels;
  day: Weekday;
  range: WeekRange;
  slotMinutes: number;
  onChange: (next: WallRange) => RangeProblem | undefined;
  onDone: () => void;
  onRemove: () => void;
}) {
  const { t } = L;
  const [invalid, setInvalid] = useState<{ draft: WallRange; problem: RangeProblem } | null>(null);
  const shown = invalid?.draft ?? range;
  const errorId = `${RANGE_EDITOR_ID}-error`;
  const pick = (part: "start" | "end", value: number) => {
    const next = { start: shown.start, end: shown.end, [part]: value };
    const problem = onChange(next);
    setInvalid(problem ? { draft: next, problem } : null);
  };
  const tooShort = !invalid && slotsInRange(shown, slotMinutes) === 0;

  return (
    <div id={RANGE_EDITOR_ID} role="group" aria-labelledby={`${RANGE_EDITOR_ID}-title`} className="mt-4 rounded-[var(--radius-field)] border border-sea-700 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 id={`${RANGE_EDITOR_ID}-title`} className="pt-2 font-semibold text-ink-900">
          {t("grid.editorTitle", { day: L.day(day) })}
        </h3>
        <IconButton label={t("grid.close")} onClick={onDone} className="-me-2 -mt-1">
          <CloseIcon />
        </IconButton>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-md">
        <Field id={RANGE_FROM_ID} label={t("grid.from")}>
          <Select
            id={RANGE_FROM_ID}
            value={shown.start}
            invalid={Boolean(invalid)}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => pick("start", Number(e.target.value))}
          >
            <TimeOptions L={L} from={0} to={MINUTES_PER_DAY - TIME_STEP_MINUTES} />
          </Select>
        </Field>
        <Field id={`${RANGE_EDITOR_ID}-to`} label={t("grid.to")}>
          <Select
            id={`${RANGE_EDITOR_ID}-to`}
            value={shown.end}
            invalid={Boolean(invalid)}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => pick("end", Number(e.target.value))}
          >
            <TimeOptions L={L} from={TIME_STEP_MINUTES} to={MINUTES_PER_DAY} />
          </Select>
        </Field>
      </div>
      {invalid ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {rangeProblemText(L, invalid.problem)}
        </p>
      ) : tooShort ? (
        <p className="mt-2 text-sm text-gold-700">{t("grid.tooShort", { length: L.minutes(slotMinutes) })}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onDone}>{t("grid.done")}</Button>
        <Button variant="ghost" onClick={onRemove}>
          {t("grid.remove")}
        </Button>
      </div>
    </div>
  );
}
