// Screen 18, Sign up and login (docs/screens/18-sign-up-and-login.md). One centred card: one email field and Continue; the
// code step replaces it with one code field, Open Gmail, and a resend timer. The why-we-ask line sits under the field. One form
// serves sign-up and sign-in, so no answer reveals whether an account exists (F5 F6 F7 F8 F9 L4 W4).
// States: /sign-in (email); ?step=code; ?state=error (email that needs a fix); ?step=code&state=error (wrong code);
// ?state=limited (too many codes for one address); ?step=code&state=limited (too many wrong codes); ?state=loading.
// ?next= is where the patient goes after signing in (only portal and booking paths; default /patient/bookings), and picks the
// lead line: /book/... (finishing a booking), /patient/records... (uploading records), anything else (the account).
// Viewer: ?country= picks the emergency number, ?tz= the zone a retry time is shown in.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { formatTimeInZone, type Locale } from "@/lib/format";
import { prototypeWrongCode } from "@/lib/otp";
import { signInSampleEmail } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { SignInFlow, type SignInStep } from "./_parts/SignInFlow";
import { reasonFor, safeNext } from "./_parts/next";
import { retryAfterLock } from "./_parts/limits";
import Loading from "./loading";

/** The address the email error state opens with: the dot after the @ is missing, so the message names that fix (rule F5). */
const SAMPLE_EMAIL_NEEDS_FIX = "noura@example";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signIn" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <Loading />;

  const loc = locale as Locale;
  const viewer = viewerFrom(sp);
  const t = await getTranslations("signIn");
  const step: SignInStep = sp.step === "code" ? "code" : "email";
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const limited = state === "limited";
  const error = state === "error";
  // Formatted here, not in the client, so the server and the first client render print the same time.
  const retryLabel = limited ? formatTimeInZone(retryAfterLock(), viewer.timeZone, loc) : undefined;

  const flow =
    step === "code" ? (
      <SignInFlow
        initialStep="code"
        initialEmail={signInSampleEmail}
        initialCode={error || limited ? prototypeWrongCode(business.otpDigits) : ""}
        initialCodeError={limited ? "limited" : error ? "wrong" : undefined}
        initialRetryLabel={retryLabel}
        next={next}
        reason={reasonFor(next)}
        timeZone={viewer.timeZone}
      />
    ) : (
      <SignInFlow
        initialEmail={limited ? signInSampleEmail : error ? SAMPLE_EMAIL_NEEDS_FIX : ""}
        initialEmailError={limited ? "limited" : error ? "noDot" : undefined}
        initialRetryLabel={retryLabel}
        next={next}
        reason={reasonFor(next)}
        timeZone={viewer.timeZone}
      />
    );

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-md px-4 py-6 sm:max-w-lg sm:px-0 sm:py-14">
        <Surface className="sm:p-8">{flow}</Surface>
        <p className="mt-6 text-center text-sm text-ink-700">
          {t("contactLead")}{" "}
          <Link href="/contact" className="font-semibold text-sea-700 underline underline-offset-2 hover:text-sea-800">
            {t("contactLink")}
          </Link>
        </p>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
}
