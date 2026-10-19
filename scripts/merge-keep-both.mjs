// Resolve append-append conflicts by keeping both sides (ours, then theirs). Only for files where each branch appended
// independent blocks (lib/sample.ts accessors, components/ui primitives, data/sample/README.md lines). Review the result.
// Usage: node scripts/merge-keep-both.mjs <file> [<file> ...]
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  if (!/^<<<<<<< /m.test(src)) { console.log(`${file}: no conflict markers`); continue; }
  // When both sides end with the same closer (`}` or `);`), git hoists it below the block as common text, so a plain
  // concatenation leaves ours unclosed. Re-attach up to two such closer lines to ours.
  const out = src.replace(/^<<<<<<< [^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n((?:[ \t]*(?:\}|\);|\]|\];)[ \t]*\n){0,2})/gm, (_m, ours, theirs, tail) =>
    tail && !ours.endsWith(tail) ? ours + tail + theirs + tail : ours + theirs,
  );
  writeFileSync(file, out);
  execSync(`git add "${file}"`);
  console.log(`${file}: kept both sides`);
}
