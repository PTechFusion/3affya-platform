// Screen 5, Search results (docs/screens/05-search-results.md). Every bit of state is in the URL so Back and sharing work
// (rule S3): ?q=&specialty=&within=&gender=&language=&visit=&age=&price=&city=&sort=&shown= (values comma-separated).
// States: results (default); zero results from filters (?specialty=urology) or from a query (?q=rash); ?state=empty (launch
// preview, no verified doctor yet); ?state=loading (skeleton); ?sheet=1 (phone filter sheet open); ?per=3 (smaller page so
// Load more shows with the 8 sample doctors). Viewer time zone and country via ?tz= and ?country= (lib/viewer.ts).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { SearchBox, type SearchSuggestion } from "@/components/brand/SearchBox";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Breadcrumbs, ChevronNext, Chip, CloseIcon, EmptyState, LinkButton, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatNumber, type Locale } from "@/lib/format";
import { publicDoctors, sampleSpecialties, toDoctorCardData, verifiedDoctors, type SampleDoctor } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { FilterPanel, FilterSheet, ResultsRegion, SearchProvider, SortSelect, type FilterGroupView } from "./SearchControls";
import { SearchSkeleton } from "./SearchSkeleton";
import {
  emptySelection,
  matches,
  parseSelection,
  parseSort,
  searchHref,
  FILTER_KEYS,
  type FilterKey,
  type SearchBase,
  type Selection,
} from "./search-model";
import {
  allowedValues,
  citySlug,
  countWithout,
  nearbySpecialties,
  notYetListed,
  PAGE_SIZE,
  rank,
  requestNow,
  searchPool,
  specialtyBySlug,
  valuesByFrequency,
  type SearchItem,
} from "./search-data";
import { symptomWordsFor } from "./search-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Prototype switches that ride along on every search link. */
const KEEP_PARAMS = ["tz", "country", "per"] as const;

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <SearchSkeleton />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const t = await getTranslations("search");
  const tc = await getTranslations("common");
  const tcard = await getTranslations("card");
  const tl = await getTranslations("languages");
  const tn = await getTranslations("nav");

  // ---- State from the URL ----
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const launchEmpty = sp.state === "empty";
  const nowMs = requestNow();
  const { query, items, bands } = searchPool(q, nowMs, launchEmpty);
  const everyone = launchEmpty ? [] : searchPool("", nowMs, false).items;
  const selection = parseSelection(sp, allowedValues(bands));
  const keep: Record<string, string> = {};
  for (const k of KEEP_PARAMS) {
    const v = sp[k];
    if (typeof v === "string" && v) keep[k] = v;
  }
  const base: SearchBase = { q, sort: parseSort(sp.sort), keep };
  const perRaw = Number(sp.per);
  const pageSize = Number.isInteger(perRaw) && perRaw >= 1 && perRaw <= PAGE_SIZE ? perRaw : PAGE_SIZE;
  const results = rank(items.filter((i) => matches(i.row, selection)), base.sort);
  const shownRaw = Number(sp.shown);
  const shown = Math.min(Math.max(Number.isInteger(shownRaw) ? shownRaw : pageSize, pageSize), Math.max(results.length, pageSize));
  const visible = results.slice(0, shown);

  // ---- Labels (every number and price through lib/format, rule N1; prices all-in, rule C5) ----
  const listJoin = loc === "ar" ? "، " : ", ";
  const specialtyName = (slug: string, other = false) => {
    const s = specialtyBySlug.get(slug);
    if (!s) return slug;
    const arabic = other ? loc !== "ar" : loc === "ar";
    return arabic ? s.nameAr : s.nameEn;
  };
  const cityOf = new Map(publicDoctors().map((d) => [citySlug(d), d] as const));
  const money = (cents: number) => formatMoney(cents, business.currencyPresentment, loc);
  const capital = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
  const labelFor = (key: FilterKey, value: string): string => {
    switch (key) {
      case "specialty":
        return specialtyName(value);
      case "within": {
        const hours = Number(value);
        return hours >= 168 && hours % 24 === 0
          ? t("filters.withinDays", { days: formatNumber(hours / 24, loc) })
          : t("filters.withinHours", { hours: formatNumber(hours, loc) });
      }
      case "gender":
        return value === "f" ? t("filters.female") : t("filters.male");
      case "language":
        return value === "en" ? tl("en") : `${tl("ar")} (${tl(`dialect.${capital(value)}`)})`;
      case "visit":
        return tcard(value === "phone" ? "phone" : "video");
      case "age":
        return tcard(value === "children" ? "children" : "adults");
      case "price": {
        const band = bands.find((b) => b.id === value);
        if (!band) return value;
        if (band.minCents == null && band.maxCents != null) return t("filters.priceUnder", { max: money(band.maxCents) });
        if (band.maxCents == null && band.minCents != null) return t("filters.priceOver", { min: money(band.minCents) });
        return t("filters.priceBetween", { min: money(band.minCents ?? 0), max: money(band.maxCents ?? 0) });
      }
      case "city": {
        const d = cityOf.get(value);
        return d ? (loc === "ar" ? d.cityAr : d.cityEn) : value;
      }
    }
  };

  // ---- Filter groups: open lists offer only values with listed doctors (rule S17), fixed lists show every value ----
  const withSelected = (key: FilterKey, list: string[]) => [...list, ...selection[key].filter((v) => !list.includes(v))];
  const languages = valuesByFrequency(items, "language");
  const optionValues: Record<FilterKey, string[]> = {
    specialty: withSelected("specialty", valuesByFrequency(items, "specialty")),
    within: business.searchAvailableWithinHours.map(String),
    gender: ["f", "m"],
    language: withSelected("language", [...languages.filter((v) => v !== "en"), ...languages.filter((v) => v === "en")]),
    visit: ["video", "phone"],
    age: ["adults", "children"],
    price: bands.map((b) => b.id),
    city: withSelected("city", valuesByFrequency(items, "city")),
  };
  const groups: FilterGroupView[] = FILTER_KEYS.map((key) => ({
    key,
    label: t(`filters.groups.${key}`),
    options: optionValues[key].map((value) => ({
      value,
      label: labelFor(key, value),
      secondary: key === "specialty" ? specialtyName(value, true) : undefined,
    })),
  }));
  const rows = items.map((i) => i.row);
  const chips = FILTER_KEYS.flatMap((key) =>
    selection[key].map((value) => ({
      key,
      value,
      label: labelFor(key, value),
      href: searchHref(base, { ...selection, [key]: selection[key].filter((v) => v !== value) }),
    })),
  );

  // ---- Heading ----
  const onlySpecialty = selection.specialty.length === 1 ? selection.specialty[0] : undefined;
  const title = onlySpecialty
    ? t("titleSpecialty", { specialty: specialtyName(onlySpecialty) })
    : q
      ? t("titleQuery", { query: q })
      : t("title");
  const crumbs = [
    { label: t("breadcrumbHome"), href: "/" },
    ...(onlySpecialty ? [{ label: t("breadcrumbSpecialties"), href: "/specialties" }, { label: specialtyName(onlySpecialty) }] : [{ label: tn("doctors") }]),
  ];
  const mapped = [...query.specialties];
  const symptomNote =
    q && mapped.length && results.length ? t("symptomNote", { specialties: mapped.map((s) => specialtyName(s)).join(listJoin), query: q }) : null;

  // ---- Suggestions for the field (rule S1); symptom words and the other script match too (rule S2) ----
  const suggestions: SearchSuggestion[] = [
    ...sampleSpecialties.map((s) => ({
      kind: "specialty" as const,
      label: specialtyName(s.slug),
      href: searchHref({ q: "", sort: base.sort, keep }, { ...emptySelection(), specialty: [s.slug] }),
      keywords: [specialtyName(s.slug, true), ...symptomWordsFor(s.slug)].join(" "),
    })),
    ...verifiedDoctors().map((d) => ({
      kind: "doctor" as const,
      label: loc === "ar" ? d.nameAr : d.nameEn,
      href: `/doctors/${d.id}`,
      keywords: `${loc === "ar" ? d.nameEn : d.nameAr} ${d.specialtyEn} ${d.specialtyAr}`,
    })),
  ];

  const card = (d: SampleDoctor, action?: { href: string; label: string }) => (
    <DoctorCard
      doctor={toDoctorCardData(d, loc, viewer.timeZone, tl)}
      state={d.state}
      size="row"
      href={`/doctors/${d.id}`}
      priceNote={t("allFeesIncluded")}
      action={action ?? (d.nextAvailableUtc ? { href: `/book/${d.id}`, label: tc("book") } : { href: `/doctors/${d.id}`, label: tc("viewProfile") })}
    />
  );
  const countLine = t("count", { count: results.length, countLabel: formatNumber(results.length, loc) });
  const showFilters = !launchEmpty;

  return (
    <>
      <SiteNav />
      <SearchProvider>
        {/* Sticky top bar (layout call): query with its submit button, Filters with count, sort. */}
        <div className="sticky top-16 z-10 border-b border-sand-200 bg-sand-50/95 backdrop-blur sm:top-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:py-3">
            <div className="lg:max-w-xl lg:flex-1">
              <SearchBox key={q} layout="inline" suggestions={suggestions} initialQuery={q} initialOpen={false} />
            </div>
            {showFilters ? (
              <div className="flex items-center gap-2 lg:ms-auto">
                <FilterSheet
                  groups={groups}
                  rows={rows}
                  selection={selection}
                  base={base}
                  initialOpen={sp.sheet === "1"}
                  className="shrink-0 lg:hidden"
                />
                <SortSelect base={base} selection={selection} className="min-w-0 flex-1 lg:flex-none" />
              </div>
            ) : null}
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 pb-14 pt-3 sm:px-6 sm:pt-6">
          <Breadcrumbs label={t("breadcrumbLabel")} items={crumbs} />
          <header className="mt-1 sm:mt-2">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{title}</h1>
              <p className="text-sm font-semibold text-ink-700">{countLine}</p>
            </div>
            {symptomNote ? <p className="mt-1 text-sm text-ink-700">{symptomNote}</p> : null}
          </header>

          <div className={["mt-4 grid gap-8", showFilters ? "lg:grid-cols-[17rem_minmax(0,1fr)]" : ""].join(" ")}>
            {showFilters ? (
              <aside className="hidden lg:block">
                <FilterPanel groups={groups} rows={rows} selection={selection} base={base} />
              </aside>
            ) : null}

            <div className="min-w-0">
              {chips.length ? (
                // Rule S12: applied filters as removable chips with Clear all, never only a count.
                <ul aria-label={t("chips.label")} className="mb-4 flex flex-wrap items-center gap-2">
                  {chips.map((c) => (
                    <li key={`${c.key}-${c.value}`}>
                      <Link href={c.href} scroll={false} aria-label={t("chips.remove", { label: c.label })} className="block rounded-[var(--radius-tag)]">
                        <Chip tone="lagoon">
                          {c.label}
                          <CloseIcon className="ms-2 size-3.5" />
                        </Chip>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={searchHref(base, emptySelection())}
                      scroll={false}
                      className="inline-flex min-h-10 items-center rounded-[var(--radius-field)] px-2 text-sm font-semibold text-sea-700 hover:underline"
                    >
                      {tc("clearAll")}
                    </Link>
                  </li>
                </ul>
              ) : null}

              <ResultsRegion label={t("resultsLabel")}>
                {visible.length ? (
                  <>
                    <h2 className="sr-only">{t("resultsLabel")}</h2>
                    <ol className="space-y-3 sm:space-y-4">
                      {visible.map((i) => (
                        <li key={i.doctor.id}>{card(i.doctor)}</li>
                      ))}
                    </ol>
                    {/* Rule S5: Load more, not pagination; the count rides in the URL (?shown=) so Back restores the list. */}
                    {shown < results.length ? (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <p className="text-sm text-ink-700">
                          {t("loadMoreStatus", { shown: formatNumber(visible.length, loc), total: formatNumber(results.length, loc) })}
                        </p>
                        <LinkButton href={searchHref(base, selection, shown + pageSize)} scroll={false} variant="secondary" className="w-full sm:w-auto sm:min-w-56">
                          {tc("loadMore")}
                        </LinkButton>
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-ink-700">
                        <p>{t("endOfList")}</p>
                        <Link href="/?chat=1" className="inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
                          {t("askAssistant")} <ChevronNext />
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <ZeroResults
                    loc={loc}
                    launchEmpty={launchEmpty}
                    q={q}
                    base={base}
                    selection={selection}
                    items={items}
                    everyone={everyone}
                    mappedSpecialties={mapped}
                    groups={groups}
                    labelFor={labelFor}
                    specialtyName={specialtyName}
                    card={card}
                  />
                )}
              </ResultsRegion>
            </div>
          </div>
        </main>
      </SearchProvider>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}

/**
 * Zero results (rules S6, L3, U3; task 2.1): what is empty and why, one action that relaxes the scope, then up to five
 * alternatives with counts and a photo preview, the doctors patients can book soonest, doctors in this specialty who are
 * not on 3affya yet (Request this doctor), and a person to talk to.
 */
async function ZeroResults({
  loc,
  launchEmpty,
  q,
  base,
  selection,
  items,
  everyone,
  mappedSpecialties,
  groups,
  labelFor,
  specialtyName,
  card,
}: {
  loc: Locale;
  launchEmpty: boolean;
  q: string;
  base: SearchBase;
  selection: Selection;
  items: SearchItem[];
  everyone: SearchItem[];
  mappedSpecialties: string[];
  groups: FilterGroupView[];
  labelFor: (key: FilterKey, value: string) => string;
  specialtyName: (slug: string) => string;
  card: (d: SampleDoctor, action?: { href: string; label: string }) => React.ReactNode;
}) {
  const t = await getTranslations("search");
  const tc = await getTranslations("common");
  const join = loc === "ar" ? "، " : ", ";
  const count = (n: number) => formatNumber(n, loc);
  const doctors = (n: number) => t("empty.doctorsCount", { count: n, countLabel: count(n) });
  const fresh: SearchBase = { q: "", sort: base.sort, keep: base.keep };
  const human = (
    <Surface className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-sea-900">{t("empty.humanTitle")}</h2>
        <p className="text-ink-700">{t("empty.humanBody")}</p>
      </div>
      <LinkButton href="/contact" variant="secondary" className="shrink-0">
        {tc("talkToHuman")}
      </LinkButton>
    </Surface>
  );

  if (launchEmpty) {
    const invite = notYetListed();
    return (
      <div className="space-y-8">
        <EmptyState
          title={t("empty.launchTitle")}
          body={t("empty.launchBody")}
          action={<LinkButton href="/specialties">{t("empty.launchAction")}</LinkButton>}
        />
        {invite.length ? <NotYetListed title={t("empty.notJoinedTitle")} body={t("empty.notJoinedBody")} action={t("requestDoctor")} doctors={invite} card={card} /> : null}
        {human}
      </div>
    );
  }

  const specialties = selection.specialty.length ? selection.specialty : mappedSpecialties;
  const others = FILTER_KEYS.filter((k) => k !== "specialty" && selection[k].length);
  const onlySpecialty = selection.specialty.length ? { ...emptySelection(), specialty: selection.specialty } : null;
  const inSpecialty = onlySpecialty && others.length ? items.filter((i) => matches(i.row, onlySpecialty)).length : 0;
  const relax =
    onlySpecialty && inSpecialty > 0
      ? { href: searchHref(base, onlySpecialty), label: t("empty.relaxSpecialty", { specialty: selection.specialty.map((s) => specialtyName(s)).join(join), countLabel: count(inSpecialty) }) }
      : { href: searchHref(fresh, emptySelection()), label: t("empty.relaxAll", { countLabel: count(everyone.length) }) };
  // Say why it is empty (rule L3): the specialty has no verified doctor yet (also when a symptom word mapped to one), or the
  // query or the filter combination matches nobody.
  const specialtyUnsupplied = specialties.length > 0 && !everyone.some((i) => specialties.includes(i.doctor.specialty));
  const body = specialtyUnsupplied
    ? t("empty.bodySpecialty", { specialty: specialties.map((s) => specialtyName(s)).join(join) })
    : others.length || selection.specialty.length
      ? t("empty.bodyFilters")
      : t("empty.bodyQuery", { query: q });

  // Alternatives (at most five): drop one filter, or a nearby specialty, each with its count and a preview photo.
  const groupLabel = (key: FilterKey) => groups.find((g) => g.key === key)?.label ?? key;
  const without = others
    .map((key) => ({ key, n: countWithout(items, selection, key) }))
    .filter((x) => x.n > 0)
    .map((x) => ({
      href: searchHref(base, { ...selection, [x.key]: [] }),
      label: t("empty.withoutFilter", { label: selection[x.key].map((v) => labelFor(x.key, v)).join(join) }),
      hint: groupLabel(x.key),
      n: x.n,
      photo: items.find((i) => matches(i.row, { ...selection, [x.key]: [] }))?.doctor.photoUrl ?? null,
    }));
  const nearby = nearbySpecialties(specialties, everyone).map((slug) => {
    const inIt = everyone.filter((i) => i.doctor.specialty === slug);
    return {
      href: searchHref(fresh, { ...emptySelection(), specialty: [slug] }),
      label: specialtyName(slug),
      hint: t("filters.groups.specialty"),
      n: inIt.length,
      photo: inIt[0]?.doctor.photoUrl ?? null,
    };
  });
  const alternatives = [...without, ...nearby].slice(0, 5);
  const popular = rank(everyone, "relevance").slice(0, 3);
  const invite = specialties.length ? notYetListed(specialties) : [];

  return (
    <div className="space-y-8">
      <EmptyState title={t("empty.title")} body={body} action={<LinkButton href={relax.href}>{relax.label}</LinkButton>} />

      {alternatives.length ? (
        <section aria-labelledby="alternatives-title">
          <h2 id="alternatives-title" className="text-lg font-bold text-sea-900">
            {t("empty.alternativesTitle")}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {alternatives.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex min-h-14 items-center gap-3 rounded-[var(--radius-field)] border border-sand-200 bg-white px-3 py-2 hover:border-lagoon-600"
                >
                  {a.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo} alt="" className="size-10 shrink-0 rounded-xl bg-sand-100 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="size-10 shrink-0 rounded-xl bg-sand-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-sea-800">{a.label}</span>
                    <span className="block text-sm text-ink-700">
                      {a.hint} · <span className="tabular">{doctors(a.n)}</span>
                    </span>
                  </span>
                  <ChevronNext className="size-4 shrink-0 text-sea-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {popular.length ? (
        <section aria-labelledby="popular-title">
          <h2 id="popular-title" className="text-lg font-bold text-sea-900">
            {t("empty.popularTitle")}
          </h2>
          <ol className="mt-3 space-y-3 sm:space-y-4">
            {popular.map((i) => (
              <li key={i.doctor.id}>{card(i.doctor)}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {invite.length ? (
        <NotYetListed title={t("empty.notJoinedTitle")} body={t("empty.notJoinedBody")} action={t("requestDoctor")} doctors={invite} card={card} />
      ) : null}
      {human}
    </div>
  );
}

/** The invite path (rule U3): doctors from public US records or still in review, never bookable, with Request this doctor. */
function NotYetListed({
  title,
  body,
  action,
  doctors,
  card,
}: {
  title: string;
  body: string;
  action: string;
  doctors: SampleDoctor[];
  card: (d: SampleDoctor, action?: { href: string; label: string }) => React.ReactNode;
}) {
  return (
    <section aria-labelledby="not-listed-title">
      <h2 id="not-listed-title" className="text-lg font-bold text-sea-900">
        {title}
      </h2>
      <p className="text-sm text-ink-700">{body}</p>
      <ol className="mt-3 space-y-3 sm:space-y-4">
        {doctors.map((d) => (
          <li key={d.id}>{card(d, { href: `/doctors/${d.id}`, label: action })}</li>
        ))}
      </ol>
    </section>
  );
}
