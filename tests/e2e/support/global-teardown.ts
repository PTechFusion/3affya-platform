// After the run: summarise what axe found (test-results/e2e/a11y-summary.md).
import { SUMMARY_FILE, writeSummary } from "./findings";

export default function globalTeardown() {
  const rows = writeSummary();
  if (rows) console.log(`a11y: ${rows} finding groups, see ${SUMMARY_FILE}`);
}
