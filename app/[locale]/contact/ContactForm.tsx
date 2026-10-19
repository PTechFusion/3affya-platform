"use client";
// The three-field email form (screen 15). Labels above, single column, nothing marked because nothing is optional (F1).
// Validates on blur only once a field has been typed in, re-checks on every keystroke once it shows an error, and clears the
// error the moment it is fixed (F4). Errors name the sub-rule and the fix, next to the field, in text (F5, L4). Input is kept
// when sending fails (L4). Right keyboard and no autocorrect on name and email (F8).
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, Field, Input, LinkButton, Textarea } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { sendContactMessage } from "./actions";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  validateContact,
  validateField,
  type ContactErrorCode,
  type ContactErrors,
  type ContactField,
  type ContactInput,
  type ContactResult,
} from "./validation";

export type ContactStatus = "form" | "sent" | "failed";

const fieldId = (field: ContactField) => `contact-${field}`;

export function ContactForm({
  initialValues,
  initialErrors = {},
  initialStatus,
  replyLabel,
  whatsappHref,
}: {
  initialValues: ContactInput;
  initialErrors?: ContactErrors;
  initialStatus: ContactStatus;
  /** "within one working day", already formatted on the server from config/business.ts */
  replyLabel: string;
  whatsappHref: string;
}) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ContactErrors>(initialErrors);
  const [typedIn, setTypedIn] = useState<Partial<Record<ContactField, boolean>>>({});
  const [status, setStatus] = useState<ContactStatus>(initialStatus);
  const [sentTo, setSentTo] = useState(initialValues.email.trim());
  const [pending, startTransition] = useTransition();
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const justSent = useRef(false);

  useEffect(() => {
    if (status === "sent" && justSent.current) sentHeading.current?.focus();
  }, [status]);

  const errorText = (code: ContactErrorCode | undefined) =>
    code
      ? t(`errors.${code}`, {
          nameMax: formatNumber(CONTACT_LIMITS.nameMax, locale),
          emailMax: formatNumber(CONTACT_LIMITS.emailMax, locale),
          min: formatNumber(CONTACT_LIMITS.messageMin, locale),
          max: formatNumber(CONTACT_LIMITS.messageMax, locale),
          count: formatNumber(values.message.trim().length, locale),
        })
      : undefined;

  const describedBy = (field: ContactField, hasHint: boolean) =>
    errors[field] ? `${fieldId(field)}-error` : hasHint ? `${fieldId(field)}-hint` : undefined;

  const focusFirst = (found: ContactErrors) => {
    const first = CONTACT_FIELDS.find((f) => found[f]);
    if (first) document.getElementById(fieldId(first))?.focus();
    return Boolean(first);
  };

  const bind = (field: ContactField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    invalid: Boolean(errors[field]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (!typedIn[field]) setTypedIn((d) => ({ ...d, [field]: true }));
      if (errors[field]) setErrors((er) => ({ ...er, [field]: validateField(field, value) }));
    },
    onBlur: () => {
      if (typedIn[field]) setErrors((er) => ({ ...er, [field]: validateField(field, values[field]) }));
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    if (focusFirst(found)) return;
    startTransition(async () => {
      const result: ContactResult = await sendContactMessage(values).catch(() => ({ ok: false, error: "unavailable" }) as const);
      if (result.ok) {
        justSent.current = true;
        setSentTo(values.email.trim());
        setStatus("sent");
      } else if (result.error === "validation") {
        setErrors(result.fields);
        setStatus("form");
        focusFirst(result.fields);
      } else {
        setStatus("failed");
      }
    });
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-success">
          <CheckIcon className="size-6" />
        </span>
        <h2 ref={sentHeading} tabIndex={-1} className="text-xl font-bold text-sea-900">
          {t("sent.title")}
        </h2>
        <p className="text-ink-700">
          {sentTo
            ? t.rich("sent.body", {
                address: sentTo,
                reply: replyLabel,
                email: (chunks) => <span className="ltr-run font-semibold text-ink-900">{chunks}</span>,
              })
            : t("sent.bodyNoEmail", { reply: replyLabel })}
        </p>
        <p className="text-sm text-ink-700">{t("sent.spam")}</p>
        <LinkButton href="/search" variant="secondary" className="mt-2">
          {tc("findDoctor")}
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <h2 id="email-title" className="text-xl font-bold text-sea-900">
        {t("form.title")}
      </h2>
      <p className="mt-1 text-ink-700">{t("form.lead", { reply: replyLabel })}</p>
      <form noValidate onSubmit={onSubmit} aria-labelledby="email-title" aria-busy={pending || undefined} className="mt-5 flex flex-col gap-5">
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
        <Field id={fieldId("email")} label={t("form.email")} hint={t("form.emailHint")} error={errorText(errors.email)}>
          <Input
            {...bind("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            dir="ltr"
            aria-describedby={describedBy("email", true)}
          />
        </Field>
        <Field id={fieldId("message")} label={t("form.message")} hint={t("form.messageHint")} error={errorText(errors.message)}>
          <Textarea {...bind("message")} rows={6} dir="auto" aria-describedby={describedBy("message", true)} />
        </Field>

        {status === "failed" ? (
          <div role="alert" className="rounded-[var(--radius-field)] border border-danger bg-white p-4">
            <p className="font-semibold text-danger">{t("form.failedTitle")}</p>
            <p className="mt-1 text-sm text-ink-700">{t("form.failedBody")}</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sea-700 underline-offset-2 hover:underline"
            >
              {t("form.failedWhatsApp")} <ChevronNext />
            </a>
          </div>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
          {pending ? t("form.sending") : status === "failed" ? t("form.retry") : t("form.submit")}
        </Button>
      </form>
    </>
  );
}
