// Playwright config for the e2e suite (`npm run test:e2e`, lane L5, task 4.3): the three journeys (patient, professional,
// admin), every route of the route map (routes.spec.ts) and axe on every route (a11y.spec.ts). Two projects, the widths every
// screen is built for: phone (390) and desktop (1280); each spec walks both locales itself.
// The app is built once with the dev role switch on (the portals' "Viewing as" bar, NEXT_PUBLIC_DEV_ROLE_SWITCH=1) and served
// by `next start` on port 3150, as `npm run screens` serves it. SITE_USERS stays empty, so the basic-auth gate in middleware.ts
// is off. CI builds in an earlier step and sets E2E_SKIP_BUILD=1. Locally a server already on port 3150 is reused as it is
// (start one yourself to iterate faster, and restart it after a rebuild).
import { defineConfig } from "@playwright/test";
import { chromiumExecutable } from "./tests/e2e/support/chromium";

const PORT = Number(process.env.E2E_PORT ?? 3150);
const BASE_URL = `http://localhost:${PORT}`;
const CI = Boolean(process.env.CI);
const executablePath = chromiumExecutable();

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/e2e/output",
  globalSetup: "./tests/e2e/support/global-setup.ts",
  globalTeardown: "./tests/e2e/support/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // One `next start` serves every worker; more than a handful of browsers at once only queues behind it.
  workers: CI ? 3 : 4,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: CI
    ? [["list"], ["github"], ["html", { open: "never", outputFolder: "test-results/e2e/report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "test-results/e2e/report" }]],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npx next build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/en`,
    reuseExistingServer: !CI,
    timeout: 600_000,
    stdout: "ignore",
    stderr: "pipe",
    env: { NEXT_PUBLIC_DEV_ROLE_SWITCH: "1", SITE_USERS: "", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
