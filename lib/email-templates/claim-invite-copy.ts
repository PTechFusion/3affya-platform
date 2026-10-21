// The claim email in one language: the one claim-invite copy. Screen 46 (admin outreach) builds its preview from it, whatever
// language the admin page is in, and the invite template (invite.ts, screen 49) renders and sends the same lines, so there is
// no second claim-invite email. Moved here from app/[locale]/admin/outreach/_parts/email-copy.ts (PLAYBOOK §9).
// One layout (screen 49's call): headline, the admin's personal line, why we wrote, the registry facts as the key block, what
// claiming gives and that patients will see the profile (rule U6), one button, when the link stops working in the doctor's
// own zone (rule E2), then the remove, why-you-got-this and opt-out lines and the footer address (rule H9). The subject says
// what it is and the preheader carries real information (rule E1). The keys stay under adminOutreach.email, where screen 46
// has always read them.
import { formatDate, formatTimeInZone, type Locale } from "@/lib/format";
import { doctorTimeZone, sampleAdmin, type SampleDoctor } from "@/lib/sample";
import { translator } from "./messages";

/**
 * One language of the claim email, every line already filled in except the admin's personal line and the To address. Screen
 * 46 declares the same shape in its _parts/types.ts; it moves to an import of this one when that page is next touched.
 */
export type ClaimEmailCopy = {
  lang: "ar" | "en";
  fromName: string;
  subject: string;
  preheader: string;
  headline: string;
  noteFrom: string;
  intro: string;
  factsTitle: string;
  facts: Array<{ label: string; value: string; ltr?: boolean }>;
  gives: string;
  scrutiny: string;
  button: string;
  expiry: string;
  notMe: string;
  why: string;
  optOut: string;
  entity: string;
  address: string;
};

/** Joins a date and a clock time: the Arabic comma in Arabic, a Latin comma in English (as screen 46's outreach.ts does). */
const dateAndTime = (date: string, time: string, loc: Locale) => `${date}${loc === "ar" ? "، " : ", "}${time}`;

export function claimEmailCopy(lang: Locale, doctor: SampleDoctor, expiresAt: Date): ClaimEmailCopy {
  const t = translator(lang, "adminOutreach.email");
  const tf = translator(lang, "footer");
  const ar = lang === "ar";
  const name = ar ? doctor.nameAr : doctor.nameEn;
  const zone = doctorTimeZone(doctor);
  const expires = dateAndTime(formatDate(expiresAt, zone, lang), formatTimeInZone(expiresAt, zone, lang), lang);
  return {
    lang,
    fromName: t("fromName"),
    subject: t("subject", { name }),
    preheader: t("preheader"),
    headline: t("headline", { name }),
    noteFrom: t("noteFrom", { admin: ar ? sampleAdmin.nameAr : sampleAdmin.nameEn }),
    intro: t("intro"),
    factsTitle: t("factsTitle"),
    facts: [
      { label: t("facts.name"), value: name },
      { label: t("facts.specialty"), value: ar ? doctor.specialtyAr : doctor.specialtyEn },
      { label: t("facts.city"), value: ar ? doctor.cityAr : doctor.cityEn },
      { label: t("facts.npi"), value: doctor.npi, ltr: true },
    ],
    gives: t("gives"),
    scrutiny: t("scrutiny"),
    button: t("button"),
    expiry: t("expiry", { expires }),
    notMe: t("notMe"),
    why: t("why"),
    optOut: t("optOut"),
    entity: tf("entity"),
    address: tf("address"),
  };
}
