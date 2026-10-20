"use client";
// The decision block of a removal request (screen 41): Confirm removal, Ask for more information, or Refuse with reason. Each
// opens its own step in place. Confirm names the outcome twice (rule B10: the removal emails the doctor and tells search engines
// the page is gone, so it is confirmed, not undone); refuse and ask need a note the doctor reads, checked with a specific message
// (rule F5). The buttons call the stub server actions; the result shows in place, errors inside the step with the fix.
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber, type Locale } from "@/lib/format";
import { Button, CheckIcon, Field, LinkButton, Notice, Surface, Textarea } from "@/components/ui";
import { askForMoreInfo, confirmRemoval, refuseRemoval, type RemovalAction, type RemovalActionResult } from "../actions";
import { REMOVAL_NOTE_LIMITS, validateNote, type NoteErrorCode } from "./validation";

type Failure = Extract<RemovalActionResult, { ok: false; error: "notFound" | "decided" | "unavailable" }>["error"];

/** Prototype previews (?state= on the detail page): a step already open with a failure, or the result after a decision. */
export type DecisionPreview = { mode: RemovalAction; failure?: Failure; done?: boolean };

const ACTIONS: RemovalAction[] = ["confirm", "askInfo", "refuse"];

const run: Record<RemovalAction, (id: string, note: string) => Promise<RemovalActionResult>> = {
  confirm: (id) => confirmRemoval({ id }),
  refuse: (id, note) => refuseRemoval({ id, note }),
  askInfo: (id, note) => askForMoreInfo({ id, note }),
};

export function RemovalDecision({
  id,
  doctorName,
  language,
  checksPassed,
  publicRemovedHref,
  queueHref,
  preview,
}: {
  id: string;
  doctorName: string;
  /** The request's language, named in the page language: the doctor's email goes out in it. */
  language: string;
  /** Formatted counts when a check failed, so the confirm step can say so; null when every check passed. */
  checksPassed: { passed: string; total: string } | null;
  publicRemovedHref: string;
  queueHref: string;
  preview?: DecisionPreview;
}) {
  const t = useTranslations("adminRemovals.decision");
  const [mode, setMode] = useState<RemovalAction | null>(preview && !preview.done ? preview.mode : null);
  const [done, setDone] = useState<RemovalAction | null>(preview?.done ? preview.mode : null);
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<NoteErrorCode | null>(null);
  const [failure, setFailure] = useState<Failure | null>(preview?.failure ?? null);
  const [pending, startTransition] = useTransition();
  // Focus follows the step: its heading when it opens, the button that opened it when it closes, the field with an error, the
  // result when it lands. An element already on screen is focused at once; one about to render is focused after the render
  // (a ref, so moving focus never causes a render of its own).
  const focusNext = useRef<string | null>(null);
  const locale = useLocale() as Locale;
  const ids = {
    step: `${id}-step`,
    result: `${id}-result`,
    note: (action: RemovalAction) => `${id}-${action}-note`,
    choice: (action: RemovalAction) => `${id}-choice-${action}`,
  };

  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });
  const setFocusTarget = (target: string) => {
    const now = document.getElementById(target);
    if (now) now.focus();
    else focusNext.current = target;
  };

  const open = (next: RemovalAction) => {
    setMode(next);
    setNote("");
    setFieldError(null);
    setFailure(null);
    setFocusTarget(ids.step);
  };
  const close = () => {
    const was = mode;
    setMode(null);
    setFailure(null);
    if (was) setFocusTarget(ids.choice(was));
  };

  const submit = () => {
    if (!mode) return;
    if (mode !== "confirm") {
      const code = validateNote(note);
      if (code) {
        setFieldError(code);
        setFocusTarget(ids.note(mode));
        return;
      }
    }
    setFieldError(null);
    setFailure(null);
    const action = mode;
    startTransition(async () => {
      const res = await run[action](id, note).catch((): RemovalActionResult => ({ ok: false, error: "unavailable" }));
      if (res.ok) {
        setDone(action);
        setMode(null);
        setFocusTarget(ids.result);
      } else if (res.error === "validation") {
        setFieldError(res.field);
        setFocusTarget(ids.note(action));
      } else {
        setFailure(res.error);
      }
    });
  };

  const noteError = (code: NoteErrorCode, action: RemovalAction) => {
    const length = note.trim().length;
    if (code === "noteMissing") return t(`errors.${action}.noteMissing`);
    const { min, max } = REMOVAL_NOTE_LIMITS;
    if (code === "noteTooShort") return t("errors.noteTooShort", { min, minLabel: formatNumber(min, locale) });
    return t("errors.noteTooLong", { max, maxLabel: formatNumber(max, locale), count: length, countLabel: formatNumber(length, locale) });
  };

  return (
    <section aria-labelledby={`decision-${id}`}>
      <Surface>
        <h2 id={`decision-${id}`} className="text-lg font-bold text-sea-900">
          {t("title")}
        </h2>

        {done ? (
          <div id={ids.result} tabIndex={-1} className="mt-3 outline-none">
            <Notice
              tone="success"
              role="status"
              icon={<CheckIcon className="size-4 text-success" />}
              title={t(`done.${done}.title`)}
              body={t(`done.${done}.body`, { name: doctorName })}
              action={
                <>
                  {done === "confirm" ? (
                    <LinkButton href={publicRemovedHref} variant="secondary">
                      {t("done.seePublic")}
                    </LinkButton>
                  ) : null}
                  <LinkButton href={queueHref} variant={done === "confirm" ? "ghost" : "secondary"}>
                    {t("done.backToQueue")}
                  </LinkButton>
                </>
              }
            />
          </div>
        ) : mode ? (
          <form
            noValidate
            className="mt-3 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <h3 id={ids.step} tabIndex={-1} className="font-bold text-ink-900 outline-none">
              {mode === "confirm" ? t("confirmStep.title", { name: doctorName }) : t(`${mode}Step.title`)}
            </h3>
            {mode === "confirm" ? (
              <>
                <p className="text-ink-700">{t("confirmStep.body")}</p>
                {checksPassed ? <Notice tone="warning" body={t("confirmStep.checksWarning", checksPassed)} /> : null}
              </>
            ) : (
              <Field
                id={ids.note(mode)}
                label={t(`${mode}Step.label`)}
                hint={t(`${mode}Step.hint`, { language })}
                error={fieldError ? noteError(fieldError, mode) : undefined}
              >
                <Textarea
                  id={ids.note(mode)}
                  value={note}
                  maxLength={REMOVAL_NOTE_LIMITS.max + 200}
                  invalid={!!fieldError}
                  aria-describedby={`${ids.note(mode)}-${fieldError ? "error" : "hint"}`}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                />
              </Field>
            )}
            {failure ? <Notice tone="danger" role="alert" title={t(`failed.${failure}.title`)} body={t(`failed.${failure}.body`)} /> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant={mode === "confirm" ? "danger" : "primary"} disabled={pending}>
                {pending ? t("working") : t(`${mode}Step.submit`)}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={close}>
                {mode === "confirm" ? t("confirmStep.keep") : t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-700">{t("hint")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {ACTIONS.map((action) => (
                <Button
                  key={action}
                  id={ids.choice(action)}
                  type="button"
                  // Removal is the step the doctor asked for; asking and refusing are the alternatives (rule X6).
                  variant={action === "confirm" ? "primary" : "secondary"}
                  onClick={() => open(action)}
                >
                  {t(action)}
                </Button>
              ))}
            </div>
          </>
        )}
      </Surface>
    </section>
  );
}
