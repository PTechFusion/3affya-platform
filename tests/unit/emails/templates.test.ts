// Screen 49 / task 2.9: every template in both locales, the rules the emails carry (E1 to E4, T4, R3, N1), and that the claim
// invite is the one copy screen 46 previews. Run: npx vitest run --config tests/unit/emails/vitest.config.ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { business } from "@/config/business";
import { formatMoney, formatZone, type Locale } from "@/lib/format";
import { fullRefundDeadline } from "@/lib/refunds";
import { sampleAdmin } from "@/lib/sample";
import { getTemplate, templateNames, type TemplateName } from "@/lib/email-templates";
import { claimEmailCopy } from "@/lib/email-templates/claim-invite-copy";
import { renderEmail, type EmailContent } from "@/lib/email-templates/layout";
import { ltr, rich, type Translate } from "@/lib/email-templates/rich";
import { translator } from "@/lib/email-templates/messages";
import { dayAndTime, duration } from "@/lib/email-templates/parts";
import { sampleEmailData, templateVariants } from "@/lib/email-templates/samples";
import { emailColors, emailFont, emailRadius } from "@/lib/email-templates/theme";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const locales: Locale[] = ["ar", "en"];
const NOW = new Date("2026-11-09T09:00:00Z");

/** Every (template, variant) pair the preview offers. */
const cases = templateNames.flatMap((name) => {
  const variants = templateVariants[name] as readonly string[];
  return (variants.length ? variants : [undefined]).map((variant) => ({ name, variant }));
});

function renderCase<N extends TemplateName>(name: N, locale: Locale, variant?: string) {
  const data = sampleEmailData(name, locale, variant, NOW);
  const t = getTemplate(name);
  return {
    data,
    subject: t.subject(locale, data),
    preheader: t.preheader(locale, data),
    ...t.render(locale, data, { assetsBaseUrl: "https://3affya.example" }),
    attachments: t.attachments(locale, data),
  };
}

const label = (c: { name: string; variant?: string }, locale: Locale) => `${c.name}${c.variant ? `/${c.variant}` : ""} ${locale}`;

describe("every template renders in both locales", () => {
  for (const c of cases) {
    for (const locale of locales) {
      it(label(c, locale), () => {
        const r = renderCase(c.name, locale, c.variant);
        expect(r.html.startsWith("<!DOCTYPE html>")).toBe(true);
        expect(r.html).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
        // 600 px single column: the card table is 600 wide and fluid below it.
        expect(r.html).toContain('width="600"');
        expect(r.html).toContain("max-width:600px");
        expect(r.text.length).toBeGreaterThan(100);
        // Footer: the postal address line and the support email, from config.
        expect(r.html).toContain(business.supportEmail);
        expect(r.text).toContain(business.supportEmail);
        expect(r.text).toContain(translator(locale, "footer")("address"));
        // At most one button.
        expect(r.html.split("mso-padding-alt").length - 1).toBeLessThanOrEqual(1);
      });
    }
  }
});

describe("subject and preheader (rule E1)", () => {
  for (const c of cases) {
    for (const locale of locales) {
      it(label(c, locale), () => {
        const { subject, preheader, html } = renderCase(c.name, locale, c.variant);
        for (const line of [subject, preheader]) {
          expect(line.trim().length).toBeGreaterThan(10);
          // No unreviewed-marker, key path, placeholder or rich-value marker leaks into what the inbox shows.
          expect(line).not.toMatch(/needs_review|email\.|adminOutreach\.|[{}]|[\uE000\uE001]/);
          expect(line.toLowerCase()).not.toContain("view in browser");
        }
        expect(preheader).not.toBe(subject);
        // The preheader is the first text in the body, hidden, so inbox previews show it.
        expect(html.indexOf(preheader.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;"))).toBeGreaterThan(-1);
      });
    }
  }

  it("states the content: the booking subject names the doctor and the time in the patient's zone", () => {
    const { subject, data } = renderCase("bookingConfirmed", "en", "patient");
    if (data.audience !== "patient") throw new Error("patient sample expected");
    expect(subject).toContain(data.doctor.nameEn);
    expect(subject).toContain(formatZone(data.startsAt, data.patientTimeZone));
    expect(subject).toMatch(/confirmed/);
  });

  it("states the content: the refund subject carries the amount", () => {
    const { subject, data } = renderCase("refund", "en", "patientEarly");
    expect(subject).toContain(formatMoney(data.refund.amountCents, data.receipt.currency, "en"));
  });

  it("the sign-in code is never in the subject or the preheader (lock screens show both)", () => {
    for (const locale of locales) {
      const { subject, preheader, data } = renderCase("otp", locale, "signIn");
      expect(subject).not.toContain(data.code);
      expect(preheader).not.toContain(data.code);
    }
  });
});

describe("right to left and digits (rules E4, R3, N1)", () => {
  for (const c of cases) {
    it(`${label(c, "ar")}: dir="rtl" on every cell, Arabic at 16 px or more, Western digits`, () => {
      const r = renderCase(c.name, "ar", c.variant);
      const cells = r.html.match(/<td\b[^>]*>/g) ?? [];
      expect(cells.length).toBeGreaterThan(5);
      for (const td of cells) expect(td).toContain('dir="rtl"');
      const sizes = [...r.html.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
      expect(sizes.length).toBeGreaterThan(0);
      for (const px of sizes) expect(px).toBeGreaterThanOrEqual(16);
      for (const s of [r.subject, r.preheader, r.html, r.text]) expect(s).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    });
  }

  it("the OTP code sits in an LTR isolate in both locales", () => {
    for (const locale of locales) {
      for (const variant of templateVariants.otp) {
        const r = renderCase("otp", locale, variant);
        expect(r.html).toMatch(new RegExp(`<span dir="ltr" style="[^"]*unicode-bidi:isolate[^"]*">${r.data.code}</span>`));
        expect(r.text).toContain(r.data.code);
      }
    }
  });

  it("the booking code (receipt number) sits in an LTR isolate in both locales", () => {
    for (const locale of locales) {
      const r = renderCase("bookingConfirmed", locale, "patient");
      if (r.data.audience !== "patient") throw new Error("patient sample expected");
      expect(r.html).toMatch(new RegExp(`<span dir="ltr" style="[^"]*unicode-bidi:isolate[^"]*">${r.data.receipt.number}</span>`));
    }
  });

  it("English emails are left to right on every cell", () => {
    const r = renderCase("refund", "en", "doctor");
    for (const td of r.html.match(/<td\b[^>]*>/g) ?? []) expect(td).toContain('dir="ltr"');
  });
});

describe("booking confirmation (rules E2, P6, E3)", () => {
  for (const locale of locales) {
    it(`names both zones, to the patient and to the doctor (${locale})`, () => {
      for (const variant of ["patient", "professional"]) {
        const r = renderCase("bookingConfirmed", locale, variant);
        const zones = [formatZone(r.data.startsAt, r.data.patientTimeZone), formatZone(r.data.startsAt, r.data.doctorTimeZone)];
        expect(zones[0]).not.toBe(zones[1]);
        for (const zone of zones) {
          expect(r.html).toContain(zone);
          expect(r.text).toContain(zone);
        }
      }
    });

    it(`carries the receipt as reviewed: total, the three lines, the last 4 digits (${locale})`, () => {
      const r = renderCase("bookingConfirmed", locale, "patient");
      if (r.data.audience !== "patient") throw new Error("patient sample expected");
      const money = (cents: number) => formatMoney(cents, r.data.audience === "patient" ? r.data.receipt.currency : "USD", locale);
      const { receipt } = r.data;
      const lines = translator(locale, "receipts.detail.lines");
      for (const key of ["doctorFee", "platformFee", "cardProcessing", "total"]) expect(r.text).toContain(lines(key));
      for (const cents of [receipt.doctorFeeCents, receipt.platformFeeCents, receipt.cardProcessingCents, receipt.totalCents]) {
        expect(r.text).toContain(money(cents));
      }
      expect(r.text).toContain(receipt.method.last4);
    });

    it(`attaches the visit as an .ics, identical on a resend (${locale})`, () => {
      for (const variant of ["patient", "professional"]) {
        const first = renderCase("bookingConfirmed", locale, variant);
        expect(first.attachments).toHaveLength(1);
        expect(first.attachments[0]?.filename).toMatch(/\.ics$/);
        expect(first.attachments[0]?.content).toContain("BEGIN:VEVENT");
        // A retried send renders the same data again: the file must be byte-identical (Resend refuses a reused key otherwise).
        const again = getTemplate("bookingConfirmed").attachments(locale, first.data);
        expect(again).toEqual(first.attachments);
      }
    });

    // Review fix: lead time (2 h by default) is shorter than the refund cutoff (24 h), so a visit can be booked after its
    // full-refund deadline. The preheader then promised "Cancel before <a time already past> for a full refund" while the body
    // said the visit is not refunded.
    it(`a visit booked inside the refund cutoff promises no refund, in the preheader or the body (${locale})`, () => {
      const data = sampleEmailData("bookingConfirmed", locale, "patient", NOW);
      if (data.audience !== "patient") throw new Error("patient sample expected");
      const t = getTemplate("bookingConfirmed");
      const cutoff = duration(locale, "hours", business.fullRefundCutoffHours);
      const late = { ...data, receipt: { ...data.receipt, paidAt: new Date(data.startsAt.getTime() - 3 * 3_600_000) } };
      const lateDeadline = dayAndTime(fullRefundDeadline(late.startsAt), late.patientTimeZone, locale);
      const latePreheader = t.preheader(locale, late);
      const lateText = t.render(locale, late).text;
      expect(latePreheader).not.toContain(lateDeadline);
      expect(lateText).not.toContain(lateDeadline);
      expect(latePreheader).toContain(cutoff);
      expect(lateText).toContain(translator(locale, "email.bookingConfirmed.patient")("changeLate", { cutoff }));
      // Booked well ahead: the deadline is promised in both places.
      const earlyDeadline = dayAndTime(fullRefundDeadline(data.startsAt), data.patientTimeZone, locale);
      expect(t.preheader(locale, data)).toContain(earlyDeadline);
      expect(t.render(locale, data).text).toContain(earlyDeadline);
    });
  }
});

describe("refund mirrors the receipt (rule E3)", () => {
  for (const locale of locales) {
    for (const variant of templateVariants.refund) {
      it(`${variant} ${locale}`, () => {
        const r = renderCase("refund", locale, variant);
        const { receipt, refund } = r.data;
        const money = (cents: number) => formatMoney(cents, receipt.currency, locale);
        const lines = translator(locale, "receipts.detail.lines");
        for (const key of ["doctorFee", "platformFee", "cardProcessing"]) expect(r.text).toContain(lines(key));
        for (const cents of [receipt.doctorFeeCents, receipt.platformFeeCents, receipt.cardProcessingCents]) expect(r.text).toContain(money(cents));
        expect(refund.amountCents).toBe(receipt.totalCents);
        // The refunded total is the most prominent figure: it is the first amount in the body, at display size.
        const total = money(refund.amountCents);
        expect(r.html).toMatch(new RegExp(`font-size:30px[^>]*>${total.replace(/[.$]/g, "\\$&")}</p>`));
        expect(r.text).toContain(receipt.method.last4);
        expect(r.html).toMatch(new RegExp(`<span dir="ltr" style="[^"]*">${receipt.number}</span>`));
        // Both times of the cancelled visit.
        expect(r.text).toContain(formatZone(r.data.startsAt, r.data.patientTimeZone));
        expect(r.text).toContain(formatZone(r.data.startsAt, r.data.doctorTimeZone));
      });
    }
  }
});

describe("AI-generated lines are labelled (rule T4)", () => {
  for (const locale of locales) {
    it(`the shared summary line carries the AI label first, then the review status (${locale})`, () => {
      const r = renderCase("bookingConfirmed", locale, "professional");
      if (r.data.audience !== "professional") throw new Error("professional sample expected");
      expect(r.data.sharedSummary).not.toBeNull();
      const ti = translator(locale, "inbox");
      const aiLabel = ti("detail.summaryAi");
      const title = translator(locale, "email.bookingConfirmed.professional")("summaryTitle");
      expect(r.html.indexOf(aiLabel)).toBeGreaterThan(-1);
      expect(r.html.indexOf(aiLabel)).toBeLessThan(r.html.indexOf(title));
      expect(r.text).toContain(`[${aiLabel} · `);
    });
  }

  it("no AI label where nothing came from AI", () => {
    const r = renderCase("bookingConfirmed", "en", "patient");
    expect(r.html).not.toContain(translator("en", "inbox")("detail.summaryAi"));
  });

  it("the layout refuses an AI block without a label, and a second button", () => {
    const base: EmailContent = { locale: "en", subject: "s", preheader: "p", headline: "h", blocks: [], footer: [] };
    expect(() => renderEmail({ ...base, blocks: [{ kind: "ai", label: " ", status: "x", title: "t", body: { html: "b", text: "b" } }] })).toThrow(/T4/);
    expect(() =>
      renderEmail({ ...base, blocks: [{ kind: "button", label: "a", href: "https://x" }, { kind: "button", label: "b", href: "https://y" }] }),
    ).toThrow(/one/);
  });
});

describe("the claim invite is screen 46's copy (no second claim-invite email)", () => {
  for (const locale of locales) {
    it(locale, () => {
      const r = renderCase("invite", locale, "plain");
      const copy = claimEmailCopy(locale, r.data.doctor, r.data.expiresAt);
      expect(r.subject).toBe(copy.subject);
      expect(r.preheader).toBe(copy.preheader);
      for (const line of [copy.headline, copy.intro, copy.gives, copy.scrutiny, copy.button, copy.expiry, copy.notMe, copy.why, copy.optOut]) {
        expect(r.text).toContain(line);
      }
      for (const f of copy.facts) expect(r.text).toContain(`${f.label}: ${f.value}`);
    });
  }

  // Review fix: the personal line was always attributed to the sample admin (lib/sample sampleAdmin) and the expiry was put in
  // a zone looked up in sample data, whatever the caller passed; a real send could not name the admin who wrote the note.
  it("names the admin who wrote the personal line, and puts the expiry in the zone the caller gives", () => {
    for (const locale of locales) {
      const data = sampleEmailData("invite", locale, "note", NOW);
      const admin = { nameEn: "Test Admin Two", nameAr: "مشرف تجريبي" };
      const r = getTemplate("invite").render(locale, { ...data, admin, timeZone: "Asia/Tokyo" });
      expect(r.text).toContain(locale === "ar" ? admin.nameAr : admin.nameEn);
      expect(r.text).not.toContain(locale === "ar" ? sampleAdmin.nameAr : sampleAdmin.nameEn);
      expect(r.text).toContain(formatZone(data.expiresAt, "Asia/Tokyo"));
    }
  });

  it("the outreach screen reads this copy: one claim-invite email in the codebase", () => {
    const compose = readFileSync(new URL("../../../app/[locale]/admin/outreach/_parts/ComposeView.tsx", import.meta.url), "utf8");
    expect(compose).toContain('from "@/lib/email-templates/claim-invite-copy"');
    expect(existsSync(new URL("../../../app/[locale]/admin/outreach/_parts/email-copy.ts", import.meta.url))).toBe(false);
  });

  it("shows the admin's personal line as written, escaped", () => {
    const data = sampleEmailData("invite", "en", "plain", NOW);
    const r = getTemplate("invite").render("en", { ...data, personalLine: 'See you <script>alert("x")</script> & thanks' });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).toContain('dir="auto"');
  });

  it("escapes the reviewer's reason, the requester's name and a doctor's name the same way", () => {
    const script = '<script>alert("x")</script>';
    const rejected = sampleEmailData("claimRejected", "en", "licence", NOW);
    const r1 = getTemplate("claimRejected").render("en", { ...rejected, reasonEn: `Blurred ${script}`, reasonAr: `غير واضح ${script}` });
    const removal = sampleEmailData("removalConfirmed", "en", "plain", NOW);
    const r2 = getTemplate("removalConfirmed").render("en", { ...removal, requesterName: `Sam ${script}` });
    const approved = sampleEmailData("claimApproved", "en", "plain", NOW);
    const r3 = getTemplate("claimApproved").render("en", { ...approved, doctor: { ...approved.doctor, nameEn: `Dr ${script}` } });
    for (const r of [r1, r2, r3]) {
      expect(r.html).not.toContain("<script>");
      expect(r.html).toContain("&lt;script&gt;");
    }
    const ar = getTemplate("claimRejected").render("ar", { ...rejected, reasonEn: "x", reasonAr: `غير واضح ${script}` });
    expect(ar.html).not.toContain("<script>");
  });

  it("a data value cannot name a rich part", () => {
    const t: Translate = (_key, values) => `Hello ${values?.name}, see ${values?.link}`;
    const r = rich(t, "any", { name: "\uE000link\uE001" }, { link: ltr("https://example.com") });
    expect(r.text).toBe("Hello link, see https://example.com");
    expect(r.html).toContain("Hello link, see ");
  });
});

describe("pure: the same data renders the same bytes (safe retries under one idempotency key)", () => {
  it("does not read the clock", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(NOW);
      const before = cases.map((c) => ({ c, data: sampleEmailData(c.name, "ar", c.variant, NOW) }));
      const first = before.map(({ c, data }) => {
        const t = getTemplate(c.name) as ReturnType<typeof getTemplate<TemplateName>>;
        return JSON.stringify([t.subject("ar", data as never), t.render("ar", data as never), t.attachments("ar", data as never)]);
      });
      vi.setSystemTime(new Date(NOW.getTime() + 3 * 3_600_000));
      const second = before.map(({ c, data }) => {
        const t = getTemplate(c.name) as ReturnType<typeof getTemplate<TemplateName>>;
        return JSON.stringify([t.subject("ar", data as never), t.render("ar", data as never), t.attachments("ar", data as never)]);
      });
      expect(second).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("copy and tokens", () => {
  it("every email.* key exists in both catalogues", () => {
    const flat = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(flat(ar.email).sort()).toEqual(flat(en.email).sort());
  });

  it("a missing key throws instead of sending its path", () => {
    expect(() => translator("en", "email.otp")("noSuchKey")).toThrow();
  });

  it("colours, radii and the font match the tokens in app/globals.css", () => {
    const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
    for (const [token, hex] of Object.entries(emailColors)) {
      expect(css.toLowerCase()).toContain(`--color-${token}: ${hex};`);
    }
    for (const [token, value] of Object.entries(emailRadius)) expect(css).toContain(`--radius-${token}: ${value};`);
    const sans = /--font-sans:\s*([^;]+);/.exec(css)?.[1]?.replace(/"/g, "'").replace(/,\s+/g, ",");
    expect(sans).toBe(emailFont);
  });
});
