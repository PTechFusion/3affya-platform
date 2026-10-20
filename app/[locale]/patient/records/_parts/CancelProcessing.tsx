"use client";
// Cancel on the progress page, offered while a set is queued or being read (rules L1, T11: over 10 seconds, show a cancel).
// Stopping throws away the pages read so far, so it is the one action here that asks first, inline, with buttons that name
// the outcome (rule B10). The stub answers ok and the page shows the stopped state (?state=cancelled).
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { business } from "@/config/business";
import { cancelRecordSet } from "../actions";

export function CancelProcessing({ setId }: { setId: string }) {
  const t = useTranslations("recordSet.cancel");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);

  // Focus follows the question in, and goes back to Cancel when the patient keeps going.
  useEffect(() => {
    if (confirming) panel.current?.focus();
    else if (wasConfirming.current) document.getElementById(`cancel-${setId}`)?.focus();
    wasConfirming.current = confirming;
  }, [confirming, setId]);

  if (!confirming) {
    return (
      <Button id={`cancel-${setId}`} variant="secondary" onClick={() => setConfirming(true)} className="shrink-0">
        {t("button")}
      </Button>
    );
  }

  const stop = () =>
    startTransition(async () => {
      const result = await cancelRecordSet(setId);
      if (result.ok) router.replace(`/patient/records/${setId}?state=cancelled`);
      else setFailed(true);
    });

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="group"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-body"
      className="w-full rounded-[var(--radius-field)] border border-sand-300 bg-sand-50 p-4"
    >
      <p id="cancel-title" className="font-bold text-ink-900">
        {t("title")}
      </p>
      <p id="cancel-body" className="mt-1 text-sm text-ink-700">
        {t("body")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button variant="danger" disabled={pending} onClick={stop}>
          {pending ? t("stopping") : t("stop")}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          {t("keep")}
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("error", { email: business.supportEmail })}
        </p>
      ) : null}
    </div>
  );
}
