// Screen 9, Claim invite landing (docs/screens/09-claim-invite-landing.md). Centred single column: the pre-built card first,
// one sentence of what claiming gives, the pre-filled email, Send code, then the code field (U4 U5 B1 B3 F6 F7 U6).
// Tokens (data/sample/invites.json): demo-valid (doc_013), demo-expired (doc_014), demo-used (doc_010); anything else is forged.
// States: valid; ?step=code; ?step=code&state=error (wrong code); ?step=done; expired and used (?state=requested after asking
// for a new link); forged (no profile, one action); ?state=limited (rate limit, token not looked up); ?state=loading.
// Viewer: ?country= picks the emergency number, ?tz= the zone for dates.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { EmptyState, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { inviteByToken, toDoctorCardData, type SampleDoctor } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { ClaimFlow, type ClaimStep } from "./_parts/ClaimFlow";
import { RequestLink } from "./_parts/RequestLink";
import type { ChecklistItem } from "./_parts/ClaimChecklist";
import { inboxLinksFor } from "./_parts/inbox";
import { prototypeWrongCode } from "./_parts/code";
import Loading from "./loading";

const FIND_HREF = "/for-professionals#find-profile";

type Props = {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "claim" });
  // An invite URL carries a secret: keep it out of search indexes, and out of the Referer sent to the mail provider links.
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/** Registry lines start ticked (rule B3); the email line is this step; photo and credentials come next in the builder. */
function checklistFor(d: SampleDoctor): ChecklistItem[] {
  return [
    { key: "name", status: "registry" },
    { key: "npi", status: d.npi ? "registry" : "todo", detail: d.npi || undefined },
    { key: "specialty", status: d.specialty ? "registry" : "todo" },
    { key: "email", status: "current" },
    { key: "photo", status: d.photoUrl ? "registry" : "todo" },
    { key: "credentials", status: "todo" },
  ];
}

export default async function ClaimInvite({ params, searchParams }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <Loading />;

  const loc = locale as Locale;
  const viewer = viewerFrom(sp);
  const t = await getTranslations("claim");
  const tc = await getTranslations("common");
  const tl = await getTranslations("languages");
  const date = (iso: string) => formatDate(new Date(iso), viewer.timeZone, loc);

  const frame = (children: ReactNode) => (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-0 sm:py-12">
        {children}
        <p className="mt-10 text-sm text-ink-700">
          {t("contactLead")}{" "}
          <Link href="/contact" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
            {t("contactLink")}
          </Link>
        </p>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
  const title = (text: string) => <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{text}</h1>;

  // Past the per-IP limit the page says so without looking the token up, so links cannot be probed (task 2.3).
  if (state === "limited") {
    const n = business.inviteRateLimitPerIpPerHour;
    return frame(
      <>
        {title(t("limited.title"))}
        <p className="mt-3 text-ink-700">{t("limited.body", { count: n, countLabel: formatNumber(n, loc) })}</p>
      </>,
    );
  }

  const found = inviteByToken(token);
  if (!found) {
    return frame(
      <>
        {title(t("forged.title"))}
        <div className="mt-6">
          <EmptyState
            title={t("forged.emptyTitle")}
            body={t("forged.emptyBody")}
            action={<LinkButton href={FIND_HREF}>{t("forged.action")}</LinkButton>}
          />
        </div>
      </>,
    );
  }

  const { invite, doctor, status } = found;
  const name = loc === "ar" ? doctor.nameAr : doctor.nameEn;
  const card = (
    <div className="mt-5">
      <DoctorCard doctor={toDoctorCardData(doctor, loc, viewer.timeZone, tl)} state={doctor.state} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        {doctor.state === "unclaimed" ? <p className="text-ink-700">{t("registrySource")}</p> : <span />}
        <Link href={`/doctors/${doctor.id}/this-is-me`} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
          {tc("notMe")}
        </Link>
      </div>
    </div>
  );

  if (status === "valid") {
    const step: ClaimStep = sp.step === "code" ? "code" : sp.step === "done" ? "done" : "email";
    const wrongCode = step === "code" && state === "error";
    return frame(
      <>
        {title(t("valid.title", { name }))}
        {card}
        <p className="mt-5 text-ink-900">{t("valid.lead")}</p>
        <ClaimFlow
          token={invite.token}
          initialEmail={invite.email}
          initialStep={step}
          initialCode={wrongCode ? prototypeWrongCode(business.otpDigits) : ""}
          initialCodeError={wrongCode ? "wrong" : undefined}
          checklist={checklistFor(doctor)}
        />
      </>,
    );
  }

  // Expired or used: the same card with Request a new link (layout call); each says what happened and when.
  const body =
    status === "expired" ? t("expired.body", { date: date(invite.expiresAtUtc) }) : t("used.body", { date: date(invite.usedAtUtc ?? invite.sentAtUtc) });
  return frame(
    <>
      {title(t(`${status}.title`))}
      {card}
      <p className="mt-5 text-ink-900">{body}</p>
      <div className="mt-5">
        <RequestLink token={invite.token} initialSent={state === "requested"} inboxLinks={inboxLinksFor(invite.email)} />
      </div>
    </>,
  );
}
