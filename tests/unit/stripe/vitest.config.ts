// Lane-local vitest config for the Stripe webhook unit tests (lane L2): `npx vitest run --config tests/unit/stripe/vitest.config.ts`.
// No database and no network: the database layer is mocked. L5's root vitest.config.ts picks this folder up after the
// merge; until then this config runs it alone. Shaped like tests/rls/vitest.config.ts: repo root, the "@/" alias, node.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  root: repoRoot,
  resolve: { alias: [{ find: /^@\//, replacement: repoRoot }] },
  test: {
    include: ["tests/unit/stripe/**/*.test.ts"],
    environment: "node",
  },
});
