"use client";
// The live part of the specialty list (screen 40): the toolbar (Add a specialty at the top, Find), the groups by body system
// with their order controls, the rows (a table from xl up, stacked rows below), the add and edit sheet, and the Undo bar.
// Hide, show, move and save apply at once and offer Undo instead of a confirmation (rule B10). The sheet checks a field on blur
// once it has been typed in, re-checks on each keystroke while it shows an error, and clears the error the moment it is fixed
// (F4); each error names the sub-rule and the fix (F5). A failed save keeps the input and says so (L4). Names are Arabic first in
// both locales (S16); search words keep each script in its own list (S2).
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, ChevronDown, EmptyState, Field, IconButton, Input, Notice, Select, Sheet, Textarea, Toast, ToastRegion } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { removeAddedSpecialty, saveSpecialty, saveSystemOrder, setSpecialtyShown, type ChangeResult, type SaveSpecialtyResult } from "../actions";
import { TABLE_COLUMNS, type InitialSheet, type InitialToast, type SpecialtyRow, type SystemView } from "./types";
import {
  EMPTY_SPECIALTY_INPUT,
  SPECIALTY_FIELDS,
  SPECIALTY_LIMITS,
  checkSpecialty,
  checkSpecialtyField,
  slugify,
  toSpecialtyInput,
  type SpecialtyContext,
  type SpecialtyError,
  type SpecialtyErrors,
  type SpecialtyField,
  type SpecialtyInput,
} from "./validation";

const TOAST_ID = "specialties-toast";
const SHEET_ID = "specialty-sheet";
const FORM_ID = "specialty-form";
const OTHER = "__other";
/** Examples the hints and errors quote. A code and two search words, not data. */
const EXAMPLES = { code: "207RC0000X", wordAr: "كارديو", wordEn: "qalb", slug: "family-medicine" } as const;

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");
/** First-strong isolate: a code, slug or word of the other script never reorders the sentence around it (rule R3). */
const iso = (s: string) => `⁨${s}⁩`;
/** Fold for the finder: case, Arabic diacritics and tatweel, and the alef, ya and ta marbuta variants patients mix up. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

type ToastState = { message: string; undo?: () => void };
type SheetState = { mode: "add" } | { mode: "edit"; slug: string };

export function SpecialtyEditor({
  initialRows,
  systems,
  initialSheet,
  initialToast,
  initialQuery,
}: {
  initialRows: SpecialtyRow[];
  /** Body systems in directory order. */
  systems: SystemView[];
  initialSheet: InitialSheet | null;
  initialToast: InitialToast | null;
  initialQuery: string;
}) {
  const t = useTranslations("adminSpecialties");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const ar = loc === "ar";
  const num = (n: number) => formatNumber(n, loc);
  const counted = (n: number) => ({ count: n, countLabel: num(n) });
  const primary = (x: { nameAr: string; nameEn: string }) => (ar ? x.nameAr : x.nameEn);
  const secondary = (x: { nameAr: string; nameEn: string }) => (ar ? x.nameEn : x.nameAr);

  const [rows, setRows] = useState(initialRows);
  const [order, setOrder] = useState(() => systems.map((s) => s.id));
  const [query, setQuery] = useState(initialQuery);
  const systemById = new Map(systems.map((s) => [s.id, s]));

  /* ---------------- Undo bar ---------------- */

  // The preview states (?state=saved, ?state=hidden) open with their Undo wired to the same handlers a live change uses. The
  // closures run only on a tap, after every binding below exists.
  const [toast, setToast] = useState<ToastState | null>(() => {
    if (!initialToast) return null;
    const row = initialRows.find((r) => r.slug === initialToast.slug);
    if (!row) return null;
    if (initialToast.kind === "hidden") return { message: t("toast.hidden", { name: primary(row) }), undo: () => undoHidden(row) };
    return { message: t("toast.saved", { name: primary(row) }), undo: () => undoSave(initialToast.previous) };
  });
  const focusToast = useRef(false);
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (focusToast.current) {
      focusToast.current = false;
      document.getElementById(TOAST_ID)?.querySelector<HTMLElement>("button")?.focus();
    }
    if (refocus.current) {
      const el = document.getElementById(refocus.current) as HTMLButtonElement | null;
      refocus.current = null;
      if (el && !el.disabled) el.focus();
      else el?.parentElement?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
  });

  async function call(action: () => Promise<ChangeResult | SaveSpecialtyResult>): Promise<boolean> {
    try {
      return (await action()).ok;
    } catch {
      return false;
    }
  }
  const failed = () => setToast({ message: t("toast.failed") });
  const patch = (slug: string, change: Partial<SpecialtyRow>) => setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...change } : r)));

  /* ---------------- Hide and show ---------------- */

  function toggleShown(row: SpecialtyRow) {
    const next = !row.shown;
    const name = primary(row);
    patch(row.slug, { shown: next, fresh: false });
    setToast({
      message: t(next ? "toast.shown" : "toast.hidden", { name }),
      undo: () => {
        patch(row.slug, { shown: row.shown });
        focusToast.current = true;
        setToast({ message: t(next ? "toast.shownUndone" : "toast.hiddenUndone", { name }) });
        void call(() => setSpecialtyShown(row.slug, row.shown)).then((ok) => {
          if (!ok) {
            patch(row.slug, { shown: next });
            failed();
          }
        });
      },
    });
    void call(() => setSpecialtyShown(row.slug, next)).then((ok) => {
      if (!ok) {
        patch(row.slug, { shown: row.shown });
        failed();
      }
    });
  }

  /* ---------------- Body system order ---------------- */

  function move(id: string, step: -1 | 1) {
    const from = order.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= order.length) return;
    const previous = order;
    const next = [...order];
    [next[from], next[to]] = [next[to] as string, next[from] as string];
    const system = systemById.get(id);
    const name = system ? primary(system) : "";
    setOrder(next);
    refocus.current = `move-${id}-${step < 0 ? "up" : "down"}`;
    setToast({
      message: t("toast.moved", { system: name, position: num(to + 1) }),
      undo: () => {
        setOrder(previous);
        focusToast.current = true;
        setToast({ message: t("toast.movedUndone", { system: name, position: num(from + 1) }) });
        void call(() => saveSystemOrder(previous)).then((ok) => {
          if (!ok) {
            setOrder(next);
            failed();
          }
        });
      },
    });
    void call(() => saveSystemOrder(next)).then((ok) => {
      if (!ok) {
        setOrder(previous);
        failed();
      }
    });
  }

  /* ---------------- Sheet: add and edit ---------------- */

  const sheetRef = useRef<HTMLDialogElement>(null);
  const editRowFor = (s: InitialSheet | null) => (s?.mode === "edit" ? initialRows.find((r) => r.slug === s.slug) : undefined);
  const [sheet, setSheet] = useState<SheetState>(() =>
    initialSheet?.mode === "edit" && editRowFor(initialSheet) ? { mode: "edit", slug: initialSheet.slug } : { mode: "add" },
  );
  const [values, setValues] = useState<SpecialtyInput>(() => {
    if (initialSheet?.values) return initialSheet.values;
    const row = editRowFor(initialSheet);
    if (row) return toSpecialtyInput(row);
    return { ...EMPTY_SPECIALTY_INPUT, systemId: initialSheet?.mode === "add" ? (initialSheet.systemId ?? "") : "" };
  });
  const [errors, setErrors] = useState<SpecialtyErrors>(() => (initialSheet?.mode === "add" ? (initialSheet.errors ?? {}) : {}));
  const [typedIn, setTypedIn] = useState<Partial<Record<SpecialtyField, boolean>>>({});
  const [slugTouched, setSlugTouched] = useState(() => Boolean(initialSheet?.values?.slug));
  const [saveFailed, setSaveFailed] = useState(() => (initialSheet?.mode === "edit" ? Boolean(initialSheet.failed) : false));
  const [pending, startTransition] = useTransition();

  const editing = sheet.mode === "edit" ? rows.find((r) => r.slug === sheet.slug) : undefined;
  const ctx: SpecialtyContext = {
    others: rows.filter((r) => r.slug !== editing?.slug),
    systemIds: order,
    slugFixed: Boolean(editing),
  };

  // A sheet preview (?state=add, edit, invalid, error) opens once on load; later opens go through openAdd and openEdit.
  // The invalid preview lands on its first error, as a failed Save does.
  const openOnLoad = initialSheet !== null;
  const firstInvalid = initialSheet?.mode === "add" ? SPECIALTY_FIELDS.find((f) => initialSheet.errors?.[f]) : undefined;
  useEffect(() => {
    if (!openOnLoad) return;
    sheetRef.current?.showModal();
    if (firstInvalid) document.getElementById(`specialty-${firstInvalid}`)?.focus();
  }, [openOnLoad, firstInvalid]);

  function undoHidden(row: SpecialtyRow) {
    const name = primary(row);
    patch(row.slug, { shown: true });
    focusToast.current = true;
    setToast({ message: t("toast.hiddenUndone", { name }) });
    void call(() => setSpecialtyShown(row.slug, true)).then((ok) => {
      if (!ok) {
        patch(row.slug, { shown: false });
        failed();
      }
    });
  }

  function openAdd(systemId?: string) {
    setSheet({ mode: "add" });
    setValues({ ...EMPTY_SPECIALTY_INPUT, systemId: systemId ?? "" });
    setErrors({});
    setTypedIn({});
    setSlugTouched(false);
    setSaveFailed(false);
    sheetRef.current?.showModal();
  }

  function openEdit(row: SpecialtyRow) {
    setSheet({ mode: "edit", slug: row.slug });
    setValues(toSpecialtyInput(row));
    setErrors({});
    setTypedIn({});
    setSlugTouched(true);
    setSaveFailed(false);
    sheetRef.current?.showModal();
  }

  const recheck = (next: SpecialtyInput, fields: SpecialtyField[]) =>
    setErrors((current) => {
      const out = { ...current };
      for (const f of fields) {
        const problem = checkSpecialtyField(f, next, ctx);
        if (problem) out[f] = problem;
        else delete out[f];
      }
      return out;
    });

  const fieldId = (field: SpecialtyField) => `specialty-${field}`;
  const describedBy = (field: SpecialtyField) => (errors[field] ? `${fieldId(field)}-error` : `${fieldId(field)}-hint`);

  function change(field: SpecialtyField, value: string) {
    const next = { ...values, [field]: value };
    const touched: SpecialtyField[] = [field];
    // Adding: the slug follows the English name until it is typed in by hand.
    if (field === "nameEn" && !editing && !slugTouched) {
      next.slug = slugify(value);
      if (errors.slug) touched.push("slug");
    }
    if (field === "slug") setSlugTouched(true);
    setValues(next);
    if (!typedIn[field]) setTypedIn((d) => ({ ...d, [field]: true }));
    // A choice in the select is final, so it is checked at once; a text field only while it already shows an error (F4).
    const due = touched.filter((f) => (f === "systemId" && field === "systemId") || errors[f]);
    if (due.length) recheck(next, due);
  }

  const bind = (field: SpecialtyField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    invalid: Boolean(errors[field]),
    "aria-describedby": describedBy(field),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => change(field, e.target.value),
    onBlur: () => {
      if (typedIn[field]) recheck(values, [field]);
    },
  });

  const focusFirst = (found: SpecialtyErrors) => {
    const first = SPECIALTY_FIELDS.find((f) => found[f]);
    if (first) document.getElementById(fieldId(first))?.focus();
  };

  function undoSave(previous: SpecialtyRow) {
    const name = primary(previous);
    setRows((rs) => rs.map((r) => (r.slug === previous.slug ? { ...previous, fresh: false } : r)));
    focusToast.current = true;
    setToast({ message: t("toast.savedUndone", { name }) });
    void call(() => saveSpecialty(toSpecialtyInput(previous), previous.slug)).then((ok) => {
      if (!ok) failed();
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const checked = checkSpecialty(values, ctx);
    if (!checked.ok) {
      setErrors(checked.errors);
      focusFirst(checked.errors);
      return;
    }
    setErrors({});
    const submitted = values;
    const before = editing;
    startTransition(async () => {
      let result: SaveSpecialtyResult;
      try {
        result = await saveSpecialty(submitted, before?.slug);
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (!result.ok) {
        if (result.error === "validation") {
          setErrors(result.fields);
          focusFirst(result.fields);
        } else setSaveFailed(true);
        return;
      }
      setSaveFailed(false);
      const saved = result.values;
      sheetRef.current?.close();
      if (before) {
        const updated: SpecialtyRow = { ...before, ...saved, fresh: true };
        setRows((rs) => rs.map((r) => (r.slug === before.slug ? updated : { ...r, fresh: false })));
        if (before.systemId !== saved.systemId) focusToast.current = true;
        setToast({ message: t("toast.saved", { name: primary(updated) }), undo: () => undoSave(before) });
        return;
      }
      const added: SpecialtyRow = { ...saved, doctorCount: 0, shown: true, photoUrl: null, fresh: true };
      const system = systemById.get(saved.systemId);
      setRows((rs) => [...rs.map((r) => ({ ...r, fresh: false })), added]);
      focusToast.current = true;
      setToast({
        message: t("toast.added", { name: primary(added), system: system ? primary(system) : "" }),
        undo: () => {
          setRows((rs) => rs.filter((r) => r.slug !== added.slug));
          focusToast.current = true;
          setToast({ message: t("toast.addUndone", { name: primary(added) }) });
          void call(() => removeAddedSpecialty(added.slug)).then((ok) => {
            if (!ok) {
              setRows((rs) => [...rs, added]);
              failed();
            }
          });
        },
      });
    });
  }

  const errorText = (e: SpecialtyError | undefined): string | undefined => {
    if (!e) return undefined;
    return t(`errors.${e.code}`, {
      value: iso(e.value ?? ""),
      other: e.other ? primary(e.other) : "",
      suggestion: iso(e.suggestion || EXAMPLES.slug),
      count: num(e.count ?? 0),
      max: num(e.max ?? 0),
      example: iso(EXAMPLES.code),
    });
  };

  /* ---------------- The list ---------------- */

  // Same order as the directory (screen 4): A to Z in the page language, Arabic ignoring the article al-.
  const collator = new Intl.Collator(ar ? "ar" : "en", { sensitivity: "base" });
  const sortKey = (r: SpecialtyRow) => (ar ? r.nameAr.replace(/^ال/, "") : r.nameEn);
  const sorted = [...rows].sort((a, b) => collator.compare(sortKey(a), sortKey(b)));
  const needle = fold(query);
  const tokens = needle.split(/\s+/).filter(Boolean);
  const matches = (r: SpecialtyRow) => {
    if (!tokens.length) return true;
    const hay = fold([r.nameAr, r.nameEn, r.slug, ...r.taxonomyCodes, ...r.synonymsAr, ...r.synonymsEn].join(" | "));
    return tokens.every((tok) => hay.includes(tok));
  };
  const visible = sorted.filter(matches);
  const known = new Set(order);
  const groups = [
    ...order.map((id) => ({ id, system: systemById.get(id), rows: visible.filter((r) => r.systemId === id) })),
    { id: OTHER, system: undefined, rows: visible.filter((r) => !known.has(r.systemId)) },
  // An empty body system shows its empty state; while finding, and for the catch-all group, only groups with rows show.
  ].filter((g) => g.rows.length > 0 || (g.id !== OTHER && tokens.length === 0));

  const hiddenCount = rows.filter((r) => !r.shown).length;
  const summaryArgs = { specialties: t("specialties", counted(rows.length)), systems: t("systems", counted(order.length)) };
  const summary = tokens.length
    ? t("matches", { ...counted(visible.length), query: iso(query.trim()) })
    : hiddenCount
      ? t("summaryHidden", { ...summaryArgs, hidden: t("hidden", counted(hiddenCount)) })
      : t("summary", summaryArgs);

  const status = (r: SpecialtyRow) =>
    r.shown ? <Badge tone="success">{t("row.shown")}</Badge> : <Badge tone="pending">{t("row.hidden")}</Badge>;

  const editButton = (r: SpecialtyRow) => (
    <Button type="button" variant="secondary" className="px-4" aria-haspopup="dialog" aria-label={t("row.editLabel", { name: primary(r) })} onClick={() => openEdit(r)}>
      {t("row.edit")}
    </Button>
  );
  // Hide and Show sit with the status they change.
  const shownToggle = (r: SpecialtyRow) => (
    <Button
      type="button"
      variant="ghost"
      className="px-3"
      aria-label={t(r.shown ? "row.hideLabel" : "row.showLabel", { name: primary(r) })}
      onClick={() => toggleShown(r)}
    >
      {t(r.shown ? "row.hide" : "row.show")}
    </Button>
  );

  // While finding, the words that matched come first, so the row shows why it is in the list.
  const hit = (word: string) => tokens.some((tok) => fold(word).includes(tok));
  // A preview of the first two words in one script per line (never two scripts on one line), then the total in the page language.
  const preview = (all: string[], script: "ar" | "en") => {
    if (!all.length) return null;
    const list = tokens.length ? [...all].sort((a, b) => Number(hit(b)) - Number(hit(a))) : all;
    return (
      <p className={script === "ar" ? "text-ink-900" : "mt-0.5 text-ink-700"}>
        <span className="sr-only">{t(script === "ar" ? "row.wordsAr" : "row.wordsEn")}: </span>
        <bdi lang={script} dir={script === "ar" ? "rtl" : "ltr"}>
          {list.slice(0, 2).join(script === "ar" ? "، " : ", ")}
        </bdi>
      </p>
    );
  };
  const wordsCell = (r: SpecialtyRow) => {
    const total = r.synonymsAr.length + r.synonymsEn.length;
    return (
      <>
        {preview(r.synonymsAr, "ar")}
        {preview(r.synonymsEn, "en")}
        <p className={cx("text-ink-500", total > 0 && "mt-0.5")}>{total ? t("row.words", counted(total)) : t("row.none")}</p>
      </>
    );
  };

  // The Arabic name stays an inline run inside a block that follows the page direction, so a wrapped name lines up with the
  // other cells on the English page (rule R4: one or two line labels follow the page).
  const nameAr = (r: SpecialtyRow) => (
    <span className="block">
      <bdi lang="ar" dir="rtl" className="font-semibold text-ink-900">
        {r.nameAr}
      </bdi>
    </span>
  );
  const nameEn = (r: SpecialtyRow) => (
    <bdi lang="en" dir="ltr">
      {r.nameEn}
    </bdi>
  );

  return (
    <>
      {/* Add sits first, at the reading-start corner (rule R9); the finder at the other end from sm up. */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Button type="button" aria-haspopup="dialog" onClick={() => openAdd()} className="w-full sm:mt-7 sm:w-auto">
          {t("add")}
        </Button>
        <div className="w-full sm:max-w-sm">
          <Field id="specialties-find" label={t("find.label")} hint={t("find.hint")}>
            <Input
              id="specialties-find"
              type="search"
              dir="auto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-describedby="specialties-find-hint"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </Field>
        </div>
      </div>

      {/* With no match the empty state below says it, so the count line stays for screen readers only. */}
      <p aria-live="polite" className={cx("mt-5 font-semibold text-ink-900", tokens.length > 0 && visible.length === 0 && "sr-only")}>
        {summary}
      </p>
      {tokens.length ? null : <p className="mt-1 max-w-3xl text-sm text-ink-700">{t("orderNote")}</p>}

      <div className="mt-4 flex flex-col gap-5">
        {tokens.length && visible.length === 0 ? (
          <EmptyState
            title={t("noMatch.title", { query: iso(query.trim()) })}
            body={t("noMatch.body")}
            action={
              <Button type="button" variant="secondary" onClick={() => setQuery("")}>
                {t("noMatch.action")}
              </Button>
            }
          />
        ) : null}

        {groups.map((g) => {
          const position = order.indexOf(g.id) + 1;
          const title = g.system ? primary(g.system) : t("group.other");
          const titleId = `system-${g.id}`;
          return (
            <section key={g.id} aria-labelledby={titleId} className="overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
              <header className="flex items-center gap-3 border-b border-sand-200 bg-sand-100 px-4 py-2.5 sm:px-5">
                {g.system ? (
                  <span aria-hidden="true" className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-sea-100 text-sm font-bold text-sea-800">
                    {num(position)}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-lg font-bold leading-snug text-sea-900">
                    {title}
                    {g.system ? <span className="sr-only">, {t("group.position", { position: num(position) })}</span> : null}
                  </h2>
                  {/* The other-language name on its own line, so a wrapped name never mixes directions with the count. */}
                  {g.system ? (
                    <p className="text-sm text-ink-700">
                      <bdi lang={ar ? "en" : "ar"} dir={ar ? "ltr" : "rtl"}>
                        {secondary(g.system)}
                      </bdi>
                    </p>
                  ) : null}
                  <p className="text-sm text-ink-500">{t("group.count", counted(g.rows.length))}</p>
                </div>
                {g.system && !tokens.length ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton id={`move-${g.id}-up`} label={t("group.moveUp", { system: title })} disabled={position <= 1} onClick={() => move(g.id, -1)}>
                      <ChevronDown className="size-5 rotate-180" />
                    </IconButton>
                    <IconButton
                      id={`move-${g.id}-down`}
                      label={t("group.moveDown", { system: title })}
                      disabled={position >= order.length}
                      onClick={() => move(g.id, 1)}
                    >
                      <ChevronDown className="size-5" />
                    </IconButton>
                  </div>
                ) : null}
              </header>

              {g.rows.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <EmptyState
                    title={t("emptySystem.title", { system: title })}
                    body={t("emptySystem.body")}
                    action={
                      <Button type="button" aria-haspopup="dialog" onClick={() => openAdd(g.id)}>
                        {t("emptySystem.action")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  {/* Phone and tablet: one stacked row per specialty; codes and search words open in the sheet (rule A5). */}
                  <ul className="divide-y divide-sand-200 xl:hidden">
                    {g.rows.map((r) => (
                      <li key={r.slug} className={cx("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5", !r.shown && "bg-sand-50")}>
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Photo url={r.photoUrl} muted={!r.shown} />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {nameAr(r)}
                              {r.fresh ? <Badge tone="info">{t("row.justSaved")}</Badge> : null}
                            </p>
                            <p className="text-ink-700">{nameEn(r)}</p>
                            <p className="mt-1 text-sm text-ink-700">
                              <span className="ltr-run">{r.slug}</span> · {t("row.doctors", counted(r.doctorCount))}
                            </p>
                            <p className="text-sm text-ink-500">
                              {t("row.codes", counted(r.taxonomyCodes.length))} ·{" "}
                              {t("row.words", counted(r.synonymsAr.length + r.synonymsEn.length))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:shrink-0">
                          <span className="me-auto sm:me-2">{status(r)}</span>
                          {editButton(r)}
                          {shownToggle(r)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop: the table the brief calls for, Arabic name first (rule S16). */}
                  <table className="hidden w-full table-fixed border-collapse text-sm xl:table">
                    <caption className="sr-only">{t("caption", { system: title })}</caption>
                    <colgroup>
                      {TABLE_COLUMNS.map((w, i) => (
                        <col key={i} className={w} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="text-ink-500">
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold first:ps-5">
                          {t("columns.nameAr")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          {t("columns.nameEn")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          {t("columns.slugCodes")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          {t("columns.words")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          {t("columns.doctors")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          {t("columns.status")}
                        </th>
                        <th scope="col" className="px-3 pb-2 pt-3 text-start font-semibold">
                          <span className="sr-only">{t("columns.actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.slug} className={cx("border-t border-sand-200 align-top", !r.shown && "bg-sand-50")}>
                          <th scope="row" className="px-3 py-3 ps-5 text-start font-normal">
                            <span className="flex items-start gap-3">
                              <Photo url={r.photoUrl} muted={!r.shown} small />
                              <span className="flex min-w-0 flex-col items-start gap-1 pt-1 text-base">
                                {nameAr(r)}
                                {r.fresh ? <Badge tone="info">{t("row.justSaved")}</Badge> : null}
                              </span>
                            </span>
                          </th>
                          <td className="px-3 py-3 pt-4 text-base text-ink-900">{nameEn(r)}</td>
                          <td className="px-3 py-3 pt-4">
                            <span className="ltr-run font-semibold text-ink-900">{r.slug}</span>
                            {r.taxonomyCodes.length ? (
                              <ul className="mt-1 text-ink-700">
                                {r.taxonomyCodes.map((c) => (
                                  <li key={c}>
                                    <span className="ltr-run tabular">{c}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-ink-500">{t("row.none")}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 pt-4">
                            {wordsCell(r)}
                          </td>
                          <td className="tabular px-3 py-3 pt-4 text-base font-semibold text-ink-900">
                            {num(r.doctorCount)}
                          </td>
                          <td className="px-3 pb-2 pt-4">
                            <span className="flex flex-col items-start gap-1">
                              {status(r)}
                              {shownToggle(r)}
                            </span>
                          </td>
                          <td className="px-3 py-3 pe-5 text-end">{editButton(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          );
        })}
      </div>

      <Sheet
        ref={sheetRef}
        id={SHEET_ID}
        title={editing ? t("sheet.editTitle", { name: primary(editing) }) : t("sheet.addTitle")}
        closeLabel={tc("close")}
        footer={
          <div className="flex flex-col gap-3">
            {saveFailed ? <Notice tone="danger" role="alert" title={t("sheet.failedTitle")} body={t("sheet.failedBody")} /> : null}
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" className="px-3" onClick={() => sheetRef.current?.close()}>
                {tc("cancel")}
              </Button>
              <Button type="submit" form={FORM_ID} className="flex-1" disabled={pending}>
                {pending
                  ? t(editing ? "sheet.saving" : "sheet.creating")
                  : saveFailed
                    ? t("sheet.retry")
                    : t(editing ? "sheet.save" : "sheet.create")}
              </Button>
            </div>
          </div>
        }
      >
        <form id={FORM_ID} noValidate onSubmit={submit} aria-busy={pending || undefined} className="flex flex-col gap-6">
          {editing ? (
            <div className="flex items-center gap-3 rounded-[var(--radius-field)] border border-sand-200 bg-white p-3">
              <Photo url={editing.photoUrl} muted={!editing.shown} />
              <p className="text-sm text-ink-700">
                {t("sheet.context", { doctors: t("row.doctors", counted(editing.doctorCount)), status: t(editing.shown ? "row.shown" : "row.hidden") })}
              </p>
            </div>
          ) : null}

          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className="mb-3 font-bold text-sea-900">{t("sheet.namesLegend")}</legend>
            <Field id={fieldId("nameAr")} label={t("sheet.nameAr")} hint={t("sheet.nameArHint")} error={errorText(errors.nameAr)}>
              <Input {...bind("nameAr")} lang="ar" dir="rtl" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="next" />
            </Field>
            <Field id={fieldId("nameEn")} label={t("sheet.nameEn")} hint={t("sheet.nameEnHint")} error={errorText(errors.nameEn)}>
              <Input {...bind("nameEn")} lang="en" dir="ltr" autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false} enterKeyHint="next" />
            </Field>
            {editing ? (
              <div>
                <p className="font-semibold text-ink-900">{t("sheet.slug")}</p>
                <p className="mt-1">
                  <span className="ltr-run font-semibold text-sea-900">{editing.slug}</span>
                </p>
                <p className="mt-1 text-sm text-ink-500">{t("sheet.slugFixed")}</p>
                <SlugLink slug={editing.slug} />
              </div>
            ) : (
              <div>
                <Field id={fieldId("slug")} label={t("sheet.slug")} hint={t("sheet.slugHint")} error={errorText(errors.slug)}>
                  <Input
                    {...bind("slug")}
                    aria-describedby={`${describedBy("slug")} specialty-slug-link`}
                    lang="en"
                    dir="ltr"
                    maxLength={SPECIALTY_LIMITS.slugMax + 20}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="next"
                  />
                </Field>
                <SlugLink id="specialty-slug-link" slug={values.slug.trim() || slugify(values.nameEn) || EXAMPLES.slug} />
              </div>
            )}
          </fieldset>

          <Field id={fieldId("systemId")} label={t("sheet.system")} hint={t("sheet.systemHint")} error={errorText(errors.systemId)}>
            <Select {...bind("systemId")}>
              <option value="" disabled>
                {t("sheet.systemPick")}
              </option>
              {order.map((id) => {
                const s = systemById.get(id);
                return s ? (
                  <option key={id} value={id}>
                    {primary(s)}
                  </option>
                ) : null;
              })}
            </Select>
          </Field>

          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className="mb-1 font-bold text-sea-900">{t("sheet.wordsLegend")}</legend>
            <p className="-mt-1 text-sm text-ink-700">{t("sheet.wordsHint")}</p>
            <Field
              id={fieldId("synonymsAr")}
              label={t("sheet.synonymsAr")}
              hint={t("sheet.synonymsArHint", { example: iso(EXAMPLES.wordAr) })}
              error={errorText(errors.synonymsAr)}
            >
              <Textarea {...bind("synonymsAr")} lang="ar" dir="rtl" rows={3} autoCorrect="off" spellCheck={false} />
            </Field>
            <Field
              id={fieldId("synonymsEn")}
              label={t("sheet.synonymsEn")}
              hint={t("sheet.synonymsEnHint", { example: iso(EXAMPLES.wordEn) })}
              error={errorText(errors.synonymsEn)}
            >
              <Textarea {...bind("synonymsEn")} lang="en" dir="ltr" rows={3} autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            </Field>
          </fieldset>

          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className="mb-3 font-bold text-sea-900">{t("sheet.codesLegend")}</legend>
            <Field id={fieldId("codes")} label={t("sheet.codes")} hint={t("sheet.codesHint", { example: iso(EXAMPLES.code) })} error={errorText(errors.codes)}>
              <Input
                {...bind("codes")}
                lang="en"
                dir="ltr"
                className="tabular"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="done"
              />
            </Field>
          </fieldset>
        </form>
      </Sheet>

      <ToastRegion>
        {toast ? (
          <Toast
            id={TOAST_ID}
            message={toast.message}
            actionLabel={toast.undo ? t("toast.undo") : undefined}
            onAction={toast.undo}
            dismissLabel={t("toast.dismiss")}
            onDismiss={() => setToast(null)}
          />
        ) : null}
      </ToastRegion>
    </>
  );
}

/** The search link a slug makes, on its own line as one left-to-right run so it never reorders inside Arabic text (rule R3). */
function SlugLink({ id, slug }: { id?: string; slug: string }) {
  return (
    <p id={id} className="mt-0.5 text-sm text-ink-500">
      <span className="ltr-run break-all">/search?specialty={slug}</span>
    </p>
  );
}

/** The face on the directory tile, small: a verified doctor's photo, or a plain disc while the specialty has none. */
function Photo({ url, muted, small }: { url: string | null; muted?: boolean; small?: boolean }) {
  const size = small ? "size-8" : "size-10";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={40} height={40} className={cx(size, "shrink-0 rounded-full object-cover", muted && "opacity-50")} />
  ) : (
    <span aria-hidden="true" className={cx(size, "shrink-0 rounded-full bg-lagoon-100")} />
  );
}
