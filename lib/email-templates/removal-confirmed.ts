// Removal confirmed: an admin confirmed a doctor's request to take the registry profile down (screen 41, task 2.8; screen 10
// promised "we email you again when it is done"). Says what was removed and when, what the link shows now, and that no claim
// invitation follows. The requester's name is what they typed, in any script, so it sits in its own isolate.
import { dateAndTime, defineTemplate, nameIn } from "./parts";
import { translator } from "./messages";
import { isolated, ltr, plain, rich } from "./rich";

export type RemovalConfirmedData = {
  /** The name typed on the request form (screen 10). */
  requesterName: string;
  doctor: { nameEn: string; nameAr: string };
  npi: string;
  requestedAt: Date;
  removedAt: Date;
  /** The doctor's IANA zone. */
  timeZone: string;
  /** The profile link, which now answers 410 with the removed notice. */
  profileUrl: string;
};

export const removalConfirmedEmail = defineTemplate<RemovalConfirmedData>((locale, data) => {
  const t = translator(locale, "email.removalConfirmed");
  const name = nameIn(locale, data.doctor);
  return {
    locale,
    subject: t("subject"),
    preheader: t("preheader", { name }),
    headline: t("headline"),
    blocks: [
      { kind: "p", text: rich(t, "intro", {}, { requester: isolated(data.requesterName) }) },
      {
        kind: "facts",
        title: t("factsTitle"),
        rows: [
          { label: t("name"), value: plain(name) },
          { label: t("npi"), value: ltr(data.npi) },
          { label: t("requested"), value: plain(dateAndTime(data.requestedAt, data.timeZone, locale)) },
          { label: t("removed"), value: plain(dateAndTime(data.removedAt, data.timeZone, locale)) },
        ],
      },
      { kind: "p", text: plain(t("after")) },
      { kind: "button", label: t("button"), href: data.profileUrl },
      { kind: "p", text: plain(t("notYou")), muted: true },
    ],
    footer: [plain(t("footer"))],
  };
});

export const { subject, preheader, render } = removalConfirmedEmail;
