"use client";
// Mark as reviewed, in the review panel after the summary, so the tap comes after reading (rules T4, Q6: "Reviewed by Dr X" is a
// licensed clinician's claim). Works without JavaScript: the form posts to the server action. The hint says what the patient
// will see, word for word (`reviewed`), before the tap.
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon } from "@/components/ui";
import { markReviewed, type MarkReviewedResult } from "../actions";

export function MarkReviewed({
  shareId,
  patientName,
  gender,
  reviewed,
  initial = null,
}: {
  shareId: string;
  patientName: string;
  gender: "f" | "m";
  /** The line the patient will see, e.g. "Reviewed by Dr Omar Khalil". */
  reviewed: string;
  initial?: MarkReviewedResult | null;
}) {
  const t = useTranslations("shared.viewer");
  const [result, formAction, pending] = useActionState(markReviewed, initial);
  const values = { name: patientName, gender, reviewed };

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col gap-1">
        <p className="flex items-center gap-2 font-bold text-sea-900">
          <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          {t("markedTitle")}
        </p>
        <p className="text-ink-700">{t("markedBody", values)}</p>
        <p className="text-sm text-ink-500">{t("prototypeNote")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="shareId" value={shareId} />
      <p className="text-ink-700">{t("markHint", values)}</p>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t("marking") : t("markReviewed")}
      </Button>
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-danger">
          {result.error === "alreadyReviewed" ? t("alreadyReviewed") : t("markError")}
        </p>
      ) : null}
    </form>
  );
}
