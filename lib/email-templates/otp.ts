// One-time sign-in code: patient and professional sign-in (screen 18), the claim code (screen 9) and the admin's emailed code
// (screen 37, step two of three). Supabase Auth issues the code; this template is what its send-email hook renders, so the code
// arrives in the reader's language and direction (L7 wires the hook). The code never goes in the subject or the preheader,
// which lock screens show; the subject still says what the email is (rule E1). The code sits in an LTR isolate (R3, E4).
import { formatTimeInZone } from "@/lib/format";
import { defineTemplate, duration } from "./parts";
import type { Block } from "./layout";
import { translator } from "./messages";
import { plain } from "./rich";

export type OtpPurpose = "signIn" | "claim" | "admin";

export type OtpData = {
  purpose: OtpPurpose;
  /** The digits as issued (business.otpDigits long). */
  code: string;
  /** signInLimits.codeValidMinutes, or adminSignIn.emailCodeValidMinutes for the admin step. */
  validMinutes: number;
  requestedAt: Date;
  /** The reader's IANA zone, for the time the code stops working. */
  timeZone: string;
};

export const otpEmail = defineTemplate<OtpData>((locale, data) => {
  const t = translator(locale, "email.otp");
  const until = new Date(data.requestedAt.getTime() + data.validMinutes * 60_000);
  const time = formatTimeInZone(until, data.timeZone, locale);
  const purpose = data.purpose;
  const admin: Block[] = purpose === "admin" ? [{ kind: "p", text: plain(t("admin")) }] : [];
  return {
    locale,
    subject: t("subject", { purpose }),
    preheader: t("preheader", { time }),
    headline: t("headline", { purpose }),
    blocks: [
      { kind: "p", text: plain(t("intro")) },
      {
        kind: "code",
        label: t("codeLabel"),
        code: data.code,
        caption: plain(t("valid", { duration: duration(locale, "minutes", data.validMinutes), time })),
      },
      ...admin,
      { kind: "p", text: plain(t("notYou")), muted: true },
      { kind: "p", text: plain(t("never")), muted: true },
    ],
    footer: [plain(t("footer", { purpose }))],
  };
});

export const { subject, preheader, render } = otpEmail;
