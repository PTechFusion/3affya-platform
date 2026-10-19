"use client";
// Hero search with live suggestions (rule S1): at most 8 suggestions, the predicted part in bold, arrow keys copy the
// suggestion into the field, Enter submits. Rule S3: visible submit button, query persists in the URL.
// Labels default to the patient search on home; other pages (Find your profile on /for-professionals) pass their own.
import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";

export type SearchSuggestion = {
  kind: "specialty" | "doctor";
  label: string;
  href: string;
  /** Extra text that matches but is not shown, e.g. the name in the other script or an NPI. */
  keywords?: string;
  /** Replaces the kind label at the end of the row, e.g. "Pediatrics · Unclaimed profile". */
  meta?: string;
};

export type SearchBoxLabels = { label: string; placeholder: string; submit: string; noSuggestions: string };

const MAX_VISIBLE = 8;

export function SearchBox({
  suggestions,
  initialQuery = "",
  initialOpen,
  labels,
  action = "/search",
}: {
  suggestions: SearchSuggestion[];
  initialQuery?: string;
  /** Open the suggestion list on load (default: when there is an initial query). */
  initialOpen?: boolean;
  labels?: Partial<SearchBoxLabels>;
  /** Route the form submits to with ?q=. */
  action?: string;
}) {
  const t = useTranslations("home");
  const label = labels?.label ?? t("searchLabel");
  const placeholder = labels?.placeholder ?? t("searchPlaceholder");
  const submit = labels?.submit ?? t("search");
  const noSuggestions = labels?.noSuggestions ?? t("noSuggestions");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const [typed, setTyped] = useState(initialQuery); // what the user typed; arrow keys change the field, not this
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(initialOpen ?? initialQuery.length > 0);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const q = typed.trim().toLocaleLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => `${s.label} ${s.keywords ?? ""}`.toLocaleLowerCase().includes(q)).slice(0, MAX_VISIBLE);
  }, [typed, suggestions]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !matches.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (active + 1) % matches.length : (active - 1 + matches.length) % matches.length;
      setActive(next);
      setValue(matches[next]?.label ?? typed);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      setValue(typed);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const m = matches[active];
      if (m) go(m.href);
    }
  };

  return (
    <form
      role="search"
      action={`/${locale}${action}`}
      method="get"
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        go(`${action}?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <div className="relative flex-1">
        <label htmlFor={`${listId}-input`} className="sr-only">
          {label}
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          name="q"
          value={value}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setTyped(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full min-h-13 rounded-[var(--radius-field)] border-0 bg-white px-4 text-ink-900 shadow-[var(--shadow-nav)] placeholder:text-ink-500/70"
        />
        {open && typed.trim() ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("suggestionsLabel")}
            className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-[var(--radius-field)] bg-white text-ink-900 shadow-[var(--shadow-card)]"
          >
            {matches.length ? (
              matches.map((m, i) => (
                <li
                  key={m.href}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(m.href)}
                  className={[
                    "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start",
                    i === active ? "bg-lagoon-100" : "hover:bg-sand-100",
                  ].join(" ")}
                >
                  <span>
                    <Highlight label={m.label} typed={typed} />
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{m.meta ?? (m.kind === "specialty" ? t("kindSpecialty") : t("kindDoctor"))}</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-ink-700">{noSuggestions}</li>
            )}
          </ul>
        ) : null}
      </div>
      <Button type="submit" className="min-h-13 sm:px-7">
        {submit}
      </Button>
    </form>
  );
}

/** Typed part plain, predicted part bold (Baymard: bold what the user has not typed). */
function Highlight({ label, typed }: { label: string; typed: string }) {
  const q = typed.trim();
  const at = label.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
  if (at < 0 || !q) return <strong>{label}</strong>;
  return (
    <>
      <strong>{label.slice(0, at)}</strong>
      {label.slice(at, at + q.length)}
      <strong>{label.slice(at + q.length)}</strong>
    </>
  );
}
