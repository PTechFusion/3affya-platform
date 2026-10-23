// Claim received: the doctor submitted the profile with credentials for review (screen 29, task 2.5). Says what we received,
// when, how the review works and when to expect the answer (credentialReview.slaHours), in the doctor's own zone (rule E2).
// File names are Latin and sit in LTR isolates (R3).
import type { CredentialKind } from "@/lib/sample";
import { formatDate } from "@/lib/format";
import { dateAndTime, defineTemplate, nameIn } from "./parts";
import { translator } from "./messages";
import { ltr, plain } from "./rich";

export type ClaimReceivedData = {
  doctor: { nameEn: string; nameAr: string };
  submittedAt: Date;
  /** The doctor's IANA zone. */
  timeZone: string;
  files: Array<{ name: string; kind: CredentialKind }>;
  /** credentialReview.slaHours: the decision is due this long after the latest submission. */
  answerWithinHours: number;
  /** The doctor's profile builder in the portal. */
  profileUrl: string;
};

export const claimReceivedEmail = defineTemplate<ClaimReceivedData>((locale, data) => {
  const t = translator(locale, "email.claimReceived");
  const name = nameIn(locale, data.doctor);
  const due = new Date(data.submittedAt.getTime() + data.answerWithinHours * 3_600_000);
  const deadline = dateAndTime(due, data.timeZone, locale);
  return {
    locale,
    subject: t("subject", { name }),
    preheader: t("preheader", { deadline }),
    headline: t("headline"),
    blocks: [
      { kind: "p", text: plain(t("intro", { name, date: formatDate(data.submittedAt, data.timeZone, locale) })) },
      {
        kind: "facts",
        title: t("factsTitle"),
        rows: [
          { label: t("submitted"), value: plain(dateAndTime(data.submittedAt, data.timeZone, locale)) },
          ...data.files.map((f) => ({ label: t(`file.${f.kind}`), value: ltr(f.name) })),
          { label: t("answerBy"), value: plain(deadline) },
        ],
      },
      { kind: "p", text: plain(t("how")) },
      { kind: "p", text: plain(t("pending")), muted: true },
      { kind: "button", label: t("button"), href: data.profileUrl },
    ],
    footer: [plain(t("footer"))],
  };
});

export const { subject, preheader, render } = claimReceivedEmail;
