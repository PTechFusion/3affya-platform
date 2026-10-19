// Screen 5 search model: URL state, filter matching, option counts and the URL writer. Pure and client-safe, so the server
// page and the client filter panel count the same way (rule S10: the number on "Show N doctors" is the number the list shows).
// Multi-select is OR inside a filter and AND across filters (rule S9). Task 2.1 moves matching into the API; this URL shape
// stays (route map in docs/screens/PLAYBOOK.md), so Back and shared links keep working (rule S3).

/** Display order of the filters; the first three are the ones patients use most (rules S7, S8, S11). */
export const FILTER_KEYS = ["specialty", "within", "gender", "language", "visit", "age", "price", "city"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Selection = Record<FilterKey, string[]>;

/** Rule S4: Relevance first, then soonest, price and experience. Never alphabetical. */
export const SORT_KEYS = ["relevance", "soonest", "price", "experience"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** What rides along on every search link: the query, the sort and the prototype viewer switches (tz, country, per). */
export type SearchBase = { q: string; sort: SortKey; keep: Record<string, string> };

/** One doctor reduced to the filter values it satisfies. */
export type FacetRow = { id: string; values: Record<FilterKey, string[]> };

export type Counts = Record<FilterKey, Record<string, number>>;

type Params = Record<string, string | string[] | undefined>;

export const emptySelection = (): Selection =>
  ({ specialty: [], within: [], gender: [], language: [], visit: [], age: [], price: [], city: [] }) satisfies Selection;

/** Reads ?specialty=a,b (or repeated keys from a plain form submit), keeping only values the filter knows. */
export function parseSelection(sp: Params, allowed: Record<FilterKey, ReadonlySet<string>>): Selection {
  const sel = emptySelection();
  for (const key of FILTER_KEYS) {
    const raw = sp[key];
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((s) => s.split(","));
    sel[key] = [...new Set(list.map((s) => s.trim().toLowerCase()).filter((s) => allowed[key].has(s)))];
  }
  return sel;
}

export function parseSort(raw: string | string[] | undefined): SortKey {
  return SORT_KEYS.find((k) => k === raw) ?? "relevance";
}

export function matches(row: FacetRow, sel: Selection, except?: FilterKey): boolean {
  return FILTER_KEYS.every((k) => k === except || sel[k].length === 0 || sel[k].some((v) => row.values[k].includes(v)));
}

/** Per option, how many doctors the list would show with that option added to the other filters (rule S10). */
export function countOptions(rows: FacetRow[], sel: Selection): Counts {
  const out = Object.fromEntries(FILTER_KEYS.map((k) => [k, {}])) as Counts;
  for (const key of FILTER_KEYS) {
    for (const row of rows) {
      if (!matches(row, sel, key)) continue;
      for (const v of row.values[key]) out[key][v] = (out[key][v] ?? 0) + 1;
    }
  }
  return out;
}

export const countMatches = (rows: FacetRow[], sel: Selection) => rows.filter((r) => matches(r, sel)).length;

export const appliedCount = (sel: Selection) => FILTER_KEYS.reduce((n, k) => n + sel[k].length, 0);

export function toggleValue(sel: Selection, key: FilterKey, value: string): Selection {
  const has = sel[key].includes(value);
  return { ...sel, [key]: has ? sel[key].filter((v) => v !== value) : [...sel[key], value] };
}

/** The canonical /search URL for a state. Commas stay readable; every value is encoded. A new filter set starts at page one. */
export function searchHref(base: SearchBase, sel: Selection, shown?: number): string {
  const parts: string[] = [];
  if (base.q) parts.push(`q=${encodeURIComponent(base.q)}`);
  for (const key of FILTER_KEYS) if (sel[key].length) parts.push(`${key}=${sel[key].map(encodeURIComponent).join(",")}`);
  if (base.sort !== "relevance") parts.push(`sort=${base.sort}`);
  if (shown) parts.push(`shown=${shown}`);
  for (const [k, v] of Object.entries(base.keep)) parts.push(`${k}=${encodeURIComponent(v)}`);
  return parts.length ? `/search?${parts.join("&")}` : "/search";
}
