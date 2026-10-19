// The ten tools this page teases: agents 2 to 11 from docs/handoff/programmx_aafia-project-notes_2026-10.md section 5.
// Order is reading order, not a release promise. Agents 6 and 7 ship at launch inside the records summary (agent 1), so they
// sit in their own group instead of reading as "coming soon". Copy lives in messages under aiTools.tools.<key>; no prices.
export const AI_TOOLS = [
  { key: "translator", agent: 4, group: "later" },
  { key: "prep", agent: 5, group: "later" },
  { key: "explainer", agent: 9, group: "later" },
  { key: "organiser", agent: 10, group: "later" },
  { key: "sharing", agent: 11, group: "later" },
  { key: "search", agent: 8, group: "later" },
  { key: "medicines", agent: 2, group: "later" },
  { key: "letters", agent: 3, group: "later" },
  { key: "gaps", agent: 6, group: "records" },
  { key: "duplicates", agent: 7, group: "records" },
] as const satisfies ReadonlyArray<{ key: string; agent: number; group: "later" | "records" }>;

export type AiTool = (typeof AI_TOOLS)[number];
