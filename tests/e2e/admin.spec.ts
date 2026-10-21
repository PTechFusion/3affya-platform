// Admin journey (task 4.3), both locales, phone and desktop: sign-in with its three factors (work email, emailed code,
// authenticator code) into the review queue, a claim's detail, listings with the suspend sheet, specialties, removals, members,
// payments, AI jobs, outreach and the audit log through the portal navigation. Nothing is written: the sheet is opened and
// left with "Keep listed".
import { expect, journey, portalNav, test, visibleLink } from "./support/app";
import { LOCALES, doctorName, lead, t } from "./support/i18n";

for (const L of LOCALES) {
  test(`admin journey ${L}`, async ({ page, watch }) => {
    const step = journey(page, watch, L);
    const h1 = (name: string) => page.getByRole("heading", { level: 1, name });
    const button = (name: string, exact = false) => page.getByRole("button", { name, exact }).filter({ visible: true }).first();
    const section = (name: string) => () => portalNav(page, L, "admin", name);
    const continueLabel = t(L, "common.continue");

    await step({
      name: "admin login",
      path: "/admin/login",
      key: () => [h1(t(L, "adminLogin.email.title")), page.locator('input[name="email"]')],
      then: async () => {
        await page.locator('input[name="email"]').fill("ops@example.com");
        await button(continueLabel, true).click();
        await expect(page.getByRole("heading", { name: t(L, "adminLogin.code.title") })).toBeVisible();
        await page.locator('input[name="email-code"]').fill("482913");
        await button(continueLabel, true).click();
        await expect(page.getByRole("heading", { name: t(L, "adminLogin.totp.title") })).toBeVisible();
        await page.locator('input[name="totp"]').fill("123456");
        await button(t(L, "adminLogin.signIn"), true).click();
      },
    });

    await step({
      name: "review queue",
      arrive: () => page.waitForURL(`**/${L}/admin/review`),
      key: () => [h1(t(L, "adminReview.title")), visibleLink(page, L, "/admin/review/doc_009")],
    });

    await step({
      name: "review detail",
      arrive: async () => {
        await visibleLink(page, L, "/admin/review/doc_009").click();
        await page.waitForURL(`**/${L}/admin/review/doc_009`);
      },
      key: () => [h1(doctorName(L, "doc_009")), page.locator('input[name="outcome"]').first()],
    });

    await step({
      name: "listings",
      arrive: section("listings"),
      key: () => [h1(t(L, "adminListings.title")), visibleLink(page, L, "/admin/listings?edit=doc_004")],
      then: async () => {
        await visibleLink(page, L, "/admin/listings?edit=doc_004").click();
        await page.waitForURL(`**/${L}/admin/listings?edit=doc_004`);
        const drawer = page.getByRole("dialog").filter({ visible: true });
        await expect(drawer, "the listing drawer opens").toBeVisible();
        await drawer.getByRole("button", { name: t(L, "adminListings.drawer.suspend.open") }).click();
        await expect(drawer.getByText(lead(L, "adminListings.drawer.suspend.confirmTitle")).first(), "the suspend question").toBeVisible();
        await expect(drawer.locator("#listing-suspend-reason"), "the reason field").toBeVisible();
        await drawer.getByRole("button", { name: t(L, "adminListings.drawer.suspend.keep") }).click();
        await expect(drawer.locator("#listing-suspend-reason"), "Keep listed closes the question").toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(drawer, "Escape closes the drawer").toHaveCount(0);
      },
    });

    await step({ name: "specialties", arrive: section("specialties"), key: () => h1(t(L, "adminSpecialties.title")) });

    await step({
      name: "removals",
      arrive: section("removals"),
      key: () => [h1(t(L, "adminRemovals.title")), visibleLink(page, L, "/admin/removals/rm_001")],
    });

    await step({ name: "members", arrive: section("members"), key: () => h1(t(L, "adminMembers.title")) });

    await step({
      name: "payments",
      arrive: section("payments"),
      key: () => [h1(t(L, "adminPayments.title")), visibleLink(page, L, "/admin/payments/export.csv")],
    });

    await step({
      name: "AI jobs",
      arrive: section("ai-jobs"),
      key: () => [h1(t(L, "adminAiJobs.title")), visibleLink(page, L, "/admin/ai-jobs/job_004")],
    });

    await step({ name: "outreach", arrive: section("outreach"), key: () => h1(t(L, "adminOutreach.title")) });

    await step({ name: "audit log", arrive: section("audit"), key: () => h1(t(L, "adminAudit.title")) });
  });
}
