// Booking confirmed (task 3.3): sent from the payment_intent.succeeded handler to both parties, each with the visit's .ics.
// To the patient (rules E1 to E3, P6): the subject names the doctor and the time in the patient's zone; the body answers what,
// when in both zones, how to join, what to prepare, the receipt as reviewed at checkout (total first, the three lines, the last
// 4 digits, the receipt number) and how to change or cancel, with the refund deadline from lib/refunds.
// To the professional: when in both zones, the visit, the meeting link, and a pointer to the inbox. The patient's reason for
// the visit stays in the inbox, not in email. A shared records summary is AI output, so its line carries the AI label and the
// review status (rule T4).
import { business } from "@/config/business";
import { formatDate, formatMoney, formatNumber, type Locale } from "@/lib/format";
import { toIcs } from "@/lib/ics";
import { fullRefundDeadline, refundsInFull } from "@/lib/refunds";
import type { Block, EmailContent } from "./layout";
import { translator } from "./messages";
import {
  dateAndTime,
  dayAndTime,
  defineTemplate,
  duration,
  nameIn,
  paymentMethodLabel,
  receiptLines,
  type ChargedLines,
  type EmailAttachment,
  type PaymentMethod,
} from "./parts";
import { ltr, plain, rich, urlLink } from "./rich";
import { emailColors } from "./theme";

type Visit = {
  /** The booking id, the .ics UID's stable part (re-sending the file updates one calendar entry). */
  bookingId: string;
  visitType: "video" | "phone";
  startsAt: Date;
  durationMinutes: number;
  patientTimeZone: string;
  doctorTimeZone: string;
  /** The professional's own video link (ADR-7); null for a phone visit. */
  joinUrl: string | null;
};

export type BookingPatientData = Visit & {
  audience: "patient";
  doctor: { nameEn: string; nameAr: string; specialtyEn: string; specialtyAr: string; gender: "f" | "m" };
  /** The booking page in the patient portal, where it is changed or cancelled. */
  bookingUrl: string;
  receipt: ChargedLines & { number: string; paidAt: Date; method: PaymentMethod };
};

export type BookingProfessionalData = Visit & {
  audience: "professional";
  patient: { firstNameEn: string; firstNameAr: string };
  ageGroup: "baby" | "child" | "teen" | "adult" | null;
  bookedBy: "self" | "parent";
  /** A records summary the patient shared with this professional, if any (AI-generated, rule T4). */
  sharedSummary: { reviewedAt: Date | null } | null;
  /** This booking in the professional's inbox. */
  inboxUrl: string;
  /** When the booking was paid: the .ics DTSTAMP, so a resend is byte-identical. */
  bookedAt: Date;
};

export type BookingConfirmedData = BookingPatientData | BookingProfessionalData;

const link = (url: string) => urlLink(url, emailColors["sea-700"]);

function patientContent(locale: Locale, d: BookingPatientData): EmailContent {
  const t = translator(locale, "email.bookingConfirmed.patient");
  const tb = translator(locale, "booking");
  const tr = translator(locale, "receipts");
  const tc = translator(locale, "email.common");
  const name = nameIn(locale, d.doctor);
  const gender = d.doctor.gender;
  const when = dayAndTime(d.startsAt, d.patientTimeZone, locale);
  const doctorWhen = dayAndTime(d.startsAt, d.doctorTimeZone, locale);
  const deadline = dayAndTime(fullRefundDeadline(d.startsAt), d.patientTimeZone, locale);
  // Lead time (2 h by default) is shorter than the refund cutoff, so a visit can be booked after its full-refund deadline. The
  // preheader and the body then both say so: neither promises a refund before a time that has already passed.
  const refundable = refundsInFull(d.startsAt, d.receipt.paidAt);
  const total = formatMoney(d.receipt.totalCents, d.receipt.currency, locale);
  const cutoff = duration(locale, "hours", business.fullRefundCutoffHours);
  const video = d.visitType === "video" && d.joinUrl;

  const join: Block[] = video
    ? [
        { kind: "button", label: t("joinButton"), href: d.joinUrl ?? "" },
        { kind: "p", text: plain(`${tb("join.help")} ${tb("join.fallback", { gender, name })}`) },
      ]
    : [
        { kind: "p", text: plain(tb("join.phone", { gender, name })) },
        { kind: "button", label: t("viewButton"), href: d.bookingUrl },
      ];
  const prepare = (key: string) => ({ title: tb(`prepare.${key}.title`), body: plain(tb(`prepare.${key}.body`)) });

  return {
    locale,
    subject: t("subject", { visitType: d.visitType, name, when }),
    preheader: refundable ? t("preheader", { total, doctorWhen, deadline, gender }) : t("preheaderLate", { total, doctorWhen, cutoff, gender }),
    headline: t("headline"),
    blocks: [
      {
        kind: "p",
        text: plain(t("intro", { visitType: d.visitType, name, specialty: locale === "ar" ? d.doctor.specialtyAr : d.doctor.specialtyEn })),
      },
      {
        kind: "facts",
        title: t("cardTitle"),
        rows: [
          { label: tb("card.yourTime"), value: plain(when) },
          { label: tb("card.doctorTime", { gender }), value: plain(doctorWhen) },
          { label: tc("length"), value: plain(tb("card.length", { minutes: d.durationMinutes, minutesLabel: formatNumber(d.durationMinutes, locale) })) },
          { label: tc("visit"), value: plain(tr(`visitType.${d.visitType}`)) },
        ],
      },
      ...join,
      { kind: "p", text: plain(t("calendar")), muted: true },
      { kind: "list", title: tb("prepare.title"), items: [prepare(video ? "device" : "phone"), prepare("room"), prepare("id")] },
      {
        kind: "money",
        title: t("receiptTitle"),
        total: { label: tr("detail.lines.total"), amount: total },
        rows: [
          { label: tr("detail.paidOn"), value: plain(dateAndTime(d.receipt.paidAt, d.patientTimeZone, locale)) },
          { label: tr("detail.method"), value: plain(paymentMethodLabel(locale, d.receipt.method)) },
          { label: tr("detail.number"), value: ltr(d.receipt.number) },
        ],
        caption: tr("detail.lines.caption"),
        lines: receiptLines(locale, d.receipt),
      },
      { kind: "heading", text: t("changeTitle") },
      {
        kind: "p",
        text: plain(refundable ? t("changeBefore", { deadline, total }) : t("changeLate", { cutoff })),
      },
      { kind: "p", text: plain(t("move")) },
      { kind: "p", text: rich(t, "manage", {}, { url: link(d.bookingUrl) }) },
    ],
    footer: [plain(t("footer"))],
  };
}

function professionalContent(locale: Locale, d: BookingProfessionalData): EmailContent {
  const t = translator(locale, "email.bookingConfirmed.professional");
  const tb = translator(locale, "booking");
  const ti = translator(locale, "inbox");
  const tr = translator(locale, "receipts");
  const tc = translator(locale, "email.common");
  const patient = locale === "ar" ? d.patient.firstNameAr : d.patient.firstNameEn;
  const when = dayAndTime(d.startsAt, d.doctorTimeZone, locale);
  const patientWhen = dayAndTime(d.startsAt, d.patientTimeZone, locale);
  const length = tb("card.length", { minutes: d.durationMinutes, minutesLabel: formatNumber(d.durationMinutes, locale) });
  const summary: Block[] = d.sharedSummary
    ? [
        {
          kind: "ai",
          label: ti("detail.summaryAi"),
          status: d.sharedSummary.reviewedAt
            ? ti("detail.summaryReviewed", { date: formatDate(d.sharedSummary.reviewedAt, d.doctorTimeZone, locale) })
            : ti("detail.summaryNotReviewed"),
          title: t("summaryTitle"),
          body: plain(ti("detail.summaryBody")),
        },
      ]
    : [];
  return {
    locale,
    subject: t("subject", { patient, when }),
    preheader: t("preheader", { visitType: d.visitType, duration: length, patientWhen }),
    headline: t("headline", { visitType: d.visitType, patient }),
    blocks: [
      { kind: "p", text: plain(t("intro")) },
      {
        kind: "facts",
        title: t("cardTitle"),
        rows: [
          { label: ti("detail.yourTime"), value: plain(when) },
          { label: ti("detail.patientTime"), value: plain(patientWhen) },
          { label: tc("length"), value: plain(length) },
          { label: tc("visit"), value: plain(tr(`visitType.${d.visitType}`)) },
          ...(d.ageGroup ? [{ label: ti("detail.ageGroup"), value: plain(ti(`ageGroup.${d.ageGroup}`)) }] : []),
          { label: ti("detail.bookedBy"), value: plain(ti(`bookedBy.${d.bookedBy}`)) },
        ],
      },
      d.visitType === "video" && d.joinUrl
        ? { kind: "p", text: rich(t, "join", {}, { url: link(d.joinUrl) }) }
        : { kind: "p", text: plain(t("phone")) },
      ...summary,
      { kind: "button", label: t("button"), href: d.inboxUrl },
    ],
    footer: [plain(t("footer"))],
  };
}

/** The visit as a calendar file (lib/ics), the same event the confirmation page offers, so both parties' calendars agree. */
function bookingIcs(locale: Locale, d: BookingConfirmedData): EmailAttachment[] {
  const tb = translator(locale, "booking");
  const other = d.audience === "patient" ? nameIn(locale, d.doctor) : locale === "ar" ? d.patient.firstNameAr : d.patient.firstNameEn;
  const manageUrl = d.audience === "patient" ? d.bookingUrl : d.inboxUrl;
  // A phone visit: the doctor calls the patient, so each side's file says its own half of that.
  const phoneLine =
    d.audience === "patient"
      ? tb("ics.phone", { name: other, gender: d.doctor.gender })
      : translator(locale, "email.bookingConfirmed.professional")("phone");
  const description = [d.visitType === "video" && d.joinUrl ? tb("ics.join", { url: d.joinUrl }) : phoneLine, tb("ics.booking", { url: manageUrl })].join(
    "\n",
  );
  const stamp = d.audience === "patient" ? d.receipt.paidAt : d.bookedAt;
  const ics = toIcs(
    {
      uid: `${d.bookingId}@3affya.com`,
      start: d.startsAt,
      end: new Date(d.startsAt.getTime() + d.durationMinutes * 60_000),
      title: tb("ics.title", { visitType: d.visitType, name: other }),
      description,
      location: d.visitType === "video" && d.joinUrl ? d.joinUrl : tb("ics.phoneLocation"),
      url: manageUrl,
    },
    stamp,
  );
  return [{ filename: "3affya-visit.ics", content: ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }];
}

export const bookingConfirmedEmail = defineTemplate<BookingConfirmedData>(
  (locale, data) => (data.audience === "patient" ? patientContent(locale, data) : professionalContent(locale, data)),
  bookingIcs,
);

export const { subject, preheader, render, attachments } = bookingConfirmedEmail;
