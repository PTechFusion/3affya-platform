// Server side of screen 5: sample doctors to facet rows, query scores and ranked results. Only verified doctors are listed
// (task 2.1); pending and unclaimed rows appear only in the zero-results "not on 3affya yet" block with a Request path (rule U3).
// Reads sample data through lib/sample.ts only; prices are the all-in total from lib/fees.ts (rule C5).
import { sampleDoctors, sampleSpecialties, verifiedDoctors, type SampleDoctor } from "@/lib/sample";
import { feeLines } from "@/lib/fees";
import { business } from "@/config/business";
import { FILTER_KEYS, matches, type FacetRow, type FilterKey, type Selection, type SortKey } from "./search-model";
import { parseQuery, scoreDoctor, words } from "./search-query";

/** Task 2.1: 20 per page, then Load more (rule S5). `?per=` lowers it in the prototype so Load more can be reviewed. */
export const PAGE_SIZE = 20;

export type SearchItem = { doctor: SampleDoctor; row: FacetRow; score: number; nextMs: number | null; totalCents: number | null };

/** The request instant: the "within 72 hours" window is measured from here (server only, so client counts match). */
export const requestNow = () => Date.now();

const HOUR_MS = 3_600_000;

export const allInCents = (d: SampleDoctor) => (d.feeUsdCents != null ? feeLines(d.feeUsdCents).totalCents : null);

export const citySlug = (d: SampleDoctor) =>
  (d.cityEn.split(",")[0] ?? d.cityEn).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type PriceBand = { id: string; minCents?: number; maxCents?: number };

/** Bands on the all-in total from config: under the first step, between steps, and the last step or more. */
export function priceBands(): PriceBand[] {
  const steps = business.searchPriceBandsCents;
  const major = (c: number) => String(Math.round(c / 100));
  const bands: PriceBand[] = [];
  steps.forEach((step, i) => {
    const prev = steps[i - 1];
    bands.push(prev == null ? { id: `0-${major(step)}`, maxCents: step } : { id: `${major(prev)}-${major(step)}`, minCents: prev, maxCents: step });
  });
  const last = steps[steps.length - 1];
  if (last != null) bands.push({ id: `${major(last)}-`, minCents: last });
  return bands;
}

const bandFor = (cents: number, bands: PriceBand[]) =>
  bands.find((b) => (b.minCents == null || cents >= b.minCents) && (b.maxCents == null || cents < b.maxCents));

function facetRow(d: SampleDoctor, nowMs: number, bands: PriceBand[]): FacetRow {
  const nextMs = d.nextAvailableUtc ? Date.parse(d.nextAvailableUtc) : null;
  const total = allInCents(d);
  const band = total != null ? bandFor(total, bands) : undefined;
  return {
    id: d.id,
    values: {
      specialty: [d.specialty],
      within: business.searchAvailableWithinHours
        .filter((h) => nextMs != null && nextMs >= nowMs && nextMs - nowMs <= h * HOUR_MS)
        .map(String),
      gender: [d.gender],
      // Every doctor here speaks Arabic, so the filter names the dialect (rule S16); English is its own option.
      language: d.languages.flatMap((l) => (l.code === "ar" ? (l.dialect ? [l.dialect.toLowerCase()] : []) : [l.code])),
      visit: [...d.visitTypes],
      age: d.ages === "allAges" ? ["adults", "children"] : [d.ages],
      price: band ? [band.id] : [],
      city: [citySlug(d)],
    },
  };
}

const haystackFor = (d: SampleDoctor) =>
  [...new Set(words([d.nameEn, d.nameAr, d.specialtyEn, d.specialtyAr, d.specialty, d.cityEn, d.cityAr, ...d.tags].join(" ")))];

/** Verified doctors (none in the ?state=empty launch preview) that match the query, with their facet rows. */
export function searchPool(q: string, nowMs: number, launchEmpty: boolean) {
  const query = parseQuery(q);
  const bands = priceBands();
  const items: SearchItem[] = (launchEmpty ? [] : verifiedDoctors()).map((d) => ({
    doctor: d,
    row: facetRow(d, nowMs, bands),
    score: scoreDoctor(query, haystackFor(d), d.specialty),
    nextMs: d.nextAvailableUtc ? Date.parse(d.nextAvailableUtc) : null,
    totalCents: allInCents(d),
  }));
  return { query, items: query.tokens.length ? items.filter((i) => i.score > 0) : items, bands };
}

/**
 * Rule S4: Relevance is the query score, then doctors with published times first, soonest first, then a light diversity
 * pass so the first rows are not all one gender (no more than two in a row while an equal-ranked alternative exists).
 * Featured placement does not exist in this build (no Sponsored rows, rule A4).
 */
export function rank(items: SearchItem[], sort: SortKey): SearchItem[] {
  const soon = (i: SearchItem) => i.nextMs ?? Number.POSITIVE_INFINITY;
  const byTimes = (a: SearchItem, b: SearchItem) => soon(a) - soon(b);
  const list = [...items];
  if (sort === "soonest") return list.sort((a, b) => byTimes(a, b) || b.score - a.score);
  if (sort === "price") return list.sort((a, b) => (a.totalCents ?? Infinity) - (b.totalCents ?? Infinity) || byTimes(a, b));
  if (sort === "experience") return list.sort((a, b) => (b.doctor.yearsInPractice ?? 0) - (a.doctor.yearsInPractice ?? 0) || byTimes(a, b));
  list.sort((a, b) => b.score - a.score || byTimes(a, b));
  const tier = (i: SearchItem) => `${i.score}:${i.nextMs == null ? 1 : 0}`;
  const out: SearchItem[] = [];
  while (list.length) {
    let pick = 0;
    const [first] = list;
    const run = out.slice(-2);
    if (first && run.length === 2 && run.every((r) => r.doctor.gender === first.doctor.gender)) {
      const alt = list.findIndex((c) => c.doctor.gender !== first.doctor.gender && tier(c) === tier(first));
      if (alt > 0) pick = alt;
    }
    out.push(...list.splice(pick, 1));
  }
  return out;
}

/** Specialty slugs and labels, for parsing and for names in titles and chips. */
export const specialtyBySlug = new Map(sampleSpecialties.map((s) => [s.slug, s]));

/** Values each filter accepts from the URL. Unknown values are dropped rather than producing an empty list. */
export function allowedValues(bands: PriceBand[]): Record<FilterKey, ReadonlySet<string>> {
  const dialects = new Set(sampleDoctors.flatMap((d) => d.languages.map((l) => l.dialect?.toLowerCase()).filter((x): x is string => !!x)));
  return {
    specialty: new Set(sampleSpecialties.map((s) => s.slug)),
    within: new Set(business.searchAvailableWithinHours.map(String)),
    gender: new Set(["f", "m"]),
    language: new Set([...dialects, "en"]),
    visit: new Set(["video", "phone"]),
    age: new Set(["adults", "children"]),
    price: new Set(bands.map((b) => b.id)),
    city: new Set(sampleDoctors.map(citySlug)),
  };
}

/** The values with at least one listed doctor, most doctors first: what a filter offers (hide zero-supply values, rule S17). */
export function valuesByFrequency(items: SearchItem[], key: FilterKey): string[] {
  const n = new Map<string, number>();
  for (const i of items) for (const v of i.row.values[key]) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/** Nearby specialties to offer when a search lands on zero (rule S6; task 2.1 "suggests nearby specialties"). */
const NEARBY: Record<string, string[]> = {
  urology: ["nephrology", "family-medicine", "internal-medicine", "infectious-disease"],
  dermatology: ["allergy", "family-medicine", "internal-medicine", "infectious-disease"],
  cardiology: ["internal-medicine", "pulmonology", "family-medicine", "endocrinology"],
  pediatrics: ["family-medicine", "allergy", "ent", "pulmonology"],
  obgyn: ["family-medicine", "endocrinology", "internal-medicine"],
  psychiatry: ["neurology", "family-medicine", "internal-medicine"],
  neurology: ["neurosurgery", "pain", "family-medicine"],
  orthopedics: ["sports-medicine", "pain", "rheumatology", "neurosurgery"],
  gastroenterology: ["internal-medicine", "family-medicine", "hematology"],
  endocrinology: ["internal-medicine", "family-medicine", "nephrology"],
  oncology: ["hematology", "internal-medicine"],
  allergy: ["ent", "pulmonology", "dermatology", "family-medicine"],
};

/**
 * Up to five specialties with listed doctors: the related ones first, then the generalists; only when that gives fewer than
 * three is the list topped up with the best-supplied specialties (rule S6 asks for three to five).
 */
export function nearbySpecialties(from: string[], all: SearchItem[]): string[] {
  const supplied = valuesByFrequency(all, "specialty");
  const usable = (list: string[]) => [...new Set(list)].filter((s) => !from.includes(s) && supplied.includes(s));
  const near = usable([...from.flatMap((s) => NEARBY[s] ?? []), "family-medicine", "internal-medicine"]);
  return near.length >= 3 ? near.slice(0, 5) : usable([...near, ...supplied]).slice(0, 3);
}

/** Unclaimed doctors from public US records in these specialties (any, when none are given): the invite path (rule U3). */
export const notYetListed = (specialties?: string[]) =>
  sampleDoctors.filter((d) => d.state === "unclaimed" && (!specialties || specialties.includes(d.specialty))).slice(0, 3);

/** Count with every filter except one, for the "Without X" alternatives on zero results. */
export const countWithout = (items: SearchItem[], sel: Selection, key: FilterKey) =>
  items.filter((i) => matches(i.row, { ...sel, [key]: [] })).length;

export { FILTER_KEYS };
