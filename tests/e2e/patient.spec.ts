// Patient journey (task 4.3), both locales, phone and desktop: home, intake chat, search, profile, slot picker, checkout,
// confirmation, bookings, receipts, records upload, summary, sharing, settings. The booking half is walked by clicking, the
// way a patient gets there (profile slot -> picker answers -> hold -> checkout details -> pay -> confirmation); the portal half
// goes through the portal navigation. Every step checks its key element, console and page errors, horizontal overflow and dir.
import { expect, isPhone, journey, portalNav as goToSection, test, visibleLink as linkTo } from "./support/app";
import { LOCALES, doctorName, lead, t } from "./support/i18n";

const DOCTOR = "doc_002"; // Dr Omar Khalil: verified, sees children, video and phone; the demo booking lands on bk_004

/** A tiny synthetic two-page PDF (no patient data): enough for the upload flow to count its pages. */
const SYNTHETIC_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n" +
    "3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n4 0 obj << /Type /Page /Parent 2 0 R >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
  "latin1",
);

for (const L of LOCALES) {
  test(`patient journey ${L}`, async ({ page, watch }) => {
    const step = journey(page, watch, L);
    const h1 = (name: string) => page.getByRole("heading", { level: 1, name });
    const visibleLink = (path: string) => linkTo(page, L, path);
    // Radio cards keep the input visually hidden inside its label (RadioCard): a person taps the label, so the test does too.
    const choose = async (name: string, value: string) => {
      const input = page.locator(`input[name="${name}"][value="${value}"]`);
      await page.locator("label").filter({ has: input }).filter({ visible: true }).first().click();
      await expect(input).toBeChecked();
    };
    const portalNav = (section: string) => () => goToSection(page, L, "patient", section);

    await step({ name: "home", path: "/", key: () => h1(t(L, "home.title")) });

    await step({
      name: "intake chat",
      arrive: async () => {
        await page.locator('a[href$="?chat=1"]').first().click();
        await page.waitForURL(/\?chat=1$/);
      },
      key: () => page.getByRole("dialog", { name: t(L, "intake.title") }),
    });
    await step({ name: "intake chat at /intake", path: "/intake", key: () => h1(t(L, "intake.title")), blockedBy: "KD-001" });

    await step({
      name: "search",
      path: "/search",
      key: () => [h1(t(L, "search.title")), visibleLink(`/doctors/${DOCTOR}`)],
    });

    await step({
      name: "profile",
      arrive: async () => {
        await visibleLink(`/doctors/${DOCTOR}`).click();
        await page.waitForURL(`**/${L}/doctors/${DOCTOR}`);
      },
      key: () => [h1(doctorName(L, DOCTOR)), page.locator(`a[href*="/book/${DOCTOR}?slot="]:visible`).first()],
    });

    await step({
      name: "slot picker",
      arrive: async () => {
        await page.locator(`a[href*="/book/${DOCTOR}?slot="]:visible`).first().click();
        await page.waitForURL(`**/${L}/book/${DOCTOR}?slot=*`);
      },
      key: () => h1(t(L, "book.title")),
      then: async () => {
        await expect(page.locator('input[name="slot"]:checked'), "the slot from the profile is chosen").toHaveCount(1);
        await choose("visit", "video");
        await choose("forWhom", "child");
        await choose("ageGroup", "child");
        await page.locator("#book-reason").fill(L === "ar" ? "ألم في الأذن منذ ثلاثة أيام" : "Ear pain for three days");
      },
    });

    await step({
      name: "checkout",
      arrive: async () => {
        await page.getByRole("button", { name: t(L, "common.continue"), exact: true }).filter({ visible: true }).first().click();
        await page.waitForURL(`**/${L}/book/${DOCTOR}/pay?*`);
      },
      key: () => [h1(t(L, "checkout.title")), page.getByRole("button", { name: lead(L, "checkout.pay.button") }).filter({ visible: true }).first()],
      then: async () => {
        await page.locator("#book-location").selectOption("SA");
        await page.locator("#book-phone").fill("501234567");
        await page.locator("#book-telehealth").check();
        await page.locator("#book-cancellation").check();
      },
    });

    await step({
      name: "confirmation",
      arrive: async () => {
        await page.getByRole("button", { name: lead(L, "checkout.pay.button") }).filter({ visible: true }).first().click();
        await page.waitForURL(`**/${L}/patient/bookings/bk_004?state=confirmed*`);
      },
      key: () => [h1(t(L, "booking.title")), page.locator('a[href$="/calendar.ics"]').first()],
    });

    await step({
      name: "bookings",
      arrive: portalNav("bookings"),
      key: () => [h1(t(L, "bookings.title")), visibleLink("/patient/bookings/bk_004")],
    });

    await step({
      name: "receipts",
      arrive: portalNav("receipts"),
      key: () => [h1(t(L, "receipts.title")), visibleLink("/patient/receipts/bk_004")],
    });

    await step({
      name: "receipt",
      arrive: async () => {
        await visibleLink("/patient/receipts/bk_004").click();
        await page.waitForURL(`**/${L}/patient/receipts/bk_004`);
      },
      key: () => page.getByRole("heading", { level: 1 }),
    });

    await step({
      name: "records upload",
      arrive: portalNav("records"),
      key: () => h1(t(L, "records.title")),
      then: async () => {
        const input = page.locator(isPhone(page) ? "#records-choose-phone" : "#records-choose");
        await input.setInputFiles({ name: "synthetic-lab-results.pdf", mimeType: "application/pdf", buffer: SYNTHETIC_PDF });
        await expect(page.getByText("synthetic-lab-results.pdf").first(), "the added file is listed").toBeVisible();
        await expect(page.getByRole("heading", { name: t(L, "records.file.listTitle") })).toBeVisible();
      },
    });

    await step({
      name: "summary",
      arrive: async () => {
        await visibleLink("/patient/records/rs_001/summary").click();
        await page.waitForURL(`**/${L}/patient/records/rs_001/summary`);
      },
      key: () => [h1(t(L, "patientSummary.title")), visibleLink("/patient/records/rs_001/summary?tab=timeline")],
    });

    await step({
      name: "sharing",
      arrive: portalNav("sharing"),
      key: () => h1(t(L, "sharing.title")),
      then: async () => {
        await page.getByRole("button", { name: t(L, "sharing.list.share") }).filter({ visible: true }).first().click();
        const sheet = page.getByRole("dialog").filter({ visible: true });
        await expect(sheet, "the share sheet opens").toBeVisible();
        await page.keyboard.press("Escape");
        await expect(sheet, "Escape closes the share sheet").toHaveCount(0);
      },
    });

    await step({
      name: "settings",
      arrive: portalNav("settings"),
      key: () => [h1(t(L, "settings.title")), page.locator('input[name="settings-language"]').first()],
    });
  });
}
