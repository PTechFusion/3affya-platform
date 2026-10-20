"use client";
// The admin sign-in card: three steps replacing each other in one card (work email, the emailed code, the authenticator code
// or a recovery code), then the review queue. Every code is one field, numeric keyboard where it is digits, paste works and is
// never blocked, autocomplete one-time-code so a password manager can fill the authenticator code (F6 W4 F8). Errors are text
// next to the field naming the fix, with the input kept (F5 L4). The emailed code is not judged on its own: a mismatch in any
// factor surfaces once, at the end, as one refusal that does not say which factor failed, and nothing on the card says whether
// an address belongs to the team (F6, brief 37). Past adminSignIn.attemptsMax refusals sign-in pauses and says until when.
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, Field, Input, LinkButton, LockIcon, nowrap } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { adminSignIn, business } from "@/config/business";
import { formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { checkEmail } from "@/lib/email";
import { checkCode, codeDigits, prototypeWrongCode } from "@/lib/otp";
import {
  checkAdminEmailCode,
  finishAdminSignIn,
  startAdminSignIn,
  type EmailCodeResult,
  type FinishResult,
  type StartResult,
} from "../actions";
import { checkRecoveryCode, groupRecoveryCode, prototypeWrongRecovery, recoveryChars, recoveryExample } from "./codes";
import { ADMIN_HOME, SIGN_IN_STEPS, pausedUntil } from "./limits";

export type AdminLoginStep = "email" | "code" | "totp" | "recovery" | "refused" | "locked";
export type EmailError = Extract<StartResult, { ok: false }>["error"];
export type EmailCodeError = Exclude<Extract<EmailCodeResult, { ok: false }>["error"], "locked">;
export type FactorError = Exclude<Extract<FinishResult, { ok: false }>["error"], "locked" | "refused">;

const EMAIL_ID = "admin-email";
const CODE_ID = "admin-email-code";
const TOTP_ID = "admin-totp";
const RECOVERY_ID = "admin-recovery";
const HEADING_ID = "admin-login-heading";
const EMAIL_DIGITS = business.otpDigits;
const TOTP_DIGITS = adminSignIn.totpDigits;
const focusById = (id: string) => document.getElementById(id)?.focus();
const codeInput = {
  type: "text",
  autoComplete: "one-time-code",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
  enterKeyHint: "done",
  dir: "ltr",
} as const;

export function AdminLoginFlow({
  initialStep = "email",
  initialEmail = "",
  initialEmailError,
  initialEmailCode = "",
  initialEmailCodeError,
  initialFactorCode = "",
  initialFactorError,
  initialRetryLabel,
  timeZone,
}: {
  initialStep?: AdminLoginStep;
  initialEmail?: string;
  initialEmailError?: Exclude<EmailError, "locked">;
  initialEmailCode?: string;
  initialEmailCodeError?: EmailCodeError;
  /** The authenticator or recovery field's opening value, for the step the card opens on. */
  initialFactorCode?: string;
  initialFactorError?: FactorError;
  /** For the paused state opened by URL: the time sign-in opens again, formatted on the server so the first render matches. */
  initialRetryLabel?: string;
  timeZone: string;
}) {
  const t = useTranslations("adminLogin");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const n = (value: number) => formatNumber(value, locale);

  const [step, setStep] = useState<AdminLoginStep | "done">(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [emailTyped, setEmailTyped] = useState(false);
  const [emailError, setEmailError] = useState<Exclude<EmailError, "locked"> | undefined>(initialEmailError);
  const [emailCode, setEmailCode] = useState(initialEmailCode);
  const [emailCodeError, setEmailCodeError] = useState<EmailCodeError | undefined>(initialEmailCodeError);
  const [totp, setTotp] = useState(initialStep === "totp" ? initialFactorCode : "");
  const [recovery, setRecovery] = useState(initialStep === "recovery" ? initialFactorCode : "");
  const [factorError, setFactorError] = useState<FactorError | undefined>(initialFactorError);
  const [retryLabel, setRetryLabel] = useState(initialRetryLabel ?? "");
  const [resent, setResent] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(initialStep === "code" && !initialEmailCodeError ? adminSignIn.resendAfterSeconds : 0);
  // Prototype only: the refusals in a row on this page. Production counts them in the database and answers "locked" itself.
  const [refusals, setRefusals] = useState(0);
  const [pending, startTransition] = useTransition();
  const moved = useRef(false);

  // Move focus only after the admin acted, never on first render (a state preview opened by URL stays at the top). Steps with a
  // field focus it; refused, paused and done move focus to their heading so screen readers hear the outcome.
  useEffect(() => {
    if (!moved.current) return;
    const field = { email: EMAIL_ID, code: CODE_ID, totp: TOTP_ID, recovery: RECOVERY_ID } as Partial<Record<string, string>>;
    focusById(field[step] ?? HEADING_ID);
  }, [step]);

  // Resend timer: one tick a second while the code step waits.
  useEffect(() => {
    if (step !== "code" || waitSeconds <= 0) return;
    const id = window.setTimeout(() => setWaitSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [step, waitSeconds]);

  const go = (next: AdminLoginStep | "done") => {
    moved.current = true;
    setStep(next);
  };
  const lockUntil = (retryAtUtc: string) => {
    setRetryLabel(formatTimeInZone(new Date(retryAtUtc), timeZone, locale));
    go("locked");
  };

  const send = (isResend: boolean) => {
    const problem = checkEmail(email);
    if (problem) {
      setEmailError(problem);
      setStep("email");
      focusById(EMAIL_ID);
      return;
    }
    startTransition(async () => {
      const result: StartResult = await startAdminSignIn({ email }).catch(() => ({ ok: false, error: "unavailable" }) as const);
      if (result.ok) {
        setEmailError(undefined);
        setEmailCodeError(undefined);
        setEmailCode("");
        setResent(isResend);
        setWaitSeconds(adminSignIn.resendAfterSeconds);
        if (isResend) focusById(CODE_ID);
        else go("code");
        return;
      }
      if (result.error === "locked") return lockUntil(result.retryAtUtc);
      setEmailError(result.error);
      go("email");
      focusById(EMAIL_ID);
    });
  };

  const checkEmailCode = () => {
    const value = codeDigits(emailCode, EMAIL_DIGITS);
    const problem = checkCode(value, EMAIL_DIGITS);
    if (problem) {
      setEmailCodeError(problem);
      focusById(CODE_ID);
      return;
    }
    startTransition(async () => {
      const result: EmailCodeResult = await checkAdminEmailCode({ email, code: value }).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      if (result.ok) {
        setEmailCodeError(undefined);
        setFactorError(undefined);
        go("totp");
        return;
      }
      if (result.error === "locked") return lockUntil(result.retryAtUtc);
      setEmailCodeError(result.error);
      focusById(CODE_ID);
    });
  };

  const finish = (factor: "totp" | "recovery") => {
    const fieldId = factor === "totp" ? TOTP_ID : RECOVERY_ID;
    const value = factor === "totp" ? codeDigits(totp, TOTP_DIGITS) : recoveryChars(recovery);
    const problem = factor === "totp" ? checkCode(value, TOTP_DIGITS) : checkRecoveryCode(value);
    if (problem) {
      setFactorError(problem);
      focusById(fieldId);
      return;
    }
    startTransition(async () => {
      const result: FinishResult = await finishAdminSignIn({ email, emailCode, factor, code: value }).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      if (result.ok) {
        go("done");
        router.push(result.next);
        return;
      }
      if (result.error === "locked") return lockUntil(result.retryAtUtc);
      if (result.error === "refused") {
        const count = refusals + 1;
        setRefusals(count);
        if (count >= adminSignIn.attemptsMax) return lockUntil(pausedUntil().toISOString());
        go("refused");
        return;
      }
      setFactorError(result.error);
      focusById(fieldId);
    });
  };

  const startAgain = () => {
    setEmailCode("");
    setTotp("");
    setRecovery("");
    setEmailCodeError(undefined);
    setFactorError(undefined);
    setEmailError(undefined);
    go("email");
  };

  const switchFactor = (to: "totp" | "recovery") => {
    setFactorError(undefined);
    go(to);
  };

  const stepLine = (index: number) => (
    <p className="text-sm font-semibold text-lagoon-800">{t("step", { step: n(index), total: n(SIGN_IN_STEPS) })}</p>
  );
  const title = (text: string) => (
    <h1 id={HEADING_ID} tabIndex={-1} className="mt-1 text-2xl font-bold leading-tight text-sea-900 outline-none sm:text-3xl">
      {text}
    </h1>
  );
  const outcome = (tone: "danger" | "success", text: string) => (
    <>
      <span
        aria-hidden="true"
        className={
          tone === "success"
            ? "inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-success"
            : "inline-flex size-12 items-center justify-center rounded-full bg-sand-100 text-danger"
        }
      >
        {tone === "success" ? <CheckIcon className="size-6" /> : <LockIcon className="size-6" />}
      </span>
      <h1 id={HEADING_ID} tabIndex={-1} className="text-2xl font-bold leading-tight text-sea-900 outline-none sm:text-3xl">
        {text}
      </h1>
    </>
  );
  const prototypeNote = (text: string) => (
    <p className="mt-4 rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">{text}</p>
  );

  if (step === "done") {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        {outcome("success", t("done.title"))}
        <p className="text-ink-700">{t("done.body")}</p>
        <LinkButton href={ADMIN_HOME} size="lg" className="mt-1 w-full">
          {tc("continue")} <ChevronNext />
        </LinkButton>
      </div>
    );
  }

  if (step === "refused") {
    const max = adminSignIn.attemptsMax;
    const minutes = adminSignIn.lockMinutes;
    return (
      <div className="flex flex-col items-start gap-3">
        {outcome("danger", t("refused.title"))}
        <p className="text-ink-900">{t("refused.body")}</p>
        <p className="text-sm text-ink-700">
          {t("refused.limit", { max, maxLabel: n(max), minutes, minutesLabel: n(minutes) })}
        </p>
        <Button type="button" size="lg" className="mt-1 w-full" onClick={startAgain}>
          {t("refused.action")}
        </Button>
      </div>
    );
  }

  if (step === "locked") {
    return (
      <div className="flex flex-col items-start gap-3">
        {outcome("danger", t("locked.title"))}
        {/* formatTimeInZone keeps the time and its zone on one line (no-break spaces, an LTR isolate in Arabic). */}
        <p className="text-ink-900">{t("locked.body", { time: retryLabel })}</p>
        <p className="text-sm text-ink-700">{t("locked.notYou")}</p>
      </div>
    );
  }

  if (step === "email") {
    return (
      <>
        {stepLine(1)}
        {title(t("email.title"))}
        <p className="mt-2 text-ink-700">{t("email.lead")}</p>
        <form
          noValidate
          aria-busy={pending || undefined}
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(false);
          }}
        >
          <Field
            id={EMAIL_ID}
            label={t("email.label")}
            hint={t("email.hint", { digits: n(EMAIL_DIGITS) })}
            error={emailError ? t(`email.error.${emailError}`) : undefined}
          >
            <Input
              id={EMAIL_ID}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
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
            {pending ? t("email.sending") : tc("continue")}
          </Button>
        </form>
      </>
    );
  }

  if (step === "code") {
    const minutes = adminSignIn.emailCodeValidMinutes;
    const clock = `${n(Math.floor(waitSeconds / 60))}:${formatNumber(waitSeconds % 60, locale, { minimumIntegerDigits: 2 })}`;
    const digits = n(EMAIL_DIGITS);
    return (
      <>
        {stepLine(2)}
        {title(t("code.title"))}
        <div role="status" className="mt-2">
          <p className="text-ink-900">{t.rich("code.sentTo", { digits, nowrap })}</p>
          {/* On its own line, as an LTR run at the start of the line (rules R3, R4). */}
          <p className="font-semibold text-ink-900">
            <span className="ltr-run break-all">{email.trim()}</span>
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {resent ? t("code.resent") : t("code.valid", { minutes, minutesLabel: n(minutes) })}
          </p>
        </div>
        <form
          noValidate
          aria-busy={pending || undefined}
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            checkEmailCode();
          }}
        >
          <Field
            id={CODE_ID}
            label={t("code.label", { digits })}
            hint={t("code.hint")}
            error={
              emailCodeError ? t(`code.error.${emailCodeError}`, { digits, count: n(codeDigits(emailCode, EMAIL_DIGITS).length) }) : undefined
            }
          >
            <Input
              {...codeInput}
              id={CODE_ID}
              name="email-code"
              inputMode="numeric"
              className="tabular"
              value={emailCode}
              invalid={Boolean(emailCodeError)}
              aria-describedby={emailCodeError ? `${CODE_ID}-error` : `${CODE_ID}-hint`}
              onChange={(e) => {
                const value = codeDigits(e.target.value, EMAIL_DIGITS);
                setEmailCode(value);
                if (emailCodeError && emailCodeError !== "unavailable") setEmailCodeError(checkCode(value, EMAIL_DIGITS));
              }}
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? t("checking") : tc("continue")}
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
            <Button type="button" variant="ghost" disabled={pending} onClick={() => send(true)}>
              {t("code.resend")}
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={pending} onClick={() => go("email")}>
            {t("code.change")}
          </Button>
        </div>
        {prototypeNote(t("prototypeNote", { digits, wrong: prototypeWrongCode(EMAIL_DIGITS) }))}
      </>
    );
  }

  if (step === "totp") {
    const digits = n(TOTP_DIGITS);
    const seconds = adminSignIn.totpPeriodSeconds;
    return (
      <>
        {stepLine(3)}
        {title(t("totp.title"))}
        <p className="mt-2 text-ink-700">{t.rich("totp.lead", { digits, seconds, secondsLabel: n(seconds), nowrap })}</p>
        <form
          noValidate
          aria-busy={pending || undefined}
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            finish("totp");
          }}
        >
          <Field
            id={TOTP_ID}
            label={t("totp.label", { digits })}
            hint={t("totp.hint")}
            error={factorError ? t(`totp.error.${factorError}`, { digits, count: n(codeDigits(totp, TOTP_DIGITS).length) }) : undefined}
          >
            <Input
              {...codeInput}
              id={TOTP_ID}
              name="totp"
              inputMode="numeric"
              className="tabular"
              value={totp}
              invalid={Boolean(factorError)}
              aria-describedby={factorError ? `${TOTP_ID}-error` : `${TOTP_ID}-hint`}
              onChange={(e) => {
                const value = codeDigits(e.target.value, TOTP_DIGITS);
                setTotp(value);
                if (factorError && factorError !== "unavailable") setFactorError(checkCode(value, TOTP_DIGITS));
              }}
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? t("checking") : t("signIn")}
          </Button>
        </form>
        <div className="mt-2 flex flex-col items-center text-center">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => switchFactor("recovery")}>
            {t("totp.useRecovery")}
          </Button>
        </div>
        {prototypeNote(t("prototypeNote", { digits, wrong: prototypeWrongCode(TOTP_DIGITS) }))}
      </>
    );
  }

  // Recovery code: letters and numbers, so the text keyboard, upper case suggested; still one field, paste works.
  const chars = adminSignIn.recoveryCodeChars;
  const charsArgs = { chars, charsLabel: n(chars) };
  return (
    <>
      {stepLine(3)}
      {title(t("recovery.title"))}
      <p className="mt-2 text-ink-700">{t("recovery.lead")}</p>
      <form
        noValidate
        aria-busy={pending || undefined}
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          finish("recovery");
        }}
      >
        <Field
          id={RECOVERY_ID}
          label={t("recovery.label")}
          hint={t("recovery.hint", { ...charsArgs, example: recoveryExample })}
          error={
            factorError ? t(`recovery.error.${factorError}`, { ...charsArgs, count: n(recoveryChars(recovery).length) }) : undefined
          }
        >
          <Input
            {...codeInput}
            id={RECOVERY_ID}
            name="recovery-code"
            inputMode="text"
            autoCapitalize="characters"
            className="tabular uppercase"
            value={recovery}
            invalid={Boolean(factorError)}
            aria-describedby={factorError ? `${RECOVERY_ID}-error` : `${RECOVERY_ID}-hint`}
            onChange={(e) => {
              setRecovery(e.target.value);
              if (factorError && factorError !== "unavailable") setFactorError(checkRecoveryCode(recoveryChars(e.target.value)));
            }}
          />
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? t("checking") : t("signIn")}
        </Button>
      </form>
      <div className="mt-2 flex flex-col items-center text-center">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => switchFactor("totp")}>
          {t("recovery.useApp")}
        </Button>
      </div>
      <p className="mt-2 text-sm text-ink-700">{t("recovery.lost")}</p>
      {prototypeNote(t("prototypeRecovery", { wrong: groupRecoveryCode(prototypeWrongRecovery) }))}
    </>
  );
}
