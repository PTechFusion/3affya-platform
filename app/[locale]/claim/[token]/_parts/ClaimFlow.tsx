"use client";
// The claim form on a valid invite: email (pre-filled from the invite) -> Send code -> one code field -> Continue to the builder.
// Email: label above, email keyboard, no autocorrect, LTR entry, checked on blur once typed in and on every keystroke once an
// error shows (F1 F4 F5 F8 L4). Code: one field, numeric keyboard, autocomplete one-time-code, paste works, never truncated
// (F6 W4). After sending, provider inbox buttons replace "check your email" (F7). Answers never say whether an account exists.
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, Field, Input, LinkButton, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { checkEmail } from "@/lib/email";
import { sendClaimCode, verifyClaimCode, type SendCodeResult, type VerifyCodeResult } from "../actions";
import { checkCode, codeDigits, prototypeWrongCode } from "./code";
import { inboxLinksFor } from "./inbox";
import { InboxLinks } from "./InboxLinks";
import { ClaimChecklist, type ChecklistItem } from "./ClaimChecklist";

export type ClaimStep = "email" | "code" | "done";
type EmailError = Extract<SendCodeResult, { ok: false }>["error"];
type CodeError = Extract<VerifyCodeResult, { ok: false }>["error"];

const EMAIL_ID = "claim-email";
const CODE_ID = "claim-code";
const DIGITS = business.otpDigits;
const BUILDER_HREF = "/professional/builder";
const focusCode = () => document.getElementById(CODE_ID)?.focus();
const focusEmail = () => document.getElementById(EMAIL_ID)?.focus();

export function ClaimFlow({
  token,
  initialEmail,
  initialStep = "email",
  initialCode = "",
  initialCodeError,
  checklist,
}: {
  token: string;
  initialEmail: string;
  initialStep?: ClaimStep;
  initialCode?: string;
  initialCodeError?: CodeError;
  /** Registry-derived lines; the email line follows the step. */
  checklist: ChecklistItem[];
}) {
  const t = useTranslations("claim");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const digits = formatNumber(DIGITS, locale);
  const [step, setStep] = useState<ClaimStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [emailTyped, setEmailTyped] = useState(false);
  const [emailError, setEmailError] = useState<EmailError | undefined>();
  const [code, setCode] = useState(initialCode);
  const [codeError, setCodeError] = useState<CodeError | undefined>(initialCodeError);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Move focus only after the user acted, never on first render (a state preview opened by URL keeps the page at the top).
  useEffect(() => {
    if (!moved.current) return;
    if (step === "code") focusCode();
    if (step === "done") doneHeading.current?.focus();
  }, [step]);

  const emailText = (e: EmailError | undefined) => (e ? t(`email.error.${e}`) : undefined);
  const codeText = (e: CodeError | undefined) =>
    e ? t(`code.error.${e}`, { digits, count: formatNumber(codeDigits(code, DIGITS).length, locale) }) : undefined;

  const send = (isResend: boolean) => {
    const problem = checkEmail(email);
    if (problem) {
      setEmailError(problem);
      setStep("email");
      focusEmail();
      return;
    }
    startTransition(async () => {
      const result: SendCodeResult = await sendClaimCode({ token, email }).catch(() => ({ ok: false, error: "unavailable" }) as const);
      if (result.ok) {
        moved.current = true;
        setEmailError(undefined);
        setCodeError(undefined);
        setResent(isResend);
        if (!isResend) setCode("");
        setStep("code");
        if (isResend) focusCode();
      } else {
        setEmailError(result.error);
        setStep("email");
        moved.current = false;
        focusEmail();
      }
    });
  };

  const verify = () => {
    const value = codeDigits(code, DIGITS);
    const problem = checkCode(value, DIGITS);
    if (problem) {
      setCodeError(problem);
      focusCode();
      return;
    }
    startTransition(async () => {
      const result: VerifyCodeResult = await verifyClaimCode({ token, email, code: value }).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      if (result.ok) {
        moved.current = true;
        setStep("done");
      } else {
        setCodeError(result.error);
        setResent(false);
        focusCode();
      }
    });
  };

  const items: ChecklistItem[] = checklist.map((item) =>
    item.key === "email" ? { ...item, status: step === "done" ? "done" : "current" } : item,
  );

  return (
    <>
      <Surface className="mt-5">
        {step === "email" ? (
          <form
            noValidate
            aria-busy={pending || undefined}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              send(false);
            }}
          >
            <Field id={EMAIL_ID} label={t("email.label")} hint={t("email.hint", { digits })} error={emailText(emailError)}>
              <Input
                id={EMAIL_ID}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                dir="ltr"
                value={email}
                invalid={Boolean(emailError)}
                aria-describedby={emailError ? `${EMAIL_ID}-error` : `${EMAIL_ID}-hint`}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTyped(true);
                  if (emailError) setEmailError(checkEmail(e.target.value));
                }}
                onBlur={() => {
                  if (emailTyped) setEmailError(checkEmail(email));
                }}
              />
            </Field>
            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? t("email.sending") : t("email.submit")}
            </Button>
            <p className="text-sm text-ink-700">{t("email.scrutiny")}</p>
          </form>
        ) : step === "code" ? (
          <div className="flex flex-col gap-4">
            <div role="status">
              <p className="text-ink-900">
                {t.rich("code.sentTo", {
                  digits,
                  email: email.trim(),
                  b: (chunks) => <span className="ltr-run font-semibold">{chunks}</span>,
                })}
              </p>
              <p className="mt-1 text-sm text-ink-700">{resent ? t("code.resent") : t("code.spam")}</p>
            </div>
            <InboxLinks links={inboxLinksFor(email)} />
            <form
              noValidate
              aria-busy={pending || undefined}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
            >
              <Field id={CODE_ID} label={t("code.label", { digits })} hint={t("code.hint")} error={codeText(codeError)}>
                <Input
                  id={CODE_ID}
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  dir="ltr"
                  className="tabular"
                  value={code}
                  invalid={Boolean(codeError)}
                  aria-describedby={codeError ? `${CODE_ID}-error` : `${CODE_ID}-hint`}
                  onChange={(e) => {
                    const next = codeDigits(e.target.value, DIGITS);
                    setCode(next);
                    if (codeError) setCodeError(checkCode(next, DIGITS));
                  }}
                />
              </Field>
              <Button type="submit" size="lg" disabled={pending} className="w-full">
                {pending ? t("code.checking") : t("code.submit")}
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => send(true)}>
                {t("code.resend")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  moved.current = false;
                  setCodeError(undefined);
                  setStep("email");
                }}
              >
                {t("code.change")}
              </Button>
            </div>
            <p className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
              {t("prototypeNote", { digits, wrong: prototypeWrongCode(DIGITS) })}
            </p>
          </div>
        ) : (
          <div role="status" className="flex flex-col items-start gap-3">
            <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-success">
              <CheckIcon className="size-6" />
            </span>
            <h2 ref={doneHeading} tabIndex={-1} className="text-xl font-bold text-sea-900">
              {t("done.title")}
            </h2>
            <p className="text-ink-700">{t("done.body")}</p>
            <LinkButton href={BUILDER_HREF} size="lg" className="mt-1 w-full">
              {tc("continue")} <ChevronNext />
            </LinkButton>
          </div>
        )}
      </Surface>
      <ClaimChecklist items={items} />
    </>
  );
}
