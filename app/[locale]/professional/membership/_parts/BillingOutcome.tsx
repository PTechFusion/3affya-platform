"use client";
// What a Stripe hand-off returned, under its button. Prototype: success says what would have opened, labelled as such; the
// real action redirects to Stripe instead, so this line only ever shows the error.
import { useTranslations } from "next-intl";
import { business } from "@/config/business";
import type { BillingResult } from "../actions";

export function BillingOutcome({ result, kind }: { result: BillingResult | null; kind: "checkout" | "portal" }) {
  const t = useTranslations("membership");
  if (!result) return null;
  if (result.ok) {
    return (
      <p role="status" className="rounded-[var(--radius-field)] border border-dashed border-sand-300 bg-white px-3 py-2 text-sm text-ink-500">
        {t(`stub.${kind}`)}
      </p>
    );
  }
  return (
    <p role="alert" className="text-sm text-danger">
      {t("error", { email: business.supportEmail })}
    </p>
  );
}
