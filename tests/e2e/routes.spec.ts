// Every route of the route map renders, in both locales, at the project's width: the right status, <html dir> and lang for
// the locale, no horizontal overflow, no console or page errors, and no raw message key on the page (next-intl prints
// "namespace.key" when a key is missing). The journeys walk the flows; this catches the pages no journey passes through.
import { expect, horizontalOverflow, href, settle, test } from "./support/app";
import { LOCALES, dirOf } from "./support/i18n";
import en from "../../messages/en.json";
import { knownRawKeys } from "./support/known-defects";
import { ROUTE_MAP, futureSlot } from "./support/routes";

/** Status a route answers with on purpose (screen 17): the 404 page and a removed profile's 410. */
const EXPECTED_STATUS: Record<string, number> = { "/no-such-page": 404, "/doctors/doc_002?state=removed": 410 };

// "namespace.key" for any top-level message namespace, but not a file name or a domain ("records.zip", "3affya.com").
const NAMESPACES = Object.keys(en).join("|");
const RAW_KEY = new RegExp(`\\b(?:${NAMESPACES})\\.(?!(?:pdf|zip|rar|7z|jpe?g|png|docx?|csv|ics|txt|com|org|net|io|gov|sa|ae)\\b)[a-z][A-Za-z0-9]*(?:\\.[A-Za-z0-9]+)*`, "g");

for (const locale of LOCALES) {
  test.describe(`routes ${locale}`, () => {
    for (const route of ROUTE_MAP) {
      test(`${route.path} (screen ${route.screen})`, async ({ page, watch }, info) => {
        const expected = EXPECTED_STATUS[route.path] ?? 200;
        const response = await page.goto(href(locale, route.path.replace("{slot}", futureSlot())));
        await settle(page);

        expect(response?.status(), "status").toBe(expected);
        await expect(page.locator("html"), "dir").toHaveAttribute("dir", dirOf(locale));
        await expect(page.locator("html"), "lang").toHaveAttribute("lang", locale);
        await expect(page.getByRole("heading", { level: 1 }).first(), "a page heading").toBeVisible();
        expect(await horizontalOverflow(page), "horizontal overflow (px)").toBe(0);

        // The browser reports the 404 or 410 document itself as a failed resource; that line is the expected status, not an error.
        const errors = watch.errors.filter((e) => !(expected !== 200 && e.includes(`status of ${expected}`)));
        expect(errors, "console and page errors").toEqual([]);

        const text = await page.locator("body").innerText();
        const raw = [...new Set(text.match(RAW_KEY) ?? [])];
        const known = knownRawKeys(route.path);
        const recorded = raw.filter((k) => known.keys.includes(k));
        if (recorded.length) info.annotations.push({ type: "known defect", description: `${known.id}: ${recorded.join(", ")}` });
        expect(raw.filter((k) => !recorded.includes(k)), `raw message keys on the page (copy missing in messages/${locale}.json?)`).toEqual([]);
      });
    }
  });
}
