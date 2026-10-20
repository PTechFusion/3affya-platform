// Screen 27, sharing and consent (docs/screens/27-sharing-and-consent.md, task 3.10). Who can see the patient's records summary,
// pinned first (rule T7), with the plain confidentiality line (T12); then the shares as rows (doctor, expires on with the days
// left, Stop sharing in one tap with Undo, no confirmation: B10); Share with a doctor opens a sheet that lists only the doctors
// of the patient's upcoming visits, with a length picker and the consent line. Then how sharing works.
// The shares are the same rows screen 36 reads (lib/sample patientSharing), so a share reads the same on both sides and has
// ended for the patient exactly when it has left the professional's list.
// States: default (sh_001 live with Dr Omar Khalil; Dr Karim Saleh open to share with); ?state=sheet (the share sheet open);
// ?state=shared (just shared with Dr Karim, Undo bar); ?state=stopped (just stopped sh_001, Undo bar); ?state=expired (the day
// after sh_001 runs out: the page clock moves to then); ?state=empty (summary ready, nothing shared: one action);
// ?state=noRecords (no summary yet: one action); ?state=loading (skeleton, same as loading.tsx). Time zone via ?tz=.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Surface } from "@/components/ui";
import { business, shareLengthDaysOptions } from "@/config/business";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { patientSharing, samplePatient, type PatientShare } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { DAY_MS, daysLeft } from "@/lib/format";
import { SharingManager } from "./_parts/SharingManager";
import { SharingSkeleton } from "./_parts/SharingSkeleton";
import type { InitialChange, LengthView, ShareRowView, VisitView } from "./_parts/types";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sharing" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function SharingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <SharingSkeleton />;

  const loc = locale as Locale;
  const ar = loc === "ar";
  const state = typeof sp.state === "string" ? sp.state : "";
  const t = await getTranslations("sharing");
  const ts = await getTranslations("summary");
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : samplePatient.timeZone;
  const date = (instant: Date) => formatDate(instant, timeZone, loc);
  const counted = (n: number) => ({ count: n, label: formatNumber(n, loc) });

  // ?state=expired previews the day after the last live share runs out, so the page clock moves to then.
  let now = new Date();
  let data = patientSharing(now);
  if (state === "expired") {
    const lastEnd = Math.max(0, ...data.shares.map((s) => s.expiresAt.getTime()));
    if (lastEnd > now.getTime()) {
      now = new Date(lastEnd + DAY_MS);
      data = patientSharing(now);
    }
  }

  const summary = state === "noRecords" ? undefined : data.summary;
  const shares = state === "empty" || state === "noRecords" ? [] : data.shares;
  const name = (d: PatientShare["doctor"]) => (ar ? d.nameAr : d.nameEn);
  const specialty = (d: PatientShare["doctor"]) => (ar ? d.specialtyAr : d.specialtyEn);

  let rows: ShareRowView[] = shares.map((s) => ({
    id: s.id,
    doctorId: s.doctor.id,
    name: name(s.doctor),
    specialty: specialty(s.doctor),
    sharedOn: date(s.sharedAt),
    expiresOn: date(s.expiresAt),
    daysLeft: daysLeft(s.expiresAt, now),
    status: s.status,
    viewedOn: s.viewedAt && s.viewedAt <= now ? date(s.viewedAt) : null,
    ended: s.expiresAt <= now ? { reason: "expired", on: date(s.expiresAt) } : null,
    fresh: false,
  }));

  const visits: VisitView[] = data.visits.map((v) => ({
    doctorId: v.doctor.id,
    name: name(v.doctor),
    specialty: specialty(v.doctor),
    visitOn: date(v.startsAt),
  }));
  const lengths: LengthView[] = shareLengthDaysOptions.map((days) => ({ days, until: date(new Date(now.getTime() + days * DAY_MS)) }));
  const defaultDays = business.shareDefaultDays;

  // The prototype states that open right after a change, with its Undo bar.
  let initialChange: InitialChange = null;
  const firstLive = rows.find((r) => !r.ended);
  if (state === "stopped" && firstLive) {
    rows = rows.map((r) => (r.id === firstLive.id ? { ...r, ended: { reason: "stopped", on: date(now) } } : r));
    initialChange = { kind: "stopped", shareId: firstLive.id };
  }
  const openVisit = visits.find((v) => !rows.some((r) => !r.ended && r.doctorId === v.doctorId));
  if (state === "shared" && openVisit && summary) {
    rows = [
      {
        id: "sh_preview",
        doctorId: openVisit.doctorId,
        name: openVisit.name,
        specialty: openVisit.specialty,
        sharedOn: date(now),
        expiresOn: date(new Date(now.getTime() + defaultDays * DAY_MS)),
        daysLeft: defaultDays,
        status: "new",
        viewedOn: null,
        ended: null,
        fresh: true,
      },
      ...rows,
    ];
    initialChange = { kind: "shared", shareId: "sh_preview" };
  }

  const pages = summary ? summary.data.documents.reduce((n, d) => n + d.pages, 0) : 0;
  const summaryCounts = {
    files: ts("files", counted(summary?.data.documents.length ?? 0)),
    pages: ts("pages", counted(pages)),
  };
  const longest = t("days", counted(Math.max(...shareLengthDaysOptions)));

  return (
    <>
      <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      <div className="mt-5">
        <SharingManager
          initialRows={rows}
          visits={visits}
          lengths={lengths}
          defaultDays={defaultDays}
          hasSummary={!!summary}
          summaryLine={t("summaryLine", summaryCounts)}
          summaryCounts={summaryCounts}
          today={date(now)}
          initialChange={initialChange}
          openOnLoad={state === "sheet"}
        />
      </div>

      <section aria-labelledby="sharing-how-title" className="mt-8">
        <Surface>
          <h2 id="sharing-how-title" className="text-xl font-bold text-sea-900">
            {t("how.title")}
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-ink-700 marker:text-lagoon-600">
            <li>{t("how.one")}</li>
            <li>{t("how.ends", { days: longest })}</li>
            <li>{t("how.stop")}</li>
            <li>{t("how.seen")}</li>
            <li>{t("how.delete")}</li>
          </ul>
        </Surface>
      </section>
    </>
  );
}
