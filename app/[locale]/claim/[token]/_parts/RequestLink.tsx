"use client";
// "Request a new link" for an expired or used invite. The new link goes to the address on file, which the page never shows;
// the confirmation reads the same whether or not that address still exists (rule F6), and keeps the inbox buttons (F7).
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon } from "@/components/ui";
import { requestNewInvite, type RequestLinkResult } from "../actions";
import type { InboxLink } from "./inbox";
import { InboxLinks } from "./InboxLinks";

export function RequestLink({ token, initialSent = false, inboxLinks }: { token: string; initialSent?: boolean; inboxLinks: InboxLink[] }) {
  const t = useTranslations("claim.request");
  const [result, setResult] = useState<RequestLinkResult | null>(initialSent ? { ok: true } : null);
  const [pending, startTransition] = useTransition();

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-sea-900">
          <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          {t("sentTitle")}
        </p>
        <p className="text-ink-700">{t("sentBody")}</p>
        <InboxLinks links={inboxLinks} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            setResult(await requestNewInvite({ token }).catch(() => ({ ok: false, error: "unavailable" }) as const));
          })
        }
      >
        {pending ? t("sending") : t("submit")}
      </Button>
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-danger">
          {t(`error.${result.error}`)}
        </p>
      ) : null}
    </div>
  );
}
