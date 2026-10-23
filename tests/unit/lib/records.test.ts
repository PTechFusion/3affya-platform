// lib/records.ts: the fixed nine-step pipeline (ADR-4), the per-GB quote (SI units, rule C5) and the file checks of screen 24.
import { describe, expect, it } from "vitest";
import { business, recordsLimits } from "@/config/business";
import { BYTES_PER_GB, BYTES_PER_MB, PIPELINE_STEPS, checkFile, estimateSeconds, fileKind, quoteFor, stepStates } from "@/lib/records";

const GB = BYTES_PER_GB;

describe("the pipeline is a fixed workflow", () => {
  it("has the nine steps in order", () => {
    expect(PIPELINE_STEPS).toEqual(["validate", "quote", "pay", "extract", "dedupe", "summarise", "flag", "store", "notify"]);
  });

  it("marks steps done before the current one and waiting after", () => {
    expect(stepStates("processing", "dedupe")).toEqual({
      validate: "done", quote: "done", pay: "done", extract: "done", dedupe: "current",
      summarise: "waiting", flag: "waiting", store: "waiting", notify: "waiting",
    });
  });

  it("shows a failed or stopped step where it happened, and every step done when finished", () => {
    expect(stepStates("failed", "extract").extract).toBe("failed");
    expect(stepStates("cancelled", "summarise").summarise).toBe("stopped");
    expect(Object.values(stepStates("done", null)).every((s) => s === "done")).toBe(true);
    expect(stepStates("queued", null).extract).toBe("current"); // a queued set starts at extract once paid
  });
});

describe("quoteFor", () => {
  it("uses SI units: 1 GB is 1,000 MB is 1,000,000,000 bytes", () => {
    expect(BYTES_PER_MB).toBe(1_000_000);
    expect(GB).toBe(1_000 * BYTES_PER_MB);
  });

  it("charges one block per started GB, fees included", () => {
    expect(quoteFor(0)).toEqual({ blocks: 0, totalCents: 0, roomBytes: 0 });
    expect(quoteFor(1)).toEqual({ blocks: 1, totalCents: business.recordsBlockPriceCents, roomBytes: GB - 1 });
    expect(quoteFor(GB)).toEqual({ blocks: 1, totalCents: business.recordsBlockPriceCents, roomBytes: 0 });
    expect(quoteFor(1.3 * GB)).toEqual({ blocks: 2, totalCents: 2 * business.recordsBlockPriceCents, roomBytes: 0.7 * GB });
  });

  it("quotes the draft of screen 24 (11.1 MB) as one block of USD 9.99", () => {
    expect(quoteFor(11.1 * BYTES_PER_MB).totalCents).toBe(999);
  });
});

describe("fileKind", () => {
  it.each([
    ["scan.PDF", "", "pdf"],
    ["letter.docx", "", "docx"],
    ["x-ray.jpeg", "", "jpg"],
    ["x-ray.JPG", "", "jpg"],
    ["photo.png", "", "png"],
    ["no-extension", "application/pdf", "pdf"],
    ["camera", "image/jpeg", "jpg"],
    ["old.doc", "application/msword", "other"],
    ["notes.txt", "text/plain", "other"],
  ])("%s (%s) is %s", (name, mime, kind) => {
    expect(fileKind(name, mime)).toBe(kind);
  });
});

describe("checkFile", () => {
  const ok = { name: "labs.pdf", kind: "pdf" as const, sizeBytes: 2 * BYTES_PER_MB };

  it("accepts a normal file", () => {
    expect(checkFile(ok, 0, [])).toBeNull();
  });

  it("refuses, in this order: empty, archive, type, too large, duplicate, set full", () => {
    expect(checkFile({ ...ok, sizeBytes: 0, name: "a.zip" }, 0, [])).toBe("empty");
    expect(checkFile({ ...ok, name: "records.zip", kind: "other" }, 0, [])).toBe("archive");
    expect(checkFile({ ...ok, name: "records.tar.gz", kind: "other" }, 0, [])).toBe("archive");
    expect(checkFile({ ...ok, name: "notes.txt", kind: "other" }, 0, [])).toBe("type");
    expect(checkFile({ ...ok, sizeBytes: recordsLimits.maxFileMb * BYTES_PER_MB + 1 }, 0, [])).toBe("tooLarge");
    expect(checkFile(ok, 0, [{ name: "labs.pdf", sizeBytes: ok.sizeBytes }])).toBe("duplicate");
    expect(checkFile(ok, recordsLimits.maxSetGb * GB - ok.sizeBytes + 1, [])).toBe("setFull");
  });

  it("allows a file of exactly the per-file limit, and the same name with a different size", () => {
    expect(checkFile({ ...ok, sizeBytes: recordsLimits.maxFileMb * BYTES_PER_MB }, 0, [])).toBeNull();
    expect(checkFile(ok, 0, [{ name: "labs.pdf", sizeBytes: ok.sizeBytes + 1 }])).toBeNull();
    expect(checkFile(ok, recordsLimits.maxSetGb * GB - ok.sizeBytes, [])).toBeNull();
  });
});

describe("estimateSeconds", () => {
  it("is pages times the per-page estimate plus the fixed tail", () => {
    expect(estimateSeconds(0)).toBe(recordsLimits.estimateTailSeconds);
    expect(estimateSeconds(8)).toBe(8 * recordsLimits.estimateSecondsPerPage + recordsLimits.estimateTailSeconds);
  });
});
