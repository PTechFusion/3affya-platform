"use client";
// Launch-notice form, the hook of screen 11. One field with the label above (F1), email keyboard, no autocorrect, LTR entry
// (F8, R3); checked on blur, re-checked on each keystroke once an error shows, cleared the instant it is fixed (F4); the error
// names the fix next to the field (F5, L4). Works without JavaScript: the form posts to the server action.
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon, Field, Input } from "@/components/ui";
import { requestLaunchNotice, type LaunchNoticeResult } from "../actions";
import { checkEmail } from "./email";

type Problem = Extract<LaunchNoticeResult, { ok: false }>["error"];

const FIELD_ID = "launch-notice-email";

export function NotifyForm({ initial = null, initialEmail = "" }: { initial?: LaunchNoticeResult | null; initialEmail?: string }) {
  const t = useTranslations("aiTools.notify");
  const [result, formAction, pending] = useActionState(requestLaunchNotice, initial);
  const [value, setValue] = useState(initialEmail);
  const [problem, setProblem] = useState<Problem | undefined>(initial && !initial.ok ? initial.error : undefined);

  // A new server result replaces the client's view of the field (adjusting state during render, not in an effect).
  const [seenResult, setSeenResult] = useState(result);
  if (result !== seenResult) {
    setSeenResult(result);
    setProblem(result && !result.ok ? result.error : undefined);
  }

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-lg font-bold text-sea-900">
          <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          {t("sentTitle")}
        </p>
        <p className="text-ink-700">{t("sentBody")}</p>
        <p className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">{t("prototypeNote")}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        const found = checkEmail(value);
        if (found) {
          e.preventDefault();
          setProblem(found);
          document.getElementById(FIELD_ID)?.focus();
        }
      }}
    >
      <Field id={FIELD_ID} label={t("label")} hint={t("hint")} error={problem ? t(`error.${problem}`) : undefined}>
        <Input
          id={FIELD_ID}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          dir="ltr"
          placeholder={t("placeholder")}
          value={value}
          invalid={Boolean(problem)}
          aria-describedby={problem ? `${FIELD_ID}-error` : `${FIELD_ID}-hint`}
          onChange={(e) => {
            setValue(e.target.value);
            if (problem) setProblem(checkEmail(e.target.value));
          }}
          onBlur={() => {
            if (value.trim()) setProblem(checkEmail(value));
          }}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
