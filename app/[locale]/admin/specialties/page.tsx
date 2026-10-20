// Screen 40, Specialty list (docs/screens/40-specialty-list.md, task 2.8). The specialty groups patients browse on the directory
// (screen 4) and pick in search, as the admin edits them: Add a specialty at the top, then one block per body system in directory
// order (move up or down), each specialty with its Arabic and English names (Arabic first, rule S16), slug, NPPES taxonomy codes,
// search words in each script (rule S2), verified-doctor count, the directory photo and whether patients see it. Edit and Add
// open one sheet (checked on blur, F4 and F5); Hide, Show and Move apply at once with Undo (B10). What is shown here is what the
// directory reads: the same rows, the same body systems, the same A to Z order inside a group.
// States: default; ?state=loading (skeleton, same as loading.tsx); ?state=empty (a body system with no specialty yet: one action);
// ?state=add (the add sheet); ?state=edit (Cardiology in the edit sheet); ?state=invalid (the add sheet after Save, three
// errors); ?state=error (the edit sheet after a failed save, input kept); ?state=saved (Cardiology just saved, Undo bar);
// ?state=hidden (Sports medicine just hidden, Undo bar); ?q= (finder typed, e.g. ?q=rash finds Dermatology by a search word).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { adminSpecialties, sampleBodySystems, sampleDraftBodySystem, specialtyPhotoUrl } from "@/lib/sample";
import { SpecialtyEditor } from "./_parts/SpecialtyEditor";
import { SpecialtiesHeader, SpecialtiesSkeleton } from "./_parts/SpecialtiesSkeleton";
import type { InitialSheet, InitialToast, SpecialtyRow, SystemView } from "./_parts/types";
import { checkSpecialty, joinList, toSpecialtyInput, type SpecialtyInput } from "./_parts/validation";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminSpecialties" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

/** The specialty the edit, error and saved previews open: a well-known one with doctors and three codes. */
const PREVIEW_EDIT = "cardiology";
/** The specialty the hidden preview hides: few doctors, so hiding it is a plausible call. */
const PREVIEW_HIDE = "sports-medicine";
/** What the saved and error previews change: one new search word in each script. */
const PREVIEW_WORDS = { ar: "أخصائي قلب", en: "heart specialist" } as const;
/** What the invalid preview typed into the add sheet: the Arabic name in Latin letters, a slug with capitals and a space, and a
 *  taxonomy code one character short (207RG0300X is the real internal-medicine geriatrics code). */
const PREVIEW_INVALID: SpecialtyInput = {
  nameAr: "Geriatrics",
  nameEn: "Geriatric medicine",
  slug: "Geriatric Medicine",
  systemId: "general",
  synonymsAr: joinList(["طب المسنين", "رعاية كبار السن"], "ar"),
  synonymsEn: joinList(["geriatrician", "elderly care"], "latin"),
  codes: joinList(["207QG0300X", "207RG030X"], "latin"),
};

export default async function AdminSpecialtiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : "";
  if (state === "loading") return <SpecialtiesSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminSpecialties");
  const ts = await getTranslations("specialties");
  const query = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";

  let rows: SpecialtyRow[] = adminSpecialties().map((s) => ({
    slug: s.slug,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    systemId: s.systemId ?? "",
    synonymsAr: s.synonymsAr,
    synonymsEn: s.synonymsEn,
    taxonomyCodes: s.taxonomyCodes,
    doctorCount: s.doctorCount,
    shown: s.shown,
    // The directory tile shows a verified doctor's face; a specialty with none has no tile and so no photo.
    photoUrl: s.doctorCount > 0 ? (specialtyPhotoUrl(s.slug) ?? null) : null,
  }));
  const systems: SystemView[] = sampleBodySystems.map((b) => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn }));
  if (state === "empty") systems.push({ ...sampleDraftBodySystem });

  let initialSheet: InitialSheet | null = null;
  let initialToast: InitialToast | null = null;
  const edited = rows.find((r) => r.slug === PREVIEW_EDIT);
  const withNewWords = (r: SpecialtyRow): SpecialtyRow => ({
    ...r,
    synonymsAr: [...r.synonymsAr, PREVIEW_WORDS.ar],
    synonymsEn: [...r.synonymsEn, PREVIEW_WORDS.en],
  });

  if (state === "add") initialSheet = { mode: "add" };
  if (state === "edit" && edited) initialSheet = { mode: "edit", slug: edited.slug };
  if (state === "error" && edited) initialSheet = { mode: "edit", slug: edited.slug, values: toSpecialtyInput(withNewWords(edited)), failed: true };
  if (state === "invalid") {
    const checked = checkSpecialty(PREVIEW_INVALID, { others: rows, systemIds: systems.map((s) => s.id), slugFixed: false });
    initialSheet = { mode: "add", values: PREVIEW_INVALID, errors: checked.ok ? {} : checked.errors };
  }
  if (state === "saved" && edited) {
    rows = rows.map((r) => (r.slug === edited.slug ? { ...withNewWords(r), fresh: true } : r));
    initialToast = { kind: "saved", slug: edited.slug, previous: edited };
  }
  if (state === "hidden" && rows.some((r) => r.slug === PREVIEW_HIDE)) {
    rows = rows.map((r) => (r.slug === PREVIEW_HIDE ? { ...r, shown: false } : r));
    initialToast = { kind: "hidden", slug: PREVIEW_HIDE };
  }

  return (
    <>
      <SpecialtiesHeader
        action={
          <Link href="/specialties" className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-4 hover:underline">
            {t("openDirectory")}
          </Link>
        }
      />

      <SpecialtyEditor initialRows={rows} systems={systems} initialSheet={initialSheet} initialToast={initialToast} initialQuery={query} />

      <section aria-labelledby="specialties-notes-title" className="mt-8">
        <Surface>
          <h2 id="specialties-notes-title" className="text-lg font-bold text-sea-900">
            {t("notes.title")}
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-ink-700 marker:text-lagoon-600">
            <li>
              {t("notes.doctors", {
                min: formatNumber(business.specialtyCountShowMin, loc),
                open: ts("openForBooking"),
                none: ts("noDoctorsYet"),
              })}
            </li>
            <li>{t("notes.hide")}</li>
            <li>{t("notes.words")}</li>
            <li>{t("notes.codes")}</li>
            <li>{t("notes.photo")}</li>
          </ul>
          <p className="mt-4 text-sm text-ink-500">{t("notes.prototype")}</p>
        </Surface>
      </section>
    </>
  );
}
