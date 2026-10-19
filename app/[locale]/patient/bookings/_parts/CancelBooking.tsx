"use client";
// Cancel a booking (rule B10): cancelling a paid visit is not routine and cannot be undone (the time is released and the refund
// sent), so it asks once, in a modal dialog whose two buttons name the outcomes, Keep booking and Cancel booking. Keep is the
// safe default and takes focus. The dialog says before the tap what the refund will be (policy: fullRefundCutoffHours). On
// success the page reloads on the list with the booking shown as cancelled; errors show next to the buttons with the fix (L4).
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { cancelBooking, type CancelBookingResult } from "../actions";

type CancelError = Extract<CancelBookingResult, { ok: false }>["error"];

export function CancelBooking({
  id,
  summary,
  refundNote,
  doneHref,
}: {
  id: string;
  /** Who and when, already formatted in the patient's zone. */
  summary: ReactNode;
  /** What cancelling now refunds, computed on the server from the visit time. */
  refundNote: string;
  /** The list to show once cancelled. */
  doneHref: string;
}) {
  const t = useTranslations("bookings.cancel");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<CancelError | null>(null);
  const titleId = `cancel-${id}-title`;

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking({ id }).catch((): CancelBookingResult => ({ ok: false, error: "unavailable" }));
      if (result.ok) {
        close();
        router.replace(doneHref);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button type="button" variant="ghost" aria-haspopup="dialog" onClick={open} className="-ms-3">
        {t("open")}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget && !pending) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-card)] bg-white p-0 text-ink-900 shadow-[var(--shadow-card)] backdrop:bg-sea-900/40"
      >
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <h2 id={titleId} className="text-xl font-bold text-sea-900">
            {t("title")}
          </h2>
          <p className="font-semibold text-ink-900">{summary}</p>
          <p className="text-ink-700">
            {refundNote}{" "}
            <Link href="/refunds" className="font-semibold text-sea-700 underline underline-offset-2">
              {t("policy")}
            </Link>
          </p>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {t(`error.${error}`)}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" autoFocus disabled={pending} onClick={close}>
              {t("keep")}
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={confirm}>
              {pending ? t("working") : t("confirm")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
