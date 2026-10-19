// Resolve append-append conflicts by keeping both sides (ours, then theirs). Only for files where each branch appended
// independent blocks (lib/sample.ts accessors, components/ui primitives, data/sample/README.md lines). Review the result.
// Usage, inside a conflicted merge: node scripts/merge-keep-both.mjs <file> [<file> ...]
//
// First choice: rebuild from the index stages. When both sides start with the whole base (pure appends), the exact answer is
// ours + what theirs appended, with no reliance on git's conflict hunks (git hoists a shared closing `}` or `);` below the
// hunk, which leaves ours unclosed if the hunk is simply concatenated). Fallback, when a side also edited the middle: keep both
// sides of each hunk and re-attach up to three hoisted closer lines to ours.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const stage = (n, file) => {
  try {
    return execSync(`git show :${n}:"${file}"`, { encoding: "utf8" });
  } catch {
    return null;
  }
};

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  if (!/^<<<<<<< /m.test(src)) { console.log(`${file}: no conflict markers`); continue; }
  const base = stage(1, file), ours = stage(2, file), theirs = stage(3, file);
  let out, how;
  if (base !== null && ours !== null && theirs !== null && ours.startsWith(base) && theirs.startsWith(base)) {
    out = ours + theirs.slice(base.length);
    how = "appended theirs after ours (exact, from index stages)";
  } else {
    out = src.replace(/^<<<<<<< [^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n((?:[ \t]*(?:<\/\w+>|\}\)*,?|\);|\]|\];|\};)[ \t]*\n){0,3})/gm, (_m, o, t, tail) =>
      tail && !o.endsWith(tail) ? o + tail + t + tail : o + t,
    );
    how = "kept both sides of each hunk (middle of file also changed; review it)";
  }
  if (/^(<<<<<<<|=======|>>>>>>>) ?/m.test(out)) { console.log(`${file}: STILL CONFLICTED`); writeFileSync(file, out); continue; }
  writeFileSync(file, out);
  execSync(`git add "${file}"`);
  console.log(`${file}: ${how}`);
}
