// Screen 28, Settings (docs/screens/28-settings.md), task 3.6. Layout call: a grouped list, Language, Time zone, Calendar
// (Gregorian, Hijri optional), Emails, then a Delete section with Delete uploads and Delete account, each explaining retention;
// Language and Time zone above the fold. This screen also carries Your details (name in both scripts, email, phone) and Your
// data (download), placed after Emails so the layout call's order and fold hold. Rules: T8 (what deletion removes and what
// retention keeps), B10 (Undo for routine changes, confirmation with outcome-named buttons for the two deletions), P6 (GCC-first
// zones, zone named), N3 (Gregorian first, Hijri optional), H10 (each language in its own script), F4/F5 (blur validation with
// specific messages), T12 (emails carry no health details). The patient is Noura (lib/sample samplePatientSettings).
// States (query params):
//   default                       Noura's settings; Hijri on, two of three optional emails on, uploads present
//   ?state=loading                the skeleton, same as loading.tsx
//   ?state=saved                  details just saved: the Undo bar says so
//   ?state=invalid                details after Save with three specific field errors (Latin in the Arabic name, email without a
//                                 dot in the domain, a Saudi number one digit short)
//   ?state=error                  saving the details failed: the alert, the edit kept, Save becomes Try again
//   ?state=exportRequested        the download is being prepared; where the link goes and for how long
//   ?state=deleteUploadsConfirm   the inline confirmation for Delete my uploads
//   ?state=empty                  no uploads: that row is the empty state with one action (Upload records)
//   ?state=deleteConfirm          the inline confirmation for Delete my account (the brief's "delete confirm")
//   ?state=deletionRequested      deletion scheduled: the banner with the date and Keep my account
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { accountData } from "@/config/business";
import { formatDate, formatHijri, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { samplePatientSettings } from "@/lib/sample";
import { MINUTES_PER_DAY } from "@/lib/slots";
import { GROUPS, PREVIEWS, type Preview, type When, type ZoneGroup } from "./_parts/model";
import { SettingsScreen } from "./_parts/SettingsScreen";
import { checkDetails, type DetailsInput } from "./_parts/validation";
import { GULF_ZONES, OTHER_ZONES, isSettingsZone, type ZoneChoice } from "./_parts/zones";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const DAY_IN_MS = MINUTES_PER_DAY * 60_000;

export default async function SettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("settings");
  const preview: Preview = PREVIEWS.find((p) => p === sp.state) ?? "default";
  const s = samplePatientSettings();
  const timeZone = isSettingsZone(s.timeZone) ? s.timeZone : GULF_ZONES[0]?.timeZone ?? s.timeZone;
  const now = new Date();

  // Zone options: the place in the page language plus today's offset, the Latin offset isolated inside Arabic (rule R3).
  const isolate = (text: string) => (loc === "ar" ? `⁦${text}⁩` : text);
  const offset = (tz: string) => formatZone(now, tz).match(/\(([^)]+)\)/)?.[1] ?? "";
  const option = (z: ZoneChoice) => ({
    timeZone: z.timeZone,
    label: `${t(`timeZone.places.${z.key}`)} ${isolate(`(${offset(z.timeZone)})`)}`,
    now: formatTime(now, z.timeZone, loc),
  });
  const zoneGroups: ZoneGroup[] = [
    { label: t("timeZone.gulf"), zones: GULF_ZONES.map(option) },
    { label: t("timeZone.other"), zones: OTHER_ZONES.map(option) },
  ];

  const when = (instant: Date): When => ({ day: formatDate(instant, timeZone, loc), time: formatTimeInZone(instant, timeZone, loc) });
  const grace = accountData.deletionGraceDays * DAY_IN_MS;

  const saved: DetailsInput = { nameAr: s.nameAr, nameEn: s.nameEn, email: s.email, phone: s.phone };
  // The invalid preview: what a patient might type, one specific problem per field (rules F4, F5).
  const invalid: DetailsInput = { nameAr: "Noura", nameEn: s.nameEn, email: "noura@example", phone: "+966 50 123 456" };
  const initialDetails = preview === "invalid" ? invalid : preview === "error" ? { ...saved, email: "noura.q@example.com" } : saved;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:items-start xl:gap-8">
        <SettingsScreen
          preview={preview}
          initialDetails={initialDetails}
          initialErrors={preview === "invalid" ? checkDetails(invalid) : {}}
          savedDetails={saved}
          timeZone={timeZone}
          hijri={s.hijri}
          emails={s.emails}
          hasUploads={s.hasUploads}
          zoneGroups={zoneGroups}
          hijriExample={`${formatDate(now, timeZone, loc)} · ${formatHijri(now, timeZone, loc)}`}
          deleteOn={when(new Date(now.getTime() + grace))}
          scheduledOn={when(new Date(s.deletionRequestedAt.getTime() + grace))}
        />
        {/* Desktop only: the page is long, so its groups are one click away at the end side. */}
        <nav aria-label={t("onThisPage")} className="hidden xl:sticky xl:top-24 xl:block">
          <p className="mb-2 text-sm font-semibold text-ink-500">{t("onThisPage")}</p>
          <ul className="flex flex-col gap-0.5 border-s border-sand-300">
            {GROUPS.map((g) => (
              <li key={g}>
                <a href={`#${g}`} className="-ms-px block border-s-2 border-transparent py-1.5 ps-3 text-[15px] font-semibold text-ink-700 hover:border-sea-700 hover:text-sea-900">
                  {t(`${g}.title`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
