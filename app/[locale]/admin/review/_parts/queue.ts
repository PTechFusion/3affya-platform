// The credential review queue (screen 38), server side: which claims wait for a decision, oldest first, with their SLA state,
// and everything the detail compares. Reads only lib/sample accessors. A claim is a pending doctor whose builder row has
// uploaded files and a submission; a resubmission (the doctor answered an earlier rejection) restarts the clock.
// Task 2.8 replaces this with a query on professionals.review_status = 'pending' under the admin role (RLS plus TOTP).
import { credentialReview } from "@/config/business";
import type { Locale } from "@/lib/format";
import {
  builderRowFor,
  doctorTimeZone,
  profileFor,
  registryAsFiledFor,
  sampleAdmin,
  sampleDoctors,
  sampleInstant,
  usStateByCode,
  type CredentialKind,
  type SampleBuilderRow,
  type SampleDoctorDetails,
} from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import type { BoardClaim } from "./model";

export type SearchParams = Record<string, string | string[] | undefined>;

export type ClaimStatus = "new" | "resubmitted";
export type SlaState = "overdue" | "dueSoon" | "onTime";

export type ClaimFile = { id: string; name: string; kind: CredentialKind; sizeBytes: number; uploadedAt: Date };

/** What the registry file (CMS, joined on NPI) said, shown beside the doctor's entries. */
export type RegistrySide = {
  nameEn: string;
  specialtyEn: string;
  specialtyAr: string;
  cityEn: string;
  cityAr: string;
  medicalSchool: string | null;
  graduationYear: number | null;
  groupPractice: string | null;
  asOf: string | null;
};

export type Claim = {
  doctor: SampleDoctorDetails;
  row: SampleBuilderRow;
  submittedAt: Date;
  status: ClaimStatus;
  /** The earlier rejection a resubmitted claim answers. */
  previousReturn: { at: Date; reasonEn: string; reasonAr: string } | null;
  dueAt: Date;
  sla: SlaState;
  files: ClaimFile[];
  board: BoardClaim;
  licenceState: { en: string; ar: string } | null;
  registry: RegistrySide;
  /** The doctor's own zone, for the dates the builder shows the doctor. */
  doctorZone: string;
};

const HOUR_MS = 3_600_000;

function slaFor(dueAt: Date, now: Date): SlaState {
  const left = dueAt.getTime() - now.getTime();
  if (left <= 0) return "overdue";
  return left <= credentialReview.dueSoonHours * HOUR_MS ? "dueSoon" : "onTime";
}

function toClaim(doctor: SampleDoctorDetails, row: SampleBuilderRow, now: Date): Claim | undefined {
  if (!row.submittedAtUtc || !row.files.length) return undefined;
  const submittedAt = sampleInstant(row.submittedAtUtc);
  const decidedAt = row.decidedAtUtc ? sampleInstant(row.decidedAtUtc) : null;
  // A rejection decided before the current submission is history the doctor has answered.
  const answered = row.rejection && decidedAt && decidedAt < submittedAt ? { at: decidedAt, reasonEn: row.rejection.reasonEn, reasonAr: row.rejection.reasonAr } : null;
  const dueAt = new Date(submittedAt.getTime() + credentialReview.slaHours * HOUR_MS);
  const profile = profileFor(doctor.id);
  const filed = registryAsFiledFor(doctor.id);
  const state = row.licenceState ? usStateByCode(row.licenceState) : undefined;
  return {
    doctor,
    row,
    submittedAt,
    status: answered ? "resubmitted" : "new",
    previousReturn: answered,
    dueAt,
    sla: slaFor(dueAt, now),
    files: row.files.map((f) => ({ id: f.id, name: f.name, kind: f.kind, sizeBytes: f.sizeBytes, uploadedAt: sampleInstant(f.uploadedAtUtc) })),
    board: { status: row.boardStatus, name: row.boardName ?? profile?.board ?? null },
    licenceState: state ? { en: state.nameEn, ar: state.nameAr } : null,
    registry: {
      nameEn: doctor.nameEn,
      specialtyEn: filed?.specialtyEn ?? doctor.specialtyEn,
      specialtyAr: filed?.specialtyAr ?? doctor.specialtyAr,
      cityEn: filed?.cityEn ?? doctor.cityEn,
      cityAr: filed?.cityAr ?? doctor.cityAr,
      medicalSchool: doctor.medicalSchool,
      graduationYear: doctor.graduationYear,
      groupPractice: profile?.groupPractice ?? null,
      asOf: profile?.registryAsOf ?? null,
    },
    doctorZone: doctorTimeZone(doctor),
  };
}

/** Every claim waiting for a decision, oldest submission first (the queue order). */
export function reviewQueue(now: Date = new Date()): Claim[] {
  return (sampleDoctors as SampleDoctorDetails[])
    .filter((d) => d.state === "pending")
    .flatMap((d) => {
      const row = builderRowFor(d.id);
      const claim = row ? toClaim(d, row, now) : undefined;
      return claim ? [claim] : [];
    })
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
}

export function claimFor(id: string, now: Date = new Date()): Claim | undefined {
  return reviewQueue(now).find((c) => c.doctor.id === id);
}

/** The claim after this one in queue order, for "Open the next claim" once a decision is made. */
export function nextClaimAfter(id: string, now: Date = new Date()): Claim | undefined {
  const queue = reviewQueue(now);
  const at = queue.findIndex((c) => c.doctor.id === id);
  return queue[at + 1] ?? queue.find((c) => c.doctor.id !== id);
}

/** Admin pages render in the signed-in admin's zone unless the prototype viewer sets ?tz= (lib/viewer). */
export function adminZone(sp: SearchParams): string {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : sampleAdmin.timeZone;
}

/** Keeps `?tz=` on links between the queue and a claim, so the reviewer's zone survives navigation. */
export function reviewHref(id: string | undefined, sp: SearchParams): string {
  const path = id ? `/admin/review/${id}` : "/admin/review";
  return typeof sp.tz === "string" ? `${path}?tz=${encodeURIComponent(viewerFrom(sp).timeZone)}` : path;
}

export const doctorName = (d: { nameEn: string; nameAr: string }, locale: Locale) => (locale === "ar" ? d.nameAr : d.nameEn);
export const reviewerName = (locale: Locale) => (locale === "ar" ? sampleAdmin.nameAr : sampleAdmin.nameEn);

/**
 * A wait or a time left, in the unit the queue shows: under an hour, whole hours, whole days from there. Time left counts in
 * hours up to the 48 h SLA (47 h left is "47 hours", not "1 day"); a wait switches to days after one day.
 */
export type Span = { unit: "underHour" | "hours" | "days"; count: number };
export function spanOf(ms: number, kind: "left" | "waiting" = "waiting"): Span {
  const hours = Math.floor(Math.abs(ms) / HOUR_MS);
  if (hours < 1) return { unit: "underHour", count: 0 };
  const dayFrom = kind === "left" ? 48 : 24;
  return hours < dayFrom ? { unit: "hours", count: hours } : { unit: "days", count: Math.floor(hours / 24) };
}

export const statusTone = { new: "pending", resubmitted: "info" } as const;
export const slaTone = { overdue: "danger", dueSoon: "warning", onTime: "success" } as const;
