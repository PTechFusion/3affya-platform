"use server";
// Export CSV (screen 47). Prototype stub: it reads the same filters the page shows, counts the rows the file would hold, and
// returns the { ok, error } union without writing anything. Task 2.8 replaces the stub: resolve the admin session on the
// server (never from the form) and refuse with "notAllowed" unless the admin signed in with TOTP recently; then queue an
// Inngest job (nothing slow runs inside the request), idempotent on a key stored in the database, that streams the matching
// rows to a CSV in a private Storage bucket and hands back a short-lived signed link. The file holds ids, first names and the
// before and after values, never record content. The export itself is appended to the log as auditLog.exported, with the
// filters and the row count, in the same transaction that creates the job.
import { auditEntries } from "@/lib/sample";
import { adminZone, applyFilters, filtersFrom, tzOverride } from "./_parts/audit";

export type AuditExportResult =
  | { ok: true; url: string; rows: number }
  | { ok: false; error: "preview"; rows: number }
  | { ok: false; error: "nothingToExport" | "notAllowed" };

export async function exportAuditLog(_prev: AuditExportResult | null, formData: FormData): Promise<AuditExportResult> {
  void _prev;
  const sp: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") sp[key] = value;
  const { filters, dateError } = filtersFrom(sp);
  const rows = applyFilters(auditEntries(), filters, adminZone(tzOverride(sp)), dateError).length;
  if (rows === 0) return { ok: false, error: "nothingToExport" };
  return { ok: false, error: "preview", rows };
}
