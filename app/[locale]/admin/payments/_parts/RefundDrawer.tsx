"use client";
// The refund drawer (layout call; rules B10, P13, E3). A refund moves money and cannot be undone, so it asks once, in the one
// Sheet primitive: the amount the patient gets back, the choice between the refund rule and a refund in full when they differ,
// who gives back what (the doctor's transfer reversal and 3affya's fee, the receipt's lines), and a confirm that names the
// outcome ("Refund USD 309"), next to Keep the payment. A refund above the rule needs a note for the audit log. On success the
// page moves to the payment in its refund-requested state; the money itself changes only when Stripe's webhook arrives.
// Every string and amount arrives formatted from the server (lib/format); this file only holds the choice and the request.
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { Button, Field, RadioCard, Sheet, Textarea } from "@/components/ui";
import { requestRefund, type RequestRefundResult } from "../actions";
import type { RefundKind } from "./payments";

export type RefundOption = {
  kind: RefundKind;
  amount: string;
  /** Why this amount: the rule's reason, or "all three lines" for in full. */
  detail: string;
  doctorShare: string;
  platformShare: string;
  /** Above what the rule gives: the note becomes required. */
  needsNote: boolean;
};

export type RefundDrawerPayment = {
  id: string;
  /** The receipt number, already isolated left-to-right for Arabic text. */
  number: string;
  summary: string;
  method: string;
  doctorName: string;
  /** The rule's outcome in one sentence, shown when the rule gives nothing back. */
  ruleNothing: string | null;
  options: RefundOption[];
  /** The visit is still ahead and not cancelled: the refund also cancels it. */
  cancelsVisit: boolean;
  idempotencyKey: string;
  doneHref: Record<RefundKind, string>;
};

type Opener = (id: string, kind?: RefundKind) => void;
const RefundContext = createContext<Opener | null>(null);

type RefundError = Extract<RequestRefundResult, { ok: false }>["error"];

export function RefundDrawerProvider({
  payments,
  initialOpen,
  children,
}: {
  payments: RefundDrawerPayment[];
  /** ?refund=<id>: the drawer opens on load for that payment (the "refund confirm" state). */
  initialOpen?: string;
  children: ReactNode;
}) {
  const t = useTranslations("adminPayments.drawer");
  const tc = useTranslations("common");
  const router = useRouter();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const noteId = useId();
  const initial = payments.find((p) => p.id === initialOpen);
  const openOnLoad = !!initial;
  const [openId, setOpenId] = useState<string | null>(initial?.id ?? null);
  const [kind, setKind] = useState<RefundKind>(initial?.options[0]?.kind ?? "rule");
  const [note, setNote] = useState("");
  const [error, setError] = useState<RefundError | null>(null);
  const [pending, startTransition] = useTransition();
  const payment = payments.find((p) => p.id === openId);
  const option = payment?.options.find((o) => o.kind === kind) ?? payment?.options[0];

  const open: Opener = (id, preferred) => {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    setOpenId(id);
    setKind(p.options.find((o) => o.kind === preferred)?.kind ?? p.options[0]?.kind ?? "full");
    setNote("");
    setError(null);
    sheetRef.current?.showModal();
  };

  useEffect(() => {
    if (openOnLoad) sheetRef.current?.showModal();
  }, [openOnLoad]);

  const confirm = () => {
    if (!payment || !option) return;
    if (option.needsNote && note.trim().length === 0) {
      setError("noteRequired");
      document.getElementById(noteId)?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestRefund({ paymentId: payment.id, kind: option.kind, note }).catch(
        (): RequestRefundResult => ({ ok: false, error: "unavailable" }),
      );
      if (result.ok) {
        sheetRef.current?.close();
        router.replace(payment.doneHref[option.kind]);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <RefundContext.Provider value={open}>
      {children}
      <Sheet
        ref={sheetRef}
        id="refund-drawer"
        title={payment ? t("title", { number: payment.number }) : ""}
        closeLabel={tc("close")}
        onClose={() => setError(null)}
        footer={
          payment && option ? (
            <div className="flex flex-col gap-3">
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {t(`error.${error}`)}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => sheetRef.current?.close()}>
                  {t("keep")}
                </Button>
                <Button type="button" variant="danger" disabled={pending} onClick={confirm}>
                  {pending ? t("working") : t("confirm", { amount: option.amount })}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {payment && option ? (
          <div className="flex flex-col gap-5">
            <p className="text-ink-900">{payment.summary}</p>

            {payment.options.length > 1 ? (
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 font-semibold text-ink-900">{t("legend")}</legend>
                {payment.options.map((o) => (
                  <RadioCard
                    key={o.kind}
                    name="refund-kind"
                    value={o.kind}
                    title={`${t(o.kind === "rule" ? "byRule" : "inFull")} · ${o.amount}`}
                    description={o.detail}
                    checked={option.kind === o.kind}
                    onChange={() => {
                      setKind(o.kind);
                      setError(null);
                    }}
                  />
                ))}
              </fieldset>
            ) : (
              <div className="flex flex-col gap-1">
                {payment.ruleNothing ? <p className="text-sm text-ink-700">{payment.ruleNothing}</p> : null}
                <p className="mt-2 font-semibold text-ink-900">
                  {t(option.kind === "rule" ? "byRule" : "inFull")} · <span className="tabular">{option.amount}</span>
                </p>
                <p className="text-sm text-ink-700">{option.detail}</p>
              </div>
            )}

            {/* Rule E3: the same lines as the receipt, read from the money's side: who gives back what. */}
            <div className="flex flex-col gap-2">
              <FeeBreakdown
                caption={t("outcome")}
                lines={[
                  { label: t("fromDoctor", { name: payment.doctorName }), detail: t("fromDoctorDetail"), amount: option.doctorShare },
                  { label: t("fromPlatform"), detail: t("fromPlatformDetail"), amount: option.platformShare },
                ]}
                total={{ label: t("toPatient"), amount: option.amount }}
              />
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{t("toPatientDetail", { method: payment.method })}.</span>{" "}
                {t("reversal", { name: payment.doctorName })}
              </p>
              {payment.cancelsVisit ? <p className="text-sm font-semibold text-ink-900">{t("visit")}</p> : null}
            </div>

            <Field id={noteId} label={option.needsNote ? t("noteRequired") : t("noteOptional")} hint={t("noteHint")}>
              <Textarea
                id={noteId}
                name="note"
                value={note}
                maxLength={500}
                required={option.needsNote}
                invalid={error === "noteRequired"}
                aria-describedby={`${noteId}-hint`}
                className="min-h-24"
                onChange={(e) => setNote(e.currentTarget.value)}
              />
            </Field>

            <p className="rounded-[var(--radius-field)] bg-sand-100 px-3 py-2 text-sm text-ink-700">
              {t("once", { key: payment.idempotencyKey })}
            </p>
          </div>
        ) : null}
      </Sheet>
    </RefundContext.Provider>
  );
}

/** A button that opens the drawer for one payment; `kind` preselects the rule or in full. */
export function RefundButton({
  paymentId,
  kind,
  label,
  accessibleLabel,
  variant = "secondary",
  className,
}: {
  paymentId: string;
  kind?: RefundKind;
  label: string;
  accessibleLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const open = useContext(RefundContext);
  return (
    <Button
      type="button"
      variant={variant}
      aria-haspopup="dialog"
      aria-label={accessibleLabel}
      className={className}
      onClick={() => open?.(paymentId, kind)}
    >
      {label}
    </Button>
  );
}
