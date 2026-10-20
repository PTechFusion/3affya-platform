"use client";
// The sign-in card: email -> Continue -> one code field -> Sign in -> the page the patient came from (or their bookings).
// Email: label above, email keyboard, no autocorrect or autocapitalise, LTR entry, the why-we-ask line under the field, checked
// on blur once typed in and on every keystroke once an error shows (F1 F4 F5 F8 L4). Code: one field, numeric keyboard,
// autocomplete one-time-code, paste works, never truncated (F6 W4). Provider inbox buttons replace "check your email" (F7); a
// resend timer counts down from signInLimits.resendAfterSeconds. Errors and limits are text next to the field, with the input
// kept; a limit names the time a new code can be asked for (F5 L4). No answer says whether an account exists (F6).
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, Field, Input, LinkButton } from "@/components/ui";
import { InboxLinks } from "@/components/brand/InboxLinks";
import { Link, useRouter } from "@/i18n/navigation";
import { business, signInLimits } from "@/config/business";
import { formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { checkEmail } from "@/lib/email";
import { inboxLinksFor } from "@/lib/inbox";
import { checkCode, codeDigits, prototypeWrongCode } from "@/lib/otp";
import { sendSignInCode, verifySignInCode, type SendCodeResult, type VerifyCodeResult } from "../actions";
import type { SignInReason } from "./next";

export type SignInStep = "email" | "code";
export type EmailError = Extract<SendCodeResult, { ok: false }>["error"];
export type CodeError = Extract<VerifyCodeResult, { ok: false }>["error"];

const EMAIL_ID = "sign-in-email";
const CODE_ID = "sign-in-code";
const DIGITS = business.otpDigits;
const focusById = (id: string) => document.getElementById(id)?.focus();
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const linkClass = "font-semibold text-sea-700 underline underline-offset-2 hover:text-sea-800";

export function SignInFlow({
  initialStep = "email",
  initialEmail = "",
  initialEmailError,
  initialCode = "",
  initialCodeError,
  initialRetryLabel,
  next,
  reason,
  timeZone,
}: {
  initialStep?: SignInStep;
  initialEmail?: string;
  initialEmailError?: EmailError;
  initialCode?: string;
  initialCodeError?: CodeError;
  /** For a limited state opened by URL: the retry time, formatted on the server so the first render matches. */
  initialRetryLabel?: string;
  /** Already checked by safeNext on the server; the verify action checks it again and returns the real destination. */
  next: string;
  reason: SignInReason;
  timeZone: string;
}) {
  const t = useTranslations("signIn");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const digits = formatNumber(DIGITS, locale);

  const [step, setStep] = useState<SignInStep | "done">(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [emailTyped, setEmailTyped] = useState(false);
  const [emailError, setEmailError] = useState<EmailError | undefined>(initialEmailError);
  // The address a send limit applies to: asking again for it repeats the limit without calling the server.
  const [limitedEmail, setLimitedEmail] = useState<string | undefined>(initialEmailError === "limited" ? initialEmail : undefined);
  const [code, setCode] = useState(initialCode);
  const [codeError, setCodeError] = useState<CodeError | undefined>(initialCodeError);
  const [retryLabel, setRetryLabel] = useState(initialRetryLabel ?? "");
  const [resent, setResent] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(initialStep === "code" && !initialCodeError ? signInLimits.resendAfterSeconds : 0);
  const [destination, setDestination] = useState(next);
  const [pending, startTransition] = useTransition();
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Move focus only after the patient acted, never on first render (a state preview opened by URL stays at the top).
  useEffect(() => {
    if (!moved.current) return;
    if (step === "code") focusById(CODE_ID);
    if (step === "email") focusById(EMAIL_ID);
    if (step === "done") doneHeading.current?.focus();
  }, [step]);

  // Resend timer: one tick a second while the code step waits.
  useEffect(() => {
    if (step !== "code" || waitSeconds <= 0) return;
    const id = window.setTimeout(() => setWaitSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [step, waitSeconds]);

  const limitParams = () => ({ time: retryLabel });
  const emailText = (e: EmailError | undefined) => {
    if (!e) return undefined;
    if (e === "limited") {
      const n = signInLimits.codesPerHour;
      return t("email.error.limited", { count: n, countLabel: formatNumber(n, locale), ...limitParams() });
    }
    return t(`email.error.${e}`);
  };
  const codeText = (e: CodeError | undefined) => {
    if (!e) return undefined;
    if (e === "limited") return t("code.error.limited", limitParams());
    return t(`code.error.${e}`, { digits, count: formatNumber(codeDigits(code, DIGITS).length, locale) });
  };
  const showLimit = (retryAtUtc: string) => setRetryLabel(formatTimeInZone(new Date(retryAtUtc), timeZone, locale));

  const send = (isResend: boolean) => {
    const problem = checkEmail(email);
    if (problem) {
      setEmailError(problem);
      setStep("email");
      focusById(EMAIL_ID);
      return;
    }
    if (limitedEmail && sameEmail(email, limitedEmail)) {
      setEmailError("limited");
      setStep("email");
      focusById(EMAIL_ID);
      return;
    }
    startTransition(async () => {
      const result: SendCodeResult = await sendSignInCode({ email }).catch(() => ({ ok: false, error: "unavailable" }) as const);
      if (result.ok) {
        moved.current = true;
        setEmailError(undefined);
        setCodeError(undefined);
        setCode("");
        setResent(isResend);
        setWaitSeconds(signInLimits.resendAfterSeconds);
        setStep("code");
        if (isResend) focusById(CODE_ID);
        return;
      }
      if (result.error === "limited") {
        showLimit(result.retryAtUtc);
        setLimitedEmail(email);
      }
      moved.current = true;
      setEmailError(result.error);
      setStep("email");
      focusById(EMAIL_ID);
    });
  };

  const verify = () => {
    const value = codeDigits(code, DIGITS);
    const problem = checkCode(value, DIGITS);
    if (problem) {
      setCodeError(problem);
      focusById(CODE_ID);
      return;
    }
    startTransition(async () => {
      const result: VerifyCodeResult = await verifySignInCode({ email, code: value, next }).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      if (result.ok) {
        moved.current = true;
        setDestination(result.next);
        setStep("done");
        router.push(result.next);
        return;
      }
      if (result.error === "limited") showLimit(result.retryAtUtc);
      setCodeError(result.error);
      setResent(false);
      focusById(CODE_ID);
    });
  };

  const title = (text: string) => <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{text}</h1>;

  if (step === "done") {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-success">
          <CheckIcon className="size-6" />
        </span>
        <h1 ref={doneHeading} tabIndex={-1} className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">
          {t("done.title")}
        </h1>
        <p className="text-ink-700">{t(`done.${reason}`)}</p>
        <LinkButton href={destination} size="lg" className="mt-1 w-full">
          {tc("continue")} <ChevronNext />
        </LinkButton>
      </div>
    );
  }

  if (step === "email") {
    return (
      <>
        {title(t("title"))}
        <p className="mt-2 text-ink-700">
          {t.rich(`lead.${reason}`, {
            link: (chunks) => (
              <Link href="/search" className={linkClass}>
                {chunks}
              </Link>
            ),
          })}
        </p>
        <form
          noValidate
          aria-busy={pending || undefined}
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(false);
          }}
        >
          <Field id={EMAIL_ID} label={t("email.label")} hint={t("email.why", { digits })} error={emailText(emailError)}>
            <Input
              id={EMAIL_ID}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              dir="ltr"
              value={email}
              invalid={Boolean(emailError)}
              aria-describedby={emailError ? `${EMAIL_ID}-error` : `${EMAIL_ID}-hint`}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                setEmailTyped(true);
                if (emailError) {
                  // A limit belongs to one address: editing it clears the limit message, other errors re-check live.
                  setEmailError(emailError === "limited" && limitedEmail && sameEmail(value, limitedEmail) ? "limited" : checkEmail(value));
                }
              }}
              onBlur={() => {
                if (emailTyped && emailError !== "limited") setEmailError(checkEmail(email));
              }}
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? t("email.sending") : tc("continue")}
          </Button>
          <p className="text-sm text-ink-700">
            {t.rich("terms", {
              terms: (chunks) => (
                <Link href="/terms" className={linkClass}>
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" className={linkClass}>
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </form>
      </>
    );
  }

  const locked = codeError === "limited";
  const minutes = signInLimits.codeValidMinutes;
  const clock = `${formatNumber(Math.floor(waitSeconds / 60), locale)}:${formatNumber(waitSeconds % 60, locale, { minimumIntegerDigits: 2 })}`;
  return (
    <>
      {title(t("code.title"))}
      <div role="status" className="mt-2">
        <p className="text-ink-900">{t("code.sentTo", { digits })}</p>
        {/* On its own line, as an LTR run at the start of the line (rules R3, R4): no trailing punctuation to drift in RTL. */}
        <p className="font-semibold text-ink-900">
          <span className="ltr-run break-all">{email.trim()}</span>
        </p>
        <p className="mt-1 text-sm text-ink-700">
          {resent ? t("code.resent") : t("code.valid", { minutes, minutesLabel: formatNumber(minutes, locale) })}
        </p>
      </div>
      <div className="mt-4">
        <InboxLinks
          links={inboxLinksFor(email)}
          labels={{
            gmail: t("inbox.gmail"),
            outlook: t("inbox.outlook"),
            yahoo: t("inbox.yahoo"),
            icloud: t("inbox.icloud"),
            newTab: t("inbox.newTab"),
          }}
        />
      </div>
      <form
        noValidate
        aria-busy={pending || undefined}
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) verify();
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
              const value = codeDigits(e.target.value, DIGITS);
              setCode(value);
              if (codeError && !locked) setCodeError(checkCode(value, DIGITS));
            }}
          />
        </Field>
        <Button type="submit" size="lg" disabled={pending || locked} className="w-full">
          {pending ? t("code.checking") : t("code.submit")}
        </Button>
      </form>
      {/* Centred under the full-width button: the resend timer (or, once it runs out, the resend button), then change email. */}
      <div className="mt-2 flex flex-col items-center text-center">
        {waitSeconds > 0 ? (
          <p className="py-3.5 text-sm text-ink-700">
            {t.rich("code.resendIn", {
              time: clock,
              n: (chunks) => <span className="ltr-run tabular font-semibold text-ink-900">{chunks}</span>,
            })}
          </p>
        ) : (
          <Button type="button" variant="ghost" disabled={pending || locked} onClick={() => send(true)}>
            {t("code.resend")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            moved.current = true;
            setCodeError(undefined);
            setStep("email");
          }}
        >
          {t("code.change")}
        </Button>
      </div>
      <p className="mt-4 rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
        {t("prototypeNote", { digits, wrong: prototypeWrongCode(DIGITS) })}
      </p>
    </>
  );
}
