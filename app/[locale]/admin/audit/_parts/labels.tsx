// How screen 47 names things: actors, targets and stored values, in the page locale. Values keep their stored form where it is
// data (ids, registry names, text typed in one script) and read through copy or lib/format where it is a code or a number.
import type { ReactNode } from "react";
import { AUDIT_ENUM_KINDS, type AuditEnumKind, type AuditValue, type AuditValueKind } from "@/lib/audit";
import { formatDate, formatMoney, formatNumber, type Locale } from "@/lib/format";
import { auditActorById, doctorById, sampleSpecialties, type SampleAuditEntry } from "@/lib/sample";

export type T = (key: string, values?: Record<string, string | number>) => string;

/** A Latin zone label inside an Arabic sentence, isolated LTR so "(GMT+3)" keeps its parentheses (rule R3, lib/format). */
export const isolatedZone = (zone: string, locale: Locale) => (locale === "ar" ? `⁦${zone}⁩` : zone);

export function doctorName(id: string, locale: Locale): string | undefined {
  const d = doctorById(id);
  return d ? (locale === "ar" ? d.nameAr : d.nameEn) : undefined;
}

/** Admins and patients by first name, professionals by their listed name, system actors by what they are. */
export function actorName(id: string, locale: Locale, t: T): string {
  const a = auditActorById(id);
  if (!a) return id;
  if (a.kind === "system") return t(`systemActors.${id}`);
  if (a.kind === "professional") return doctorName(id, locale) ?? id;
  return (locale === "ar" ? a.firstNameAr : a.firstNameEn) ?? id;
}

export function actorRole(id: string, t: T): string {
  return t(`roles.${auditActorById(id)?.kind ?? "system"}`);
}

/**
 * The record an entry is about. A professional no longer listed (removed) shows its id only: the name went with the profile.
 * Null when the type says it all (the audit log itself).
 */
export function targetName(target: SampleAuditEntry["target"], locale: Locale, t: T): ReactNode | null {
  switch (target.type) {
    case "professional": {
      const name = doctorName(target.id, locale);
      if (name) return name;
      return (
        <>
          <span className="ltr-run">{target.id}</span> {t("removedSuffix")}
        </>
      );
    }
    case "specialty": {
      const s = sampleSpecialties.find((x) => x.slug === target.id);
      return s ? (locale === "ar" ? s.nameAr : s.nameEn) : <span className="ltr-run">{target.id}</span>;
    }
    case "adminAccount":
      return actorName(target.id, locale, t);
    case "auditLog":
      return null;
    default:
      return <span className="ltr-run">{target.id}</span>;
  }
}

const isEnumKind = (kind: AuditValueKind): kind is AuditEnumKind => (AUDIT_ENUM_KINDS as readonly string[]).includes(kind);

/** One stored value, formatted by its kind. Null reads as "Not set", never as a blank cell. */
export function AuditValueView({
  kind,
  value,
  currency,
  lang,
  locale,
  t,
}: {
  kind: AuditValueKind;
  value: AuditValue;
  currency?: string;
  lang?: "ar" | "en";
  locale: Locale;
  t: T;
}) {
  if (value === null) return <span className="text-ink-500">{t("values.notSet")}</span>;
  if (isEnumKind(kind)) return <>{t(`values.${kind}.${value}`)}</>;
  switch (kind) {
    case "count":
      return <span className="tabular">{formatNumber(Number(value), locale)}</span>;
    case "money":
      return <span className="tabular whitespace-nowrap">{formatMoney(Number(value), currency ?? "USD", locale)}</span>;
    case "date":
      // A calendar date, not an instant: format it in UTC so no zone moves it to the day before.
      return <>{formatDate(new Date(`${value}T00:00:00Z`), "UTC", locale)}</>;
    case "code":
      return <span className="ltr-run break-all">{String(value)}</span>;
    default:
      // Text typed in one script keeps its own direction inside either page (rule R4).
      return (
        <span lang={lang} dir="auto">
          {String(value)}
        </span>
      );
  }
}
