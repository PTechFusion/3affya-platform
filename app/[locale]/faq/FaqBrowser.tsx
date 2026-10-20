"use client";
// FAQ search and grouped accordions (screen 13). The search field is the hook: it filters the questions as you type, across
// question and answer, tolerant of Arabic spelling variants (hamza forms, taa marbuta, alef maqsura, the article al-) and
// English plurals. The query is kept in the URL (?q=) so Back and sharing work; without JavaScript the form submits ?q= and
// the server renders the same filtered list. Two levels only: group heading, then question with its answer (rule X5).
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown, ChevronNext, Chip, EmptyState, Field, Input, LinkButton, SearchIcon, Surface } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";

export type FaqEntry = { id: string; q: string; a: string; href?: string; linkLabel?: string };
export type FaqSection = { id: string; title: string; items: FaqEntry[] };

/** Matches up to this many open their answers automatically; more stay folded so the list stays scannable. */
const AUTO_OPEN_MAX = 6;

const AR_MARKS = /[ؐ-ًؚ-ٰٟـ]/g; // harakat, small high marks, tatweel

function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(AR_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

function searchTerms(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((w) => w.length >= 2)
    .map((w) => {
      let term = w;
      if (term.startsWith("ال") && term.length >= 5) term = term.slice(2); // السجلات matches سجلاتك
      if (term.endsWith("ه") && term.length >= 4) term = term.slice(0, -1); // وصفة (normalised وصفه) matches الوصفات
      if (/^[a-z]{4,}s$/.test(term)) term = term.slice(0, -1); // refunds matches refund
      return term;
    });
}

export function FaqBrowser({
  sections,
  initialQuery = "",
  openId,
  forceEmpty = false,
}: {
  sections: FaqSection[];
  initialQuery?: string;
  /** Item id to render open, or "all". From ?open= so a link can point at one answer. */
  openId?: string;
  /** ?state=empty: show the no-match state until the viewer types. */
  forceEmpty?: boolean;
}) {
  const t = useTranslations("faq");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState(initialQuery);
  const [touched, setTouched] = useState(false);

  const indexed = useMemo(
    () =>
      sections.map((s) => ({
        ...s,
        // Question and answer only: matching the group title too would return a whole group for "refund".
        items: s.items.map((item) => ({ item, haystack: normalize(`${item.q} ${item.a}`) })),
      })),
    [sections],
  );

  const terms = useMemo(() => searchTerms(query), [query]);
  const searching = terms.length > 0;
  const visible = useMemo(
    () =>
      indexed
        .map((s) => ({
          ...s,
          items: searching ? s.items.filter(({ haystack }) => terms.every((w) => haystack.includes(w))) : s.items,
        }))
        .filter((s) => s.items.length > 0),
    [indexed, terms, searching],
  );
  const matchCount = visible.reduce((n, s) => n + s.items.length, 0);
  const showEmpty = (forceEmpty && !touched) || (searching && matchCount === 0);
  const autoOpen = searching && matchCount <= AUTO_OPEN_MAX;

  // A link to /faq#cancel opens that answer, not just scrolls to its folded question.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const update = (value: string) => {
    setQuery(value);
    setTouched(true);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value.trim());
    else url.searchParams.delete("q");
    url.searchParams.delete("state");
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="mt-6">
      <form
        role="search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          (document.getElementById("faq-search") as HTMLInputElement | null)?.blur(); // close the phone keyboard
        }}
      >
        <Field id="faq-search" label={t("searchLabel")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-ink-500">
              <SearchIcon />
            </span>
            <Input
              id="faq-search"
              type="search"
              name="q"
              value={query}
              onChange={(e) => update(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby="faq-search-count"
              className={`ps-12 [&::-webkit-search-cancel-button]:appearance-none ${query ? "pe-20" : ""}`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  update("");
                  document.getElementById("faq-search")?.focus();
                }}
                className="absolute inset-y-1 end-1 inline-flex min-w-11 items-center justify-center rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-sea-700 hover:bg-sand-100"
              >
                {t("searchClear")}
              </button>
            ) : null}
          </div>
        </Field>
      </form>

      {/* Live region stays mounted so screen readers hear the count change; it takes no space until there is a count. */}
      <p id="faq-search-count" role="status" className={searching && matchCount > 0 ? "mt-3 text-sm text-ink-700" : "sr-only"}>
        {searching && matchCount > 0 ? t("resultCount", { count: matchCount, countLabel: formatNumber(matchCount, locale) }) : null}
      </p>

      {!searching && !showEmpty ? (
        <nav aria-label={t("topics")} className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-[var(--radius-tag)]">
                  <Chip>{s.title}</Chip>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {showEmpty ? (
        <div className="mt-6">
          <EmptyState
            title={query.trim() ? t("emptyTitle", { query: `⁨${query.trim()}⁩` }) : t("emptyTitleGeneric")}
            body={t("emptyBody")}
            action={<LinkButton href="/contact">{t("emptyAction")}</LinkButton>}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-10">
            {visible.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
                <h2 id={`${s.id}-title`} className="text-xl font-bold text-sea-900 sm:text-2xl">
                  {s.title}
                </h2>
                <ul className="mt-3 divide-y divide-sand-200 rounded-[var(--radius-card)] border border-sand-200 bg-white px-5">
                  {s.items.map(({ item }) => (
                    <li key={item.id}>
                      <details id={item.id} className="group py-4" open={autoOpen || openId === "all" || openId === item.id}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                          {item.q}
                          <ChevronDown className="size-4 shrink-0 text-sea-700 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-ink-700">{item.a}</p>
                        {item.href && item.linkLabel ? (
                          <Link href={item.href} className="mt-2 inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
                            {item.linkLabel} <ChevronNext />
                          </Link>
                        ) : null}
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <Surface className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-sea-900">{t("moreTitle")}</h2>
              <p className="mt-1 text-ink-700">{t("moreBody")}</p>
            </div>
            <LinkButton href="/contact" variant="secondary" className="shrink-0">
              {t("moreAction")}
            </LinkButton>
          </Surface>
        </>
      )}
    </div>
  );
}
