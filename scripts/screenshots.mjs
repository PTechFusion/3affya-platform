// Screenshots of every route in both locales at phone and desktop width. Output: scripts/screenshots/<route>-<locale>-<width>.png
// Usage: npm run build && PORT=3100 npm run start (one terminal), then BASE_URL=http://localhost:3100 ROUTES=/faq,/about npm run screens.
// Fails (exit 1) on any uncaught page error, so a hydration mismatch or a client crash cannot hide behind a pretty PNG.
// Also prints horizontal overflow per shot. Query strings are allowed in ROUTES: "/?state=loading" becomes home-state-loading.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
const ROUTES = (process.env.ROUTES ?? "/,/brand").split(",").map((r) => r.trim()).filter(Boolean);
const WIDTHS = [390, 1280];
const LOCALES = ["ar", "en"];
const out = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

// Playwright pins one Chromium build per version; when that exact build is missing, use any installed one rather than downloading.
function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => d.startsWith("chromium-")).sort().reverse();
  for (const d of dirs) {
    const bin = join(root, d, "chrome-linux64", "chrome");
    if (existsSync(bin)) return bin;
    const legacy = join(root, d, "chrome-linux", "chrome");
    if (existsSync(legacy)) return legacy;
  }
  return undefined;
}

const fileName = (route, locale, width) => {
  const slug = route === "/" || route.startsWith("/?") ? `home${route.slice(1)}` : route.slice(1);
  return `${slug.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-${locale}-${width}.png`;
};

let browser;
try {
  browser = await chromium.launch();
} catch {
  const executablePath = findChromium();
  if (!executablePath) throw new Error("No Chromium found. Run `npx playwright install chromium` or set CHROME_PATH.");
  browser = await chromium.launch({ executablePath });
}

const failures = [];
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  page.on("console", (m) => {
    if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push(m.text().split("\n")[0]);
  });
  for (const locale of LOCALES) {
    for (const route of ROUTES) {
      errors.length = 0;
      const url = `${BASE}/${locale}${route === "/" ? "" : route.startsWith("/?") ? route.slice(1) : route}`;
      // "load" plus fonts, not networkidle: link prefetches for routes not built yet 404 and keep the network busy.
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const name = fileName(route, locale, width);
      await page.screenshot({ path: out + name, fullPage: true });
      const flags = [overflow > 0 ? `OVERFLOW ${overflow}px` : "", errors.length ? `PAGE ERRORS ${errors.length}` : ""].filter(Boolean).join("  ");
      console.log(`${name}${flags ? "  " + flags : ""}`);
      if (overflow > 0) failures.push(`${name}: horizontal overflow ${overflow}px`);
      for (const e of errors) failures.push(`${name}: ${e}`);
    }
  }
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error("\nScreens failed:\n  " + failures.join("\n  "));
  process.exit(1);
}
