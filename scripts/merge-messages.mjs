// Three-way merge for messages/*.json during a branch merge. Screens add keys under their own namespaces, so git's line merge
// conflicts on the closing braces while the keys never overlap. Usage, inside a conflicted merge:
//   node scripts/merge-messages.mjs            (resolves messages/en.json and messages/ar.json from the index stages)
// Start from the base, apply every key changed in ours, then every key changed in theirs (theirs wins a true clash, which is
// reported). Output keeps namespace order: base order, then ours additions, then theirs additions.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const files = ["messages/en.json", "messages/ar.json"];
const stage = (n, file) => {
  try {
    return JSON.parse(execSync(`git show :${n}:${file}`, { encoding: "utf8" }));
  } catch {
    return null;
  }
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function merge3(base, ours, theirs, path, clashes) {
  const out = {};
  const keys = [...new Set([...Object.keys(base ?? {}), ...Object.keys(ours ?? {}), ...Object.keys(theirs ?? {})])];
  for (const k of keys) {
    const b = base?.[k], o = ours?.[k], t = theirs?.[k];
    const p = path ? `${path}.${k}` : k;
    if (isObj(o) && isObj(t)) out[k] = merge3(isObj(b) ? b : {}, o, t, p, clashes);
    else if (same(o, t)) { if (o !== undefined) out[k] = o; }
    else if (same(o, b)) { if (t !== undefined) out[k] = t; } // only theirs changed (or theirs deleted)
    else if (same(t, b)) { if (o !== undefined) out[k] = o; } // only ours changed
    else { clashes.push(p); out[k] = t ?? o; }
  }
  return out;
}

for (const file of files) {
  const base = stage(1, file), ours = stage(2, file), theirs = stage(3, file);
  if (!ours || !theirs) { console.log(`${file}: not conflicted, skipped`); continue; }
  const clashes = [];
  const merged = merge3(base ?? {}, ours, theirs, "", clashes);
  writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  execSync(`git add ${file}`);
  console.log(`${file}: merged${clashes.length ? `, theirs won on: ${clashes.join(", ")}` : ""}`);
}
