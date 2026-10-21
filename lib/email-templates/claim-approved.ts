// Claim approved: an admin verified the doctor (screen 38, task 2.8). Says the profile is live, when it was verified and when the
// next check is due (rule A2), and the two steps before patients can book: weekly hours (the one button) and payouts.
import { formatDate } from "@/lib/format";
import { defineTemplate, nameIn } from "./parts";
import { translator } from "./messages";
import { plain, rich, urlLink } from "./rich";
import { emailColors } from "./theme";

export type ClaimApprovedData = {
  doctor: { nameEn: string; nameAr: string; specialtyEn: string; specialtyAr: string };
  approvedAt: Date;
  /** The doctor's IANA zone. */
  timeZone: string;
  /** Calendar date of the next re-verification (licence expiry or business.verifiedReverifyMonths, whichever is first), UTC midnight. */
  nextCheckOn: Date;
  /** The availability page in the portal. */
  availabilityUrl: string;
  /** The public profile. */
  profileUrl: string;
};

export const claimApprovedEmail = defineTemplate<ClaimApprovedData>((locale, data) => {
  const t = translator(locale, "email.claimApproved");
  const name = nameIn(locale, data.doctor);
  return {
    locale,
    subject: t("subject", { name }),
    preheader: t("preheader"),
    headline: t("headline"),
    blocks: [
      { kind: "p", text: plain(t("intro")) },
      {
        kind: "facts",
        title: t("factsTitle"),
        rows: [
          { label: t("name"), value: plain(name) },
          { label: t("specialty"), value: plain(locale === "ar" ? data.doctor.specialtyAr : data.doctor.specialtyEn) },
          { label: t("verifiedOn"), value: plain(formatDate(data.approvedAt, data.timeZone, locale)) },
          // A calendar date, not an instant: formatted in UTC so no zone moves it a day (as the card's verified-on date).
          { label: t("nextCheck"), value: plain(formatDate(data.nextCheckOn, "UTC", locale)) },
        ],
      },
      {
        kind: "list",
        title: t("nextTitle"),
        items: [
          { title: t("hours.title"), body: plain(t("hours.body")) },
          { title: t("payouts.title"), body: plain(t("payouts.body")) },
        ],
      },
      { kind: "button", label: t("button"), href: data.availabilityUrl },
      { kind: "p", text: rich(t, "profile", {}, { url: urlLink(data.profileUrl, emailColors["sea-700"]) }) },
      { kind: "p", text: plain(t("recheck")), muted: true },
    ],
    footer: [plain(t("footer"))],
  };
});

export const { subject, preheader, render } = claimApprovedEmail;
