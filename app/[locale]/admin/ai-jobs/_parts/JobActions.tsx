"use client";
// Retry and Stop for one AI job (screen 45). Retry is safe to repeat (same quote, idempotent on the attempt), so it runs at once
// (rule B10: no confirmation for a routine action). Stop throws away the pages read so far, so it asks first, inline, with
// buttons that name the outcome. Each answer comes back as { ok, error }; on ok the page shows the row the action would write
// (?state=retryQueued or ?state=cancelled), on an error the reason sits under the button (rule L4).
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { cancelAiJob, retryAiJob, type JobActionResult } from "../actions";

type ErrorCode = Extract<JobActionResult, { ok: false }>["error"];

export function RetryJob({ id, doneHref, size = "md", className }: { id: string; doneHref: string; size?: "md" | "lg"; className?: string }) {
  const t = useTranslations("adminAiJobs.retry");
  const router = useRouter();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, startTransition] = useTransition();
  const retry = () =>
    startTransition(async () => {
      setError(null);
      const result = await retryAiJob({ id });
      if (result.ok) router.replace(doneHref, { scroll: false });
      else setError(result.error);
    });
  return (
    <div className={className}>
      <Button type="button" size={size} disabled={pending} onClick={retry} aria-label={t("label", { job: id })} className="w-full sm:w-auto">
        {pending ? t("pending") : t("button")}
      </Button>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {t(`error.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

export function CancelJob({ id, doneHref }: { id: string; doneHref: string }) {
  const t = useTranslations("adminAiJobs.cancel");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);

  // Focus follows the question in, and goes back to Stop when the admin keeps the job running.
  useEffect(() => {
    if (confirming) panel.current?.focus();
    else if (wasConfirming.current) document.getElementById(`stop-${id}`)?.focus();
    wasConfirming.current = confirming;
  }, [confirming, id]);

  if (!confirming) {
    return (
      <Button id={`stop-${id}`} type="button" variant="secondary" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
        {t("button")}
      </Button>
    );
  }

  const stop = () =>
    startTransition(async () => {
      setError(null);
      const result = await cancelAiJob({ id });
      if (result.ok) router.replace(doneHref, { scroll: false });
      else setError(result.error);
    });

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="group"
      aria-labelledby={`stop-${id}-title`}
      aria-describedby={`stop-${id}-body`}
      className="w-full rounded-[var(--radius-field)] border border-sand-300 bg-sand-50 p-4"
    >
      <p id={`stop-${id}-title`} className="font-bold text-ink-900">
        {t("title")}
      </p>
      <p id={`stop-${id}-body`} className="mt-1 text-sm text-ink-700">
        {t("body")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="danger" disabled={pending} onClick={stop}>
          {pending ? t("stopping") : t("stop")}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          {t("keep")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t(`error.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
