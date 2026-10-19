"use client";
// The answer block of an inbox detail: accept or propose another time for a request, propose another time for an upcoming
// visit (how to change, rule E2), mark done once a visit has passed. The buttons call stub server actions; the result shows
// in place within a tap (rule L2), errors next to the buttons with the fix (rule L4).
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon, Surface } from "@/components/ui";
import type { InboxStatus } from "@/lib/sample";
import { acceptIntroduction, markVisitDone, proposeAnotherTime, type InboxAction, type InboxActionResult } from "../actions";

const run: Record<InboxAction, (input: { id: string }) => Promise<InboxActionResult>> = {
  accept: acceptIntroduction,
  propose: proposeAnotherTime,
  markDone: markVisitDone,
};

const plan: Partial<Record<InboxStatus, { title: string; hint: string; actions: InboxAction[] }>> = {
  request: { title: "requestTitle", hint: "requestHint", actions: ["accept", "propose"] },
  upcoming: { title: "changeTitle", hint: "changeHint", actions: ["propose"] },
  awaitingDone: { title: "doneTitle", hint: "doneHint", actions: ["markDone"] },
};

export function InboxActions({ id, status }: { id: string; status: InboxStatus }) {
  const t = useTranslations("inbox.actions");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<InboxAction | null>(null);
  const [done, setDone] = useState<InboxAction | null>(null);
  const [error, setError] = useState<Extract<InboxActionResult, { ok: false }>["error"] | null>(null);
  const p = plan[status];
  if (!p) return null;

  const submit = (action: InboxAction) => {
    setBusy(action);
    setError(null);
    startTransition(async () => {
      const result = await run[action]({ id }).catch((): InboxActionResult => ({ ok: false, error: "unavailable" }));
      if (result.ok) setDone(action);
      else setError(result.error);
      setBusy(null);
    });
  };

  return (
    <section aria-labelledby={`answer-${id}`}>
      <Surface>
        <h2 id={`answer-${id}`} className="text-lg font-bold text-sea-900">
          {t(p.title)}
        </h2>
        {done ? (
          <p role="status" className="mt-3 flex items-start gap-2 font-semibold text-ink-900">
            <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
              <CheckIcon className="size-4" />
            </span>
            {t(`result.${done}`)}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-700">{t(p.hint)}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {p.actions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  // Accepting and marking done are the step forward; proposing another time is the alternative (rule X6).
                  variant={action === "propose" ? "secondary" : "primary"}
                  disabled={pending}
                  onClick={() => submit(action)}
                >
                  {busy === action ? t("working") : t(action)}
                </Button>
              ))}
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {t(`error.${error}`)}
              </p>
            ) : null}
          </>
        )}
      </Surface>
    </section>
  );
}
