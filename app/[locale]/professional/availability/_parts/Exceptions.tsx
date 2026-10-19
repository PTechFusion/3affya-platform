"use client";
// Date exceptions: a day off, or extra hours on one date, on the doctor's own calendar. The list comes first, the add form
// opens in place (labels above, single column, rule F1). The form checks on Add, then re-checks on every change while an error
// shows, and clears it the moment it is fixed (F4); errors name the problem and the fix, beside the field (F5, L4). Dates are
// offered as a list from today to the booking horizon, formatted through lib/format, so every digit is Western (N1, N4).
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, CloseIcon, Field, IconButton, RadioCard, Select, Surface } from "@/components/ui";
import { MINUTES_PER_DAY, addDays, dateKey, parseDateKey, type DateException, type WallRange } from "@/lib/slots";
import { STARTER_RANGE, TIME_STEP_MINUTES, exceptionProblem, lastExceptionDate, type DayException, type ExceptionProblem } from "../model";
import type { Labels } from "./labels";
import { TimeOptions, rangeProblemText } from "./WeekGrid";

export const EXCEPTION_ADD_ID = "availability-exception-add";
const FORM_ID = "availability-exception";

function dateOptions(today: string): string[] {
  const start = parseDateKey(today);
  if (!start) return [];
  const last = lastExceptionDate(today);
  const out: string[] = [];
  for (let d = start; dateKey(d) <= last; d = addDays(d, 1)) out.push(dateKey(d));
  return out;
}

export function Exceptions({
  L,
  timeZone,
  exceptions,
  today,
  justAddedId,
  onAdd,
  onRemove,
}: {
  L: Labels;
  timeZone: string;
  exceptions: DayException[];
  today: string;
  justAddedId?: string;
  /** Applies the exception, or returns why it cannot be added. */
  onAdd: (x: DateException) => ExceptionProblem | undefined;
  onRemove: (id: string) => void;
}) {
  const { t } = L;
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DateException["kind"]>("off");
  const [date, setDate] = useState(today);
  const [range, setRange] = useState<WallRange>(STARTER_RANGE);
  const [problem, setProblem] = useState<ExceptionProblem>();
  // Focus follows the form: into its first choice when it opens, back to "Add an exception" when it closes.
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    document.getElementById(open ? `${FORM_ID}-kind-${kind}` : EXCEPTION_ADD_ID)?.focus();
  }, [open, kind]);
  const toggle = (next: boolean) => {
    moved.current = true;
    setOpen(next);
  };

  const candidate = (next: { kind?: DateException["kind"]; date?: string; range?: WallRange } = {}): DateException => {
    const k = next.kind ?? kind;
    const d = next.date ?? date;
    const r = next.range ?? range;
    return k === "off" ? { kind: "off", date: d } : { kind: "extra", date: d, start: r.start, end: r.end };
  };
  // Rule F4: once an error shows, every change re-checks it, so it clears the moment the input is fixed.
  const recheck = (x: DateException) => {
    if (problem) setProblem(exceptionProblem(x, exceptions, today));
  };
  const close = () => {
    toggle(false);
    setProblem(undefined);
  };
  const submit = () => {
    const found = onAdd(candidate());
    setProblem(found);
    if (!found) {
      toggle(false);
      setKind("off");
      setRange(STARTER_RANGE);
    }
  };

  const dateProblem = problem?.code === "dateTaken" || problem?.code === "dateOutOfRange" ? problem : undefined;
  const rangeIssue = problem && (problem.code === "endBeforeStart" || problem.code === "overlap") ? problem : undefined;
  const lastDate = L.date(lastExceptionDate(today), timeZone);

  return (
    <section aria-labelledby={`${FORM_ID}-title`}>
      <Surface>
        <h2 id={`${FORM_ID}-title`} className="text-xl font-bold text-sea-900">
          {t("exceptions.title")}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{t("exceptions.lead")}</p>

        {exceptions.length ? (
          <ul className="mt-3 divide-y divide-sand-200 border-y border-sand-200">
            {exceptions.map((x) => {
              const day = L.date(x.date, timeZone);
              const isNew = x.id === justAddedId;
              return (
                <li key={x.id} className={["flex items-center justify-between gap-3 py-2.5", isNew ? "-mx-2 rounded-[var(--radius-field)] bg-lagoon-100 px-2" : ""].join(" ")}>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{day}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={x.kind === "off" ? "pending" : "info"}>{x.kind === "off" ? t("exceptions.off") : t("exceptions.extra")}</Badge>
                      {x.kind === "extra" ? <span className="text-sm text-ink-700">{L.range(x)}</span> : null}
                      {isNew ? <Badge tone="success">{t("exceptions.new")}</Badge> : null}
                    </div>
                  </div>
                  <IconButton label={t("exceptions.removeLabel", { date: day })} onClick={() => onRemove(x.id)}>
                    <CloseIcon />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-500">{t("exceptions.none")}</p>
        )}

        {open ? (
          <form
            noValidate
            aria-labelledby={`${FORM_ID}-form-title`}
            className="mt-4 flex flex-col gap-4 rounded-[var(--radius-field)] border border-sea-700 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <h3 id={`${FORM_ID}-form-title`} className="font-semibold text-ink-900">
              {t("exceptions.formTitle")}
            </h3>
            <fieldset>
              <legend className="text-[15px] font-semibold text-ink-900">{t("exceptions.kind")}</legend>
              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                {(["off", "extra"] as const).map((k) => (
                  <RadioCard
                    key={k}
                    id={`${FORM_ID}-kind-${k}`}
                    name={`${FORM_ID}-kind`}
                    value={k}
                    checked={kind === k}
                    onChange={() => {
                      setKind(k);
                      recheck(candidate({ kind: k }));
                    }}
                    title={t(`exceptions.${k}`)}
                    description={t(`exceptions.${k}Body`)}
                  />
                ))}
              </div>
            </fieldset>
            <Field
              id={`${FORM_ID}-date`}
              label={t("exceptions.date")}
              hint={t("exceptions.dateHint", { zone: L.isolate(L.zone(timeZone)) })}
              error={
                dateProblem ? (dateProblem.code === "dateTaken" ? t("errors.dateTaken") : t("errors.dateOutOfRange", { date: lastDate })) : undefined
              }
            >
              <Select
                id={`${FORM_ID}-date`}
                value={date}
                invalid={Boolean(dateProblem)}
                aria-describedby={dateProblem ? `${FORM_ID}-date-error` : `${FORM_ID}-date-hint`}
                onChange={(e) => {
                  setDate(e.target.value);
                  recheck(candidate({ date: e.target.value }));
                }}
              >
                {dateOptions(today).map((key) => (
                  <option key={key} value={key}>
                    {L.date(key, timeZone)}
                  </option>
                ))}
              </Select>
            </Field>
            {kind === "extra" ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                  <Field id={`${FORM_ID}-from`} label={t("grid.from")}>
                    <Select
                      id={`${FORM_ID}-from`}
                      value={range.start}
                      invalid={Boolean(rangeIssue)}
                      onChange={(e) => {
                        const next = { ...range, start: Number(e.target.value) };
                        setRange(next);
                        recheck(candidate({ range: next }));
                      }}
                    >
                      <TimeOptions L={L} from={0} to={MINUTES_PER_DAY - TIME_STEP_MINUTES} />
                    </Select>
                  </Field>
                  <Field id={`${FORM_ID}-to`} label={t("grid.to")}>
                    <Select
                      id={`${FORM_ID}-to`}
                      value={range.end}
                      invalid={Boolean(rangeIssue)}
                      onChange={(e) => {
                        const next = { ...range, end: Number(e.target.value) };
                        setRange(next);
                        recheck(candidate({ range: next }));
                      }}
                    >
                      <TimeOptions L={L} from={TIME_STEP_MINUTES} to={MINUTES_PER_DAY} />
                    </Select>
                  </Field>
                </div>
                {rangeIssue ? (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {rangeProblemText(L, rangeIssue)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit">{t("exceptions.submit")}</Button>
              <Button type="button" variant="ghost" onClick={close}>
                {tc("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button id={EXCEPTION_ADD_ID} variant="secondary" className="mt-4" onClick={() => toggle(true)}>
            {t("exceptions.add")}
          </Button>
        )}
      </Surface>
    </section>
  );
}
