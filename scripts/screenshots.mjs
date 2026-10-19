// Screenshots of every route in both locales at phone and desktop width. Output: scripts/screenshots/<route>-<locale>-<width>.png
// Usage: npm run build && npm run start (in one terminal), then `npm run screens` (another). Or set BASE_URL.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ROUTES = (process.env.ROUTES ?? "/,/brand").split(",");
const WIDTHS = [390, 1280];
const LOCALES = ["ar", "en"];
const out = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  for (const locale of LOCALES) {
    for (const route of ROUTES) {
      const url = `${BASE}/${locale}${route === "/" ? "" : route}`;
      await page.goto(url, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const name = `${route === "/" ? "home" : route.slice(1).replace(/\//g, "-")}-${locale}-${width}.png`;
      await page.screenshot({ path: out + name, fullPage: true });
      console.log(`${name}${overflow > 0 ? `  OVERFLOW ${overflow}px` : ""}`);
    }
  }
  await page.close();
}
await browser.close();
