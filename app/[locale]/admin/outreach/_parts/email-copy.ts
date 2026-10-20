// The claim email in one language, built on the server for the preview (screen 46) whatever language the admin page is in.
// One layout (screen 49's call): headline, the admin's personal line, why we wrote, the registry facts as the key block, what
// claiming gives and that patients will see the profile (rule U6), one button, when the link stops working in the doctor's
// own zone (rule E2), then the remove, why-you-got-this and opt-out lines and the footer address (rule H9). The subject says
// what it is and the preheader carries real information (rule E1).
import { getTranslations } from "next-intl/server";
import { formatDate, formatTimeInZone, type Locale } from "@/lib/format";
import { doctorTimeZone, sampleAdmin, type SampleDoctor } from "@/lib/sample";
import { dateAndTime } from "./outreach";
import type { ClaimEmailCopy } from "./types";

export async function claimEmailCopy(lang: Locale, doctor: SampleDoctor, expiresAt: Date): Promise<ClaimEmailCopy> {
  const t = await getTranslations({ locale: lang, namespace: "adminOutreach.email" });
  const tf = await getTranslations({ locale: lang, namespace: "footer" });
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
