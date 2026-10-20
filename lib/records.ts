// Records pipeline vocabulary for the upload flow (screen 24, task 3.7) and the progress page (screen 25, task 3.8). The
// pipeline is a fixed workflow (ADR-4): the nine steps below run in this order, every time. No sample data is imported here,
// so client components (the upload flow) can use the quote and the file checks.
import { business, recordsLimits } from "@/config/business";

/** SI units, as phones show file sizes: 1 MB is 1,000,000 bytes and 1 GB is 1,000 MB. */
export const BYTES_PER_MB = 1_000_000;
export const BYTES_PER_GB = 1_000_000_000;

export const PIPELINE_STEPS = ["validate", "quote", "pay", "extract", "dedupe", "summarise", "flag", "store", "notify"] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export type RecordFileKind = "pdf" | "docx" | "jpg" | "png" | "other";
export type RejectReason = "type" | "archive" | "tooLarge" | "setFull" | "empty" | "encrypted" | "duplicate";
export type UnreadableReason = "blurry" | "handwritten" | "cutOff";
/** One page's state in the extract step. notRead: never reached, because the set failed or was stopped first. */
export type PageStatus = "read" | "unreadable" | "reading" | "waiting" | "failed" | "notRead";
export type RecordSetStatus = "queued" | "processing" | "failed" | "done" | "cancelled";
/** damaged: one page could not be opened after three tries. unavailable: the reading service failed three times. */
export type FailureReason = "damaged" | "unavailable";
export type StepState = "done" | "current" | "waiting" | "failed" | "stopped";

/** A file in the upload flow before payment. `pages` is null until counted (Word files are counted after upload). */
export type DraftFile = {
  id: string;
  name: string;
  kind: RecordFileKind;
  sizeBytes: number;
  pages: number | null;
  status: "checking" | "accepted" | "rejected";
  reason?: RejectReason;
};

/** What the file pickers accept (task 3.7: PDF, DOCX, JPG, PNG). Anything else that is dropped is listed with its reason. */
export const RECORDS_ACCEPT =
  ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";

const ARCHIVE = /\.(zip|rar|7z|tar|gz)$/i;

export function fileKind(name: string, mime: string): RecordFileKind {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (mime === "image/jpeg" || /\.jpe?g$/.test(n)) return "jpg";
  if (mime === "image/png" || n.endsWith(".png")) return "png";
  return "other";
}

/**
 * The quote (task 3.7): one block per started recordsBlockGb of accepted bytes, each at recordsBlockPriceCents, all fees
 * included (rule C5). 1.3 GB is two blocks. `roomBytes` is what can still be added before the next block starts.
 */
export function quoteFor(acceptedBytes: number): { blocks: number; totalCents: number; roomBytes: number } {
  const blockBytes = business.recordsBlockGb * BYTES_PER_GB;
  const blocks = acceptedBytes > 0 ? Math.ceil(acceptedBytes / blockBytes) : 0;
  return { blocks, totalCents: blocks * business.recordsBlockPriceCents, roomBytes: blocks * blockBytes - acceptedBytes };
}

/**
 * The checks that need no file contents: empty, archive, wrong type, over the per-file limit, already in the list, or over the
 * per-set limit once added. `acceptedBytes` is what the set already holds. A locked PDF is found by reading the file (encrypted).
 */
export function checkFile(
  file: { name: string; kind: RecordFileKind; sizeBytes: number },
  acceptedBytes: number,
  existing: Array<{ name: string; sizeBytes: number }>,
): RejectReason | null {
  if (file.sizeBytes === 0) return "empty";
  if (ARCHIVE.test(file.name)) return "archive";
  if (file.kind === "other") return "type";
  if (file.sizeBytes > recordsLimits.maxFileMb * BYTES_PER_MB) return "tooLarge";
  if (existing.some((f) => f.name === file.name && f.sizeBytes === file.sizeBytes)) return "duplicate";
  if (acceptedBytes + file.sizeBytes > recordsLimits.maxSetGb * BYTES_PER_GB) return "setFull";
  return null;
}

/** Every step's state for a set: done before the current step, the current one live (or failed, or stopped), waiting after. */
export function stepStates(status: RecordSetStatus, step: PipelineStep | null): Record<PipelineStep, StepState> {
  const at = status === "done" ? PIPELINE_STEPS.length : Math.max(0, PIPELINE_STEPS.indexOf(step ?? "extract"));
  const here: StepState = status === "failed" ? "failed" : status === "cancelled" ? "stopped" : "current";
  return Object.fromEntries(
    PIPELINE_STEPS.map((s, i) => [s, i < at ? "done" : i === at ? here : "waiting"]),
  ) as Record<PipelineStep, StepState>;
}

/** Seconds left, from the pages still to read plus the fixed tail (config/business.ts recordsLimits). */
export function estimateSeconds(pagesLeft: number): number {
  return pagesLeft * recordsLimits.estimateSecondsPerPage + recordsLimits.estimateTailSeconds;
}
