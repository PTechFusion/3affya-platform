// Vitest config for the RLS suite only (`npm run test:rls`). It runs against the local Supabase stack, so it picks up
// only tests/rls/**/*.rls.ts (a plain vitest run elsewhere never sees these files), runs the files one after another
// (each builds and removes its own fixture world in the shared database) and allows network-sized timeouts. Hooks get ten
// minutes: a fixture world inserts listings, which wait while the registry import holds the slug lock (minutes), see
// LOCK_WAIT_BUDGET_MS in support/fixtures.ts.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  root: repoRoot,
  // lib/ modules the fixtures reuse (lib/fees.ts) import "@/config/...", as the app does.
  resolve: { alias: [{ find: /^@\//, replacement: repoRoot }] },
  test: {
    include: ["tests/rls/**/*.rls.ts"],
    environment: "node",
    globalSetup: ["tests/rls/support/global-setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false, shuffle: false },
    testTimeout: 60_000,
    hookTimeout: 600_000,
    teardownTimeout: 120_000,
  },
});
