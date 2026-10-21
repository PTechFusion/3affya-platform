// Claim rejected: an admin sent the claim back with a reason (screen 38, task 2.8). The key block is the reviewer's own words,
// in Arabic when the admin wrote an Arabic version and the doctor reads Arabic, otherwise the English as written (screen 38's
// form). One button: replace the file; everything else the doctor entered is kept and the claim is resubmittable.
import type { CredentialKind } from "@/lib/sample";
import { formatDate } from "@/lib/format";
import { dateAndTime, defineTemplate, nameIn } from "./parts";
import { translator } from "./messages";
import { ltr, plain } from "./rich";

export type ClaimRejectedData = {
  doctor: { nameEn: string; nameAr: string };
  reviewedAt: Date;
  /** The doctor's IANA zone. */
  timeZone: string;
  /** What needs fixing (screen 38's choice). */
  fix: CredentialKind;
  /** The file the reason is about, when the reason is about one file. */
  fileName: string | null;
  reasonEn: string;
  reasonAr: string | null;
  /** The doctor's profile builder in the portal. */
  builderUrl: string;
};

export const claimRejectedEmail = defineTemplate<ClaimRejectedData>((locale, data) => {
  const t = translator(locale, "email.claimRejected");
  const name = nameIn(locale, data.doctor);
  const arabic = locale === "ar" && data.reasonAr?.trim();
  return {
    locale,
    subject: t("subject", { fix: data.fix }),
    preheader: t("preheader"),
    headline: t("headline", { fix: data.fix }),
    blocks: [
      { kind: "p", text: plain(t("intro", { name, date: formatDate(data.reviewedAt, data.timeZone, locale) })) },
      { kind: "quote", caption: t("reviewer"), body: arabic ? (data.reasonAr ?? "") : data.reasonEn, lang: arabic ? "ar" : "en" },
      {
        kind: "facts",
        rows: [
          ...(data.fileName ? [{ label: t("file"), value: ltr(data.fileName) }] : []),
          { label: t("reviewed"), value: plain(dateAndTime(data.reviewedAt, data.timeZone, locale)) },
        ],
      },
      { kind: "p", text: plain(t("next")) },
      { kind: "button", label: t("button"), href: data.builderUrl },
    ],
    footer: [plain(t("footer"))],
  };
});

export const { subject, preheader, render } = claimRejectedEmail;
