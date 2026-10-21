// Professional journey (task 4.3), both locales, phone and desktop: claim landing (email, code, claimed) into the profile
// builder, then availability, practice ID card, inbox, membership, payouts and shared summaries through the portal navigation.
// The builder runs at phone width in the phone project (the brief's "builder on phone width"): its steps, the live card and
// the full-card sheet are checked there like everywhere else.
import { expect, isPhone, journey, portalNav, test, visibleLink } from "./support/app";
import { LOCALES, doctorName, lead, t } from "./support/i18n";

const INVITE = "demo-valid"; // data/sample/invites.json: a valid invite for doc_013 (unclaimed)

for (const L of LOCALES) {
  test(`professional journey ${L}`, async ({ page, watch }) => {
    const step = journey(page, watch, L);
    const h1 = (name: string) => page.getByRole("heading", { level: 1, name });
    const button = (name: string, exact = false) => page.getByRole("button", { name, exact }).filter({ visible: true }).first();
    const section = (name: string) => () => portalNav(page, L, "professional", name);

    await step({
      name: "claim landing",
      path: `/claim/${INVITE}`,
      key: () => [h1(t(L, "claim.valid.title", { name: doctorName(L, "doc_013") })), page.locator('input[name="email"]')],
      then: async () => {
        await expect(page.locator('input[name="email"]'), "the invite pre-fills the email").not.toHaveValue("");
        await button(t(L, "claim.email.submit")).click();
        await page.locator('input[name="code"]').fill("123456");
        await button(t(L, "claim.code.submit")).click();
        await expect(page.getByRole("heading", { name: t(L, "claim.done.title") })).toBeVisible();
      },
    });

    await step({
      name: "builder",
      arrive: async () => {
        await visibleLink(page, L, "/professional/builder").click();
        await page.waitForURL(`**/${L}/professional/builder`);
      },
      key: () => [h1(t(L, "builder.title")), page.getByRole("progressbar").first()],
      then: async () => {
        // The registry pre-fill opens on step 1; saving it moves on to step 2.
        await expect(page.locator("#step-photo-toggle")).toHaveAttribute("aria-expanded", "true");
        await page.locator("#step-photo-body").getByRole("button", { name: t(L, "builder.actions.continue") }).click();
        await expect(page.locator("#step-location-toggle"), "step 2 opens after Save and continue").toHaveAttribute("aria-expanded", "true");
        // Phone: the live card sits behind "Full card", a sheet with both sides. Desktop (xl, 1280 up): a sticky column.
        if (isPhone(page)) {
          await button(t(L, "builder.preview.openCardLabel")).click();
          const sheet = page.getByRole("dialog").filter({ visible: true });
          await expect(sheet, "the full-card sheet opens").toBeVisible();
          await page.keyboard.press("Escape");
          await expect(sheet, "Escape closes it").toHaveCount(0);
        } else {
          await expect(page.getByRole("complementary", { name: t(L, "builder.preview.title") }), "the live preview column").toBeVisible();
        }
      },
    });

    await step({
      name: "availability",
      arrive: section("availability"),
      key: () => [h1(t(L, "availability.title")), button(lead(L, "availability.preview.toggle"))],
    });

    await step({
      name: "practice ID card",
      arrive: section("card"),
      key: () => [h1(t(L, "idCard.title")), button(t(L, "idCard.download.front"))],
    });

    await step({
      name: "inbox",
      arrive: section("inbox"),
      key: () => [h1(t(L, "inbox.title")), visibleLink(page, L, "/professional/inbox/int_003")],
    });

    await step({
      name: "introduction request",
      arrive: async () => {
        await visibleLink(page, L, "/professional/inbox/int_003").click();
        await page.waitForURL(`**/${L}/professional/inbox/int_003`);
      },
      key: () => page.getByRole("heading", { level: 1 }),
    });

    await step({
      name: "membership",
      arrive: section("membership"),
      key: () => [h1(t(L, "membership.title")), button(t(L, "membership.choose.subscribe"))],
    });

    await step({
      name: "payouts",
      arrive: section("payouts"),
      key: () => [h1(t(L, "payouts.title.notStarted")), button(t(L, "payouts.stripe.setUp"))],
    });

    await step({
      name: "shared summaries",
      arrive: section("shared"),
      key: () => h1(t(L, "shared.title")),
    });
  });
}
