// Vitest config for the email template tests only (lane L4), until L5's root vitest.config.ts picks tests/unit/** up:
//   npx vitest run --config tests/unit/emails/vitest.config.ts
// Root is the repo root and "@/" points there, as in the app, so lib/email-templates, lib/sample and messages/*.json resolve
// the way Next resolves them. Node environment: the templates render strings, no DOM.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  root: repoRoot,
  resolve: { alias: [{ find: /^@\//, replacement: repoRoot }] },
  test: {
    include: ["tests/unit/emails/**/*.test.ts"],
    environment: "node",
  },
});
