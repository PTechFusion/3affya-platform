// Screen 4, Specialty directory (docs/screens/04-specialty-directory.md). Above the fold: the search box and six curated
// specialty tiles, each with one doctor's face (the hook) and a count badge (X7). "See all" then opens every specialty A to Z,
// grouped by body system, in two columns. Names Arabic first with English in parentheses (S16). Counts are verified doctors
// only and show as a number only from business.specialtyCountShowMin up (H6, S10); a specialty with no verified doctor is
// never promoted (S17) and links to its empty-group state here, not to an empty result list.
// States: default; ?all=1 (full list open); ?specialty=urology or ?state=empty (empty group, one action); ?state=loading
// (skeleton); ?q= (search typed, suggestions open). Viewer country via ?country= for the footer emergency line.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { SearchBox, type SearchSuggestion } from "@/components/brand/SearchBox";
import { Badge, CtaBand, Disclosure, EmptyState, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatNumber, type Locale } from "@/lib/format";
import { sampleSpecialties, specialtiesBySystem, specialtyPhotoUrl, type SampleSpecialty } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { BadgeSlot, DirectoryHeader, SpecialtyNames, TILE_CLASS, TILE_GRID_CLASS, TILE_PHOTO_CLASS, TILE_TOP_CLASS } from "./parts";
import Loading from "./loading";

// Curated tiles (rule X7): the specialties patients ask for most, in priority order. A specialty with no verified doctor is
// skipped (S17) and the next one takes its place, so the list holds a few spares.
const CURATED = ["family-medicine", "pediatrics", "obgyn", "cardiology", "urology", "dermatology", "oncology", "orthopedics"];
const TILES = 6;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "specialties" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SpecialtyDirectory({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const query = typeof sp.q === "string" ? sp.q : "";
  const t = await getTranslations("specialties");

  const primary = (s: { nameEn: string; nameAr: string }) => (loc === "ar" ? s.nameAr : s.nameEn);
  const secondary = (s: { nameEn: string; nameAr: string }) => (loc === "ar" ? s.nameEn : s.nameAr);
  // Counts are verified doctors only. Small numbers backfire (H6), so below the threshold the badge says the specialty is
  // bookable without the number; zero is never shown as a count.
  const countText = (s: SampleSpecialty) =>
    s.doctorCount >= business.specialtyCountShowMin
      ? t("doctorCount", { count: s.doctorCount, countLabel: formatNumber(s.doctorCount, loc) })
      : s.doctorCount > 0
        ? t("openForBooking")
        : t("noDoctorsYet");
  const hrefFor = (s: SampleSpecialty) => (s.doctorCount > 0 ? `/search?specialty=${s.slug}` : `/specialties?specialty=${s.slug}`);

  // Alphabetical in the page language. Arabic ignores the article al- when ordering, as dictionaries do.
  const collator = new Intl.Collator(loc === "ar" ? "ar" : "en", { sensitivity: "base" });
  const sortKey = (s: SampleSpecialty) => (loc === "ar" ? s.nameAr.replace(/^ال/, "") : s.nameEn);
  const groups = specialtiesBySystem().map((g) => ({
    id: g.system?.id ?? "other",
    title: g.system ? primary(g.system) : t("otherSystem"),
    specialties: [...g.specialties].sort((a, b) => collator.compare(sortKey(a), sortKey(b))),
  }));

  const tiles = CURATED.map((slug) => sampleSpecialties.find((s) => s.slug === slug))
    .filter((s): s is SampleSpecialty => s !== undefined && s.doctorCount > 0)
    .slice(0, TILES);

  // Empty group: a specialty with no verified doctor, from ?specialty=<slug>, or the first such one for ?state=empty.
  const requested = typeof sp.specialty === "string" ? sampleSpecialties.find((s) => s.slug === sp.specialty) : undefined;
  const emptyGroup =
    sp.state === "empty" ? sampleSpecialties.find((s) => s.doctorCount === 0) : requested?.doctorCount === 0 ? requested : undefined;
  const showAll = sp.all === "1";

  const suggestions: SearchSuggestion[] = sampleSpecialties.map((s) => ({
    kind: "specialty",
    label: primary(s),
    href: hrefFor(s),
    keywords: `${secondary(s)} ${s.slug.replace(/-/g, " ")}`,
    meta: countText(s),
  }));

  const badge = (s: SampleSpecialty) =>
    s.doctorCount > 0 ? (
      <BadgeSlot>
        <Badge tone="info">{countText(s)}</Badge>
      </BadgeSlot>
    ) : (
      <span className="text-sm text-ink-500">{countText(s)}</span>
    );

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <DirectoryHeader title={t("title")} lead={t("lead")} />

        {emptyGroup ? (
          <div id="empty-group" className="mt-6 max-w-2xl">
            <EmptyState
              title={t("empty.title", { specialty: primary(emptyGroup) })}
              body={t("empty.body")}
              action={<LinkButton href="/contact">{t("empty.action")}</LinkButton>}
            />
          </div>
        ) : null}

        <div className="mt-5 max-w-2xl sm:mt-8">
          <SearchBox
            suggestions={suggestions}
            initialQuery={query}
            labels={{ label: t("searchLabel"), placeholder: t("searchPlaceholder") }}
          />
        </div>

        <section aria-labelledby="curated-title" className="mt-7 sm:mt-10">
          <h2 id="curated-title" className="text-xl font-bold text-sea-900 sm:text-2xl">
            {t("curatedTitle")}
          </h2>
          <ul className={`mt-3 sm:mt-4 ${TILE_GRID_CLASS}`}>
            {tiles.map((s) => {
              const photo = specialtyPhotoUrl(s.slug);
              return (
                <li key={s.slug}>
                  <Link href={hrefFor(s)} className={`${TILE_CLASS} hover:border-lagoon-600`}>
                    <span className={TILE_TOP_CLASS}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" width={80} height={80} className={`${TILE_PHOTO_CLASS} object-cover`} />
                      ) : (
                        <span aria-hidden="true" className={`${TILE_PHOTO_CLASS} bg-lagoon-100`} />
                      )}
                      <span className="whitespace-nowrap">
                        <Badge tone="info">{countText(s)}</Badge>
                      </span>
                    </span>
                    <SpecialtyNames primary={primary(s)} secondary={secondary(s)} locale={loc} size="tile" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-ink-500">{t("countsNote")}</p>
        </section>

        <section aria-labelledby="all-title" className="mt-8 rounded-[var(--radius-card)] border border-sand-200 bg-white px-4 sm:px-6">
          <Disclosure
            id="all"
            open={showAll}
            summary={
              // A heading is allowed directly inside <summary>; the lead rides inside it so the row stays one control.
              <h2 id="all-title" className="flex min-h-12 flex-col justify-center">
                <span className="text-lg font-bold text-sea-700 sm:text-xl">
                  {t("seeAll", { count: sampleSpecialties.length, countLabel: formatNumber(sampleSpecialties.length, loc) })}
                </span>
                <span className="text-sm font-normal text-ink-500">{t("seeAllLead")}</span>
              </h2>
            }
          >
            <div className="space-y-6 pb-4 pt-2 lg:columns-2 lg:gap-10 lg:space-y-0 lg:pb-0">
              {groups.map((g) => (
                <section key={g.id} aria-labelledby={`system-${g.id}`} className="break-inside-avoid lg:pb-6">
                  <h3 id={`system-${g.id}`} className="border-b border-sand-200 pb-2 font-bold text-sea-900">
                    {g.title}
                  </h3>
                  <ul className="mt-1 grid grid-cols-2 gap-x-3">
                    {g.specialties.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={hrefFor(s)}
                          className="flex h-full min-h-12 flex-col gap-1.5 rounded-[var(--radius-field)] px-2 py-2.5 hover:bg-sand-100"
                        >
                          <SpecialtyNames primary={primary(s)} secondary={secondary(s)} locale={loc} />
                          {badge(s)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Disclosure>
        </section>

        <div className="mt-10">
          <CtaBand
            title={t("cta.title")}
            body={t("cta.body")}
            action={
              <LinkButton href="/?chat=1" variant="secondary" className="shrink-0">
                {t("cta.action")}
              </LinkButton>
            }
          />
        </div>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}
