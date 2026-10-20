// Screen 46, Outreach and invites (docs/screens/46-outreach-and-invites.md, tasks 2.3 and 4.5). Phone first: the heading,
// the funnel tiles (sent, opened, claimed, expired; each filters the list), the counsel gate, then the lists with search
// visible and the specialty filter one level down (rules A5, U6). Sent invites (default): status, when it was sent, what
// happened last, Resend (off until counsel clears sending), Revoke with Undo (B10). To invite: unclaimed registry doctors with
// no live invite, as the one DoctorCard row, each opening the invite form. ?invite=<doctor id> is that form: address,
// personal line, email language and a live preview of the claim email that lands on /claim/[token] (screen 9).
// Data: data/sample/invites.json through lib/sample.ts outreachInvites / outreachCandidates. The admin is sampleAdmin;
// dates show in sampleAdmin.timeZone unless ?tz= is set.
// States: sent list (default, also ?tab=sent); ?tab=invite; ?status=opened|claimed|expired|bounced|revoked; ?q= and
// ?specialty= on either tab; ?state=loading; ?state=empty (per tab); ?state=error; ?state=just-sent (after Send, with the new
// row on top); ?state=bounced (a bounce to act on); ?invite=doc_020 (the form), ?invite=doc_016 (re-invite after a bounce),
// ?invite=doc_013 (a doctor with an open invite), ?invite=doc_002 (not invitable: in-shell empty state).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice, Surface, TabLinks } from "@/components/ui";
import { outreach } from "@/config/business";
import { formatDate, formatNumber, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { outreachCandidates, outreachInvites, sampleAdmin, type OutreachInvite } from "@/lib/sample";
import { ComposeView } from "./_parts/ComposeView";
import { OutreachSkeleton } from "./_parts/OutreachSkeleton";
import { SentInvites } from "./_parts/SentInvites";
import { dateAndTime, funnelCounts, matchesFilter, matchesSearch, outreachHref, readQuery, type SearchParams } from "./_parts/outreach";
import {
  AppliedFilters,
  CandidateList,
  Filters,
  FunnelTiles,
  GATE_ID,
  GateNotice,
  HowInvitesWork,
  OutreachHeader,
  specialtyOptions,
} from "./_parts/sections";
import type { InviteRowView, NowLabels } from "./_parts/types";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminOutreach" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function OutreachPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = readQuery(await searchParams);
  if (query.state === "loading") return <OutreachSkeleton tab={query.tab} />;

  const loc = locale as Locale;
  const zone = query.tz ?? sampleAdmin.timeZone;
  const now = new Date();
  if (query.invite) return <ComposeView query={query} locale={loc} zone={zone} now={now} />;

  const t = await getTranslations("adminOutreach");

  if (query.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        <OutreachHeader />
        <Surface className="flex flex-col items-start gap-4">
          <div role="alert">
            <h2 className="text-lg font-bold text-ink-900">{t("error.title")}</h2>
            <p className="mt-1 max-w-xl text-ink-700">{t("error.body")}</p>
          </div>
          <LinkButton href={outreachHref({ ...query, state: undefined })}>{t("error.action")}</LinkButton>
        </Surface>
      </div>
    );
  }

  // ?state=empty: on Sent, nothing has been sent yet; on To invite, every unclaimed doctor already has a live invite.
  const empty = query.state === "empty";
  const all = empty && query.tab === "sent" ? [] : outreachInvites(outreach.inviteValidDays, { justSent: query.state === "just-sent" }, now);
  const everyone = empty && query.tab === "invite" ? [] : outreachCandidates(all);
  const counts = funnelCounts(all);

  const date = (d: Date) => formatDate(d, zone, loc);
  const dateTime = (d: Date) => dateAndTime(date(d), formatTime(d, zone, loc), loc);
  const name = (i: OutreachInvite) => (loc === "ar" ? i.doctor.nameAr : i.doctor.nameEn);
  const counted = (n: number) => formatNumber(n, loc);

  const sentTab = query.tab === "sent";
  const shownInvites = all.filter((i) => matchesFilter(i, query.status) && matchesSearch(i.doctor, query.q, i.email) && (!query.specialty || i.doctor.specialty === query.specialty));
  const shownCandidates = everyone.filter(({ doctor }) => matchesSearch(doctor, query.q) && (!query.specialty || doctor.specialty === query.specialty));
  const specialties = specialtyOptions(sentTab ? all.map((i) => i.doctor) : everyone.map((c) => c.doctor), loc);
  const clearHref = outreachHref({ tab: query.tab, tz: query.tz });

  const justSent = query.state === "just-sent" ? all[0] : undefined;
  const bounced = query.state === "bounced" ? all.find((i) => i.status === "bounced") : undefined;

  const rows: InviteRowView[] = shownInvites.map((i) => ({
    id: i.id,
    name: name(i),
    specialty: loc === "ar" ? i.doctor.specialtyAr : i.doctor.specialtyEn,
    email: i.email,
    status: i.status,
    sentOn: dateTime(i.sentAt),
    sentDate: date(i.sentAt),
    sentTime: formatTime(i.sentAt, zone, loc),
    expires: date(i.expiresAt),
    opened: i.openedAt ? date(i.openedAt) : undefined,
    claimed: i.claimedAt ? date(i.claimedAt) : undefined,
    bounced: i.bouncedAt ? date(i.bouncedAt) : undefined,
    bounce: i.bounce,
    revoked: i.revokedAt ? date(i.revokedAt) : undefined,
    fresh: i === justSent,
    profileHref: `/doctors/${i.doctor.id}`,
    composeHref: outreachHref({ invite: i.doctor.id, tz: query.tz }),
  }));
  const nowLabels: NowLabels = {
    today: date(now),
    sentOn: dateTime(now),
    sentDate: date(now),
    sentTime: formatTime(now, zone, loc),
    expires: date(new Date(now.getTime() + outreach.inviteValidDays * 86_400_000)),
  };
  const addr = (c: React.ReactNode) => <span className="ltr-run break-all font-semibold text-ink-900">{c}</span>;

  return (
    <div className="flex flex-col gap-6">
      <OutreachHeader />

      {justSent ? (
        <Notice
          tone="success"
          role="status"
          title={t("justSent.title", { name: name(justSent) })}
          body={t.rich("justSent.body", { email: justSent.email, expires: dateAndTime(date(justSent.expiresAt), formatTimeInZone(justSent.expiresAt, zone, loc), loc), addr })}
          action={
            <LinkButton href={outreachHref({ tab: "invite", tz: query.tz })} variant="secondary">
              {t("justSent.action")}
            </LinkButton>
          }
        />
      ) : null}
      {bounced?.bouncedAt ? (
        <Notice
          tone="danger"
          title={t("bounced.title", { name: name(bounced) })}
          body={t.rich("bounced.body", {
            email: bounced.email,
            date: date(bounced.bouncedAt),
            reason: t(`bounced.reason.${bounced.bounce ?? "noMailbox"}`),
            addr,
          })}
          action={<LinkButton href={outreachHref({ invite: bounced.doctor.id, tz: query.tz })}>{t("bounced.action")}</LinkButton>}
        />
      ) : null}

      {counts.sent ? <FunnelTiles counts={counts} query={query} showSide={!bounced} /> : null}
      <GateNotice />

      <div className="flex flex-col gap-4">
        <TabLinks
          label={t("tabs.label")}
          scroll={false}
          items={[
            { href: outreachHref({ tz: query.tz }), label: t("tabs.sent"), count: counted(all.length), current: sentTab },
            { href: outreachHref({ tab: "invite", tz: query.tz }), label: t("tabs.invite"), count: counted(everyone.length), current: !sentTab },
          ]}
        />

        {sentTab ? (
          all.length === 0 ? (
            <EmptyState
              title={t("empty.sentTitle")}
              body={t("empty.sentBody")}
              action={<LinkButton href={outreachHref({ tab: "invite", tz: query.tz })}>{t("empty.sentAction")}</LinkButton>}
            />
          ) : (
            <>
              <Filters query={query} specialties={specialties} />
              <AppliedFilters query={query} specialties={specialties} />
              {rows.length ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink-700">
                    {t.rich("sent.zone", { zone: formatZone(now, zone), run: (c) => <span className="ltr-run">{c}</span> })}
                  </p>
                  <SentInvites initialRows={rows} now={nowLabels} sendingCleared={outreach.sendingCleared} gateId={GATE_ID} caption={t("sent.caption")} />
                </div>
              ) : (
                <EmptyState
                  title={t("noMatch.sentTitle")}
                  body={t("noMatch.sentBody")}
                  action={<LinkButton href={clearHref}>{t("noMatch.action")}</LinkButton>}
                />
              )}
            </>
          )
        ) : everyone.length === 0 ? (
          <EmptyState
            title={t("empty.inviteTitle")}
            body={t("empty.inviteBody")}
            action={<LinkButton href={outreachHref({ tz: query.tz })}>{t("empty.inviteAction")}</LinkButton>}
          />
        ) : (
          <>
            <Filters query={query} specialties={specialties} />
            <AppliedFilters query={query} specialties={specialties} />
            <p className="text-sm text-ink-700">{t("invite.liveNote")}</p>
            {shownCandidates.length ? (
              <CandidateList candidates={shownCandidates} query={query} zone={zone} />
            ) : (
              <EmptyState
                title={t("noMatch.inviteTitle")}
                body={t("noMatch.inviteBody")}
                action={<LinkButton href={clearHref}>{t("noMatch.action")}</LinkButton>}
              />
            )}
          </>
        )}
      </div>

      <HowInvitesWork />
    </div>
  );
}
