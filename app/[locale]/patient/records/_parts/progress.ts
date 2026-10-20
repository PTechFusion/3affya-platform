// What the progress page (screen 25) reads from one record set: every page numbered across the set (the "page 4 of 12" the
// patient sees), the counts, the page a failure stopped on and the quote. Pure, so the page and its parts agree.
import { quoteFor, type PageStatus, type RecordSetStatus, type UnreadableReason } from "@/lib/records";
import type { RecordFile, SampleRecordSet } from "@/lib/sample";

export type PageView = { n: number; file: RecordFile; filePage: number; status: PageStatus; reason?: UnreadableReason };

export type SetProgress = {
  pages: PageView[];
  total: number;
  /** Read or flagged unreadable: the pages the extract step has finished with. */
  done: number;
  unreadable: PageView[];
  reading: PageView | null;
  /** Still to read (reading or waiting), for the estimate. */
  left: number;
  failedPage: PageView | null;
  quote: ReturnType<typeof quoteFor>;
};

/** `status` is the shown status: a stopped (cancelled) set shows its unread pages as not read. */
export function progressOf(set: SampleRecordSet, status: RecordSetStatus): SetProgress {
  const pages: PageView[] = [];
  for (const file of set.files) {
    file.pages.forEach((p, i) => {
      const stopped = status === "cancelled" && (p.status === "reading" || p.status === "waiting");
      pages.push({ n: pages.length + 1, file, filePage: i + 1, status: stopped ? "notRead" : p.status, reason: p.reason });
    });
  }
  const failure = set.failure;
  return {
    pages,
    total: pages.length,
    done: pages.filter((p) => p.status === "read" || p.status === "unreadable").length,
    unreadable: pages.filter((p) => p.status === "unreadable"),
    reading: pages.find((p) => p.status === "reading") ?? null,
    left: pages.filter((p) => p.status === "reading" || p.status === "waiting").length,
    failedPage: failure ? (pages.find((p) => p.file.id === failure.fileId && p.filePage === failure.filePage) ?? null) : null,
    quote: quoteFor(set.files.reduce((n, f) => n + f.sizeBytes, 0)),
  };
}
