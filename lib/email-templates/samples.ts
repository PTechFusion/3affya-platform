// Sample data for each template, read from lib/sample.ts (synthetic rows only), for the dev preview route, the unit tests and the
// test-send script. Every instant comes from the sample clock (sampleInstant), so upcoming visits stay ahead. Recipients are on
// the reserved example.com domain. Variants are the states worth seeing in each email.
import { adminSignIn, credentialReview, outreach, signInLimits, business } from "@/config/business";
import type { Locale } from "@/lib/format";
import {
  builderRowFor,
  doctorById,
  doctorTimeZone,
  introductionById,
  patientBookingById,
  patientReceiptById,
  removalRequestById,
  sampleAdmin,
  sampleDoctors,
  sampleInstant,
  samplePatient,
  signInSampleEmail,
  visitMinutesFor,
} from "@/lib/sample";
import type { TemplateData, TemplateName } from "./index";
import { defaultAssetsBaseUrl } from "./layout";

export const templateVariants = {
  invite: ["plain", "note"],
  otp: ["signIn", "claim", "admin"],
  claimReceived: [],
  claimApproved: [],
  claimRejected: ["licence", "board"],
  removalConfirmed: [],
  bookingConfirmed: ["patient", "professional"],
  refund: ["patientEarly", "doctor"],
} as const satisfies Record<TemplateName, readonly string[]>;

export type TemplateVariant<N extends TemplateName> = (typeof templateVariants)[N][number];

/** The variant asked for if the template has it, else its first (or none). */
export function pickVariant(name: TemplateName, asked: string | undefined): string | undefined {
  const all = templateVariants[name] as readonly string[];
  return asked && all.includes(asked) ? asked : all[0];
}

/** A link into the site in the reader's language. */
export const siteLink = (locale: Locale, path: string) => `${defaultAssetsBaseUrl()}/${locale}${path}`;

const need = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`Sample data is missing ${what}.`);
  return value;
};

const doctor = (id: string) => need(sampleDoctors.find((d) => d.id === id), `doctor ${id}`);

/** Synthetic personal line for the invite's "note" variant, in the admin's language. */
const SAMPLE_NOTE: Record<Locale, string> = {
  en: "We spoke after the grand rounds in Dearborn last month. Your profile is ready whenever you have five minutes.",
  ar: "تحدثنا بعد الاجتماع العلمي في ديربورن الشهر الماضي. ملفك جاهز متى توفرت لك خمس دقائق.",
};

export function sampleEmailData<N extends TemplateName>(name: N, locale: Locale, variant?: string, now: Date = new Date()): TemplateData<N> {
  const v = pickVariant(name, variant);
  return build(name, locale, v, now) as TemplateData<N>;
}

/** Who the sample email goes to, for the preview's envelope. */
export function sampleRecipient(name: TemplateName, variant?: string): string {
  const v = pickVariant(name, variant);
  switch (name) {
    case "invite":
      return "maha.mansour@example.com";
    case "otp":
      return v === "admin" ? sampleAdmin.email : v === "claim" ? "maha.mansour@example.com" : signInSampleEmail;
    case "claimReceived":
      return "fadi.baroudi@example.com";
    case "claimApproved":
      return "omar.khalil@example.com";
    case "claimRejected":
      return v === "board" ? "yousef.khalil@example.com" : "rania.hamdan@example.com";
    case "removalConfirmed":
      return need(removalRequestById("rm_005"), "removal rm_005").requesterEmail;
    case "bookingConfirmed":
      return v === "professional" ? "omar.khalil@example.com" : signInSampleEmail;
    case "refund":
      return signInSampleEmail;
  }
}

function build(name: TemplateName, locale: Locale, v: string | undefined, now: Date): TemplateData<TemplateName> {
  switch (name) {
    case "invite": {
      // doc_013 with the demo-valid token: the link opens the prototype's claim page for her (screen 9).
      return {
        doctor: doctor("doc_013"),
        expiresAt: new Date(now.getTime() + outreach.inviteValidDays * 86_400_000),
        claimUrl: siteLink(locale, "/claim/demo-valid"),
        personalLine: v === "note" ? SAMPLE_NOTE[locale] : undefined,
      } satisfies TemplateData<"invite">;
    }
    case "otp": {
      const purpose = v === "admin" ? "admin" : v === "claim" ? "claim" : "signIn";
      return {
        purpose,
        code: "482913",
        validMinutes: purpose === "admin" ? adminSignIn.emailCodeValidMinutes : signInLimits.codeValidMinutes,
        requestedAt: now,
        timeZone: purpose === "admin" ? sampleAdmin.timeZone : purpose === "claim" ? doctorTimeZone(doctor("doc_013")) : samplePatient.timeZone,
      } satisfies TemplateData<"otp">;
    }
    case "claimReceived": {
      // doc_010: submitted, waiting for review (screen 38's queue).
      const d = doctor("doc_010");
      const row = need(builderRowFor("doc_010"), "builder row doc_010");
      return {
        doctor: d,
        submittedAt: sampleInstant(need(row.submittedAtUtc ?? undefined, "doc_010 submittedAtUtc")),
        timeZone: doctorTimeZone(d),
        files: row.files.map((f) => ({ name: f.name, kind: f.kind })),
        answerWithinHours: credentialReview.slaHours,
        profileUrl: siteLink(locale, "/professional/builder"),
      } satisfies TemplateData<"claimReceived">;
    }
    case "claimApproved": {
      // doc_002, the prototype's signed-in professional, approved on the builder row's decision date.
      const d = doctor("doc_002");
      const row = need(builderRowFor("doc_002"), "builder row doc_002");
      const approvedAt = sampleInstant(need(row.decidedAtUtc ?? undefined, "doc_002 decidedAtUtc"));
      const next = new Date(Date.UTC(approvedAt.getUTCFullYear(), approvedAt.getUTCMonth() + business.verifiedReverifyMonths, approvedAt.getUTCDate()));
      return {
        doctor: d,
        approvedAt,
        timeZone: doctorTimeZone(d),
        nextCheckOn: next,
        availabilityUrl: siteLink(locale, "/professional/availability"),
        profileUrl: siteLink(locale, `/doctors/${d.id}`),
      } satisfies TemplateData<"claimApproved">;
    }
    case "claimRejected": {
      // doc_009: the licence was a photo of a screen; doc_012: the board file was a residency certificate (since replaced, so
      // builder.json no longer lists it: the email then names no file).
      const id = v === "board" ? "doc_012" : "doc_009";
      const d = doctor(id);
      const row = need(builderRowFor(id), `builder row ${id}`);
      const rejection = need(row.rejection ?? undefined, `${id} rejection`);
      const file = row.files.find((f) => f.id === rejection.fileId);
      return {
        doctor: d,
        reviewedAt: sampleInstant(need(row.decidedAtUtc ?? undefined, `${id} decidedAtUtc`)),
        timeZone: doctorTimeZone(d),
        fix: file?.kind ?? (v === "board" ? "board" : "other"),
        fileName: file?.name ?? null,
        reasonEn: rejection.reasonEn,
        reasonAr: rejection.reasonAr,
        builderUrl: siteLink(locale, "/professional/builder"),
      } satisfies TemplateData<"claimRejected">;
    }
    case "removalConfirmed": {
      // rm_005: confirmed by the admin; the profile now answers 410.
      const r = need(removalRequestById("rm_005", now), "removal rm_005");
      const decided = need(r.decision ?? undefined, "rm_005 decision");
      return {
        requesterName: r.requesterName,
        doctor: r.doctor,
        npi: r.npi,
        requestedAt: r.receivedAt,
        removedAt: decided.decidedAt,
        timeZone: doctorTimeZone(r.doctor),
        profileUrl: siteLink(locale, `/doctors/${r.doctor.id}`),
      } satisfies TemplateData<"removalConfirmed">;
    }
    case "bookingConfirmed": {
      if (v === "professional") {
        // int_002: Noura's booking with Dr Omar Khalil, as his inbox has it, with her shared records summary.
        const i = need(introductionById("int_002"), "introduction int_002");
        return {
          audience: "professional",
          bookingId: "bk_004",
          visitType: i.visitType,
          startsAt: i.startsAt,
          durationMinutes: visitMinutesFor(i.doctorId),
          patientTimeZone: i.patientTimeZone,
          doctorTimeZone: i.doctorTimeZone,
          joinUrl: i.joinUrl,
          patient: { firstNameEn: i.patientFirstNameEn, firstNameAr: i.patientFirstNameAr },
          ageGroup: i.ageGroup,
          bookedBy: i.bookedBy,
          sharedSummary: i.sharedSummary ? { reviewedAt: i.sharedSummary.reviewedAt } : null,
          inboxUrl: siteLink(locale, `/professional/inbox/${i.id}`),
          bookedAt: i.receivedAt,
        } satisfies TemplateData<"bookingConfirmed">;
      }
      // bk_004: the booking screens 19 and 20 land on (Noura with Dr Omar Khalil), with its receipt.
      const b = need(patientBookingById("bk_004", now), "booking bk_004");
      const r = need(patientReceiptById("bk_004"), "receipt bk_004");
      const d = need(doctorById(b.doctorId), `doctor ${b.doctorId}`);
      return {
        audience: "patient",
        bookingId: b.id,
        visitType: b.visitType,
        startsAt: b.startsAt,
        durationMinutes: b.durationMinutes,
        patientTimeZone: b.patientTimeZone,
        doctorTimeZone: b.doctorTimeZone,
        joinUrl: b.joinUrl,
        doctor: d,
        bookingUrl: siteLink(locale, `/patient/bookings/${b.id}`),
        receipt: {
          currency: r.currency,
          doctorFeeCents: r.doctorFeeCents,
          platformFeeCents: r.platformFeeCents,
          cardProcessingCents: r.cardProcessingCents,
          totalCents: r.totalCents,
          number: r.receiptNumber,
          paidAt: r.paidAt,
          method: r.paymentMethod,
        },
      } satisfies TemplateData<"bookingConfirmed">;
    }
    case "refund": {
      // bk_003: Noura cancelled early, refunded in full; bk_008: the doctor cancelled.
      const id = v === "doctor" ? "bk_008" : "bk_003";
      const r = need(patientReceiptById(id), `receipt ${id}`);
      const d = need(doctorById(r.doctorId), `doctor ${r.doctorId}`);
      const cancellation = need(r.cancellation ?? undefined, `${id} cancellation`);
      const refund = need(r.refunds[0], `${id} refund`);
      if (cancellation.reason === "patientLate") throw new Error(`${id} has no refund.`);
      return {
        doctor: d,
        visitType: r.visitType,
        startsAt: r.startsAt,
        patientTimeZone: samplePatient.timeZone,
        doctorTimeZone: r.doctorTimeZone,
        reason: cancellation.reason,
        cancelledAt: cancellation.at,
        refund: { amountCents: refund.amountCents, at: refund.at, status: refund.status === "pending" ? "pending" : "succeeded" },
        receipt: {
          currency: r.currency,
          doctorFeeCents: r.doctorFeeCents,
          platformFeeCents: r.platformFeeCents,
          cardProcessingCents: r.cardProcessingCents,
          totalCents: r.totalCents,
          number: r.receiptNumber,
          method: r.paymentMethod,
        },
        receiptUrl: siteLink(locale, `/patient/receipts/${id}`),
        rulesUrl: siteLink(locale, "/refunds"),
      } satisfies TemplateData<"refund">;
    }
  }
}
