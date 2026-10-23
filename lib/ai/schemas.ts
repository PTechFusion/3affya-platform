// The shapes model output must have before anything downstream reads it (CLAUDE.md: validated with zod; invalid output is a
// retry, then a failure, never a partial write). Two layers:
//   - what the model writes (ModelPageOutput, ModelSummaryOutput): snake_case JSON with every field present (null when the
//     document does not give it) and no page references of its own. The client stamps the page reference on every item, so a
//     model can never point an item at a page it did not read, and summary sources must be references it was given.
//   - what lib/ai returns (RecordItem, PageExtraction, Summary).
// Enum values are L1's Postgres enums (record_item_type, unreadable_reason); tests/unit/ai/schemas.test.ts reads the migration
// and fails if they drift. Summary entries are components/brand/SummaryViewer's types, checked at compile time in the same
// test, so the pipeline (task 3.8) can store a Summary's sections in record_summaries.data as they are.
import { z } from "zod";

/* ---------------- vocabularies ---------------- */

/** public.record_item_type (L1, supabase/migrations/20261020000100_l1_foundation.sql). */
export const RECORD_ITEM_TYPES = [
  "condition",
  "medication",
  "allergy",
  "procedure",
  "result",
  "immunization",
  "vital",
  "unreadable",
  "other",
] as const;
export const RecordItemType = z.enum(RECORD_ITEM_TYPES);
export type RecordItemType = z.infer<typeof RecordItemType>;

/** public.unreadable_reason (L1) and SummaryUnreadable.reason. */
export const UNREADABLE_REASONS = ["blurry", "handwritten", "cutOff"] as const;
export const UnreadableReason = z.enum(UNREADABLE_REASONS);

/** The language a page is written in; `none` for a page with no text (a blank or an image-only page). */
export const PAGE_LANGUAGES = ["ar", "en", "mixed", "other", "none"] as const;

/** SummaryFrequency in components/brand/SummaryViewer.tsx. */
export const MEDICATION_FREQUENCIES = ["onceDaily", "twiceDaily", "threeTimesDaily", "asNeeded"] as const;

/** A page holds at most this many items (a dense lab page lists about a hundred rows). */
export const MAX_ITEMS_PER_PAGE = 200;
/** summarise takes at most this many items in one call (task 3.8 chunks a larger set). */
export const MAX_ITEMS_PER_SUMMARY = 5_000;

/* ---------------- page references ---------------- */

// A page reference is "<document id>:p<page>", e.g. "d1:p2": the document is the set's file (its id or short id), the page
// counts from 1 within that file. Letters, digits, '_' and '-' only, so it can never carry text from a document.
export const PAGE_REF_PATTERN = /^([A-Za-z0-9_-]{1,64}):p([1-9][0-9]{0,4})$/;
export const PageRef = z.string().regex(PAGE_REF_PATTERN, "a page reference is <document id>:p<page>, e.g. d1:p2");

export function pageRef(doc: string, page: number): string {
  const ref = `${doc}:p${page}`;
  if (!PAGE_REF_PATTERN.test(ref)) throw new Error(`not a valid page reference: document "${doc}", page ${page}`);
  return ref;
}

export function parsePageRef(ref: string): { doc: string; page: number } | null {
  const match = PAGE_REF_PATTERN.exec(ref);
  return match?.[1] && match[2] ? { doc: match[1], page: Number(match[2]) } : null;
}

/* ---------------- digits and numbers ---------------- */

// Medical values use Western digits in both locales (CLAUDE.md, ADR-11). The prompt asks for them; this makes sure, before
// validation, whatever the model wrote: Arabic-Indic (U+0660..) and Extended Arabic-Indic (U+06F0..) digits, and the Arabic
// decimal and thousands separators.
export function toWesternDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/** A value that is one plain number, with the decimals it was printed with ("12.0" keeps 1). null for anything else. */
export function numericValue(value: string | null): { amount: number; decimals: number } | null {
  if (value === null) return null;
  const match = /^[-+]?(\d+)(?:\.(\d+))?$/.exec(toWesternDigits(value).trim());
  if (!match) return null;
  return { amount: Number(toWesternDigits(value).trim()), decimals: match[2]?.length ?? 0 };
}

// A number as a value prints it: a sign only where it starts the number ("-2.5", "T-score −2.5"; not the "-" of a range such
// as "4.0-11.0" or of a word), and thousands grouped with "," ("50,000", which is also what "٥٠٬٠٠٠" becomes).
const PRINTED_NUMBER = /(?:(?<![\p{L}\p{N}.)])([-+−]))?(\d{1,3}(?:,\d{3})+(?!\d)|\d+)(?:\.(\d+))?/gu;

/** Every plain number in a text ("500 mg twice daily" gives 500, "50,000 IU" 50000, "-2.5" -2.5), with its printed decimals. */
export function numbersIn(text: string | null): Array<{ amount: number; decimals: number }> {
  if (text === null) return [];
  return [...toWesternDigits(text).matchAll(PRINTED_NUMBER)].map((m) => {
    const magnitude = Number(`${(m[2] ?? "").replace(/,/g, "")}${m[3] ? `.${m[3]}` : ""}`);
    return { amount: m[1] === "-" || m[1] === "−" ? -magnitude : magnitude, decimals: m[3]?.length ?? 0 };
  });
}

/* ---------------- shared fields ---------------- */

/** A calendar date as the document prints it, YYYY-MM-DD (never an instant: no timezone applies). */
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "a date is YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "not a calendar date");

const text = (max: number) => z.string().trim().min(1).max(max);

/* ---------------- one item ---------------- */

// Matches public.record_items: label, value_text (value), unit, ref_low, ref_high, item_date (date), confidence, and the
// type-specific details (frequency for a medication, reaction for an allergy) that task 3.8 writes into record_items.details.
const itemShape = {
  type: RecordItemType,
  /** The item as the document names it, in the document's language. */
  label: text(500),
  /** The value as printed, Western digits ("13.1", "500", "Positive", "142/90"). */
  value: text(2000).nullable(),
  unit: text(40).nullable(),
  /** The date the document gives for this item, YYYY-MM-DD; null when it gives none (never inferred). */
  date: IsoDate.nullable(),
  /** The reference range the document prints next to a result or vital. */
  ref_low: z.number().finite().nullable(),
  ref_high: z.number().finite().nullable(),
  /** How often a medication is taken, as printed. */
  frequency: text(200).nullable(),
  /** An allergy's reaction, as printed. */
  reaction: text(500).nullable(),
  /** How sure the reading is (legibility), 0 to 1. Not medical certainty. */
  confidence: z.number().min(0).max(1),
};

function rangeInOrder(item: { ref_low: number | null; ref_high: number | null }, ctx: z.RefinementCtx): void {
  if (item.ref_low !== null && item.ref_high !== null && item.ref_low > item.ref_high) {
    ctx.addIssue({ code: "custom", message: "ref_low is above ref_high", path: ["ref_low"] });
  }
}

/** One item as the model writes it: no page reference (the client adds it). */
export const ModelItem = z.strictObject(itemShape).superRefine(rangeInOrder);
export type ModelItem = z.infer<typeof ModelItem>;

/** One typed item with the page it came from (task 3.9: no item without a source page). */
export const RecordItem = z.strictObject({ ...itemShape, source_page_ref: PageRef }).superRefine(rangeInOrder);
export type RecordItem = z.infer<typeof RecordItem>;

/* ---------------- one page ---------------- */

/** What the model writes for one page. */
export const ModelPageOutput = z
  .strictObject({
    /** The page's medical content cannot be read at all. Then `items` is ignored and one `unreadable` item is recorded. */
    unreadable: z.boolean(),
    unreadable_reason: UnreadableReason.nullable(),
    language: z.enum(PAGE_LANGUAGES),
    items: z.array(ModelItem).max(MAX_ITEMS_PER_PAGE),
    notes: z.string().trim().max(1000).nullable(),
  })
  .superRefine((page, ctx) => {
    if (!page.unreadable && page.unreadable_reason !== null) {
      ctx.addIssue({ code: "custom", message: "a reason only on an unreadable page", path: ["unreadable_reason"] });
    }
  });
export type ModelPageOutput = z.infer<typeof ModelPageOutput>;

/** One page's extraction, as lib/ai returns it. An unreadable page carries exactly one `unreadable` item with its reference. */
export const PageExtraction = z
  .strictObject({
    pageRef: PageRef,
    unreadable: z.boolean(),
    unreadableReason: UnreadableReason.nullable(),
    language: z.enum(PAGE_LANGUAGES),
    items: z.array(RecordItem).max(MAX_ITEMS_PER_PAGE),
    notes: z.string().max(1000).nullable(),
  })
  .superRefine((page, ctx) => {
    page.items.forEach((item, i) => {
      if (item.source_page_ref !== page.pageRef) {
        ctx.addIssue({ code: "custom", message: "every item points at the page it came from", path: ["items", i, "source_page_ref"] });
      }
    });
    if (page.unreadable && !(page.items.length === 1 && page.items[0]?.type === "unreadable")) {
      ctx.addIssue({ code: "custom", message: "an unreadable page carries exactly one unreadable item", path: ["items"] });
    }
    if (!page.unreadable && page.unreadableReason !== null) {
      ctx.addIssue({ code: "custom", message: "a reason only on an unreadable page", path: ["unreadableReason"] });
    }
  });
export type PageExtraction = z.infer<typeof PageExtraction>;

/* ---------------- the summary ---------------- */

/** SummarySourceRef: a page in one of the set's documents. */
export const SourceRef = z.strictObject({ doc: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), page: z.number().int().min(1).max(99_999) });
const sources = z.array(SourceRef).min(1).max(100);
/** In model output a source is the page reference it was given. */
const modelSources = z.array(PageRef).min(1).max(100);

const name = text(300);
const conditionShape = { nameEn: name, nameAr: name, notedOn: IsoDate.nullable() };
const procedureShape = { nameEn: name, nameAr: name, doneOn: IsoDate.nullable() };
export const Quantity = z.strictObject({ amount: z.number().finite(), decimals: z.number().int().min(0).max(6), unit: text(40) });
const medicationShape = { nameEn: name, nameAr: name, dose: Quantity.nullable(), frequency: z.enum(MEDICATION_FREQUENCIES).nullable() };
const allergyShape = { nameEn: name, nameAr: name, reactionEn: text(500).nullable(), reactionAr: text(500).nullable() };
const resultShape = {
  nameEn: name,
  nameAr: name,
  value: z.number().finite(),
  decimals: z.number().int().min(0).max(6),
  unit: text(40),
  low: z.number().finite().nullable(),
  high: z.number().finite().nullable(),
  takenOn: IsoDate,
};
const flagShape = { kind: z.enum(["missing", "conflict"]), textEn: text(1000), textAr: text(1000) };

export const ConditionEntry = z.strictObject({ ...conditionShape, sources });
export const ProcedureEntry = z.strictObject({ ...procedureShape, sources });
export const MedicationEntry = z.strictObject({ ...medicationShape, sources });
export const AllergyEntry = z.strictObject({ ...allergyShape, sources });
export const ResultEntry = z.strictObject({ ...resultShape, sources });
export const FlagEntry = z.strictObject({ ...flagShape, sources });

/** A dated entry for the timeline, built by the client from the sections (never by the model, never dated by inference). */
export const TimelineEvent = z.strictObject({
  date: IsoDate,
  kind: z.enum(["condition", "procedure", "result"]),
  nameEn: name,
  nameAr: name,
  sources,
});

export const SummarySections = z.strictObject({
  conditions: z.array(ConditionEntry),
  procedures: z.array(ProcedureEntry),
  medications: z.array(MedicationEntry),
  allergies: z.array(AllergyEntry),
  results: z.array(ResultEntry),
});

/** The set's summary: the five blocks, the flags (missing and conflicting items) and the timeline, newest first. */
export const Summary = z.strictObject({
  sections: SummarySections,
  flags: z.array(FlagEntry),
  timeline: z.array(TimelineEvent),
});
export type Summary = z.infer<typeof Summary>;
export type SummarySections = z.infer<typeof SummarySections>;
export type TimelineEvent = z.infer<typeof TimelineEvent>;

/** What the model writes for a summary: the blocks and flags, each entry citing the page references of its items. */
export const ModelSummaryOutput = z.strictObject({
  conditions: z.array(z.strictObject({ ...conditionShape, sources: modelSources })),
  procedures: z.array(z.strictObject({ ...procedureShape, sources: modelSources })),
  medications: z.array(z.strictObject({ ...medicationShape, sources: modelSources })),
  allergies: z.array(z.strictObject({ ...allergyShape, sources: modelSources })),
  results: z.array(z.strictObject({ ...resultShape, sources: modelSources })),
  flags: z.array(z.strictObject({ ...flagShape, sources: modelSources })),
});
export type ModelSummaryOutput = z.infer<typeof ModelSummaryOutput>;

export const EMPTY_SUMMARY: Summary = {
  sections: { conditions: [], procedures: [], medications: [], allergies: [], results: [] },
  flags: [],
  timeline: [],
};

/** The timeline from the sections: dated conditions, procedures and results, newest first, in that order within a day. */
export function timelineOf(sections: SummarySections): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...sections.conditions.flatMap((c) => (c.notedOn ? [{ date: c.notedOn, kind: "condition" as const, nameEn: c.nameEn, nameAr: c.nameAr, sources: c.sources }] : [])),
    ...sections.procedures.flatMap((p) => (p.doneOn ? [{ date: p.doneOn, kind: "procedure" as const, nameEn: p.nameEn, nameAr: p.nameAr, sources: p.sources }] : [])),
    ...sections.results.map((r) => ({ date: r.takenOn, kind: "result" as const, nameEn: r.nameEn, nameAr: r.nameAr, sources: r.sources })),
  ];
  const order = { condition: 0, procedure: 1, result: 2 } as const;
  return events.sort((a, b) => b.date.localeCompare(a.date) || order[a.kind] - order[b.kind]);
}

/* ---------------- JSON Schema for the prompt and for structured outputs ---------------- */

/** The JSON Schema of a model-output schema, as the prompt states it. Refinements are checked by zod, not stated here. */
export function modelJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

// Keywords structured outputs do not accept (claude-api skill, JSON Schema limitations): string, number and array bounds and
// patterns. zod still checks every one of them after the response arrives.
const UNSUPPORTED_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "format",
]);

/** The same schema reduced to what `output_config.format` accepts: no bounds or patterns, every object closed. */
export function structuredOutputSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) if (!UNSUPPORTED_KEYWORDS.has(key)) out[key] = strip(value);
    if (out.type === "object") out.additionalProperties = false;
    return out;
  };
  return strip(modelJsonSchema(schema)) as Record<string, unknown>;
}
