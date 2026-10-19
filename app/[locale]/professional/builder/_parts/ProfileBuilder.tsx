"use client";
// Screen 29, profile builder (docs/screens/29-profile-builder.md, tasks 1.7, 2.4, 2.5). One client island: the form, the live
// card and the checklist share one draft, so every keystroke reaches the card (the hook, rule B4).
// Layout: phone and tablet, the stacked steps under a sticky mini card that opens the full card in a sheet; desktop (xl), the
// form at the start, the full card pinned at the end. Steps are 2 to 6 fields with a heading, all visible, the current one
// open and highlighted (F3); Back and Save and continue on each. Fields: labels above, single column, optional ones marked
// (F1); checked on blur once typed in, re-checked on every keystroke while an error shows, cleared when fixed (F4); errors
// name the fix, in text, next to the field (F5 L4). Coach marks on first use of each step, dismissible, remembered per doctor
// in this browser (?coach=0 hides them). Uploads are a stub: the photo previews from memory, credential files list by name.
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Badge,
  Button,
  CheckCard,
  CheckIcon,
  ChevronDown,
  CloseIcon,
  CoachMark,
  Field,
  Input,
  LinkButton,
  RadioCard,
  Select,
  Tag,
  Textarea,
  type BadgeTone,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatDate, formatMoney, formatNumber, type Locale } from "@/lib/format";
import type { CredentialKind, SampleDoctor, SampleSpecialty, UsState } from "@/lib/sample";
import { saveBuilderStep, submitForReview, type SaveResult, type SubmitResult } from "../actions";
import { Checklist } from "./Checklist";
import { PreviewCard, PreviewPanel, PreviewScope, draftToDoctor, type PreviewMessages, type PreviewMode, type PreviewPrompt } from "./Preview";
import {
  DIALECTS,
  ITEM_STEP,
  LATER_ITEMS,
  LIMITS,
  REQUIRED_ITEMS,
  STEPS,
  STEP_FIELDS,
  digitsOnly,
  isVerifiedStage,
  missingFor,
  toMb,
  toPayload,
  validateAll,
  validateCredentialFile,
  validatePhotoFile,
  validateStep,
  validateTag,
  validateText,
  validateTrainingLine,
  type ChecklistKey,
  type Draft,
  type ErrorCode,
  type ErrorKey,
  type FieldErrors,
  type MissingCode,
  type Stage,
  type StepId,
  type TextField,
} from "./model";

/** Research facts the photo step quotes (rules B4 C3), the same figures as /for-professionals. Not business numbers. */
const PHOTO_VIEWS_MULTIPLE = 2;
const DOXIMITY_PROFILES = 500_000;

export type ProfileBuilderProps = {
  doctorId: string;
  /** The sample row the card mapping starts from; the draft overrides what the doctor edits. */
  base: SampleDoctor;
  npi: string;
  initialDraft: Draft;
  initialStage: Stage;
  initialStep: StepId;
  /** Checklist items filled from the registry when the builder opened (rule B3). */
  registryKeys: ChecklistKey[];
  hasAvailability: boolean;
  timeZone: string;
  thisYear: number;
  coach: boolean;
  initialPreview: Locale;
  previewMessages: PreviewMessages;
  specialties: SampleSpecialty[];
  states: UsState[];
  /** Formatted on the server with lib/format. */
  dates: { submitted?: string; decided?: string };
  rejection?: { kind: CredentialKind; reason: string; reasonLang: Locale };
  publicHref?: string;
};

/* ---------------- Coach marks: dismissed steps per doctor, in this browser ---------------- */

const coachListeners = new Set<() => void>();
const coachMemory = new Map<string, string>(); // used when storage is blocked (private mode), so Got it still works
const coachKey = (doctorId: string) => `3affya.builder.coach.${doctorId}`;

function readCoach(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? coachMemory.get(key) ?? "[]";
  } catch {
    return coachMemory.get(key) ?? "[]";
  }
}

function subscribeCoach(onChange: () => void) {
  coachListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    coachListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Null on the server and during hydration (no coach mark in the server HTML), then the dismissed steps. */
function useCoachSeen(doctorId: string): { seen: string[] | null; dismiss: (step: StepId) => void } {
  const key = coachKey(doctorId);
  const raw = useSyncExternalStore(subscribeCoach, () => readCoach(key), () => null);
  let seen: string[] | null = null;
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      seen = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
    } catch {
      seen = [];
    }
  }
  const dismiss = (step: StepId) => {
    const next = JSON.stringify([...new Set([...(seen ?? []), step])]);
    coachMemory.set(key, next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // storage blocked: the in-memory copy keeps it dismissed for this visit
    }
    coachListeners.forEach((fn) => fn());
  };
  return { seen, dismiss };
}

/* ---------------- Small local pieces ---------------- */

/** A file input drawn as the secondary button; the native input stays focusable for keyboard and screen readers. */
function FilePick({
  id,
  label,
  accept,
  onChange,
  describedBy,
}: {
  id: string;
  label: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  describedBy?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border border-sea-700 bg-white px-5 py-3 text-[15px] font-semibold text-sea-700 transition-colors hover:bg-sea-100 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-lagoon-500"
    >
      <input id={id} type="file" accept={accept} onChange={onChange} aria-describedby={describedBy} className="sr-only" />
      {label}
    </label>
  );
}

const STAGE_TONE: Record<Stage, BadgeTone> = {
  registry: "unclaimed",
  uploaded: "pending",
  submitted: "info",
  rejected: "danger",
  live: "verified",
  editing: "verified",
};

type Focus = { id: string; scrollTo?: string; block?: ScrollLogicalPosition; n: number };

export function ProfileBuilder(props: ProfileBuilderProps) {
  const { doctorId, base, npi, registryKeys, hasAvailability, timeZone, thisYear, previewMessages, specialties, states, dates, rejection, publicHref } = props;
  const t = useTranslations("builder");
  const tc = useTranslations("common");
  const tcard = useTranslations("card");
  const tl = useTranslations("languages");
  const locale = useLocale() as Locale;
  const n = (v: number) => formatNumber(v, locale);
  const year = (v: number) => formatNumber(v, locale, { useGrouping: false });
  const mb = (bytes: number | undefined) => formatNumber(toMb(bytes ?? 0), locale, { maximumFractionDigits: 1 });

  const [draft, setDraft] = useState<Draft>(props.initialDraft);
  const [stage, setStage] = useState<Stage>(props.initialStage);
  const [open, setOpen] = useState<StepId | null>(props.initialStep);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorSizes, setErrorSizes] = useState<Partial<Record<ErrorKey, number>>>({});
  const [typed, setTyped] = useState<Partial<Record<TextField, boolean>>>({});
  const [previewLocale, setPreviewLocale] = useState<Locale>(props.initialPreview);
  const [mode, setMode] = useState<PreviewMode>("review");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "failed" | "invalid">("idle");
  const [finalState, setFinalState] = useState<"idle" | "failed" | "saved">("idle");
  const [submittedLabel, setSubmittedLabel] = useState(dates.submitted);
  const [tagInput, setTagInput] = useState("");
  const [bookNote, setBookNote] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const blobRef = useRef<string | null>(null);
  const seq = useRef(0);
  const coach = useCoachSeen(doctorId);

  // Focus moves only after the doctor acted (Continue, Back, a checklist link), never on first render.
  useEffect(() => {
    if (!focus) return;
    const target = document.getElementById(focus.id);
    document.getElementById(focus.scrollTo ?? focus.id)?.scrollIntoView({ block: focus.block ?? "start" });
    target?.focus({ preventScroll: true });
  }, [focus]);

  useEffect(
    () => () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    },
    [],
  );

  /* ---------- derived ---------- */
  const ctx = { npi, hasAvailability, thisYear };
  const allItems = [...REQUIRED_ITEMS, ...LATER_ITEMS] as ChecklistKey[];
  const missing: Partial<Record<ChecklistKey, MissingCode>> = {};
  for (const key of allItems) {
    const code = missingFor(key, draft, ctx);
    if (code) missing[key] = code;
  }
  const requiredLeft = REQUIRED_ITEMS.filter((k) => missing[k]).length;
  const total = allItems.length;
  const done = total - Object.keys(missing).length;
  const verified = isVerifiedStage(stage);
  const cardState = verified || mode === "verified" ? "verified" : "pending";
  const doctor = draftToDoctor(base, draft, cardState, specialties, states);
  const bookable = verified && hasAvailability;
  const otherLocale: Locale = previewLocale === "ar" ? "en" : "ar";
  const filesLocked = stage === "submitted";
  const fee = digitsOnly(draft.feeUsd);
  const feeTotal =
    /^\d+$/.test(fee) && Number(fee) > 0 ? formatMoney(feeLines(Number(fee) * 100).totalCents, business.currencyPresentment, locale) : undefined;

  const itemsOf = (step: StepId) => allItems.filter((k) => ITEM_STEP[k] === step);
  const neededIn = (step: StepId) => itemsOf(step).filter((k) => (REQUIRED_ITEMS as readonly string[]).includes(k) && missing[k]).length;
  const stepDone = (step: StepId) => itemsOf(step).every((k) => !missing[k]);

  /* ---------- state helpers ---------- */
  const fid = (key: string) => `builder-${key.replace(".", "-")}`;
  const nextFocus = (f: Omit<Focus, "n">) => {
    seq.current += 1;
    setFocus({ ...f, n: seq.current });
  };
  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaveState("idle");
    setFinalState("idle");
  };
  const setError = (key: ErrorKey, code: ErrorCode | undefined) =>
    setErrors((e) => {
      const next = { ...e };
      if (code) next[key] = code;
      else delete next[key];
      return next;
    });

  const valueOf = (key: ErrorKey): string => {
    if (key === "tag") return tagInput;
    if (key.startsWith("training.")) return draft.training[Number(key.split(".")[1])] ?? "";
    return key in draft ? String(draft[key as TextField] ?? "") : "";
  };
  const errorText = (key: ErrorKey): string | undefined => {
    const code = errors[key];
    if (!code) return undefined;
    const max: Partial<Record<ErrorCode, string>> = {
      nameTooLong: n(LIMITS.nameMax),
      yearsRange: n(LIMITS.yearsMax),
      cityTooLong: n(LIMITS.cityMax),
      licenceTooLong: n(LIMITS.licenceMax),
      boardTooLong: n(LIMITS.boardMax),
      schoolTooLong: n(LIMITS.schoolMax),
      gradRange: year(thisYear),
      trainingTooLong: n(LIMITS.trainingMax),
      bioTooLong: n(LIMITS.bioMax),
      photoSize: n(business.photoMaxMb),
      fileSize: n(business.credentialMaxMb),
      tagTooLong: n(LIMITS.tagMaxChars),
      tagsFull: n(LIMITS.tagsMax),
    };
    return t(`errors.${code}`, {
      max: max[code] ?? "",
      min: year(LIMITS.gradYearMin),
      count: n(valueOf(key).trim().length),
      size: mb(errorSizes[key]),
    });
  };
  const describedBy = (key: ErrorKey, hasHint: boolean) => (errors[key] ? `${fid(key)}-error` : hasHint ? `${fid(key)}-hint` : undefined);

  const bind = (field: TextField, hasHint: boolean) => ({
    id: fid(field),
    name: field,
    value: draft[field],
    invalid: Boolean(errors[field]),
    "aria-describedby": describedBy(field, hasHint),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      update({ [field]: value } as Partial<Draft>);
      if (!typed[field]) setTyped((x) => ({ ...x, [field]: true }));
      if (errors[field]) setError(field, validateText(field, value, draft, thisYear));
    },
    onBlur: () => {
      if (typed[field]) setError(field, validateText(field, draft[field], draft, thisYear));
    },
  });
  const opt = (label: string) => t("optional", { label });

  const goTo = (step: StepId, fieldId?: string) => {
    setOpen(step);
    nextFocus(fieldId ? { id: fieldId, block: "center" } : { id: `step-${step}-toggle`, scrollTo: `step-${step}` });
  };
  const goToChecklist = () => {
    setOpen(null);
    nextFocus({ id: "publish-title", scrollTo: "publish" });
  };
  const stepOfError = (key: string): StepId =>
    key.startsWith("training.") ? "training" : (STEPS.find((s) => (STEP_FIELDS[s] as readonly string[]).includes(key)) ?? "photo");
  const showFirstError = (found: FieldErrors) => {
    const first = Object.keys(found)[0];
    if (!first) return;
    setOpen(stepOfError(first));
    nextFocus({ id: fid(first), block: "center" });
  };

  /* ---------- actions ---------- */
  const failed = (): SaveResult => ({ ok: false, error: "unavailable" });

  const saveStep = (step: StepId) => {
    const found = validateStep(step, draft, thisYear);
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(next) as ErrorKey[]) if (stepOfError(key) === step && !key.startsWith("file") && key !== "photo" && key !== "tag") delete next[key];
      return { ...next, ...found };
    });
    if (Object.keys(found).length) {
      setSaveState("invalid");
      showFirstError(found);
      return;
    }
    startSaving(async () => {
      const result = await saveBuilderStep(doctorId, step, toPayload(draft)).catch(failed);
      if (result.ok) {
        setSaveState("saved");
        const next = STEPS[STEPS.indexOf(step) + 1];
        if (next) goTo(next);
        else goToChecklist();
      } else if (result.error === "validation") {
        setErrors((e) => ({ ...e, ...result.fields }));
        setSaveState("invalid");
        showFirstError(result.fields);
      } else {
        setSaveState("failed");
      }
    });
  };

  const submit = () =>
    startSubmitting(async () => {
      const result = await submitForReview(doctorId, toPayload(draft)).catch((): SubmitResult => ({ ok: false, error: "unavailable" }));
      if (result.ok) {
        setStage("submitted");
        setSubmittedLabel(formatDate(new Date(result.submittedAtUtc), timeZone, locale));
        setFinalState("idle");
        nextFocus({ id: "builder-banner-title", scrollTo: "builder-banner" });
      } else if (result.error === "incomplete") {
        const first = result.missing[0];
        if (first) goTo(ITEM_STEP[first]);
      } else {
        setFinalState("failed");
      }
    });

  const saveChanges = () => {
    const found = validateAll(draft, thisYear);
    setErrors(found);
    if (Object.keys(found).length) {
      showFirstError(found);
      return;
    }
    startSaving(async () => {
      const result = await saveBuilderStep(doctorId, "all", toPayload(draft)).catch(failed);
      if (result.ok) setFinalState("saved");
      else if (result.error === "validation") {
        setErrors(result.fields);
        showFirstError(result.fields);
      } else setFinalState("failed");
    });
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const code = validatePhotoFile(file);
    setErrorSizes((s) => ({ ...s, photo: file.size }));
    setError("photo", code);
    if (code) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = URL.createObjectURL(file);
    update({ photoUrl: blobRef.current });
  };
  const removePhoto = () => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = null;
    update({ photoUrl: "" });
    setError("photo", undefined);
    nextFocus({ id: "builder-photo", block: "center" });
  };

  const onFile = (kind: CredentialKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const key = `file.${kind}` as const;
    const code = validateCredentialFile(file);
    setErrorSizes((s) => ({ ...s, [key]: file.size }));
    setError(key, code);
    if (code) return;
    seq.current += 1;
    update({ files: [...draft.files, { id: `new-${seq.current}`, name: file.name, kind, sizeBytes: file.size, status: "pending" }] });
  };
  const removeFile = (id: string, kind: CredentialKind) => {
    update({ files: draft.files.filter((f) => f.id !== id) });
    nextFocus({ id: fid(`file.${kind}`), block: "center" });
  };

  const addTag = () => {
    const code = validateTag(tagInput, draft.tags);
    setError("tag", code);
    if (code) return;
    update({ tags: [...draft.tags, tagInput.trim().replace(/\s+/g, " ")] });
    setTagInput("");
  };
  const removeTag = (tag: string) => {
    update({ tags: draft.tags.filter((x) => x !== tag) });
    setError("tag", undefined);
    nextFocus({ id: "builder-tag", block: "center" });
  };

  const setTraining = (i: number, value: string) => {
    update({ training: draft.training.map((line, j) => (j === i ? value : line)) });
    if (errors[`training.${i}`]) setError(`training.${i}`, validateTrainingLine(value));
  };
  const addTraining = () => {
    if (draft.training.length >= LIMITS.trainingLinesMax) return;
    update({ training: [...draft.training, ""] });
    nextFocus({ id: fid(`training.${draft.training.length}`), block: "center" });
  };
  const removeTraining = (i: number) => {
    update({ training: draft.training.filter((_, j) => j !== i) });
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("training."))) as FieldErrors);
    nextFocus({ id: "builder-training-add", block: "center" });
  };

  const setBoardStatus = (status: Draft["boardStatus"]) => {
    update({ boardStatus: status });
    if (errors.boardName) setError("boardName", validateText("boardName", draft.boardName, { boardStatus: status }, thisYear));
  };

  const openCard = () => dialogRef.current?.showModal();
  const closeCard = () => dialogRef.current?.close();

  /* ---------- preview ---------- */
  // Task 2.4: a missing Arabic name or a missing bio in the preview language gets an "add" prompt under the card.
  const bioField = previewLocale === "ar" ? "bioAr" : "bioEn";
  const prompts: PreviewPrompt[] = [
    ...(previewLocale === "ar" && !draft.nameAr.trim()
      ? [{ key: "nameAr", label: t("preview.addNameAr"), body: t("preview.addNameArBody"), step: "photo" as const, fieldId: fid("nameAr") }]
      : []),
    ...(!draft[bioField].trim()
      ? [{ key: bioField, label: previewLocale === "ar" ? t("preview.addBioAr") : t("preview.addBioEn"), step: "training" as const, fieldId: fid(bioField) }]
      : []),
  ];
  const onPrompt = (prompt: PreviewPrompt) => {
    closeCard();
    goTo(prompt.step, prompt.fieldId);
  };
  const panelProps = {
    doctor,
    draft,
    previewLocale,
    onPreviewLocale: setPreviewLocale,
    mode,
    onMode: setMode,
    showMode: !verified,
    messages: previewMessages,
    timeZone,
    prompts,
    onPrompt,
    bookable,
    bookNote,
    onBook: () => setBookNote(true),
  };

  /* ---------- steps ---------- */
  const sortedSpecialties = [...specialties].sort((a, b) =>
    locale === "ar" ? a.nameAr.localeCompare(b.nameAr, "ar") : a.nameEn.localeCompare(b.nameEn, "en"),
  );
  const sortedStates = [...states].sort((a, b) => (locale === "ar" ? a.nameAr.localeCompare(b.nameAr, "ar") : a.nameEn.localeCompare(b.nameEn, "en")));
  const stateOptions = sortedStates.map((s) => (
    <option key={s.code} value={s.code}>
      {locale === "ar" ? s.nameAr : s.nameEn}
    </option>
  ));
  const fieldError = (key: ErrorKey) =>
    errors[key] ? (
      <p id={`${fid(key)}-error`} role="alert" className="mt-1.5 text-sm text-danger">
        {errorText(key)}
      </p>
    ) : null;
  const legend = "text-[15px] font-semibold text-ink-900";

  const stepBody = (step: StepId) => {
    switch (step) {
      case "photo":
        return (
          <>
            <div>
              <p className={legend}>{t("photo.label")}</p>
              <div className="mt-2 flex items-start gap-4">
                {draft.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.photoUrl} alt="" className="size-24 shrink-0 rounded-2xl bg-sand-100 object-cover ring-4 ring-sand-100" />
                ) : (
                  <div aria-hidden="true" className="size-24 shrink-0 rounded-2xl bg-sand-200 ring-4 ring-sand-100" />
                )}
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                  <FilePick
                    id="builder-photo"
                    accept="image/jpeg,image/png"
                    label={draft.photoUrl ? t("photo.replace") : t("photo.upload")}
                    onChange={onPhoto}
                    describedBy={describedBy("photo", true)}
                  />
                  {draft.photoUrl ? (
                    <Button type="button" variant="ghost" onClick={removePhoto}>
                      {t("photo.remove")}
                    </Button>
                  ) : (
                    <p className="text-sm text-ink-700">{t("photo.none")}</p>
                  )}
                </div>
              </div>
              {errors.photo ? (
                fieldError("photo")
              ) : (
                <p id="builder-photo-hint" className="mt-1.5 text-sm text-ink-500">
                  {t("photo.formats", { max: n(business.photoMaxMb) })}
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-field)] bg-lagoon-100 px-4 py-3 text-lagoon-900">
              <p className="font-semibold">{t("photo.benefit", { n: n(PHOTO_VIEWS_MULTIPLE) })}</p>
              <p className="mt-0.5 text-xs">{t("photo.source", { profiles: n(DOXIMITY_PROFILES) })}</p>
            </div>
            <div>
              <p className={legend}>{t("photo.guideTitle")}</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-700">
                {(["recent", "coat", "background"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <CheckIcon className="mt-1 size-3.5 shrink-0 text-success" />
                    {t(`photo.guide.${k}`)}
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <CloseIcon className="mt-1 size-3.5 shrink-0 text-danger" />
                  {t("photo.guide.no")}
                </li>
              </ul>
            </div>
            <Field id={fid("nameEn")} label={t("fields.nameEn.label")} hint={t("fields.nameEn.hint")} error={errorText("nameEn")}>
              <Input {...bind("nameEn", true)} dir="ltr" lang="en" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            </Field>
            <Field id={fid("nameAr")} label={opt(t("fields.nameAr.label"))} hint={t("fields.nameAr.hint")} error={errorText("nameAr")}>
              <Input {...bind("nameAr", true)} dir="rtl" lang="ar" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            </Field>
          </>
        );
      case "location":
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <p className={legend}>{t("fields.npi.label")}</p>
              <p dir="ltr" className="tabular rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 px-4 py-3 text-start text-ink-900">
                {npi}
              </p>
              <p className="text-sm text-ink-500">
                {t("fields.npi.hint")}{" "}
                <Link href="/contact" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                  {t("fields.npi.contact")}
                </Link>
              </p>
            </div>
            <Field id={fid("specialty")} label={t("fields.specialty.label")} hint={t("fields.specialty.hint")}>
              <Select id={fid("specialty")} value={draft.specialty} onChange={(e) => update({ specialty: e.target.value })} aria-describedby={`${fid("specialty")}-hint`}>
                {sortedSpecialties.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {/* Rule S16: Arabic first, English in parentheses. */}
                    {locale === "ar" ? `${s.nameAr} (${s.nameEn})` : s.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={fid("yearsInPractice")} label={opt(t("fields.years.label"))} hint={t("fields.years.hint")} error={errorText("yearsInPractice")}>
              <Input {...bind("yearsInPractice", true)} inputMode="numeric" dir="ltr" className="tabular text-start" autoComplete="off" />
            </Field>
            <Field id={fid("stateCode")} label={t("fields.state.label")}>
              <Select id={fid("stateCode")} value={draft.stateCode} onChange={(e) => update({ stateCode: e.target.value })}>
                <option value="">{t("fields.state.choose")}</option>
                {stateOptions}
              </Select>
            </Field>
            <Field id={fid("cityEn")} label={t("fields.cityEn.label")} hint={t("fields.cityEn.hint")} error={errorText("cityEn")}>
              <Input {...bind("cityEn", true)} dir="ltr" lang="en" autoComplete="off" spellCheck={false} />
            </Field>
            <Field id={fid("cityAr")} label={opt(t("fields.cityAr.label"))} hint={t("fields.cityAr.hint")} error={errorText("cityAr")}>
              <Input {...bind("cityAr", true)} dir="rtl" lang="ar" autoComplete="off" spellCheck={false} />
            </Field>
          </>
        );
      case "visits":
        return (
          <>
            <fieldset>
              <legend className={legend}>{t("fields.languages.legend")}</legend>
              <div className="mt-1.5 flex flex-col gap-2">
                <CheckCard title={tl("ar")} checked={draft.langAr} onChange={(e) => update({ langAr: e.target.checked })}>
                  <Field id={fid("dialect")} label={t("fields.languages.dialect")} hint={t("fields.languages.dialectHint")}>
                    <Select id={fid("dialect")} value={draft.dialect} onChange={(e) => update({ dialect: e.target.value })} aria-describedby={`${fid("dialect")}-hint`}>
                      <option value="">{t("fields.languages.dialectNone")}</option>
                      {DIALECTS.map((d) => (
                        <option key={d} value={d}>
                          {tl(`dialect.${d}`)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </CheckCard>
                <CheckCard title={tl("en")} checked={draft.langEn} onChange={(e) => update({ langEn: e.target.checked })} />
              </div>
            </fieldset>
            <fieldset>
              <legend className={legend}>{t("fields.visitTypes.legend")}</legend>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {(["video", "phone"] as const).map((v) => (
                  <CheckCard
                    key={v}
                    title={tcard(v)}
                    description={t(`fields.visitTypes.${v}`)}
                    checked={draft.visitTypes.includes(v)}
                    onChange={(e) =>
                      update({ visitTypes: e.target.checked ? (["video", "phone"] as const).filter((x) => x === v || draft.visitTypes.includes(x)) : draft.visitTypes.filter((x) => x !== v) })
                    }
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={legend}>{t("fields.ages.legend")}</legend>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {(["adults", "children", "allAges"] as const).map((a) => (
                  <RadioCard key={a} name="builder-ages" value={a} title={tcard(a)} checked={draft.ages === a} onChange={() => update({ ages: a })} />
                ))}
              </div>
            </fieldset>
            <div>
              <Field id={fid("feeUsd")} label={t("fields.fee.label")} hint={feeTotal ? t("fields.fee.total", { total: feeTotal }) : t("fields.fee.hint")} error={errorText("feeUsd")}>
                <div dir="ltr" className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink-700">{business.currencyPresentment}</span>
                  <Input {...bind("feeUsd", true)} inputMode="numeric" className="tabular text-start" autoComplete="off" />
                </div>
              </Field>
              <p className="mt-1 text-sm">
                <Link href="/fees" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                  {t("fields.fee.totalLink")}
                </Link>
              </p>
            </div>
            <Field id={fid("videoLink")} label={opt(t("fields.videoLink.label"))} hint={t("fields.videoLink.hint")} error={errorText("videoLink")}>
              <Input {...bind("videoLink", true)} type="url" inputMode="url" dir="ltr" className="text-start" autoComplete="off" autoCapitalize="off" spellCheck={false} />
            </Field>
          </>
        );
      case "credentials": {
        const kinds: CredentialKind[] = ["licence", "board", "other"];
        const kindLabel = (kind: CredentialKind) =>
          kind === "licence"
            ? t("files.kind.licence")
            : kind === "board"
              ? draft.boardStatus === "eligible"
                ? opt(t("files.kind.boardEligible"))
                : t("files.kind.board")
              : opt(t("files.kind.other"));
        return (
          <>
            <Field id={fid("licenceState")} label={t("fields.licenceState.label")}>
              <Select id={fid("licenceState")} value={draft.licenceState} onChange={(e) => update({ licenceState: e.target.value })}>
                <option value="">{t("fields.state.choose")}</option>
                {stateOptions}
              </Select>
            </Field>
            <Field id={fid("licenceNumber")} label={t("fields.licenceNumber.label")} hint={t("fields.licenceNumber.hint")} error={errorText("licenceNumber")}>
              <Input {...bind("licenceNumber", true)} dir="ltr" className="tabular text-start" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            </Field>
            <fieldset>
              <legend className={legend}>{t("fields.board.legend")}</legend>
              <div className="mt-1.5 flex flex-col gap-2">
                {/* Rule H8: board certified is defined in one sentence where the badge first appears; rule B7: eligible is text. */}
                <RadioCard
                  name="builder-board"
                  value="certified"
                  title={t("fields.board.certified")}
                  description={tcard("boardCertifiedHint")}
                  checked={draft.boardStatus === "certified"}
                  onChange={() => setBoardStatus("certified")}
                />
                <RadioCard
                  name="builder-board"
                  value="eligible"
                  title={t("fields.board.eligible")}
                  description={t("fields.board.eligibleHint")}
                  checked={draft.boardStatus === "eligible"}
                  onChange={() => setBoardStatus("eligible")}
                />
              </div>
            </fieldset>
            {draft.boardStatus === "certified" ? (
              <Field id={fid("boardName")} label={t("fields.boardName.label")} hint={t("fields.boardName.hint")} error={errorText("boardName")}>
                <Input {...bind("boardName", true)} dir="ltr" lang="en" className="text-start" autoComplete="off" spellCheck={false} />
              </Field>
            ) : null}
            <fieldset>
              <legend className={legend}>{t("files.legend")}</legend>
              <p id="builder-files-hint" className="mt-0.5 text-sm text-ink-500">
                {t("files.hint", { max: n(business.credentialMaxMb) })}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {kinds.map((kind) => {
                  const list = draft.files.filter((f) => f.kind === kind);
                  const key = `file.${kind}` as const;
                  return (
                    <div key={kind} className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ink-900">{kindLabel(kind)}</p>
                        {filesLocked ? null : (
                          <FilePick
                            id={fid(key)}
                            label={t("files.choose")}
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={onFile(kind)}
                            describedBy={errors[key] ? `${fid(key)}-error` : "builder-files-hint"}
                          />
                        )}
                      </div>
                      {list.length ? (
                        <ul className="mt-2 divide-y divide-sand-200">
                          {list.map((f) => (
                            <li key={f.id} className="py-2">
                              <div className="flex items-start gap-2">
                                {/* The file name gets its own line (long names wrap anywhere); size and status sit under it. */}
                                <div className="min-w-0 flex-1">
                                  <bdi className="block break-all text-ink-900">{f.name}</bdi>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="tabular text-sm text-ink-500">{t("files.size", { size: mb(f.sizeBytes) })}</span>
                                    <Badge tone={f.status === "verified" ? "verified" : f.status === "rejected" ? "danger" : "pending"}>
                                      {t(`files.status.${f.status}`)}
                                    </Badge>
                                  </div>
                                </div>
                                {!filesLocked && f.status !== "verified" ? (
                                  <Button type="button" variant="ghost" onClick={() => removeFile(f.id, kind)} aria-label={t("files.remove", { name: f.name })}>
                                    <CloseIcon className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
                              {f.status === "rejected" && rejection ? (
                                <p lang={rejection.reasonLang} className="mt-1 text-sm text-danger">
                                  {rejection.reason}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-ink-500">{t("files.none")}</p>
                      )}
                      {fieldError(key)}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </>
        );
      }
      case "training":
        return (
          <>
            <Field id={fid("medicalSchool")} label={opt(t("fields.school.label"))} error={errorText("medicalSchool")}>
              <Input {...bind("medicalSchool", false)} dir="auto" className="text-start" autoComplete="off" spellCheck={false} />
            </Field>
            <Field id={fid("graduationYear")} label={opt(t("fields.gradYear.label"))} error={errorText("graduationYear")}>
              <Input {...bind("graduationYear", false)} inputMode="numeric" dir="ltr" maxLength={4} className="tabular text-start" autoComplete="off" />
            </Field>
            <fieldset>
              <legend className={legend}>{opt(t("fields.training.legend"))}</legend>
              <p id="builder-training-hint" className="mt-0.5 text-sm text-ink-500">
                {t("fields.training.hint")}
              </p>
              {draft.training.length ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {draft.training.map((line, i) => {
                    const key = `training.${i}` as const;
                    return (
                      <li key={i}>
                        <div className="flex items-start gap-2">
                          <Input
                            id={fid(key)}
                            value={line}
                            dir="auto"
                            className="text-start"
                            aria-label={t("fields.training.line", { n: n(i + 1) })}
                            aria-describedby={errors[key] ? `${fid(key)}-error` : "builder-training-hint"}
                            invalid={Boolean(errors[key])}
                            onChange={(e) => setTraining(i, e.target.value)}
                            onBlur={() => setError(key, validateTrainingLine(line))}
                          />
                          <Button type="button" variant="ghost" className="shrink-0" onClick={() => removeTraining(i)} aria-label={t("fields.training.remove", { n: n(i + 1) })}>
                            <CloseIcon className="size-4" />
                          </Button>
                        </div>
                        {fieldError(key)}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {draft.training.length < LIMITS.trainingLinesMax ? (
                <Button id="builder-training-add" type="button" variant="secondary" className="mt-2" onClick={addTraining}>
                  {t("fields.training.add")}
                </Button>
              ) : null}
            </fieldset>
            <div>
              <Field id={fid("bioEn")} label={opt(t("fields.bioEn.label"))} hint={t("fields.bioEn.hint")} error={errorText("bioEn")}>
                <Textarea {...bind("bioEn", true)} dir="ltr" lang="en" rows={4} className="text-start" />
              </Field>
              <p className="tabular mt-1 text-xs text-ink-500">{t("fields.count", { count: n(draft.bioEn.trim().length), max: n(LIMITS.bioMax) })}</p>
            </div>
            <div>
              <Field id={fid("bioAr")} label={opt(t("fields.bioAr.label"))} hint={t("fields.bioAr.hint")} error={errorText("bioAr")}>
                <Textarea {...bind("bioAr", true)} dir="rtl" lang="ar" rows={4} className="text-start" />
              </Field>
              <p className="tabular mt-1 text-xs text-ink-500">{t("fields.count", { count: n(draft.bioAr.trim().length), max: n(LIMITS.bioMax) })}</p>
            </div>
          </>
        );
      case "expertise":
        return (
          <>
            <div>
              <Field id="builder-tag" label={opt(t("fields.tags.label"))} hint={t("fields.tags.hint", { max: n(LIMITS.tagMaxChars) })} error={errorText("tag")}>
                <div className="flex items-start gap-2">
                  <Input
                    id="builder-tag"
                    value={tagInput}
                    dir="auto"
                    className="text-start"
                    invalid={Boolean(errors.tag)}
                    aria-describedby={errors.tag ? "builder-tag-error" : "builder-tag-hint"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTagInput(value);
                      if (errors.tag) setError("tag", value.trim() ? validateTag(value, draft.tags) : undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" className="shrink-0" onClick={addTag}>
                    {t("fields.tags.add")}
                  </Button>
                </div>
              </Field>
              <p aria-live="polite" className="tabular mt-2 text-sm font-semibold text-ink-700">
                {t("fields.tags.count", { count: n(draft.tags.length), max: n(LIMITS.tagsMax) })}
              </p>
              {draft.tags.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {draft.tags.map((tag) => (
                    <li key={tag}>
                      <Tag>
                        <bdi>{tag}</bdi>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={t("fields.tags.remove", { tag })}
                          className="-me-2 ms-1 inline-flex size-6 items-center justify-center rounded-full hover:bg-white"
                        >
                          <CloseIcon className="size-3" />
                        </button>
                      </Tag>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-500">{t("fields.tags.empty")}</p>
              )}
            </div>
            {/* Rule B6: Accepting new patients stays off until weekly hours are published (screen 30). */}
            <div className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{t("fields.availability.title")}</p>
                <Badge tone={bookable ? "success" : "pending"}>{bookable ? t("fields.availability.on") : t("fields.availability.off")}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-700">{bookable ? t("fields.availability.onBody") : t("fields.availability.offBody")}</p>
              <LinkButton href="/professional/availability" variant="secondary" className="mt-3">
                {t("fields.availability.link")}
              </LinkButton>
            </div>
          </>
        );
    }
  };

  /* ---------- banner ---------- */
  const bannerTone =
    stage === "rejected" ? "border border-danger/40 bg-white" : verified ? "bg-lagoon-100 text-lagoon-900" : "bg-sky-100 text-sea-900";
  const banner = (
    <section id="builder-banner" aria-labelledby="builder-banner-title" className={["scroll-mt-64 rounded-[var(--radius-card)] p-4 sm:p-5 xl:scroll-mt-24", bannerTone].join(" ")}>
      <h2 id="builder-banner-title" tabIndex={-1} className={["text-lg font-bold outline-none", stage === "rejected" ? "text-danger" : "text-sea-900"].join(" ")}>
        {stage === "submitted"
          ? t("banner.submitted.title", { date: submittedLabel ?? "" })
          : stage === "rejected"
            ? t(`banner.rejected.title.${rejection?.kind ?? "other"}`)
            : t(`banner.${stage}.title`)}
      </h2>
      {stage === "rejected" ? (
        <>
          <p className="mt-1 text-sm text-ink-700">{t("banner.rejected.reviewed", { date: dates.decided ?? "" })}</p>
          {rejection ? (
            <blockquote lang={rejection.reasonLang} className="mt-2 border-s-4 border-danger/60 ps-3 text-ink-900">
              {rejection.reason}
            </blockquote>
          ) : null}
          <p className="mt-2 text-sm text-ink-700">{t("banner.rejected.after")}</p>
          <Button type="button" className="mt-3" onClick={() => goTo("credentials", fid(`file.${rejection?.kind ?? "licence"}`))}>
            {t("banner.rejected.action")}
          </Button>
        </>
      ) : (
        <p className="mt-1 text-ink-700">{t(`banner.${stage}.body`)}</p>
      )}
      {stage === "live" ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <LinkButton href="/professional/availability">{t("banner.live.availability")}</LinkButton>
          </li>
          <li>
            <LinkButton href="/professional/card" variant="secondary">
              {t("banner.live.card")}
            </LinkButton>
          </li>
          <li>
            <LinkButton href="/professional/payouts" variant="secondary">
              {t("banner.live.payouts")}
            </LinkButton>
          </li>
        </ul>
      ) : null}
      {verified && publicHref ? (
        <Link href={publicHref} className="mt-3 inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-2 hover:underline">
          {t(`banner.${stage === "live" ? "live" : "editing"}.view`)}
        </Link>
      ) : null}
    </section>
  );

  /* ---------- final action under the checklist ---------- */
  const blockedCount = requiredLeft;
  const finalAction = verified ? (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="lg" onClick={saveChanges} disabled={saving}>
        {saving ? t("actions.saving") : t("checklist.saveChanges")}
      </Button>
      <p aria-live="polite" className={["text-sm", finalState === "failed" ? "text-danger" : "text-ink-700"].join(" ")}>
        {finalState === "saved" ? t("checklist.changesSaved") : finalState === "failed" ? t("checklist.submitFailed") : null}
      </p>
    </div>
  ) : stage === "submitted" ? (
    <div className="flex flex-col items-start gap-2">
      <Badge tone="info">{t("stage.submitted")}</Badge>
      <p className="text-sm text-ink-700">{t("checklist.submitted", { date: submittedLabel ?? "" })}</p>
    </div>
  ) : (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" size="lg" onClick={submit} disabled={blockedCount > 0 || submitting} aria-describedby="builder-submit-note" className="w-full sm:w-auto">
        {submitting ? t("checklist.submitting") : stage === "rejected" ? t("checklist.resubmit") : t("checklist.submit")}
      </Button>
      <p id="builder-submit-note" aria-live="polite" className={["text-sm", finalState === "failed" ? "text-danger" : blockedCount ? "font-medium text-gold-700" : "text-ink-700"].join(" ")}>
        {finalState === "failed"
          ? t("checklist.submitFailed")
          : blockedCount
            ? t("checklist.blocked", { count: blockedCount, countLabel: n(blockedCount) })
            : t("checklist.ready")}
      </p>
    </div>
  );

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start xl:gap-8">
      <div className="min-w-0">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
            <Badge tone={STAGE_TONE[stage]}>{t(`stage.${stage}`)}</Badge>
          </div>
          {/* On phone the mini card right below says the same thing, so the photo step stays in the first screen. */}
          <p className="mt-1 hidden text-ink-700 sm:block">{t("lead")}</p>
          {/* Endowed progress (rule B3): opens part-filled from the registry and says how much is left to submit. */}
          <div className="mt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="tabular font-semibold text-ink-900">{t("progress", { done: n(done), total: n(total) })}</span>
              {verified || stage === "submitted" ? null : (
                <span className={requiredLeft ? "font-medium text-gold-700" : "text-ink-700"}>
                  {t("progressLeft", { count: requiredLeft, countLabel: n(requiredLeft) })}
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-label={t("progressLabel")}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-valuetext={t("progress", { done: n(done), total: n(total) })}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-200"
            >
              <div className="h-full rounded-full bg-lagoon-600 transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <p aria-live="polite" className="mt-1 text-sm text-ink-700 empty:hidden">
              {saveState === "saved" ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-3.5 text-success" />
                  {t("actions.saved")}
                </span>
              ) : null}
            </p>
          </div>
        </header>

        {/* Phone and tablet: the mini card stays in view while the form scrolls; tap it for the full card, both sides. */}
        <div className="sticky top-16 z-10 -mx-4 mt-2 border-b border-sand-200 bg-sand-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 xl:hidden">
          <div className="flex items-stretch gap-2">
            <div className="relative min-w-0 flex-1">
              <PreviewScope locale={previewLocale} messages={previewMessages} timeZone={timeZone}>
                <PreviewCard doctor={doctor} timeZone={timeZone} size="mini" side="front" />
              </PreviewScope>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={openCard}
                className="absolute inset-0 z-[1] max-w-xs cursor-pointer rounded-[var(--radius-card)]"
              />
            </div>
            <div className="flex w-[4.75rem] shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={openCard}
                aria-haspopup="dialog"
                aria-label={t("preview.openCardLabel")}
                className="flex flex-1 items-center justify-center rounded-[var(--radius-field)] border border-sea-700 bg-white px-1 text-center text-xs font-semibold leading-tight text-sea-700 hover:bg-sea-100"
              >
                {t("preview.openCard")}
              </button>
              <button
                type="button"
                lang={otherLocale}
                onClick={() => setPreviewLocale(otherLocale)}
                aria-label={t("preview.switchTo", { language: otherLocale === "ar" ? tc("arabic") : tc("english") })}
                className="flex flex-1 items-center justify-center rounded-[var(--radius-field)] bg-sand-200/70 px-1 text-center text-xs font-semibold leading-tight text-sea-900 hover:bg-sand-200"
              >
                {otherLocale === "ar" ? tc("arabic") : tc("english")}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">{banner}</div>

        <div className="mt-5">
          <ol aria-label={t("steps.label")} className="flex flex-col gap-3">
            {STEPS.map((step, i) => {
              const isOpen = open === step;
              const needed = neededIn(step);
              const complete = stepDone(step);
              const status = complete ? t("steps.status.done") : needed ? t("steps.status.needed", { count: needed, countLabel: n(needed) }) : t("steps.status.later");
              const showCoach = props.coach && isOpen && coach.seen !== null && !coach.seen.includes(step);
              const prev = STEPS[i - 1];
              const last = i === STEPS.length - 1;
              return (
                <li
                  key={step}
                  id={`step-${step}`}
                  className={[
                    "scroll-mt-64 rounded-[var(--radius-card)] border bg-white transition-shadow xl:scroll-mt-24",
                    isOpen ? "border-sea-700 shadow-[var(--shadow-card)]" : "border-sand-200",
                  ].join(" ")}
                >
                  <h2 className="text-lg font-bold">
                    <button
                      type="button"
                      id={`step-${step}-toggle`}
                      aria-expanded={isOpen}
                      aria-controls={`step-${step}-body`}
                      aria-current={isOpen ? "step" : undefined}
                      onClick={() => setOpen((o) => (o === step ? null : step))}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] p-4 text-start sm:px-5"
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "tabular inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          complete ? "bg-lagoon-100 text-lagoon-900" : isOpen ? "bg-sea-700 text-white" : "bg-sand-100 text-ink-700",
                        ].join(" ")}
                      >
                        {complete ? <CheckIcon className="size-4" /> : n(i + 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink-500">{t("steps.stepOf", { step: n(i + 1), total: n(STEPS.length) })}</span>
                        <span className="block leading-snug text-sea-900">{t(`steps.${step}`)}</span>
                        <span className={["block text-sm font-medium", needed ? "text-gold-700" : "text-ink-500"].join(" ")}>{status}</span>
                      </span>
                      <ChevronDown className={["size-5 shrink-0 text-sea-700 transition-transform", isOpen ? "rotate-180" : ""].join(" ")} />
                    </button>
                  </h2>
                  {isOpen ? (
                    <form
                      id={`step-${step}-body`}
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveStep(step);
                      }}
                      className="border-t border-sand-200 px-4 pb-5 pt-4 sm:px-5"
                    >
                      {showCoach ? (
                        <div className="mb-5">
                          <CoachMark
                            title={t(`coach.${step}.title`)}
                            body={t(`coach.${step}.body`, { max: n(LIMITS.tagsMax) })}
                            action={
                              <button
                                type="button"
                                onClick={() => coach.dismiss(step)}
                                className="inline-flex min-h-10 items-center rounded-[var(--radius-field)] bg-white px-4 text-sm font-semibold text-sea-900 hover:bg-sand-100"
                              >
                                {t("coach.dismiss")}
                              </button>
                            }
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-5">{stepBody(step)}</div>
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-sand-200 pt-4">
                        <Button type="submit" disabled={saving}>
                          {saving ? t("actions.saving") : last ? t("actions.finish") : t("actions.continue")}
                        </Button>
                        {prev ? (
                          <Button type="button" variant="ghost" onClick={() => goTo(prev)}>
                            {t("actions.back")}
                          </Button>
                        ) : null}
                        <p aria-live="polite" className={["w-full text-sm", saveState === "failed" || saveState === "invalid" ? "text-danger" : "text-ink-700"].join(" ")}>
                          {saveState === "failed" ? t("actions.saveFailed") : saveState === "invalid" ? t("actions.fixErrors") : null}
                        </p>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-5">
          <Checklist stage={stage} missing={missing} registryKeys={stage === "registry" ? registryKeys : []} onGo={(step) => goTo(step)} action={finalAction} />
        </div>
      </div>

      {/* Desktop: the full card pinned at the end side while the form scrolls (mirrors in RTL with the grid). */}
      <aside aria-labelledby="builder-preview-title" className="hidden xl:sticky xl:top-24 xl:block">
        <PreviewPanel idPrefix="builder-preview" heading {...panelProps} />
      </aside>

      <dialog
        ref={dialogRef}
        aria-labelledby="builder-card-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCard();
        }}
        className="inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[var(--radius-card)] bg-sand-50 p-0 text-ink-900 shadow-[var(--shadow-card)] backdrop:bg-sea-900/40"
      >
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="builder-card-dialog-title" className="text-lg font-bold text-sea-900">
              {t("preview.dialogTitle")}
            </h2>
            <Button type="button" variant="ghost" onClick={closeCard}>
              {tc("close")}
            </Button>
          </div>
          <PreviewPanel idPrefix="builder-dialog" {...panelProps} />
        </div>
      </dialog>
    </div>
  );
}
