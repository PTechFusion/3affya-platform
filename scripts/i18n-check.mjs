// Fails when messages/ar.json and messages/en.json do not share the same key set.
// Also reports how many Arabic keys are still unreviewed (messages/ar.reviewed.json).
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../messages/${p}`, import.meta.url), "utf8"));
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const en = new Set(flat(read("en.json")));
const ar = new Set(flat(read("ar.json")));
const reviewed = new Set(read("ar.reviewed.json"));

const missingInAr = [...en].filter((k) => !ar.has(k));
const missingInEn = [...ar].filter((k) => !en.has(k));

if (missingInAr.length || missingInEn.length) {
  if (missingInAr.length) console.error("Missing in ar.json:\n  " + missingInAr.join("\n  "));
  if (missingInEn.length) console.error("Missing in en.json:\n  " + missingInEn.join("\n  "));
  process.exit(1);
}
const unreviewed = [...ar].filter((k) => !reviewed.has(k));
console.log(`i18n ok: ${en.size} keys in both locales. Arabic keys still needs_review: ${unreviewed.length} of ${ar.size}.`);
