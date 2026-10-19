"use client";
// The one Stripe button of the payouts page: a form posting to the server action that returns the Stripe-hosted link, so it
// works before JavaScript loads. The visible label names Stripe and the line under it says Stripe opens in this tab and that
// onboarding can be left and resumed (rule F3). On a link, the browser goes to Stripe; on an error, the reason shows here.
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { openStripeDashboard, openStripeOnboarding, type StripeLinkResult } from "../actions";

export type StripeButtonKind = "setUp" | "continue" | "dashboard";

export function StripeButton({ kind, variant = "primary" }: { kind: StripeButtonKind; variant?: "primary" | "secondary" }) {
  const t = useTranslations("payouts.stripe");
  const action = kind === "dashboard" ? openStripeDashboard : openStripeOnboarding;
  const [result, formAction, pending] = useActionState<StripeLinkResult | null, FormData>(action, null);

  useEffect(() => {
    if (result?.ok) window.location.assign(result.url);
  }, [result]);

  const hintId = `stripe-${kind}-hint`;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" size="lg" variant={variant} disabled={pending} aria-describedby={hintId} className="w-full sm:w-auto sm:self-start">
        {pending ? t("pending") : t(kind)}
      </Button>
      <p id={hintId} className="text-sm text-ink-700">
        {kind === "dashboard" ? t("hintDashboard") : t("hintOnboarding")}
      </p>
      {result && !result.ok ? (
        <p role="status" className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-700">
          {t(`error.${result.error}`)}
        </p>
      ) : null}
    </form>
  );
}
