"use client";
// The plan choice for a professional with no membership: monthly or yearly as radio cards, the all-in amount and how often it
// repeats spelled out under them (rules B8, C5), then Subscribe, which hands off to Stripe Checkout. Prices arrive formatted
// from the server (config/business.ts through lib/format.ts). Works without JavaScript: the form posts the checked interval.
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, RadioCard } from "@/components/ui";
import type { BillingInterval } from "@/lib/sample";
import { startCheckout } from "../actions";
import { BillingOutcome } from "./BillingOutcome";

export type IntervalOption = { interval: BillingInterval; title: string; description: string; summary: string };

export function SubscribeForm({ options, initial = "month" }: { options: IntervalOption[]; initial?: BillingInterval }) {
  const t = useTranslations("membership");
  const [chosen, setChosen] = useState<BillingInterval>(initial);
  const [result, formAction, pending] = useActionState(startCheckout, null);
  const summary = options.find((o) => o.interval === chosen)?.summary;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 font-semibold text-ink-900">{t("choose.legend")}</legend>
        <div className="grid gap-3">
          {options.map((o) => (
            <RadioCard
              key={o.interval}
              name="interval"
              value={o.interval}
              checked={chosen === o.interval}
              onChange={() => setChosen(o.interval)}
              title={o.title}
              description={o.description}
            />
          ))}
        </div>
      </fieldset>
      {summary ? (
        <p aria-live="polite" className="font-semibold text-ink-900">
          {summary}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
          {pending ? t("opening") : t("choose.subscribe")}
        </Button>
        <p className="text-sm text-ink-700">{t("choose.hint")}</p>
        <BillingOutcome result={result} kind="checkout" />
      </div>
    </form>
  );
}
