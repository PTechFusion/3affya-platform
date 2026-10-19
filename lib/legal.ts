// Legal pages (screen 16): the four documents, their review dates, and the loader that turns a document's messages into what
// LegalPage renders. Text lives in messages/{ar,en}.json under legal.<doc>:
//   title, metaTitle, metaDescription, summary.{1..4}, sections.<id>.{title, p1.., li1.., note?}
// p keys are paragraphs, li keys are bullet items, in message order; note is an open question shown in a callout.
// Numbers are never written into the copy: pages pass them in as formatted values (lib/format, config/business.ts).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { LegalSection } from "@/components/brand/LegalPage";
import { formatNumber, type Locale } from "@/lib/format";

export const legalDocs = ["privacy", "terms", "fees", "refunds"] as const;
export type LegalDoc = (typeof legalDocs)[number];

/** Calendar dates, YYYY-MM-DD. effectiveOn stays null until counsel approves the text (task 4.3). */
const legalDates: Record<LegalDoc, { lastReviewed: string; effectiveOn: string | null }> = {
  privacy: { lastReviewed: "2026-10-19", effectiveOn: null },
  terms: { lastReviewed: "2026-10-19", effectiveOn: null },
  fees: { lastReviewed: "2026-10-19", effectiveOn: null },
  refunds: { lastReviewed: "2026-10-19", effectiveOn: null },
};

export type LegalValues = Record<string, string | number>;

const calendar = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** A count with its unit, pluralised per locale ("24 hours", "24 ساعة"); the digits go through lib/format. */
export async function durationLabel(locale: string, unit: "hours" | "minutes" | "days", count: number): Promise<string> {
  const t = await getTranslations({ locale, namespace: "legal.units" });
  return t(unit, { count, n: formatNumber(count, locale as Locale) });
}

export async function legalMetadata(locale: string, doc: LegalDoc): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `legal.${doc}` });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Builds the props LegalPage needs for one document, minus the viewer-specific emergency number and section extras. */
export async function loadLegalDoc(locale: string, doc: LegalDoc, values: LegalValues = {}) {
  const t = await getTranslations({ locale, namespace: `legal.${doc}` });
  const tl = await getTranslations({ locale, namespace: "legal" });
  const summary = Object.keys(t.raw("summary") as Record<string, string>).map((k) => t(`summary.${k}`, values));
  const raw = t.raw("sections") as Record<string, Record<string, string>>;
  const sections: LegalSection[] = Object.entries(raw).map(([id, fields]) => ({
    id,
    title: t(`sections.${id}.title`, values),
    blocks: Object.keys(fields)
      .filter((k) => /^(p|li)\d+$/.test(k))
      .map((k) => ({ kind: k.startsWith("li") ? ("item" as const) : ("para" as const), text: t(`sections.${id}.${k}`, values) })),
    note: "note" in fields ? t(`sections.${id}.note`, values) : undefined,
  }));
  const dates = legalDates[doc];
  return {
    title: t("title"),
    summary,
    sections,
    lastReviewed: calendar(dates.lastReviewed),
    effectiveOn: dates.effectiveOn ? calendar(dates.effectiveOn) : undefined,
    draft: dates.effectiveOn === null,
    related: legalDocs.filter((d) => d !== doc).map((d) => ({ href: `/${d}`, label: tl(`${d}.title`) })),
  };
}
