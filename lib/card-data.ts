// The one mapping from a doctor row to DoctorCardData (rules C1, C5) and the prototype's sample clock. Nothing here imports
// sample data, so a client component (the profile builder's live card) can map a draft without shipping the sample JSON to
// the browser. Pages import both through lib/sample.ts, which re-exports them.
import type { DoctorCardData } from "@/components/brand/DoctorCard";
import type { SampleDoctor } from "@/lib/sample";
import { formatDate, formatMoney, formatTimeInZone, type Locale } from "@/lib/format";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";

// Prototype only: sample slots were authored for 10 to 23 Nov 2026. Every instant is shifted so the first authored day is
// always tomorrow, so "next available" and "within 72 h" stay meaningful whenever the prototype is opened. Gone with task 1.5.
const SAMPLE_ANCHOR_UTC = Date.UTC(2026, 10, 9);
export function sampleInstant(iso: string): Date {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(Date.parse(iso) + (today - SAMPLE_ANCHOR_UTC));
}

/** Translator for the `languages` namespace: language codes and dialect names. */
export type LanguageLabels = (key: string) => string;

export function toDoctorCardData(d: SampleDoctor, locale: Locale, timeZone: string, tl: LanguageLabels): DoctorCardData {
  const languages = d.languages
    .map((l) => (l.dialect ? `${tl(l.code)} (${tl(`dialect.${l.dialect}`)})` : tl(l.code)))
    .join(locale === "ar" ? "، " : ", ");
  const next = d.nextAvailableUtc ? sampleInstant(d.nextAvailableUtc) : undefined;
  return {
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    specialtyEn: d.specialtyEn,
    specialtyAr: d.specialtyAr,
    cityEn: d.cityEn,
    cityAr: d.cityAr,
    photoUrl: d.photoUrl ?? undefined,
    languages,
    visitTypes: d.visitTypes,
    ages: d.ages,
    tags: d.tags,
    trainingLines: d.training,
    yearsInPractice: d.yearsInPractice ?? undefined,
    // Rule C5: the card price is the all-in total the patient pays, never the doctor fee alone.
    feeLabel: d.feeUsdCents != null ? formatMoney(feeLines(d.feeUsdCents).totalCents, business.currencyPresentment, locale) : undefined,
    nextAvailableLabel: next ? `${formatDate(next, timeZone, locale)} · ${formatTimeInZone(next, timeZone, locale)}` : undefined,
    // verifiedOn is a calendar date, not an instant: format it in UTC so a viewer west of UTC does not see the day before.
    verifiedOnLabel: d.verifiedOn ? formatDate(new Date(`${d.verifiedOn}T00:00:00Z`), "UTC", locale) : undefined,
    boardCertified: d.boardCertified,
  };
}
