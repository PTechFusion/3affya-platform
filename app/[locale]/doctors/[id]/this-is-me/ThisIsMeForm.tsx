"use client";
// The This is me / remove me form (screen 10). Two radio cards pick the intent and change the copy; then full name, NPI and
// email, plus the reason when removing (rules F1 F2). Labels above, single column, the one optional field marked (F1).
// Validates on blur only once a field has been typed in, re-checks on every keystroke once it shows an error, and clears the
// error the moment it is fixed (F4). Errors name the sub-rule and the fix, next to the field, in text (F5, L4). Input is kept
// when sending fails (L4). The NPI field is LTR and numeric (F8, R3).
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, Field, Input, LinkButton, RadioCard, Select, Textarea } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { submitThisIsMe } from "./actions";
import {
  INTENTS,
  NPI_DIGITS,
  REMOVAL_REASONS,
  THIS_IS_ME_LIMITS,
  normaliseNpi,
  validateField,
  validateThisIsMe,
  type Intent,
  type ThisIsMeErrorCode,
  type ThisIsMeErrors,
  type ThisIsMeField,
  type ThisIsMeInput,
  type ThisIsMeResult,
} from "./validation";

export type ThisIsMeStatus = "form" | "submitted" | "failed" | "profileUnavailable";

const fieldId = (field: ThisIsMeField) => `this-is-me-${field}`;
const intentId = (intent: Intent) => `this-is-me-intent-${intent}`;
const FOCUS_ORDER = ["intent", "name", "npi", "email", "reason", "details"] as const;

export function ThisIsMeForm({
  doctorId,
  titleId,
  initialIntent,
  initialValues,
  initialErrors = {},
  initialStatus,
  slaLabel,
}: {
  doctorId: string;
  /** id of the page heading that names the form */
  titleId: string;
  initialIntent?: Intent;
  initialValues: ThisIsMeInput;
  initialErrors?: ThisIsMeErrors;
  initialStatus: ThisIsMeStatus;
  /** "within 48 hours", formatted on the server from business.removalSlaHours */
  slaLabel: string;
}) {
  const t = useTranslations("thisIsMe");
  const locale = useLocale() as Locale;
  const [intent, setIntent] = useState<Intent | undefined>(initialIntent);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ThisIsMeErrors>(initialErrors);
  const [typedIn, setTypedIn] = useState<Partial<Record<ThisIsMeField, boolean>>>({});
  const [status, setStatus] = useState<ThisIsMeStatus>(initialStatus);
  const [sentTo, setSentTo] = useState(initialValues.email.trim());
  const [pending, startTransition] = useTransition();
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const justSent = useRef(false);
  const n = (value: number) => formatNumber(value, locale);

  useEffect(() => {
    if (status === "submitted" && justSent.current) doneHeading.current?.focus();
  }, [status]);

  const errorText = (code: ThisIsMeErrorCode | undefined) =>
    code
      ? t(`errors.${code}`, {
          nameMax: n(THIS_IS_ME_LIMITS.nameMax),
          emailMax: n(THIS_IS_ME_LIMITS.emailMax),
          digits: n(NPI_DIGITS),
          count: n(normaliseNpi(values.npi.trim()).length),
          detailsMax: n(THIS_IS_ME_LIMITS.detailsMax),
          detailsCount: n(values.details.trim().length),
        })
      : undefined;

  const describedBy = (field: ThisIsMeField, hasHint: boolean) =>
    errors[field] ? `${fieldId(field)}-error` : hasHint ? `${fieldId(field)}-hint` : undefined;

  const focusFirst = (found: ThisIsMeErrors) => {
    const first = FOCUS_ORDER.find((f) => found[f]);
    if (!first) return false;
    const id = first === "intent" ? intentId(INTENTS[0]) : fieldId(first);
    document.getElementById(id)?.focus();
    return true;
  };

  const recheck = (field: ThisIsMeField, value: string, nextIntent = intent, reason = values.reason) =>
    setErrors((er) => ({ ...er, [field]: validateField(field, value, nextIntent, reason) }));

  const chooseIntent = (next: Intent) => {
    setIntent(next);
    // The reason only applies to removal: switching to claim drops its errors, switching back starts it untouched (F4).
    setErrors((er) => ({ ...er, intent: undefined, reason: undefined, details: undefined }));
    if (status === "profileUnavailable" || status === "failed") setStatus("form");
  };

  const bind = (field: ThisIsMeField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    invalid: Boolean(errors[field]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (!typedIn[field]) setTypedIn((d) => ({ ...d, [field]: true }));
      if (errors[field]) recheck(field, value);
    },
    onBlur: () => {
      if (typedIn[field]) recheck(field, values[field]);
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateThisIsMe(intent, values);
    setErrors(found);
    if (focusFirst(found)) return;
    startTransition(async () => {
      const result: ThisIsMeResult = await submitThisIsMe(doctorId, intent, values).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      if (result.ok) {
        justSent.current = true;
        setSentTo(values.email.trim());
        setStatus("submitted");
      } else if (result.error === "validation") {
        setErrors(result.fields);
        setStatus("form");
        focusFirst(result.fields);
      } else {
        setStatus(result.error === "profileUnavailable" ? "profileUnavailable" : "failed");
      }
    });
  };

  if (status === "submitted") {
    const done = intent ?? "remove";
    const email = (chunks: React.ReactNode) => <span className="ltr-run font-semibold text-ink-900">{chunks}</span>;
    return (
      <div className="flex flex-col items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-success">
          <CheckIcon className="size-6" />
        </span>
        <h2 ref={doneHeading} tabIndex={-1} className="text-xl font-bold text-sea-900">
          {t(`submitted.${done}.title`)}
        </h2>
        {done === "remove" ? (
          <>
            <p className="text-ink-700">{t("submitted.remove.lead", { sla: slaLabel })}</p>
            <ol className="flex flex-col gap-3">
              {(["step1", "step2", "step3"] as const).map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="tabular inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-600 text-sm font-bold text-white">
                    {n(i + 1)}
                  </span>
                  <p className="pt-0.5 text-ink-900">
                    {step === "step1" && sentTo
                      ? t.rich("submitted.remove.step1", { address: sentTo, email })
                      : step === "step1"
                        ? t("submitted.remove.step1NoEmail")
                        : t(`submitted.remove.${step}`, { sla: slaLabel })}
                  </p>
                </li>
              ))}
            </ol>
            <p className="text-sm text-ink-700">{t("submitted.remove.after")}</p>
          </>
        ) : (
          <>
            <p className="text-ink-700">
              {sentTo
                ? t.rich("submitted.claim.body", { address: sentTo, digits: n(business.otpDigits), email })
                : t("submitted.claim.bodyNoEmail", { digits: n(business.otpDigits) })}
            </p>
            <p className="text-sm text-ink-700">{t("submitted.claim.spam")}</p>
          </>
        )}
        <LinkButton href={`/doctors/${doctorId}`} variant="secondary" className="mt-2">
          {t("submitted.backToProfile")}
        </LinkButton>
      </div>
    );
  }

  const submitLabel = pending ? t("form.sending") : status === "failed" ? t("form.retry") : t(`form.submit.${intent ?? "none"}`);

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={titleId} aria-busy={pending || undefined} className="flex flex-col gap-5">
      <fieldset aria-describedby={errors.intent ? "this-is-me-intent-error" : undefined}>
        <legend className="text-[15px] font-semibold text-ink-900">{t("choice.legend")}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          {INTENTS.map((value) => (
            <RadioCard
              key={value}
              id={intentId(value)}
              name="intent"
              value={value}
              checked={intent === value}
              onChange={() => chooseIntent(value)}
              invalid={Boolean(errors.intent)}
              title={t(`choice.${value}.title`)}
              description={t(`choice.${value}.body`)}
            />
          ))}
        </div>
        {errors.intent ? (
          <p id="this-is-me-intent-error" role="alert" className="mt-1.5 text-sm text-danger">
            {errorText(errors.intent)}
          </p>
        ) : null}
      </fieldset>

      <Field id={fieldId("name")} label={t("form.name")} error={errorText(errors.name)}>
        <Input
          {...bind("name")}
          autoComplete="name"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="next"
          dir="auto"
          aria-describedby={describedBy("name", false)}
        />
      </Field>

      <Field id={fieldId("npi")} label={t("form.npi")} hint={t("form.npiHint", { digits: n(NPI_DIGITS) })} error={errorText(errors.npi)}>
        <Input
          {...bind("npi")}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={16}
          dir="ltr"
          className="tabular"
          aria-describedby={describedBy("npi", true)}
        />
      </Field>

      <Field id={fieldId("email")} label={t("form.email")} hint={t("form.emailHint")} error={errorText(errors.email)}>
        <Input
          {...bind("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={intent === "remove" ? "next" : "send"}
          dir="ltr"
          aria-describedby={describedBy("email", true)}
        />
      </Field>

      {intent === "remove" ? (
        <>
          <Field id={fieldId("reason")} label={t("form.reason")} error={errorText(errors.reason)}>
            <Select
              id={fieldId("reason")}
              name="reason"
              value={values.reason}
              invalid={Boolean(errors.reason)}
              aria-describedby={describedBy("reason", false)}
              onChange={(e) => {
                const reason = e.target.value;
                setValues((v) => ({ ...v, reason }));
                setTypedIn((d) => ({ ...d, reason: true }));
                recheck("reason", reason, intent, reason);
                if (reason !== "other") setErrors((er) => ({ ...er, details: undefined }));
              }}
              onBlur={() => {
                if (typedIn.reason) recheck("reason", values.reason);
              }}
            >
              <option value="" disabled>
                {t("form.reasonChoose")}
              </option>
              {REMOVAL_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(`reasons.${reason}`)}
                </option>
              ))}
            </Select>
          </Field>

          {values.reason === "wrongDetails" ? (
            <div className="rounded-[var(--radius-field)] bg-sky-100 p-4 text-sm text-ink-900">
              <p>{t("form.wrongDetailsHint")}</p>
              <button
                type="button"
                onClick={() => chooseIntent("claim")}
                className="mt-1 inline-flex min-h-6 items-center gap-1 font-semibold text-sea-700 underline-offset-2 hover:underline"
              >
                {t("form.claimInstead")} <ChevronNext />
              </button>
            </div>
          ) : null}

          {values.reason === "other" ? (
            <Field id={fieldId("details")} label={t("form.details")} error={errorText(errors.details)}>
              <Textarea {...bind("details")} rows={3} dir="auto" className="min-h-24" aria-describedby={describedBy("details", false)} />
            </Field>
          ) : null}
        </>
      ) : null}

      {intent ? <p className="text-sm text-ink-700">{t(`form.note.${intent}`, { sla: slaLabel, digits: n(business.otpDigits) })}</p> : null}

      {status === "failed" || status === "profileUnavailable" ? (
        <div role="alert" className="rounded-[var(--radius-field)] border border-danger bg-white p-4">
          <p className="font-semibold text-danger">{t(`${status}.title`)}</p>
          <p className="mt-1 text-sm text-ink-700">
            {status === "failed"
              ? t.rich("failed.body", {
                  address: business.supportEmail,
                  email: (chunks) => (
                    <a href={`mailto:${business.supportEmail}`} className="ltr-run font-semibold text-sea-700 underline-offset-2 hover:underline">
                      {chunks}
                    </a>
                  ),
                })
              : t("profileUnavailable.body")}
          </p>
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
