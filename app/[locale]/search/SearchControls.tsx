"use client";
// Client controls for screen 5. Desktop applies each filter at once and dims the list while it loads, keeping the scroll
// position (rule S11); phone batches changes in a bottom sheet behind a sticky "Show N doctors" button with the live count
// (rules S10, S11). Counts beside every option come from the same pure functions the server uses (search-model.ts).
import { createContext, useContext, useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Select } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import {
  appliedCount,
  countMatches,
  countOptions,
  emptySelection,
  searchHref,
  toggleValue,
  SORT_KEYS,
  type Counts,
  type FacetRow,
  type FilterKey,
  type SearchBase,
  type Selection,
  type SortKey,
} from "./search-model";

export type FilterOptionView = { value: string; label: string; /** Same name in the other script (rule S16). */ secondary?: string };
export type FilterGroupView = { key: FilterKey; label: string; options: FilterOptionView[] };

/* ---------------- Navigation with a pending state ---------------- */

type Nav = { pending: boolean; navigate: (href: string, optimistic?: () => void) => void };
const NavContext = createContext<Nav>({ pending: false, navigate: () => {} });

export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string, optimistic?: () => void) =>
    startTransition(() => {
      optimistic?.();
      router.push(href, { scroll: false });
    });
  return <NavContext.Provider value={{ pending, navigate }}>{children}</NavContext.Provider>;
}

/** The result list: dimmed and marked busy while new results load (rule S11), never replaced by a blank spinner. */
export function ResultsRegion({ label, children }: { label: string; children: ReactNode }) {
  const { pending } = useContext(NavContext);
  return (
    <section aria-label={label} aria-busy={pending || undefined} className={["transition-opacity", pending ? "opacity-55" : ""].join(" ")}>
      {children}
    </section>
  );
}

/* ---------------- Sort ---------------- */

export function SortSelect({ base, selection, className }: { base: SearchBase; selection: Selection; className?: string }) {
  const t = useTranslations("search");
  const { navigate } = useContext(NavContext);
  const [sort, setSort] = useOptimistic(base.sort);
  const id = useId();
  return (
    <div className={["flex items-center gap-2", className ?? ""].join(" ")}>
      <label htmlFor={id} className="shrink-0 text-sm font-semibold text-ink-700">
        {t("sortLabel")}
      </label>
      <Select
        id={id}
        value={sort}
        className="min-w-0 lg:w-52"
        onChange={(e) => {
          const next = e.target.value as SortKey;
          navigate(searchHref({ ...base, sort: next }, selection), () => setSort(next));
        }}
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>
            {t(`sort.${k}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}

/* ---------------- Filter groups (shared by the desktop column and the phone sheet) ---------------- */

/** Rule S13: show 6, then "Show more (+N)"; never hide a single leftover value. */
const VISIBLE_VALUES = 6;

function FilterGroups({
  groups,
  selection,
  counts,
  onToggle,
  idPrefix,
}: {
  groups: FilterGroupView[];
  selection: Selection;
  counts: Counts;
  onToggle: (key: FilterKey, value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="divide-y divide-sand-200">
      {groups.map((g) => (
        <FilterGroup key={g.key} group={g} selected={selection[g.key]} counts={counts[g.key]} onToggle={onToggle} idPrefix={idPrefix} />
      ))}
    </div>
  );
}

function FilterGroup({
  group,
  selected,
  counts,
  onToggle,
  idPrefix,
}: {
  group: FilterGroupView;
  selected: string[];
  counts: Record<string, number>;
  onToggle: (key: FilterKey, value: string) => void;
  idPrefix: string;
}) {
  const t = useTranslations("search.filters");
  const loc = useLocale() as Locale;
  const [expanded, setExpanded] = useState(false);
  const short = group.options.filter((o, i) => i < VISIBLE_VALUES || selected.includes(o.value));
  const truncate = group.options.length - short.length > 1;
  const visible = truncate && !expanded ? short : group.options;
  const hidden = group.options.length - short.length;
  return (
    <fieldset className="py-4 first:pt-1">
      <legend className="text-[15px] font-bold text-sea-900">{group.label}</legend>
      <ul className="mt-0.5">
        {visible.map((o) => {
          const checked = selected.includes(o.value);
          const n = counts[o.value] ?? 0;
          // Rule S10: an option that would empty the list is shown with its 0 but cannot be picked.
          const disabled = !checked && n === 0;
          const id = `${idPrefix}-${group.key}-${o.value}`;
          return (
            <li key={o.value}>
              <label
                htmlFor={id}
                className={[
                  "flex min-h-11 items-center gap-3 rounded-[var(--radius-field)] px-2",
                  disabled ? "cursor-not-allowed text-ink-500" : "cursor-pointer text-ink-900 hover:bg-sand-100",
                ].join(" ")}
              >
                <input
                  id={id}
                  type="checkbox"
                  name={group.key}
                  value={o.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(group.key, o.value)}
                  className="size-5 shrink-0 accent-sea-700"
                />
                <span className="min-w-0 flex-1 py-1 text-[15px] leading-snug">
                  {o.label}
                  {o.secondary ? (
                    <span className="block text-sm text-ink-500">
                      <bdi>({o.secondary})</bdi>
                    </span>
                  ) : null}
                </span>
                <span className="tabular shrink-0 text-sm text-ink-500">{formatNumber(n, loc)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {truncate ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 min-h-10 rounded-[var(--radius-field)] px-2 text-sm font-semibold text-sea-700 hover:underline"
        >
          {expanded ? t("showLess") : t("showMore", { count: formatNumber(hidden, loc) })}
        </button>
      ) : null}
    </fieldset>
  );
}

/* ---------------- Desktop column: instant apply ---------------- */

export function FilterPanel({
  groups,
  rows,
  selection,
  base,
}: {
  groups: FilterGroupView[];
  rows: FacetRow[];
  selection: Selection;
  base: SearchBase;
}) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const { navigate } = useContext(NavContext);
  const [current, setCurrent] = useOptimistic(selection);
  const apply = (next: Selection) => navigate(searchHref(base, next), () => setCurrent(next));
  return (
    // A plain GET form: without JavaScript the Apply button submits the same URL the instant filters would.
    <form action="" method="get" aria-label={t("filters.panelLabel")} onSubmit={(e) => e.preventDefault()}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-sea-900">{t("filters.title")}</h2>
        {appliedCount(current) ? (
          <button type="button" onClick={() => apply(emptySelection())} className="min-h-10 px-1 text-sm font-semibold text-sea-700 hover:underline">
            {tc("clearAll")}
          </button>
        ) : null}
      </div>
      {base.q ? <input type="hidden" name="q" value={base.q} /> : null}
      {base.sort !== "relevance" ? <input type="hidden" name="sort" value={base.sort} /> : null}
      {Object.entries(base.keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <FilterGroups
        groups={groups}
        selection={current}
        counts={countOptions(rows, current)}
        onToggle={(k, v) => apply(toggleValue(current, k, v))}
        idPrefix="panel"
      />
      <noscript>
        <Button type="submit" variant="secondary" className="mt-3 w-full">
          {t("filters.apply")}
        </Button>
      </noscript>
    </form>
  );
}

/* ---------------- Phone: Filters button and bottom sheet ---------------- */

export function FilterSheet({
  groups,
  rows,
  selection,
  base,
  initialOpen = false,
  className,
}: {
  groups: FilterGroupView[];
  rows: FacetRow[];
  selection: Selection;
  base: SearchBase;
  /** Open on load (?sheet=1), so the sheet can be reviewed from a URL. */
  initialOpen?: boolean;
  className?: string;
}) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const { navigate } = useContext(NavContext);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState(selection);
  const applied = appliedCount(selection);
  const n = countMatches(rows, draft);

  useEffect(() => {
    if (initialOpen && window.matchMedia("(max-width: 1023.98px)").matches) ref.current?.showModal();
  }, [initialOpen]);

  const open = () => {
    setDraft(selection);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <Button type="button" variant="secondary" onClick={open} className={className} aria-haspopup="dialog">
        {t("filters.button")}
        {applied ? (
          <span className="tabular inline-flex min-w-6 items-center justify-center rounded-[var(--radius-tag)] bg-sea-700 px-1.5 text-sm text-white">
            {formatNumber(applied, loc)}
          </span>
        ) : null}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="inset-x-0 mx-0 mb-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-[var(--radius-card)] border-0 bg-sand-50 p-0 text-ink-900 shadow-[var(--shadow-card)] backdrop:bg-sea-900/40 lg:hidden"
      >
        <div className="flex max-h-[88dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-2">
            <h2 id={titleId} className="text-lg font-bold text-sea-900">
              {t("filters.title")}
            </h2>
            <Button type="button" variant="ghost" onClick={close} className="px-3">
              {tc("close")}
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <FilterGroups
              groups={groups}
              selection={draft}
              counts={countOptions(rows, draft)}
              onToggle={(k, v) => setDraft((d) => toggleValue(d, k, v))}
              idPrefix="sheet"
            />
          </div>
          <footer className="flex items-center gap-3 border-t border-sand-200 bg-white px-4 py-3">
            <Button type="button" variant="ghost" className="px-3" disabled={!appliedCount(draft)} onClick={() => setDraft(emptySelection())}>
              {tc("clearAll")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={n === 0}
              onClick={() => {
                close();
                navigate(searchHref(base, draft));
              }}
            >
              {t("filters.show", { count: n, countLabel: formatNumber(n, loc) })}
            </Button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
