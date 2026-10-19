"use client";
// The one Download receipt button (rules T1, E3). It is an action, not a link: the server fetches a fresh Stripe-hosted receipt
// link first (ADR 6). Works before JavaScript loads: the form posts to the server action. On a link the browser goes to Stripe;
// on an error the reason shows under the button.
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { openStripeReceipt, type ReceiptLinkResult } from "../actions";

export function DownloadReceipt({ receiptId }: { receiptId: string }) {
  const t = useTranslations("receipts.detail.download");
  const [result, formAction, pending] = useActionState<ReceiptLinkResult | null, FormData>(openStripeReceipt, null);

  useEffect(() => {
    if (result?.ok) window.location.assign(result.url);
  }, [result]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="receiptId" value={receiptId} />
      <Button type="submit" size="lg" disabled={pending} aria-describedby="receipt-download-hint" className="w-full sm:w-auto sm:self-start">
        {pending ? t("pending") : t("button")}
      </Button>
      <p id="receipt-download-hint" className="text-sm text-ink-700">
        {t("hint")}
      </p>
      {result && !result.ok ? (
        <p role="status" className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-700">
          {t(`error.${result.error}`)}
        </p>
      ) : null}
    </form>
  );
}
