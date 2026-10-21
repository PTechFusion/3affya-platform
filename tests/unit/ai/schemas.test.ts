// lib/ai/schemas.ts: the item and page schemas refuse what they must, the enums are L1's Postgres enums, the summary entries
// are the SummaryViewer's types (compile-time), and the JSON Schema helpers give the prompt and structured outputs what they need.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import type {
  SummaryAllergy,
  SummaryCondition,
  SummaryFlag,
  SummaryMedication,
  SummaryProcedure,
  SummaryResult,
} from "@/components/brand/SummaryViewer";
import {
  AllergyEntry,
  ConditionEntry,
  FlagEntry,
  MedicationEntry,
  ModelPageOutput,
  modelJsonSchema,
  numbersIn,
  numericValue,
  PageExtraction,
  pageRef,
  parsePageRef,
  ProcedureEntry,
  RECORD_ITEM_TYPES,
  RecordItem,
  ResultEntry,
  structuredOutputSchema,
  timelineOf,
  toWesternDigits,
  UNREADABLE_REASONS,
} from "@/lib/ai/schemas";
import { item, repoPath } from "./support";

// Compile-time: a Summary's entries are the viewer's entries, so task 3.8 can store them in record_summaries.data as they are.
// `npm run typecheck` fails here if either side changes shape.
const sameShape = {
  condition: (e: z.infer<typeof ConditionEntry>): SummaryCondition => e,
  procedure: (e: z.infer<typeof ProcedureEntry>): SummaryProcedure => e,
  medication: (e: z.infer<typeof MedicationEntry>): SummaryMedication => e,
  allergy: (e: z.infer<typeof AllergyEntry>): SummaryAllergy => e,
  result: (e: z.infer<typeof ResultEntry>): SummaryResult => e,
  flag: (e: z.infer<typeof FlagEntry>): SummaryFlag => e,
};

const recordItem = (fields: Record<string, unknown> = {}) => ({ ...item(), source_page_ref: "d1:p1", ...fields });

async function postgresEnum(name: string): Promise<string[]> {
  const sql = await readFile(repoPath("supabase/migrations/20261020000100_l1_foundation.sql"), "utf8");
  const body = new RegExp(`create type public\\.${name} as enum \\(([^)]*)\\)`).exec(sql)?.[1] ?? "";
  return [...body.matchAll(/'([A-Za-z_]+)'/g)].map((m) => m[1]!);
}

describe("vocabularies", () => {
  it("RecordItem types are L1's record_item_type enum, in order", async () => {
    expect(await postgresEnum("record_item_type")).toEqual([...RECORD_ITEM_TYPES]);
  });

  it("unreadable reasons are L1's unreadable_reason enum", async () => {
    expect(await postgresEnum("unreadable_reason")).toEqual([...UNREADABLE_REASONS]);
  });

  it("summary entries have the SummaryViewer's shape", () => {
    expect(Object.keys(sameShape)).toHaveLength(6);
  });
});

describe("RecordItem", () => {
  it("accepts a typed item with its page reference", () => {
    expect(RecordItem.safeParse(recordItem()).success).toBe(true);
  });

  it.each([
    ["an unknown field", { dose_text: "500 mg" }],
    ["an unknown type", { type: "lab_value" }],
    ["a date that is not a calendar date", { date: "2026-02-30" }],
    ["a date with a time", { date: "2026-09-14T00:00:00Z" }],
    ["a page reference that is not one", { source_page_ref: "page 1" }],
    ["confidence above 1", { confidence: 1.2 }],
    ["an empty label", { label: "" }],
    ["a range in the wrong order", { ref_low: 15.5, ref_high: 12 }],
    ["a missing field", { unit: undefined }],
  ])("refuses %s", (_what, fields) => {
    expect(RecordItem.safeParse(recordItem(fields)).success).toBe(false);
  });
});

describe("PageExtraction", () => {
  const page = (fields: Record<string, unknown> = {}) => ({
    pageRef: "d1:p1",
    unreadable: false,
    unreadableReason: null,
    language: "en",
    items: [recordItem()],
    notes: null,
    ...fields,
  });

  it("accepts a page whose items point at it", () => {
    expect(PageExtraction.safeParse(page()).success).toBe(true);
  });

  it("refuses an item that points at another page", () => {
    expect(PageExtraction.safeParse(page({ items: [recordItem({ source_page_ref: "d1:p2" })] })).success).toBe(false);
  });

  it("requires exactly one unreadable item on an unreadable page", () => {
    expect(PageExtraction.safeParse(page({ unreadable: true, unreadableReason: "blurry" })).success).toBe(false);
    const unreadable = recordItem({ type: "unreadable", label: "Unreadable page", value: null, unit: null, ref_low: null, ref_high: null });
    expect(PageExtraction.safeParse(page({ unreadable: true, unreadableReason: "blurry", items: [unreadable] })).success).toBe(true);
  });

  it("allows a reason only on an unreadable page", () => {
    expect(PageExtraction.safeParse(page({ unreadableReason: "cutOff" })).success).toBe(false);
    expect(ModelPageOutput.safeParse({ unreadable: false, unreadable_reason: "blurry", language: "en", items: [], notes: null }).success).toBe(false);
  });
});

describe("page references", () => {
  it("round-trip and refuse anything that could carry document text", () => {
    expect(pageRef("d1", 2)).toBe("d1:p2");
    expect(parsePageRef("file_7:p12")).toEqual({ doc: "file_7", page: 12 });
    expect(parsePageRef("d1:p0")).toBeNull();
    expect(parsePageRef("lab report:p1")).toBeNull();
    expect(() => pageRef("a/b", 1)).toThrow();
  });
});

describe("digits and numbers", () => {
  it("writes Arabic-Indic and Extended Arabic-Indic digits and separators as Western", () => {
    expect(toWesternDigits("٥٠٠ ملغ")).toBe("500 ملغ");
    expect(toWesternDigits("١٣٫١")).toBe("13.1");
    expect(toWesternDigits("۵۰٬۰۰۰")).toBe("50,000");
    expect(toWesternDigits("142/90")).toBe("142/90");
  });

  it("reads a plain number with its printed decimals", () => {
    expect(numericValue("12.0")).toEqual({ amount: 12, decimals: 1 });
    expect(numericValue("١٣٫١")).toEqual({ amount: 13.1, decimals: 1 });
    expect(numericValue("142/90")).toBeNull();
    expect(numericValue("Positive")).toBeNull();
    expect(numbersIn("500 mg twice daily")).toEqual([{ amount: 500, decimals: 0 }]);
    expect(numbersIn("142/90")).toEqual([
      { amount: 142, decimals: 0 },
      { amount: 90, decimals: 0 },
    ]);
  });

  it("reads a leading sign and grouped thousands as printed, but not the dash of a range or a word", () => {
    expect(numbersIn("-2.5")).toEqual([{ amount: -2.5, decimals: 1 }]);
    expect(numbersIn("T-score −2.5")).toEqual([{ amount: -2.5, decimals: 1 }]);
    expect(numbersIn("+2")).toEqual([{ amount: 2, decimals: 0 }]);
    expect(numbersIn("4.0-11.0")).toEqual([
      { amount: 4, decimals: 1 },
      { amount: 11, decimals: 1 },
    ]);
    expect(numbersIn("50,000 IU")).toEqual([{ amount: 50_000, decimals: 0 }]);
    expect(numbersIn("٥٠٬٠٠٠ وحدة")).toEqual([{ amount: 50_000, decimals: 0 }]);
    expect(numbersIn("1,250,000.5")).toEqual([{ amount: 1_250_000.5, decimals: 1 }]);
    expect(numbersIn("1,2")).toEqual([
      { amount: 1, decimals: 0 },
      { amount: 2, decimals: 0 },
    ]);
  });
});

describe("timelineOf", () => {
  it("lists dated conditions, procedures and results, newest first, and leaves undated entries out", () => {
    const src = [{ doc: "d1", page: 1 }];
    const timeline = timelineOf({
      conditions: [
        { nameEn: "Asthma", nameAr: "الربو", notedOn: null, sources: src },
        { nameEn: "Diabetes", nameAr: "السكري", notedOn: "2026-08-02", sources: src },
      ],
      procedures: [{ nameEn: "Chest X-ray", nameAr: "أشعة الصدر", doneOn: "2026-08-02", sources: src }],
      medications: [],
      allergies: [],
      results: [{ nameEn: "CRP", nameAr: "البروتين التفاعلي", value: 86, decimals: 0, unit: "mg/L", low: 0, high: 5, takenOn: "2026-09-01", sources: src }],
    });
    expect(timeline.map((e) => `${e.date} ${e.kind} ${e.nameEn}`)).toEqual([
      "2026-09-01 result CRP",
      "2026-08-02 condition Diabetes",
      "2026-08-02 procedure Chest X-ray",
    ]);
  });
});

describe("JSON Schema", () => {
  it("states every field of the page output for the prompt, closed objects and all", () => {
    const schema = modelJsonSchema(ModelPageOutput) as { properties: Record<string, unknown>; required: string[]; additionalProperties: boolean };
    expect(Object.keys(schema.properties).sort()).toEqual(["items", "language", "notes", "unreadable", "unreadable_reason"]);
    expect(schema.required.sort()).toEqual(["items", "language", "notes", "unreadable", "unreadable_reason"]);
    expect(schema.additionalProperties).toBe(false);
    expect(JSON.stringify(schema)).toContain('"enum":["condition","medication"');
  });

  it("drops the keywords structured outputs refuse and closes every object", () => {
    const text = JSON.stringify(structuredOutputSchema(ModelPageOutput));
    expect(text).not.toMatch(/"(minLength|maxLength|pattern|minimum|maximum|maxItems|minItems|format)"/);
    const objects = [...text.matchAll(/"type":"object"/g)].length;
    expect([...text.matchAll(/"additionalProperties":false/g)].length).toBe(objects);
  });
});
