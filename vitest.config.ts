// Root Vitest config (`npm run test`, `npm run test:unit`, lane L5). Unit tests only: every tests/unit/**/*.test.ts(x), which
// picks up tests/unit/lib (L5) and, once their lanes merge, tests/unit/stripe (L2), tests/unit/ai (L3) and tests/unit/emails
// (L4). Those lanes also carry a lane-local tests/unit/<folder>/vitest.config.ts; it is a config, not a test, so it is never
// collected here. Kept out: tests/rls (L1's suite, `npm run test:rls`, needs the local Supabase stack) and tests/e2e
// (Playwright, `npm run test:e2e`). Pure modules only: environment node, no network, no database.
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("./", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  root: repoRoot,
  // Modules under test import "@/config/...", "@/lib/..." as the app does (tsconfig paths).
  resolve: { alias: [{ find: /^@\//, replacement: repoRoot }] },
  // .tsx tests (email templates, L4) compile with React's automatic runtime, as Next does: no `import React` needed.
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "tests/rls/**", "tests/e2e/**", "**/vitest.config.*"],
    environment: "node",
    // No global mock or env resets: the lane suites set theirs up in their own hooks. Fixed instants only (lane brief): a test
    // that needs "now" injects it, or sets the fake clock and restores it itself.
    // `npm run test:unit -- --coverage` prints line coverage of lib/ (written to coverage/, gitignored).
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/db/types.ts"],
      reporter: ["text-summary", "text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
