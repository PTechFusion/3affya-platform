"use client";
// One button that hands the professional to the Stripe Customer Portal (Manage billing, Update card, Renew). It is an action,
// not a link: the server creates the portal session first. Works without JavaScript: the form posts to the server action.
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { openBillingPortal, type PortalFlow } from "../actions";
import { BillingOutcome } from "./BillingOutcome";

export function PortalButton({
  flow,
  label,
  hint,
  variant = "primary",
}: {
  flow: PortalFlow;
  label: string;
  hint?: string;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("membership");
  const [result, formAction, pending] = useActionState(openBillingPortal, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="flow" value={flow} />
      <Button type="submit" variant={variant} disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending ? t("opening") : label}
      </Button>
      {hint ? <p className="text-sm text-ink-700">{hint}</p> : null}
      <BillingOutcome result={result} kind="portal" />
    </form>
  );
}
