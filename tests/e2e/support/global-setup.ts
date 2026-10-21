// Before the run: the defect list the suite recognises (known-defects.ts) and the readable one (ops/known_defects.md) must
// name the same ids, so a fixed defect cannot linger in one and a new one cannot hide in the other. Then start from an empty
// a11y findings folder, so the summary reflects this run only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clearFindings } from "./findings";
import { KNOWN_DEFECTS } from "./known-defects";

export default function globalSetup() {
  const md = readFileSync(join(process.cwd(), "ops", "known_defects.md"), "utf8");
  const listed = new Set(md.match(/\bKD-\d{3}\b/g) ?? []);
  const recognised = new Set<string>(KNOWN_DEFECTS.map((d) => d.id));
  const onlyInList = [...listed].filter((id) => !recognised.has(id));
  const onlyInSuite = [...recognised].filter((id) => !listed.has(id));
  if (onlyInList.length || onlyInSuite.length) {
    throw new Error(
      `ops/known_defects.md and tests/e2e/support/known-defects.ts disagree. Only in the list: ${onlyInList.join(", ") || "none"}. ` +
        `Only in the suite: ${onlyInSuite.join(", ") || "none"}.`,
    );
  }
  clearFindings();
}
