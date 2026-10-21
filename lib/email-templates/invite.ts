// Claim invite (task 2.3 sends it, ADR-10: one doctor, one address, one email at a time, only once counsel clears sending).
// The copy is claim-invite-copy.ts, the same lines screen 46 previews; this module only lays them out. The personal line is the
// admin's own words, shown as written (dir="auto").
import type { SampleDoctor } from "@/lib/sample";
import { claimEmailCopy } from "./claim-invite-copy";
import type { Block } from "./layout";
import { defineTemplate } from "./parts";
import { ltr, plain } from "./rich";

export type InviteData = {
  /** The registry row the invite is about (task 1.5 replaces the sample shape with the professionals row). */
  doctor: SampleDoctor;
  /** When the one-time link stops working (outreach.inviteValidDays after sending). */
  expiresAt: Date;
  /** The claim link with its one-time token. */
  claimUrl: string;
  /** The admin's optional note at the top (outreach.personalLineMaxChars). */
  personalLine?: string;
};

export const inviteEmail = defineTemplate<InviteData>((locale, data) => {
  const copy = claimEmailCopy(locale, data.doctor, data.expiresAt);
  const line = data.personalLine?.trim();
  const note: Block[] = line ? [{ kind: "quote", caption: copy.noteFrom, body: line }] : [];
  return {
    locale,
    subject: copy.subject,
    preheader: copy.preheader,
    headline: copy.headline,
    blocks: [
      ...note,
      { kind: "p", text: plain(copy.intro) },
      {
        kind: "facts",
        title: copy.factsTitle,
        rows: copy.facts.map((f) => ({ label: f.label, value: f.ltr ? ltr(f.value) : plain(f.value) })),
      },
      { kind: "p", text: plain(copy.gives) },
      { kind: "p", text: plain(copy.scrutiny) },
      { kind: "button", label: copy.button, href: data.claimUrl },
      { kind: "p", text: plain(copy.expiry), muted: true },
    ],
    footer: [plain(copy.notMe), plain(copy.why), plain(copy.optOut)],
  };
});

export const { subject, preheader, render } = inviteEmail;
