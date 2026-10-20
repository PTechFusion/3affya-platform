// Screen 37, Admin login with TOTP (docs/screens/37-login-with-totp.md). No portal shell: the wordmark and one centred card whose
// three steps replace each other: work email, the code we email to it, then the code from an authenticator app (or one recovery
// code). Single-field codes, paste works, errors in text next to the field; the refusal gives no hint which factor failed, and
// nothing says whether an address belongs to the team (F5 F6 W4). Success goes to /admin/review; the stubs create no session.
// It lives in the (no-shell) route group so the admin portal layout (app/[locale]/admin/layout.tsx) does not wrap it.
// States: /admin/login (email); ?state=error (email that needs a fix); ?step=code; ?step=code&state=error (code too short);
// ?step=totp; ?step=totp&state=error; ?step=recovery; ?step=recovery&state=error; ?state=refused; ?state=locked (sign-in
// paused, says until when); ?state=loading. ?tz= picks the zone the pause end is shown in (default the admin's, Riyadh).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatTimeInZone, type Locale } from "@/lib/format";
import { sampleAdmin } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { AdminLoginFlow, type AdminLoginStep } from "./_parts/AdminLoginFlow";
import { LoginFrame } from "./_parts/LoginFrame";
import { pausedUntil } from "./_parts/limits";
import Loading from "./loading";

/** Error-state openers: each value breaks one rule, so its message names that fix (rule F5). */
const SAMPLE_EMAIL_NEEDS_FIX = "ops@3affya"; // no dot after the @
const SAMPLE_CODE_SHORT = "1234"; // emailed code, 4 of 6 digits
const SAMPLE_TOTP_SHORT = "12345"; // authenticator code, 5 of 6 digits
const SAMPLE_RECOVERY_SHORT = "K7QM4-X2W9"; // recovery code, 9 of 10 characters
/** The emailed code the later steps carry when a preview opens on them (any full code other than all zeros). */
const SAMPLE_EMAIL_CODE = "482913";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminLogin" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const STEPS: readonly AdminLoginStep[] = ["email", "code", "totp", "recovery"];

export default async function AdminLogin({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <Loading />;

  // Before sign-in nobody is known, so the zone is the viewer's (?tz=), which defaults to the admin's own (Riyadh).
  const { timeZone } = viewerFrom(sp);
  const error = state === "error";
  const asked = STEPS.find((s) => s === sp.step) ?? "email";
  const step: AdminLoginStep = state === "refused" ? "refused" : state === "locked" ? "locked" : asked;
  // Formatted here, not in the client, so the server and the first client render print the same time.
  const retryLabel = step === "locked" ? formatTimeInZone(pausedUntil(), timeZone, locale as Locale) : undefined;

  const flow =
    step === "email" ? (
      <AdminLoginFlow
        initialEmail={error ? SAMPLE_EMAIL_NEEDS_FIX : ""}
        initialEmailError={error ? "noDot" : undefined}
        timeZone={timeZone}
      />
    ) : step === "code" ? (
      <AdminLoginFlow
        initialStep="code"
        initialEmail={sampleAdmin.email}
        initialEmailCode={error ? SAMPLE_CODE_SHORT : ""}
        initialEmailCodeError={error ? "short" : undefined}
        timeZone={timeZone}
      />
    ) : step === "totp" || step === "recovery" ? (
      <AdminLoginFlow
        initialStep={step}
        initialEmail={sampleAdmin.email}
        initialEmailCode={SAMPLE_EMAIL_CODE}
        initialFactorCode={error ? (step === "totp" ? SAMPLE_TOTP_SHORT : SAMPLE_RECOVERY_SHORT) : ""}
        initialFactorError={error ? (step === "totp" ? "short" : "length") : undefined}
        timeZone={timeZone}
      />
    ) : (
      <AdminLoginFlow initialStep={step} initialEmail={sampleAdmin.email} initialRetryLabel={retryLabel} timeZone={timeZone} />
    );

  return <LoginFrame>{flow}</LoginFrame>;
}
