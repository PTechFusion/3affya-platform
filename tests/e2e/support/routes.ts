// Every route of the route map in docs/screens/PLAYBOOK.md section 2, with the sample ids that open it in its main state. The
// a11y spec scans each one in both locales; the screen number is what ops/known_defects.md files a finding under.

export type MappedRoute = {
  screen: string;
  /** App path without the locale; query strings allowed. */
  path: string;
};

/** A future instant for checkout's ?slot= (any future time opens the form; the hold is the server's). Whole hour, UTC. */
export function futureSlot(daysAhead = 3): string {
  const t = new Date(Date.now() + daysAhead * 86_400_000);
  t.setUTCMinutes(0, 0, 0);
  return t.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export const ROUTE_MAP: readonly MappedRoute[] = [
  { screen: "1", path: "/" },
  { screen: "2", path: "/why-us-training" },
  { screen: "3", path: "/how-it-works" },
  { screen: "4", path: "/specialties" },
  { screen: "5", path: "/search" },
  { screen: "6", path: "/doctors/doc_013" }, // unclaimed
  { screen: "7", path: "/doctors/doc_002" }, // verified
  { screen: "8", path: "/?chat=1" }, // /intake is KD-001
  { screen: "9", path: "/claim/demo-valid" },
  { screen: "10", path: "/doctors/doc_013/this-is-me" },
  { screen: "11", path: "/ai-tools" },
  { screen: "12", path: "/for-professionals" },
  { screen: "13", path: "/faq" },
  { screen: "14", path: "/about" },
  { screen: "15", path: "/contact" },
  { screen: "16", path: "/privacy" },
  { screen: "16", path: "/terms" },
  { screen: "16", path: "/fees" },
  { screen: "16", path: "/refunds" },
  { screen: "17", path: "/no-such-page" }, // 404
  { screen: "17", path: "/doctors/doc_002?state=removed" }, // 410
  { screen: "18", path: "/sign-in" },
  { screen: "18", path: "/sign-in?step=code" },
  { screen: "19", path: "/book/doc_002" },
  { screen: "20", path: "/book/doc_002/pay?slot={slot}&visit=video&for=child&age=child" },
  { screen: "21", path: "/patient/bookings/bk_004?state=confirmed" },
  { screen: "22", path: "/patient/bookings" },
  { screen: "23", path: "/patient/receipts" },
  { screen: "23", path: "/patient/receipts/bk_004" },
  { screen: "24", path: "/patient/records" },
  { screen: "25", path: "/patient/records/rs_004" },
  { screen: "26", path: "/patient/records/rs_001/summary" },
  { screen: "27", path: "/patient/sharing" },
  { screen: "28", path: "/patient/settings" },
  { screen: "29", path: "/professional/builder" },
  { screen: "30", path: "/professional/availability" },
  { screen: "31", path: "/professional/card" },
  { screen: "32", path: "/professional/inbox" },
  { screen: "32", path: "/professional/inbox/int_003" },
  { screen: "33", path: "/professional/membership" },
  { screen: "35", path: "/professional/payouts" },
  { screen: "36", path: "/professional/shared" },
  { screen: "36", path: "/professional/shared/sh_001" },
  { screen: "37", path: "/admin/login" },
  { screen: "38", path: "/admin/review" },
  { screen: "38", path: "/admin/review/doc_009" },
  { screen: "39", path: "/admin/listings" },
  { screen: "40", path: "/admin/specialties" },
  { screen: "41", path: "/admin/removals" },
  { screen: "41", path: "/admin/removals/rm_001" },
  { screen: "42", path: "/admin/members" },
  { screen: "43", path: "/admin/payments" },
  { screen: "45", path: "/admin/ai-jobs" },
  { screen: "45", path: "/admin/ai-jobs/job_004" },
  { screen: "46", path: "/admin/outreach" },
  { screen: "47", path: "/admin/audit" },
  { screen: "48", path: "/brand" },
];

/** The screen a path belongs to, for findings that come from a journey step. */
export function screenOf(path: string): string {
  const bare = path.split("?")[0]!;
  const hit = ROUTE_MAP.find((r) => r.path.split("?")[0] === bare);
  return hit?.screen ?? "?";
}
