// Screen 30, availability editor (docs/screens/30-availability-editor.md), task 2.6. Layout call: slot length and time zone
// above, the week grid (seven columns, swipeable on phone, tap to add) above the fold, exceptions below; the hook is the
// "preview as a patient in Riyadh" toggle, which swaps the grid for the patient's week in their own zone (rules P6 P7 N3).
// Changes apply at once with Undo, no confirmation dialogs (L2 B10); the first saved hours turn Accepting new patients on (B6).
// Weekly hours are the doctor's wall clock in America/Chicago for the prototype doctor doc_002; storage is UTC plus the zone.
// States (query params):
//   default                                     weekly hours, a day off and extra hours, the grid showing
//   ?state=exceptionAdded                       a day off was just added: highlighted in the list, with the Undo bar
//   ?preview=1&tz=Asia/Riyadh&country=SA        the patient view from Riyadh, Friday and Saturday shaded
//   ?preview=1&tz=Asia/Dubai&country=AE         the patient view from Dubai, Saturday and Sunday shaded
//   ?state=empty                                no weekly hours yet: one action, Accepting new patients off
//   ?state=firstSaved                           the first hours just saved: Accepting new patients on, with its notice
//   ?state=loading                              the skeleton, same as loading.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { business } from "@/config/business";
import { availabilityFor, sampleAddedException } from "@/lib/sample";
import { exceptionFromStored, isTimeZone } from "@/lib/slots";
import { gulfTimeZones, viewerFrom } from "@/lib/viewer";
import { AvailabilityEditor, type InitialChange } from "./_parts/AvailabilityEditor";
import { PROTOTYPE_DOCTOR_ID, STARTER_DAY, STARTER_RANGE, emptyWeek, modelFromStored, todayIn, type AvailabilityModel } from "./model";
import AvailabilityLoading from "./loading";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "availability" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

/** The preview viewer: a Gulf country (Saudi by default) and its zone, unless ?tz= names another valid zone. */
function previewViewer(sp: SearchParams): { country: string; timeZone: string } {
  const { country: asked } = viewerFrom(sp);
  const country = asked in gulfTimeZones ? asked : "SA";
  const tz = typeof sp.tz === "string" && isTimeZone(sp.tz) ? sp.tz : undefined;
  return { country, timeZone: tz ?? gulfTimeZones[country] ?? business.defaultTimeZone };
}

export default async function AvailabilityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <AvailabilityLoading />;

  const t = await getTranslations("availability");
  const stored = availabilityFor(PROTOTYPE_DOCTOR_ID);
  if (!stored) notFound();

  const now = new Date();
  let model: AvailabilityModel = modelFromStored(stored, todayIn(stored.timeZone, now));
  let accepting = stored.acceptingNewPatients;
  let notice = false;
  let change: InitialChange | undefined;

  if (state === "empty") {
    model = { ...model, slotMinutes: business.slotLengthMinutesDefault, leadTimeHours: business.leadTimeHoursDefault, week: emptyWeek(), exceptions: [] };
    accepting = false; // rule B6: off until the first weekly hours are saved
  } else if (state === "firstSaved") {
    const id = "r_first";
    model = { ...model, week: { ...emptyWeek(), [STARTER_DAY]: [{ id, ...STARTER_RANGE }] }, exceptions: [] };
    accepting = true;
    notice = true;
    change = { kind: "firstHours", day: STARTER_DAY, id };
  } else if (state === "exceptionAdded") {
    const added = sampleAddedException(PROTOTYPE_DOCTOR_ID);
    if (added) {
      const x = { id: added.id, ...exceptionFromStored(added, stored.timeZone) };
      model = { ...model, exceptions: [...model.exceptions.filter((e) => e.date !== x.date), x].sort((a, b) => a.date.localeCompare(b.date)) };
      change = { kind: "exceptionAdded", id: x.id };
    }
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>
      <AvailabilityEditor
        initialModel={model}
        initialAccepting={accepting}
        initialNotice={notice}
        initialPreview={sp.preview === "1"}
        initialViewer={previewViewer(sp)}
        initialChange={change}
        nowIso={now.toISOString()}
      />
    </>
  );
}
