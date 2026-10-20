"use client";
// Invite one doctor (screen 46): the address, an optional personal line and the email language, with the email preview
// updating as the admin types. Phone: fields, preview, then Send. Desktop: fields and Send at the start, the preview beside
// them. Labels above fields, the optional one marked (F1); the address is checked on blur once typed in, re-checked on each
// keystroke while it shows an error, and the error names the fix (F4, F5, lib/email checkEmail); input is kept when sending
// fails (L4). Send stays off until counsel clears sending, and the server action refuses it as well (config outreach).
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Field, Input, LinkButton, SegmentedControl, Textarea } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { checkEmail, type EmailProblem } from "@/lib/email";
import { formatNumber, type Locale } from "@/lib/format";
import { sendInvite, type SendInviteResult } from "../actions";
import { ClaimEmailPreview, type PreviewLabels } from "./ClaimEmailPreview";
import type { ClaimEmailCopy } from "./types";

type Lang = "ar" | "en";

export function InviteComposer({
  doctorId,
  initialEmail,
  emailNote,
  copy,
  fromEmail,
  maxChars,
  sendingCleared,
  gateId,
  expiresLabel,
  backHref,
  sentHref,
}: {
  doctorId: string;
  initialEmail: string;
  /** Shown under the address instead of the usual hint, e.g. that the last invite to it bounced (already formatted). */
  emailNote?: React.ReactNode;
  copy: Record<Lang, ClaimEmailCopy>;
  fromEmail: string;
  maxChars: number;
  sendingCleared: boolean;
  gateId: string;
  /** "If sent now, the link works until ..." in the admin's zone. */
  expiresLabel: string;
  backHref: string;
  /** Where a sent invite lands: the list with the just-sent notice. */
  sentHref: string;
}) {
  const t = useTranslations("adminOutreach.compose");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [typedIn, setTypedIn] = useState(false);
  const [emailError, setEmailError] = useState<EmailProblem | undefined>();
  const [line, setLine] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = line.trim().length;
  const tooLong = count > maxChars;
  const n = (v: number) => formatNumber(v, loc);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const problem = checkEmail(email);
    setEmailError(problem);
    if (problem) {
      document.getElementById("invite-email")?.focus();
      return;
    }
    if (tooLong) {
      document.getElementById("invite-line")?.focus();
      return;
    }
    setFormError(null);
    startTransition(async () => {
      let result: SendInviteResult;
      try {
        result = await sendInvite({ doctorId, email, personalLine: line, language: lang });
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (result.ok) {
        router.push(sentHref);
        return;
      }
      if (result.error === "tooLong") return;
      if (result.error === "notCleared" || result.error === "doctor" || result.error === "unavailable") {
        setFormError(t(`errors.${result.error}`));
        return;
      }
      setEmailError(result.error);
      document.getElementById("invite-email")?.focus();
    });
  };

  const labels: PreviewLabels = {
    from: t("preview.from"),
    to: t("preview.to"),
    subject: t("preview.subject"),
    preheader: t("preview.preheader"),
    toEmpty: t("preview.toEmpty"),
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1">
        <Field id="invite-email" label={t("email.label")} error={emailError ? t(`email.error.${emailError}`) : undefined}>
          <Input
            id="invite-email"
            name="email"
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            invalid={Boolean(emailError)}
            aria-describedby={emailError ? "invite-email-error" : "invite-email-note"}
            onChange={(e) => {
              setEmail(e.target.value);
              if (!typedIn) setTypedIn(true);
              if (emailError) setEmailError(checkEmail(e.target.value));
            }}
            onBlur={() => {
              if (typedIn) setEmailError(checkEmail(email));
            }}
          />
          {emailError ? null : (
            <p id="invite-email-note" className="text-sm text-ink-700">
              {emailNote ?? t("email.hint")}
            </p>
          )}
        </Field>

        <Field id="invite-line" label={t("line.label")} error={tooLong ? t("line.tooLong", { maxLabel: n(maxChars), countLabel: n(count) }) : undefined}>
          <Textarea
            id="invite-line"
            name="personalLine"
            dir="auto"
            rows={3}
            value={line}
            invalid={tooLong}
            aria-describedby={tooLong ? "invite-line-error" : "invite-line-note"}
            onChange={(e) => setLine(e.target.value)}
          />
          {tooLong ? null : (
            <p id="invite-line-note" className="flex flex-wrap justify-between gap-x-3 text-sm text-ink-700">
              <span>{t("line.hint")}</span>
              <span className="tabular">{t("line.count", { countLabel: n(count), maxLabel: n(maxChars) })}</span>
            </p>
          )}
        </Field>

        <div className="flex flex-col gap-1.5">
          <SegmentedControl
            legend={t("language.legend")}
            name="language"
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: tc("english"), lang: "en" },
              { value: "ar", label: tc("arabic"), lang: "ar" },
            ]}
          />
          <p className="text-sm text-ink-700">{t("language.hint")}</p>
        </div>
      </div>

      <section aria-labelledby="invite-preview-title" className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <h2 id="invite-preview-title" className="text-lg font-bold text-sea-900">
          {t("preview.title")}
        </h2>
        <p className="mb-3 text-sm text-ink-700">{t("preview.lead")}</p>
        <ClaimEmailPreview copy={copy[lang]} to={email} personalLine={line} fromEmail={fromEmail} labels={labels} />
      </section>

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2">
        <p className="text-sm text-ink-700">{expiresLabel}</p>
        {formError ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!sendingCleared || pending} aria-describedby={sendingCleared ? undefined : `${gateId} invite-send-off`}>
            {pending ? t("sending") : t("send")}
          </Button>
          <LinkButton href={backHref} variant="ghost">
            {t("back")}
          </LinkButton>
        </div>
        {sendingCleared ? null : (
          <p id="invite-send-off" className="text-sm font-semibold text-ink-700">
            {t("sendOff")}
          </p>
        )}
      </div>
    </form>
  );
}
