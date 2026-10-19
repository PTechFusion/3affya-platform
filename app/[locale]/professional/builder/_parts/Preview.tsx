"use client";
// The live preview (rules B4 B5 R4): the one DoctorCard, fed by toDoctorCardData from the draft on every keystroke, rendered in
// the preview language (Arabic or English) whatever the page language. The card sits inside its own next-intl provider with
// that locale's card, common and language strings, and a dir/lang wrapper, so it is exactly the card a patient reading that
// language sees. Prompts to add the Arabic name or a bio in the preview language sit under the card, never on it, so the card
// stays identical to the public one.
import type { ReactNode } from "react";
import { NextIntlClientProvider, useLocale, useTranslations, type AbstractIntlMessages } from "next-intl";
import { DoctorCard, type DoctorCardState } from "@/components/brand/DoctorCard";
import { Button, SegmentedControl } from "@/components/ui";
// The mapping comes from lib/card-data (re-exported by lib/sample) so the sample JSON never ships to the browser.
import { toDoctorCardData } from "@/lib/card-data";
import type { SampleDoctor, SampleSpecialty, UsState } from "@/lib/sample";
import type { Locale } from "@/lib/format";
import { boardIsNamed, digitsOnly, type Draft, type StepId } from "./model";

export type PreviewMode = "review" | "verified";
export type PreviewMessages = Record<Locale, AbstractIntlMessages>;

/** The draft as the sample row the card mapping reads. Empty Arabic fields fall back to English rather than a blank card. */
export function draftToDoctor(
  base: SampleDoctor,
  draft: Draft,
  state: DoctorCardState,
  specialties: SampleSpecialty[],
  states: UsState[],
): SampleDoctor {
  const specialty = specialties.find((s) => s.slug === draft.specialty);
  const usState = states.find((s) => s.code === draft.stateCode);
  const cityEn = draft.cityEn.trim();
  const cityAr = draft.cityAr.trim() || cityEn;
  const joinPlace = (city: string, stateName: string | undefined, sep: string) =>
    [city, stateName && stateName !== city ? stateName : ""].filter(Boolean).join(sep);
  const fee = digitsOnly(draft.feeUsd);
  const years = digitsOnly(draft.yearsInPractice);
  return {
    ...base,
    state,
    nameEn: draft.nameEn.trim() || base.nameEn,
    nameAr: draft.nameAr.trim() || draft.nameEn.trim() || base.nameAr,
    specialty: draft.specialty,
    specialtyEn: specialty?.nameEn ?? base.specialtyEn,
    specialtyAr: specialty?.nameAr ?? base.specialtyAr,
    cityEn: joinPlace(cityEn, usState?.nameEn, ", "),
    cityAr: joinPlace(cityAr, usState?.nameAr, "، "),
    photoUrl: draft.photoUrl || null,
    languages: [
      ...(draft.langAr ? [{ code: "ar" as const, ...(draft.dialect ? { dialect: draft.dialect } : {}) }] : []),
      ...(draft.langEn ? [{ code: "en" as const }] : []),
    ],
    visitTypes: draft.visitTypes,
    ages: draft.ages,
    tags: draft.tags,
    training: draft.training.map((line) => line.trim()).filter(Boolean),
    yearsInPractice: /^\d+$/.test(years) && Number(years) > 0 ? Number(years) : null,
    boardCertified: draft.boardStatus === "certified" && boardIsNamed(draft.boardName),
    // Whole dollars to minor units; the card shows the all-in total from lib/fees (rule C5).
    feeUsdCents: /^\d+$/.test(fee) && Number(fee) > 0 ? Number(fee) * 100 : null,
    // A doctor not yet verified previews the verified face without a date or a next time: neither exists yet.
    verifiedOn: base.state === "verified" ? base.verifiedOn : null,
    nextAvailableUtc: base.state === "verified" ? base.nextAvailableUtc : null,
  };
}

/** A subtree rendered in another locale: its own messages, direction and language. */
export function PreviewScope({
  locale,
  messages,
  timeZone,
  className,
  children,
}: {
  locale: Locale;
  messages: PreviewMessages;
  timeZone: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone={timeZone}>
      <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={className}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

/** The card itself, inside a PreviewScope: the language labels and the locale come from the preview provider. */
export function PreviewCard({
  doctor,
  timeZone,
  size = "full",
  side,
  bookable,
  onBook,
}: {
  doctor: SampleDoctor;
  timeZone: string;
  size?: "full" | "mini";
  side?: "front" | "back";
  bookable?: boolean;
  onBook?: () => void;
}) {
  const tl = useTranslations("languages");
  const locale = useLocale() as Locale;
  return (
    <DoctorCard
      doctor={toDoctorCardData(doctor, locale, timeZone, tl)}
      state={doctor.state}
      size={size}
      side={side}
      bookable={bookable}
      onBook={onBook}
    />
  );
}

/** An "add" prompt under the card: which step and field it opens. */
export type PreviewPrompt = { key: string; label: string; body?: string; step: StepId; fieldId: string };

/** The bio in the preview language when written, otherwise the other one with its own direction (rule R4). */
export function pickBio(draft: Draft, locale: Locale): { text: string; lang: Locale } | undefined {
  const own = (locale === "ar" ? draft.bioAr : draft.bioEn).trim();
  if (own) return { text: own, lang: locale };
  const other = (locale === "ar" ? draft.bioEn : draft.bioAr).trim();
  return other ? { text: other, lang: locale === "ar" ? "en" : "ar" } : undefined;
}

export function PreviewPanel({
  idPrefix,
  heading,
  doctor,
  draft,
  previewLocale,
  onPreviewLocale,
  mode,
  onMode,
  showMode,
  messages,
  timeZone,
  prompts,
  onPrompt,
  bookable,
  bookNote,
  onBook,
}: {
  idPrefix: string;
  /** The panel's own heading; the phone dialog passes none and titles itself. */
  heading?: boolean;
  doctor: SampleDoctor;
  draft: Draft;
  previewLocale: Locale;
  onPreviewLocale: (locale: Locale) => void;
  mode: PreviewMode;
  onMode: (mode: PreviewMode) => void;
  showMode: boolean;
  messages: PreviewMessages;
  timeZone: string;
  prompts: PreviewPrompt[];
  onPrompt: (prompt: PreviewPrompt) => void;
  bookable: boolean;
  bookNote: boolean;
  onBook: () => void;
}) {
  const t = useTranslations("builder.preview");
  const tc = useTranslations("common");
  const pageLocale = useLocale() as Locale;
  const bio = pickBio(draft, previewLocale);
  return (
    <div className="flex flex-col gap-4">
      {heading ? (
        <div>
          <h2 id={`${idPrefix}-title`} className="text-lg font-bold text-sea-900">
            {t("title")}
          </h2>
          <p className="text-sm text-ink-700">{t("lead")}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-ink-700">
            {t("language")}
          </span>
          <SegmentedControl<Locale>
            label={t("language")}
            value={previewLocale}
            onChange={onPreviewLocale}
            options={[
              { value: "ar", label: tc("arabic"), lang: pageLocale === "ar" ? undefined : "ar" },
              { value: "en", label: tc("english"), lang: pageLocale === "en" ? undefined : "en" },
            ]}
          />
        </div>
        {showMode ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-ink-700">{t("mode")}</span>
            <SegmentedControl<PreviewMode>
              label={t("mode")}
              value={mode}
              onChange={onMode}
              options={[
                { value: "review", label: t("modeReview") },
                { value: "verified", label: t("modeVerified") },
              ]}
            />
          </div>
        ) : null}
      </div>

      <PreviewScope locale={previewLocale} messages={messages} timeZone={timeZone}>
        <PreviewCard doctor={doctor} timeZone={timeZone} bookable={bookable} onBook={onBook} />
      </PreviewScope>
      <p aria-live="polite" className="text-sm text-ink-700 empty:hidden">
        {bookNote ? t("bookNote") : null}
      </p>

      {prompts.length ? (
        <ul className="flex flex-col gap-2">
          {prompts.map((p) => (
            <li key={p.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[var(--radius-field)] bg-gold-100 px-3 py-2">
              {p.body ? <span className="min-w-0 flex-1 text-sm text-ink-900">{p.body}</span> : null}
              <Button type="button" variant="ghost" onClick={() => onPrompt(p)} className="ms-auto">
                {p.label}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-[var(--radius-field)] border border-sand-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink-500">{t("bioTitle")}</h3>
        {bio ? (
          // Rule R4: the bio aligns by its own language, so an English bio stays left-aligned in the Arabic preview.
          <p lang={bio.lang} dir={bio.lang === "ar" ? "rtl" : "ltr"} className="mt-1 line-clamp-5 text-start text-ink-900">
            {bio.text}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-500">{t("bioEmpty")}</p>
        )}
      </div>
    </div>
  );
}
