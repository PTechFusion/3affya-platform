// The e2e fixtures. `test` watches every page for uncaught errors and console errors; `journey(locale)` walks one step at a
// time and checks the four things every page must hold (lane brief L5): its key element is visible, no console or page
// errors, no horizontal overflow, and <html dir> and lang match the locale. A step that a recorded defect blocks is skipped
// with the defect id (ops/known_defects.md); the page itself is never changed to make a test pass.
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { defect, type DefectId } from "./known-defects";
import { dirOf, t, type Locale } from "./i18n";

export { expect };

/** Errors seen since the last reset: uncaught exceptions and console.error lines (a hydration mismatch logs one). */
export class PageWatch {
  readonly errors: string[] = [];
  constructor(page: Page) {
    page.on("pageerror", (e) => this.errors.push(`page error: ${e.message.split("\n")[0]}`));
    page.on("console", (m) => {
      if (m.type() === "error") this.errors.push(`console error: ${m.text().split("\n")[0]} (${m.location().url})`);
    });
  }
  reset() {
    this.errors.length = 0;
  }
}

// The fixture callback is named `provide`, not Playwright's usual `use`: the React hooks lint rule reads `use(...)` as a hook.
export const test = base.extend<{ watch: PageWatch }>({
  watch: async ({ page }, provide) => {
    await provide(new PageWatch(page));
  },
});

/** Width of the current project, so a step can say what it checked ("390" or "1280"). */
export const widthOf = (page: Page) => page.viewportSize()?.width ?? 0;
export const isPhone = (page: Page) => widthOf(page) < 640;

/** `/en/patient/bookings` from a locale and an app path ("/" is the home page). */
export const href = (locale: Locale, path: string) => `/${locale}${path === "/" ? "" : path.startsWith("/?") ? path.slice(1) : path}`;

/** Load, fonts and a short settle: hydration errors and late layout shifts surface within it (as scripts/screenshots.mjs). */
export async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(400);
}

/** The first visible link to an app path (`a[href="/en/patient/bookings"]`): a page may render one link per width. */
export const visibleLink = (page: Page, locale: Locale, path: string) => page.locator(`a[href="${href(locale, path)}"]:visible`).first();

/**
 * Go to a portal section the way a person does: the side column on desktop, the bottom bar on phone, where sections past the
 * first four sit behind More (the portal overview, which links every section).
 */
export async function portalNav(page: Page, locale: Locale, portal: "patient" | "professional" | "admin", section: string) {
  const target = `/${portal}/${section}`;
  if (!(await visibleLink(page, locale, target).isVisible())) {
    const sections = page.getByRole("navigation", { name: t(locale, "portal.sections") });
    await sections.locator(`a[href="${href(locale, `/${portal}`)}"]:visible`).first().click();
    await page.waitForURL(`**${href(locale, `/${portal}`)}`);
  }
  await visibleLink(page, locale, target).click();
  await page.waitForURL(`**${href(locale, target)}`);
}

/** The page is wider than the viewport by this many CSS pixels (0 is right). */
export const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export type Step = {
  /** What the step is, in the report: "checkout". */
  name: string;
  /** Go there directly (an app path, locale added). Leave out when `arrive` gets there by clicking. */
  path?: string;
  /** Get there from the previous page (click a link, submit a form). */
  arrive?: () => Promise<void>;
  /** The element(s) that prove this is the right page in the right state. */
  key: () => Locator | Locator[];
  /** What to do on the page once it checks out (open a sheet, fill a form), checked again afterwards. */
  then?: () => Promise<void>;
  /** A recorded defect that blocks this step: it is skipped and named, not run. */
  blockedBy?: DefectId;
};

export function journey(page: Page, watch: PageWatch, locale: Locale) {
  const check = async (label: string, keys: Locator[]) => {
    for (const k of keys) await expect(k, `${label}: key element`).toBeVisible();
    await expect(page.locator("html"), `${label}: dir`).toHaveAttribute("dir", dirOf(locale));
    await expect(page.locator("html"), `${label}: lang`).toHaveAttribute("lang", locale);
    expect(await horizontalOverflow(page), `${label}: horizontal overflow (px)`).toBe(0);
    expect(watch.errors, `${label}: console and page errors`).toEqual([]);
  };

  return async function step(s: Step) {
    if (s.blockedBy) {
      const d = defect(s.blockedBy);
      test.info().annotations.push({ type: "skipped step", description: `${s.name}: ${d.id} ${d.what}` });
      await test.step.skip(`${s.name} (skipped: ${d.id})`, async () => {});
      return;
    }
    await test.step(s.name, async () => {
      watch.reset();
      if (s.path !== undefined) await page.goto(href(locale, s.path));
      else if (s.arrive) await s.arrive();
      await settle(page);
      const keys = () => {
        const k = s.key();
        return Array.isArray(k) ? k : [k];
      };
      await check(s.name, keys());
      if (s.then) {
        await s.then();
        await page.waitForTimeout(250);
        expect(await horizontalOverflow(page), `${s.name} (after action): horizontal overflow (px)`).toBe(0);
        expect(watch.errors, `${s.name} (after action): console and page errors`).toEqual([]);
      }
    });
  };
}
