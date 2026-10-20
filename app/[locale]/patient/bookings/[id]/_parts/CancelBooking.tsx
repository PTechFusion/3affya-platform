"use client";
// Cancel booking (how to change, rule P10). Cancelling is irreversible and moves money, so it is the one place a confirmation
// step earns its keep, with buttons that name the outcome: Cancel booking / Keep booking (rule B10). The consequence (full
// refund or none) is stated before the tap; the result shows in place (rule L2), errors under the buttons with the fix (L4).
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckIcon, LinkButton } from "@/components/ui";
import { cancelBooking, type CancelBookingResult } from "../actions";

type Failure = Extract<CancelBookingResult, { ok: false }>["error"];

export function CancelBooking({
  id,
  refundable,
  amount,
  hours,
  hoursLabel,
  bookAgainHref,
  children,
}: {
  id: string;
  /** Decided on the server at render; the action decides again when it runs. */
  refundable: boolean;
  amount: string;
  hours: number;
  hoursLabel: string;
  bookAgainHref: string;
  /** The policy lines above the button; the result replaces them once the booking is cancelled. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("booking.cancel");
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [refunded, setRefunded] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reopened = useRef(false);

  // Focus follows the step: the question when it opens, back to Cancel booking when the patient keeps the booking.
  useEffect(() => {
    if (step === "confirm") headingRef.current?.focus();
    else if (step === "idle" && reopened.current) document.getElementById(`cancel-start-${id}`)?.focus();
  }, [step, id]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking({ id }).catch((): CancelBookingResult => ({ ok: false, error: "unavailable" }));
      if (result.ok) {
        setRefunded(result.refunded);
        setStep("done");
      } else setError(result.error);
    });
  };

  if (step === "done") {
    return (
      <div className="mt-4">
        <p role="status" className="flex items-start gap-2 font-semibold text-ink-900">
          <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          <span>
            {t("done")} {refunded ? t("doneRefund", { amount }) : null}
          </span>
        </p>
        <LinkButton href={bookAgainHref} className="mt-4 w-full sm:w-auto">
          {t("bookAgain")}
        </LinkButton>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <>
        {children}
        <div role="group" aria-labelledby={`cancel-${id}`} className="mt-4 rounded-[var(--radius-field)] border border-danger/40 bg-white p-4">
          <h3 id={`cancel-${id}`} ref={headingRef} tabIndex={-1} className="font-bold text-ink-900">
            {t("confirmTitle")}
          </h3>
          <p className="mt-1 text-sm text-ink-700">{refundable ? t("refund", { amount }) : t("noRefund", { amount, hours, hoursLabel })}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="danger" disabled={pending} onClick={submit}>
              {pending ? t("working") : t("confirm")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                reopened.current = true;
                setError(null);
                setStep("idle");
              }}
            >
              {t("keep")}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {t(`error.${error}`)}
            </p>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      {children}
      <Button id={`cancel-start-${id}`} type="button" variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => setStep("confirm")}>
        {t("start")}
      </Button>
    </>
  );
}
