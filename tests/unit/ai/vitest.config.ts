// Vitest config for lane L3's unit tests only (lib/ai and the spike's scoring), run with
//   npx vitest run --config tests/unit/ai/vitest.config.ts
// No database, no network, no API key: the vendor SDKs and the service client are mocked. L5's root vitest.config.ts picks
// this folder up after the lanes merge.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  root: repoRoot,
  resolve: { alias: [{ find: /^@\//, replacement: repoRoot }] },
  test: {
    include: ["tests/unit/ai/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
