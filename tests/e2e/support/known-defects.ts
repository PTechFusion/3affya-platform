// The defects the e2e, axe and unit runs found, as the suite recognises them. ops/known_defects.md is the readable list (same
// ids). A journey step a defect blocks is skipped with its id; a serious axe finding that matches an entry is reported, not
// failed; anything serious or critical that matches nothing fails the run. Fix a defect in its page, then delete its entry here
// and its line in ops/known_defects.md: the suite then checks that page in full again.

type Pair = readonly [fg: string, bg: string];

export type KnownDefect = {
  id: string;
  /** Screen numbers from docs/screens/README.md. */
  screens: string;
  what: string;
  /**
   * How axe reports it: its rule ids; for contrast, the colour pairs it measured (lower-case hex: one token pair, one defect,
   * wherever it appears); for a defect of one page, the route-map paths it is known on, so the same rule elsewhere still fails.
   */
  axe?: { rules: readonly string[]; pairs?: readonly Pair[]; paths?: readonly string[] };
  /** Raw message keys a page prints because its copy is missing (routes.spec.ts), on one route-map path. */
  rawKeys?: { path: string; keys: readonly string[] };
};

export const KNOWN_DEFECTS = [
  {
    id: "KD-001",
    screens: "8",
    what: "/intake answers 404: the route map lists /intake and /?chat=1 for the intake chat, only /?chat=1 exists",
  },
  {
    id: "KD-007",
    screens: "6",
    what: "unclaimed profile, registry source line: text-ink-500 #5E6A77 on sand-200 #E2DCCE is 4.03:1",
    axe: { rules: ["color-contrast"], pairs: [["#5e6a77", "#e2dcce"]] },
  },
  {
    id: "KD-008",
    screens: "21 to 47 (every portal page)",
    what: "dev role bar (prototype only, compiled out without NEXT_PUBLIC_DEV_ROLE_SWITCH): the other-portal links at opacity-70 are #A58542 on #F8EBC4, 2.92:1",
    axe: { rules: ["color-contrast"], pairs: [["#a58542", "#f8ebc4"]] },
  },
  {
    id: "KD-009",
    screens: "48",
    what: "brand page at 390: the horizontally scrolling token table cannot be reached by keyboard (no tabindex on the scroll box)",
    axe: { rules: ["scrollable-region-focusable"], paths: ["/brand"] },
  },
  {
    id: "KD-010",
    screens: "1, 5, 6, 7, 8, 12, 20 to 47",
    what: "moderate: content outside any landmark (axe region): the dev role bar on portal pages, the home and for-professionals heroes above <main>, the unclaimed-profile registry bar, the profile's fixed phone Book bar, a bar at the top of search, checkout's hold and total bar, the admin login language switch",
    axe: { rules: ["region"] },
  },
  {
    id: "KD-011",
    screens: "8",
    what: "moderate: the intake sheet's <header> is a second banner landmark beside the site header (axe landmark-no-duplicate-banner, landmark-unique)",
    axe: { rules: ["landmark-no-duplicate-banner", "landmark-unique"], paths: ["/?chat=1"] },
  },
  {
    id: "KD-012",
    screens: "8",
    what: "minor: the intake sheet is <aside role=\"dialog\">; dialog is not an allowed role on <aside> (axe aria-allowed-role)",
    axe: { rules: ["aria-allowed-role"], paths: ["/?chat=1"] },
  },
  {
    id: "KD-013",
    screens: "29, 38",
    what: "credential file sizes: toMb at one decimal shows a file under 0.05 MB (about 52 KB) as \"0 MB\" (tests/unit/lib/credentials.test.ts, expected failure)",
  },
  {
    id: "KD-014",
    screens: "every DoctorCard back face (5, 7, 12, 31, 48 and the builder preview)",
    what: "axe cannot measure the back face (gradient behind a 3D flip). Computed from the gradient stops: text-white/75 labels are about 4.9:1 at the dark corner but about 3.9:1 at mid-card (#08708E), under 4.5:1 for the 12 to 13 px labels; check by eye",
  },
] as const satisfies readonly KnownDefect[];

export type DefectId = (typeof KNOWN_DEFECTS)[number]["id"];

export function defect(id: DefectId): KnownDefect {
  const d = (KNOWN_DEFECTS as readonly KnownDefect[]).find((x) => x.id === id);
  if (!d) throw new Error(`Unknown defect ${id}`);
  return d;
}

/** The recorded defect an axe node is, if any: same rule, one of its colour pairs (contrast), and one of its paths (if listed). */
export function knownAxeDefect(rule: string, path: string, fg?: string, bg?: string): KnownDefect | undefined {
  const f = fg?.toLowerCase();
  const b = bg?.toLowerCase();
  return (KNOWN_DEFECTS as readonly KnownDefect[]).find(
    (d) =>
      d.axe?.rules.includes(rule) &&
      (!d.axe.pairs || d.axe.pairs.some(([pf, pb]) => pf === f && pb === b)) &&
      (!d.axe.paths || d.axe.paths.includes(path)),
  );
}

/** The raw keys a recorded defect prints on a route-map path (empty when none is recorded there). */
export function knownRawKeys(path: string): { id: string; keys: readonly string[] } {
  const d = (KNOWN_DEFECTS as readonly KnownDefect[]).find((x) => x.rawKeys?.path === path);
  return { id: d?.id ?? "", keys: d?.rawKeys?.keys ?? [] };
}
