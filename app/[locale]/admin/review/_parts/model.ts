// Credential review model (screen 38): the four checks, their sources, what approving needs and the reason rules. Pure and
// shared by the client workspace (live checklist, enabled buttons) and the server actions (never trust the client).
// Rule A1: licence at the state board, board at ABMS or AOA, sanctions at FSMB or the NPDB, each stored with source, time and
// reviewer. Rule A2: the licence expiry read at the source sets the re-verification date, or the cycle in config, whichever
// is first. Rule B7: a certified claim needs a named ABMS or AOA board, and board eligible never becomes the badge.
import type { ReviewCheckKey } from "@/lib/sample";
import { boardIsNamed } from "@/app/[locale]/professional/builder/_parts/model";

export type { ReviewCheckKey };
export const CHECK_KEYS: readonly ReviewCheckKey[] = ["licence", "board", "sanctions", "photo"];

export type CheckResult = "unchecked" | "match" | "mismatch";
export const CHECK_RESULTS: readonly CheckResult[] = ["unchecked", "match", "mismatch"];

/** Where each check can be made, first is the default. Labels live in messages (adminReview.sources.*). */
export const CHECK_SOURCES: Record<ReviewCheckKey, readonly string[]> = {
  licence: ["stateBoard", "docinfo"],
  board: ["abms", "aoa"],
  sanctions: ["docinfo", "npdb"],
  photo: ["visual", "reverseImage"],
};

/** One check as the reviewer leaves it. `checkedAtUtc` is stamped when a result is set; `expiresOn` (YYYY-MM-DD) is the licence's. */
export type CheckState = { result: CheckResult; source: string; checkedAtUtc: string | null; expiresOn: string };
export type Checks = Record<ReviewCheckKey, CheckState>;

/** What the builder's rejected banner names (builder.banner.rejected.title.*): the licence, the board or another file. */
export type FixKind = "licence" | "board" | "other";
export const FIX_KINDS: readonly FixKind[] = ["licence", "board", "other"];
export const fixKindFor = (key: ReviewCheckKey): FixKind => (key === "licence" || key === "board" ? key : "other");

/** Format limits for the reviewer's note, not business numbers. */
export const REASON = { minChars: 20, maxChars: 1000 } as const;

/** What the claim says about the board: certified with a board name, or board eligible (text only, rule B7). */
export type BoardClaim = { status: "certified" | "eligible" | null; name: string | null };

export const blankCheck = (key: ReviewCheckKey): CheckState => ({ result: "unchecked", source: CHECK_SOURCES[key][0] ?? "", checkedAtUtc: null, expiresOn: "" });
export const blankChecks = (): Checks => ({
  licence: blankCheck("licence"),
  board: blankCheck("board"),
  sanctions: blankCheck("sanctions"),
  photo: blankCheck("photo"),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (v: string) => ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Board eligible has nothing to verify at ABMS: the board check does not apply and the card never shows the badge. */
export const boardCheckApplies = (board: BoardClaim) => board.status !== "eligible";

/** Why a check is not ready for approval. */
export type CheckGap = "unchecked" | "mismatch" | "expiryMissing" | "expiryPast" | "boardNotNamed";

/** Undefined when the check supports approval, otherwise what is missing. `today` is YYYY-MM-DD in the reviewer's zone. */
export function checkGap(key: ReviewCheckKey, check: CheckState, board: BoardClaim, today: string): CheckGap | undefined {
  if (key === "board") {
    if (!boardCheckApplies(board)) return undefined;
    if (board.status === "certified" && !boardIsNamed(board.name ?? "")) return "boardNotNamed";
  }
  if (check.result === "unchecked") return "unchecked";
  if (check.result === "mismatch") return "mismatch";
  if (!CHECK_SOURCES[key].includes(check.source)) return "unchecked";
  if (key === "licence") {
    if (!isIsoDate(check.expiresOn)) return "expiryMissing";
    if (check.expiresOn <= today) return "expiryPast";
  }
  return undefined;
}

export function checkGaps(checks: Checks, board: BoardClaim, today: string): Array<{ key: ReviewCheckKey; gap: CheckGap }> {
  return CHECK_KEYS.flatMap((key) => {
    const gap = checkGap(key, checks[key], board, today);
    return gap ? [{ key, gap }] : [];
  });
}

/** Checks done, out of the checks that apply (board eligible has three). */
export function checksDone(checks: Checks, board: BoardClaim, today: string): { done: number; of: number } {
  const keys = CHECK_KEYS.filter((k) => k !== "board" || boardCheckApplies(board));
  return { done: keys.filter((k) => !checkGap(k, checks[k], board, today)).length, of: keys.length };
}

/** The first check marked as not matching, which preselects what the doctor must fix. */
export const firstMismatch = (checks: Checks): ReviewCheckKey | undefined => CHECK_KEYS.find((k) => checks[k].result === "mismatch");

export type ReasonError = "reasonMissing" | "reasonShort" | "reasonTooLong";

export function reasonError(reasonEn: string, reasonAr: string): ReasonError | undefined {
  const en = reasonEn.trim();
  if (!en) return "reasonMissing";
  if (en.length < REASON.minChars) return "reasonShort";
  return en.length > REASON.maxChars || reasonAr.trim().length > REASON.maxChars ? "reasonTooLong" : undefined;
}

/** Calendar date (UTC midnight) `months` after an instant's UTC date, clamped to the month's last day. */
function addMonthsUtc(at: Date, months: number): Date {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(at.getUTCDate(), lastDay)));
}

/** Rule A2: re-verify at licence expiry or after the cycle, whichever comes first. Both are calendar dates: format in UTC. */
export function reverification(decidedAt: Date, licenceExpiresOn: string, cycleMonths: number): { on: Date; by: "licence" | "cycle" } {
  const cycle = addMonthsUtc(decidedAt, cycleMonths);
  const expiry = isIsoDate(licenceExpiresOn) ? new Date(`${licenceExpiresOn}T00:00:00Z`) : null;
  return expiry && expiry < cycle ? { on: expiry, by: "licence" } : { on: cycle, by: "cycle" };
}

/** YYYY-MM-DD of an instant on the wall clock of a zone (the reviewer's "today"). */
export function isoDateInZone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/* ---------------- Wire format ---------------- */

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Rebuilds the checks from untrusted input on the server: unknown keys dropped, unknown results unchecked, lengths capped. */
export function checksFromPayload(raw: unknown): Checks {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const one = (key: ReviewCheckKey): CheckState => {
    const c = (p[key] && typeof p[key] === "object" ? p[key] : {}) as Record<string, unknown>;
    const result = CHECK_RESULTS.find((r) => r === c.result) ?? "unchecked";
    const source = CHECK_SOURCES[key].find((s) => s === c.source) ?? "";
    const expiresOn = str(c.expiresOn, 10);
    return { result, source, checkedAtUtc: str(c.checkedAtUtc, 40) || null, expiresOn: isIsoDate(expiresOn) ? expiresOn : "" };
  };
  return { licence: one("licence"), board: one("board"), sanctions: one("sanctions"), photo: one("photo") };
}
