// lib/inbox.ts (rule F7): an "Open Gmail" style link for the email-code step.
import { describe, expect, it } from "vitest";
import { inboxLinksFor } from "@/lib/inbox";

describe("inboxLinksFor", () => {
  it.each([
    ["noura@gmail.com", "gmail"],
    ["noura@googlemail.com", "gmail"],
    ["noura@hotmail.com", "outlook"],
    ["noura@live.com", "outlook"],
    ["noura@ymail.com", "yahoo"],
    ["noura@me.com", "icloud"],
  ])("%s opens %s", (email, provider) => {
    expect(inboxLinksFor(email)).toEqual([expect.objectContaining({ provider })]);
  });

  it("ignores case and surrounding spaces", () => {
    expect(inboxLinksFor("  Noura@GMAIL.com ")).toEqual([{ provider: "gmail", href: "https://mail.google.com/mail/u/0/#inbox" }]);
  });

  it("offers Gmail and Outlook for a practice or work domain, and for an address without a domain", () => {
    for (const email of ["dr.omar@clinic.example.com", "noura", ""]) {
      expect(inboxLinksFor(email).map((l) => l.provider)).toEqual(["gmail", "outlook"]);
    }
  });

  it("links only to https inbox pages", () => {
    for (const email of ["a@gmail.com", "a@outlook.com", "a@yahoo.com", "a@icloud.com", "a@work.example"]) {
      for (const link of inboxLinksFor(email)) expect(new URL(link.href).protocol).toBe("https:");
    }
  });
});
