// Invite one doctor (screen 46, ?invite=<doctor id>): the trail back to Outreach, the heading, the counsel gate, the registry
// row the doctor will be shown (the one DoctorCard), then the form and the email preview. A doctor who is not an unclaimed
// registry row (claimed, removed, unknown id) gets an in-shell empty state with one action (PLAYBOOK §9), never a 404.
import { getTranslations } from "next-intl/server";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Breadcrumbs, EmptyState, LinkButton, Notice } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business, outreach } from "@/config/business";
import { formatDate, formatTimeInZone, type Locale } from "@/lib/format";
import { outreachInvites, outreachIsLive, sampleDoctors, toDoctorCardData } from "@/lib/sample";
import { claimEmailCopy } from "./email-copy";
import { InviteComposer } from "./InviteComposer";
import { dateAndTime, outreachHref, type OutreachQuery } from "./outreach";
import { GATE_ID, GateNotice } from "./sections";

export async function ComposeView({ query, locale, zone, now }: { query: OutreachQuery; locale: Locale; zone: string; now: Date }) {
  const t = await getTranslations("adminOutreach");
  const tp = await getTranslations("portal");
  const tl = await getTranslations("languages");
  const backHref = outreachHref({ tab: "invite", tz: query.tz });
  const doctor = sampleDoctors.find((d) => d.id === query.invite && d.state === "unclaimed");
  const crumbs = (current: string) => (
    <Breadcrumbs
      label={t("compose.breadcrumb")}
      items={[{ label: tp("admin.title"), href: "/admin" }, { label: t("title"), href: backHref }, { label: current }]}
    />
  );

  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        {crumbs(t("compose.notFound.title"))}
        <EmptyState
          title={t("compose.notFound.title")}
          body={t("compose.notFound.body")}
          action={<LinkButton href={backHref}>{t("compose.notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const name = locale === "ar" ? doctor.nameAr : doctor.nameEn;
  const mine = outreachInvites(outreach.inviteValidDays, {}, now).filter((i) => i.doctor.id === doctor.id);
  const live = mine.find(outreachIsLive);
  const last = mine[0];
  const bounced = last?.status === "bounced" ? last : undefined;
  const date = (d: Date) => formatDate(d, zone, locale);
  const expiresAt = new Date(now.getTime() + outreach.inviteValidDays * 86_400_000);
  const [en, ar] = await Promise.all([claimEmailCopy("en", doctor, expiresAt), claimEmailCopy("ar", doctor, expiresAt)]);

  return (
    <div className="flex flex-col gap-6">
      {crumbs(t("compose.title", { name }))}
      <header>
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("compose.title", { name })}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("compose.lead")}</p>
      </header>
      <GateNotice />
      {live ? <Notice tone="info" title={t("compose.liveTitle", { name })} body={t("compose.liveBody", { date: date(live.sentAt) })} /> : null}

      <section aria-labelledby="invite-registry-title" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="invite-registry-title" className="text-lg font-bold text-sea-900">
            {t("compose.registry")}
          </h2>
          <Link href={`/doctors/${doctor.id}`} className="text-sm font-semibold text-sea-700 underline-offset-2 hover:underline">
            {t("compose.viewProfile")}
          </Link>
        </div>
        <DoctorCard doctor={toDoctorCardData(doctor, locale, zone, tl)} state={doctor.state} size="row" />
      </section>

      <InviteComposer
        doctorId={doctor.id}
        initialEmail={bounced?.email ?? ""}
        emailNote={
          bounced?.bouncedAt
            ? t.rich("compose.email.bounced", {
                email: bounced.email,
                date: date(bounced.bouncedAt),
                addr: (c) => <span className="ltr-run break-all font-semibold text-ink-900">{c}</span>,
              })
            : undefined
        }
        copy={{ en, ar }}
        fromEmail={business.supportEmail}
        maxChars={outreach.personalLineMaxChars}
        sendingCleared={outreach.sendingCleared}
        gateId={GATE_ID}
        expiresLabel={t("compose.expires", { expires: dateAndTime(date(expiresAt), formatTimeInZone(expiresAt, zone, locale), locale) })}
        backHref={backHref}
        sentHref={outreachHref({ state: "just-sent", tz: query.tz })}
      />
    </div>
  );
}
