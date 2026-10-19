"use client";
// One-tap invite on an unclaimed profile. Works without JavaScript: the form posts to the server action.
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon } from "@/components/ui";
import { requestInvite, type InviteResult } from "../actions";

export function InviteDoctor({
  doctorId,
  name,
  gender,
  initial = null,
}: {
  doctorId: string;
  name: string;
  gender: "f" | "m";
  initial?: InviteResult | null;
}) {
  const t = useTranslations("profile.registry.invite");
  const [result, formAction, pending] = useActionState(requestInvite, initial);

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <p className="flex items-center gap-2 font-bold text-sea-900">
          <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          {t("sentTitle", { name })}
        </p>
        <p className="text-ink-700">{t("sentBody", { gender })}</p>
        <p className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">{t("prototypeNote")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="doctorId" value={doctorId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? t("sending") : t("cta", { gender })}
      </Button>
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-danger">
          {t("error")}
        </p>
      ) : null}
    </form>
  );
}
