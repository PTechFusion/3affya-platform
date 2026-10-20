// Sample data for the prototype. Real rows arrive with Supabase in task 1.5; pages read through here, never the JSON shape directly,
// so the swap to generated types is one file.
import doctorsJson from "@/data/sample/doctors.json";
import specialtiesJson from "@/data/sample/specialties.json";
import bodySystemsJson from "@/data/sample/body-systems.json";
import invitesJson from "@/data/sample/invites.json";
import profilesJson from "@/data/sample/profiles.json";
import availabilityJson from "@/data/sample/availability.json";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import type { Locale } from "@/lib/format";
import { business } from "@/config/business";
import { addDays, zonedInstant, zonedParts, type StoredException, type StoredRule } from "@/lib/slots";
import builderJson from "@/data/sample/builder.json";
import usStatesJson from "@/data/sample/us-states.json";
import { sampleInstant, sampleInstantExact, toDoctorCardData, type LanguageLabels } from "@/lib/card-data";
import payoutsJson from "@/data/sample/payouts.json";
import type { PayoutAccount, PayoutRecordStatus, PayoutStatus } from "@/lib/payouts";
import membershipsJson from "@/data/sample/memberships.json";
import introductionsJson from "@/data/sample/introductions.json";
import summariesJson from "@/data/sample/summaries.json";
import type { SummaryData } from "@/components/brand/SummaryViewer";

// The card mapping and the sample clock live in lib/card-data.ts (no JSON imports, so client components can use them);
// pages keep importing them from here.
export { sampleInstant, sampleInstantExact, toDoctorCardData, type LanguageLabels } from "@/lib/card-data";

export type SampleDoctor = {
  id: string;
  npi: string;
  /** The public card state. A suspension (admin, screen 39) is a listings.json row, read through suspendedDoctorIds(). */
  state: DoctorCardState;
  gender: "f" | "m";
  nameEn: string;
  nameAr: string;
  specialty: string;
  specialtyEn: string;
  specialtyAr: string;
  cityEn: string;
  cityAr: string;
  photoUrl: string | null;
  languages: Array<{ code: "ar" | "en"; dialect?: string }>;
  visitTypes: Array<"video" | "phone">;
  ages: "adults" | "children" | "allAges";
  tags: string[];
  training: string[];
  yearsInPractice: number | null;
  boardCertified: boolean;
  verifiedOn: string | null;
  feeUsdCents: number | null;
  nextAvailableUtc: string | null;
};

export type SampleSpecialty = { slug: string; nameEn: string; nameAr: string; doctorCount: number };

export const sampleDoctors = doctorsJson as unknown as SampleDoctor[];

export const sampleSpecialties = specialtiesJson as SampleSpecialty[];

/** Verified doctors a public page may show: a suspended or removed one is left out (publicDoctors). */
export const verifiedDoctors = () => publicDoctors().filter((d) => d.state === "verified");

/** Two verified doctors for the home strip, one of each gender (rule G2). */
export function featuredDoctors(): SampleDoctor[] {
  const verified = verifiedDoctors();
  const first = verified[0];
  if (!first) return [];
  const other = verified.find((d) => d.gender !== first.gender) ?? verified[1];
  return other ? [first, other] : [first];
}

/** Lowest published first-visit fee across verified doctors, in minor units. */
export function lowestVerifiedFeeCents(): number | undefined {
  const fees = verifiedDoctors().map((d) => d.feeUsdCents).filter((f): f is number => typeof f === "number");
  return fees.length ? Math.min(...fees) : undefined;
}

/* ---------------- Screen 4, specialty directory ---------------- */

/** A body system that groups specialties in the directory's full list (screen 4). `specialties` holds slugs in display order. */
export type SampleBodySystem = { id: string; nameEn: string; nameAr: string; specialties: string[] };
export type SpecialtySystemGroup = { system: SampleBodySystem | null; specialties: SampleSpecialty[] };

export const sampleBodySystems = bodySystemsJson as SampleBodySystem[];

/** Every specialty grouped by body system, systems in data order. A specialty no system lists goes in a last group with system null. */
export function specialtiesBySystem(): SpecialtySystemGroup[] {
  const bySlug = new Map(sampleSpecialties.map((s) => [s.slug, s]));
  const placed = new Set<string>();
  const groups = sampleBodySystems
    .map((system) => ({
      system,
      specialties: system.specialties.flatMap((slug) => {
        const s = bySlug.get(slug);
        if (!s || placed.has(slug)) return [];
        placed.add(slug);
        return [s];
      }),
    }))
    .filter((g) => g.specialties.length > 0);
  const rest = sampleSpecialties.filter((s) => !placed.has(s.slug));
  return rest.length ? [...groups, { system: null, specialties: rest }] : groups;
}

// Prototype only: the 8 verified sample doctors cover 7 of the 24 sample groups, so a group with no verified sample doctor borrows the
// sample portrait (every sample photo is the same placeholder). With Supabase this is a verified doctor's photo, or none.
const SAMPLE_PORTRAIT = sampleDoctors.find((d) => d.photoUrl)?.photoUrl ?? undefined;

/** The face on a specialty tile (screen 4 hook): the photo of a verified doctor in that specialty. */
export function specialtyPhotoUrl(slug: string): string | undefined {
  return verifiedDoctors().find((d) => d.specialty === slug && d.photoUrl)?.photoUrl ?? SAMPLE_PORTRAIT;
}

/* ---------------- Claim invites (screen 9) ---------------- */

/** An invite as the prototype stores it. Production stores a hash of the token, never the token itself (task 2.3). */
export type SampleInvite = {
  id: string;
  token: string;
  doctorId: string;
  email: string;
  sentAtUtc: string;
  expiresAtUtc: string;
  usedAtUtc: string | null;
};

export type InviteStatus = "valid" | "expired" | "used";

// Invite instants are authored around the sample anchor and shifted like every other instant, so the claim screen (9) and the
// outreach screen (46) agree on when an invite was sent, used or expired.
export const sampleInvites: SampleInvite[] = (invitesJson as SampleInvite[]).map((i) => ({
  ...i,
  sentAtUtc: sampleInstant(i.sentAtUtc).toISOString(),
  expiresAtUtc: sampleInstant(i.expiresAtUtc).toISOString(),
  usedAtUtc: i.usedAtUtc ? sampleInstant(i.usedAtUtc).toISOString() : null,
}));

/** Doctors a public page may list: never a suspended or removed one (suspended is reversible and must look unknown). */
export function publicDoctors(): SampleDoctor[] {
  const hidden = new Set([...removedDoctorIds(), ...suspendedDoctorIds()]);
  return sampleDoctors.filter((d) => !hidden.has(d.id));
}

/** Looks a token up and derives its status at `now`. Undefined means forged: no such token, or its doctor row is gone. */
export function inviteByToken(
  token: string,
  now: Date = new Date(),
): { invite: SampleInvite; doctor: SampleDoctor; status: InviteStatus } | undefined {
  const invite = sampleInvites.find((i) => i.token === token);
  const doctor = invite ? sampleDoctors.find((d) => d.id === invite.doctorId) : undefined;
  if (!invite || !doctor) return undefined;
  const status: InviteStatus = invite.usedAtUtc ? "used" : new Date(invite.expiresAtUtc) <= now ? "expired" : "valid";
  return { invite, doctor, status };
}
/* ---------------- Doctor profile (screens 6 and 7) ---------------- */

/** The row fields the profile page reads beyond the card. They are in doctors.json; the card mapping does not need them. */
export type SampleDoctorDetails = SampleDoctor & {
  medicalSchool: string | null;
  graduationYear: number | null;
  hospitalAffiliation: string | null;
  bioEn: string;
  bioAr: string;
};

export type RegistrySource = "cms";

/** Per-doctor profile extras (data/sample/profiles.json). */
export type SampleProfile = {
  id: string;
  groupPractice: string | null;
  /** Unclaimed and pending rows: where the public facts came from, and the file date. */
  registrySource: RegistrySource | null;
  registryAsOf: string | null;
  /** Verified rows: the named certifying board (rule C8) and the licence state. */
  board: string | null;
  licenceStateEn: string | null;
  licenceStateAr: string | null;
  /** Verified rows: next open times in UTC, ascending. Empty means no published availability. */
  slotsUtc: string[];
};

const sampleProfiles = profilesJson as unknown as SampleProfile[];

export function doctorById(id: string): SampleDoctorDetails | undefined {
  return sampleDoctors.find((d) => d.id === id) as SampleDoctorDetails | undefined;
}

export function profileFor(id: string): SampleProfile | undefined {
  return sampleProfiles.find((p) => p.id === id);
}

/** The doctor's next open times, earliest first. */
export function upcomingSlots(id: string): Date[] {
  return (profileFor(id)?.slotsUtc ?? []).map(sampleInstant).sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Everything an unclaimed or pending profile may show: public registry facts and their source, nothing else. There is no fee,
 * availability, checkout or contact field on this type, so the page cannot render one (task 2.2, rules U1 U2).
 */
export type RegistryFacts = {
  id: string;
  state: "unclaimed" | "pending";
  gender: "f" | "m";
  nameEn: string;
  nameAr: string;
  specialty: string;
  specialtyEn: string;
  specialtyAr: string;
  cityEn: string;
  cityAr: string;
  photoUrl: string | null;
  medicalSchool: string | null;
  graduationYear: number | null;
  groupPractice: string | null;
  hospitalAffiliation: string | null;
  source: RegistrySource;
  asOf: string | null;
};

export function toRegistryFacts(d: SampleDoctorDetails): RegistryFacts {
  const p = profileFor(d.id);
  return {
    id: d.id,
    state: d.state === "pending" ? "pending" : "unclaimed",
    gender: d.gender,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    specialty: d.specialty,
    specialtyEn: d.specialtyEn,
    specialtyAr: d.specialtyAr,
    cityEn: d.cityEn,
    cityAr: d.cityAr,
    photoUrl: d.state === "pending" ? d.photoUrl : null, // unclaimed rows never carry a photo (rule C3: neutral placeholder)
    medicalSchool: d.medicalSchool,
    graduationYear: d.graduationYear,
    groupPractice: p?.groupPractice ?? null,
    hospitalAffiliation: d.hospitalAffiliation,
    source: p?.registrySource ?? "cms",
    asOf: p?.registryAsOf ?? null,
  };
}

/**
 * The pre-made card for a registry profile, or the front of a card shown where booking is not on offer. Built with
 * toDoctorCardData, then every fee, availability and booking field is dropped so none reaches the page (task 2.2).
 */
export function withoutBooking(card: DoctorCardData): DoctorCardData {
  return { ...card, feeLabel: undefined, nextAvailableLabel: undefined };
}

export function toRegistryCardData(d: SampleDoctor, locale: Locale, timeZone: string, tl: LanguageLabels): DoctorCardData {
  const card = withoutBooking(toDoctorCardData(d, locale, timeZone, tl));
  return { ...card, photoUrl: d.state === "pending" ? card.photoUrl : undefined, verifiedOnLabel: undefined, boardCertified: false };
}

/**
 * Verified doctors to offer from a page that cannot book (rules S6, U3): the same specialty first; if there is none, doctors
 * who see the same age group; then any verified doctor. `scope` says which one matched so the page can say so.
 */
export function verifiedAlternatives(d: SampleDoctor, limit = 2): { scope: "specialty" | "ages" | "any"; doctors: SampleDoctor[] } {
  const others = verifiedDoctors().filter((v) => v.id !== d.id);
  const sameSpecialty = others.filter((v) => v.specialty === d.specialty);
  if (sameSpecialty.length) return { scope: "specialty", doctors: sameSpecialty.slice(0, limit) };
  const seesSameAges = others.filter((v) => v.ages === d.ages || v.ages === "allAges");
  if (seesSameAges.length) return { scope: "ages", doctors: seesSameAges.slice(0, limit) };
  return { scope: "any", doctors: others.slice(0, limit) };
}

/* ---------------- Availability (screen 30) ---------------- */

/** A doctor's availability as stored (data/sample/availability.json): UTC instants plus the rule zone, never local times. */
export type SampleAvailability = {
  doctorId: string;
  timeZone: string;
  slotMinutes: number;
  leadTimeHours: number;
  /** Rule B6: off until the first weekly hours are saved. */
  acceptingNewPatients: boolean;
  rules: StoredRule[];
  exceptions: StoredException[];
};

const availabilityData = availabilityJson as unknown as {
  schedules: SampleAvailability[];
  addedException: StoredException & { doctorId: string };
};

/**
 * Prototype only: sampleInstant's shift, applied in whole days on the doctor's wall clock, so a day off still runs midnight to
 * midnight and extra hours keep their clock times when the shift crosses a DST change. Gone with task 1.5.
 */
function sampleInstantOnWallClock(iso: string, timeZone: string): string {
  const days = Math.round((sampleInstant(iso).getTime() - Date.parse(iso)) / 86_400_000);
  const wall = zonedParts(new Date(iso), timeZone);
  return zonedInstant(addDays(wall, days), wall.minutes, timeZone).toISOString();
}

function shiftException(x: StoredException, timeZone: string): StoredException {
  return { ...x, startsAtUtc: sampleInstantOnWallClock(x.startsAtUtc, timeZone), endsAtUtc: sampleInstantOnWallClock(x.endsAtUtc, timeZone) };
}

/** The doctor's weekly rules and exceptions. Rules repeat weekly, so only the dated exceptions are shifted into the coming week. */
export function availabilityFor(doctorId: string): SampleAvailability | undefined {
  const row = availabilityData.schedules.find((s) => s.doctorId === doctorId);
  return row ? { ...row, exceptions: row.exceptions.map((x) => shiftException(x, row.timeZone)) } : undefined;
}

/** The exception the `?state=exceptionAdded` preview shows as just added, shifted like the others. */
export function sampleAddedException(doctorId: string): StoredException | undefined {
  const row = availabilityData.schedules.find((s) => s.doctorId === doctorId);
  const { doctorId: owner, ...x } = availabilityData.addedException;
  return row && owner === doctorId ? shiftException(x, row.timeZone) : undefined;
}
/* ---------------- Payouts setup (screen 35) ---------------- */

type SamplePayoutRow = Omit<PayoutAccount, "nextPayout" | "recentPayouts"> & {
  sample: PayoutStatus;
  doctorId: string;
  doctorTimeZone: string;
  nextPayout: { arrivalUtc: string; amountCents: number; currency: string } | null;
  recentPayouts: Array<{ id: string; arrivalUtc: string; amountCents: number; currency: string; status: PayoutRecordStatus }>;
};

/** The signed-in doctor's connected account (prototype: doc_002) in one sample state, plus the doctor's own time zone. */
export type SamplePayoutAccount = PayoutAccount & { doctorId: string; doctorTimeZone: string };

const samplePayoutRows = payoutsJson as unknown as SamplePayoutRow[];

/** One row per state (data/sample/payouts.json). Payout dates go through sampleInstant so the next payout stays ahead. */
export function samplePayoutAccount(sample: PayoutStatus): SamplePayoutAccount | undefined {
  const row = samplePayoutRows.find((r) => r.sample === sample);
  if (!row) return undefined;
  const { sample: _sample, nextPayout, recentPayouts, ...account } = row;
  void _sample;
  return {
    ...account,
    nextPayout: nextPayout
      ? { arrivesAt: sampleInstant(nextPayout.arrivalUtc), amountCents: nextPayout.amountCents, currency: nextPayout.currency }
      : null,
    recentPayouts: recentPayouts.map((p) => ({
      id: p.id,
      arrivesAt: sampleInstant(p.arrivalUtc),
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
    })),
  };
}
/* ---------------- Membership and billing (screen 33) ---------------- */

/** The membership states the portal shows. `cancelled`: cancelled in the Stripe portal, running to the end of the paid period. */
export type MembershipStatus = "none" | "active" | "past_due" | "cancelled";
export type BillingInterval = "month" | "year";

/** A row as data/sample/memberships.json stores it. No prices: those come from config/business.ts. */
type SampleMembershipRow = {
  id: string;
  doctorId: string;
  status: MembershipStatus;
  interval: BillingInterval | null;
  currentPeriodEndUtc: string | null;
  paymentFailedAtUtc: string | null;
  cancelledAtUtc: string | null;
  timeZone: string;
};

/**
 * A membership with its instants shifted by sampleInstant. `currentPeriodEnd` is the next renewal (active), the renewal that
 * failed (past_due) or the last day of access (cancelled). `timeZone` is the doctor's own, for display.
 */
export type SampleMembership = {
  id: string;
  doctorId: string;
  status: MembershipStatus;
  interval: BillingInterval | null;
  currentPeriodEnd: Date | null;
  paymentFailedAt: Date | null;
  cancelledAt: Date | null;
  timeZone: string;
};

const sampleMembershipRows = membershipsJson as unknown as SampleMembershipRow[];

/** The sample membership in one state (the prototype's ?state= switch). Production reads the signed-in professional's row. */
export function sampleMembership(status: MembershipStatus): SampleMembership | undefined {
  const row = sampleMembershipRows.find((m) => m.status === status);
  if (!row) return undefined;
  const at = (iso: string | null) => (iso ? sampleInstant(iso) : null);
  return {
    id: row.id,
    doctorId: row.doctorId,
    status: row.status,
    interval: row.interval,
    currentPeriodEnd: at(row.currentPeriodEndUtc),
    paymentFailedAt: at(row.paymentFailedAtUtc),
    cancelledAt: at(row.cancelledAtUtc),
    timeZone: row.timeZone,
  };
}
/* ---------------- Introduction inbox (screen 32) ---------------- */
// Imported here, not at the top, so this section stays one appended block (ES imports are hoisted either way).

/** Stored status. "confirmed" is a paid booking; once its time has passed it reads as awaiting done (see inboxStatus). */
export type IntroductionStatus = "request" | "confirmed" | "done";
export type IntroductionAgeGroup = "baby" | "child" | "teen" | "adult";
export type IntroductionPrepared = "records" | "medicines" | "questions" | "deviceTest";

type IntroductionRow = {
  id: string;
  doctorId: string;
  status: IntroductionStatus;
  patientFirstNameEn: string;
  patientFirstNameAr: string;
  ageGroup: IntroductionAgeGroup;
  bookedBy: "self" | "parent";
  visitType: "video" | "phone";
  startsAtUtc: string;
  receivedAtUtc: string;
  patientTimeZone: string;
  doctorTimeZone: string;
  concernEn: string;
  concernAr: string;
  prepared: IntroductionPrepared[];
  joinUrl: string | null;
  /** The share (screen 36) the patient made for this professional; its dates and review state live on the share. */
  sharedSummaryId: string | null;
  doneAtUtc: string | null;
};

/** A booking or an introduction request as the professional's inbox reads it. Every instant goes through sampleInstant. */
export type SampleIntroduction = Omit<IntroductionRow, "startsAtUtc" | "receivedAtUtc" | "sharedSummaryId" | "doneAtUtc"> & {
  /** The booked time; for a request, the time the patient asked for. */
  startsAt: Date;
  receivedAt: Date;
  /** The records summary the patient shared with this professional; screen 36 opens it at /professional/shared/[id]. */
  sharedSummary: { id: string; sharedAt: Date; expiresAt: Date; reviewedAt: Date | null } | null;
  doneAt: Date | null;
};

/** What the inbox shows: a request to answer, an upcoming visit, a past visit not yet marked done, or a done visit. */
export type InboxStatus = "request" | "upcoming" | "awaitingDone" | "done";

const introductionRows = introductionsJson as unknown as IntroductionRow[];

function toIntroduction(r: IntroductionRow): SampleIntroduction {
  const { startsAtUtc, receivedAtUtc, sharedSummaryId, doneAtUtc, ...rest } = r;
  // One source of truth: the share row (screen 36) carries the dates and the review; an ended share reads as none.
  const share = sharedSummaryId ? shareFor(sharedSummaryId, r.doctorId) : undefined;
  return {
    ...rest,
    startsAt: sampleInstant(startsAtUtc),
    receivedAt: sampleInstant(receivedAtUtc),
    sharedSummary: share
      ? { id: share.id, sharedAt: share.sharedAt, expiresAt: share.expiresAt, reviewedAt: share.summary.review?.at ?? null }
      : null,
    doneAt: doneAtUtc ? sampleInstant(doneAtUtc) : null,
  };
}

/** Every booking and introduction request for one professional, earliest visit first. */
export function introductionsFor(doctorId: string): SampleIntroduction[] {
  return introductionRows
    .filter((r) => r.doctorId === doctorId)
    .map(toIntroduction)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function introductionById(id: string): SampleIntroduction | undefined {
  const row = introductionRows.find((r) => r.id === id);
  return row ? toIntroduction(row) : undefined;
}

export function inboxStatus(i: SampleIntroduction, now: Date = new Date()): InboxStatus {
  if (i.status === "request" || i.status === "done") return i.status;
  return i.startsAt.getTime() > now.getTime() ? "upcoming" : "awaitingDone";
}
/* ---------------- Records summaries and shares (screen 36; the summary body is screen 26's too) ---------------- */

/**
 * The prototype's signed-in professional (screens 30 to 36): Dr Omar Khalil in Chicago. Production reads the session and the
 * doctor's own zone from the availability settings. Dates the doctor reads about their own work show in this zone unless the
 * page is opened with ?tz=. The builder (29) is the exception: it opens on doc_013, the registry pre-fill that /claim hands over.
 */
export const sampleProfessional = { id: "doc_002", timeZone: "America/Chicago" } as const;
export const sampleProfessionalId = sampleProfessional.id;

/**
 * The prototype's signed-in patient (screens 18 to 28): Noura in Riyadh, the patient behind share sh_001 and introduction
 * int_002. Her bookings are the rows in data/sample/bookings.json whose patientFirstName is hers. Production reads the session.
 */
export const samplePatient = { firstNameEn: "Noura", firstNameAr: "نورة", gender: "f", country: "SA", timeZone: "Asia/Riyadh" } as const;

/**
 * The prototype's signed-in admin (screens 37 to 47): Dr Ayman's operations lead in Riyadh. Admin pages render dates in this
 * zone unless ?tz= is set; audit rows and job logs keep their UTC instants. Production reads the session and the TOTP factor.
 */
export const sampleAdmin = { id: "adm_001", nameEn: "Sara Al-Rashid", nameAr: "سارة الراشد", email: "ops@3affya.example", timeZone: "Asia/Riyadh" } as const;

type SampleSummaryRow = Omit<SummaryData, "generatedAt"> & {
  recordSetId: string;
  patient: { firstNameEn: string; firstNameAr: string; gender: "f" | "m" };
  generatedAtUtc: string;
  reviewedBy: { professionalId: string; reviewedAtUtc: string } | null;
};
type SampleShareRow = { id: string; summaryId: string; professionalId: string; sharedAtUtc: string; viewedAtUtc: string | null };

const summaryRows = (summariesJson as unknown as { summaries: SampleSummaryRow[] }).summaries;
const shareRows = (summariesJson as unknown as { shares: SampleShareRow[] }).shares;

/** A summary as both viewers read it, instants shifted with sampleInstant. `review` is the licensed reviewer (rules T4, Q6). */
export type SampleSummary = {
  recordSetId: string;
  patient: SampleSummaryRow["patient"];
  data: SummaryData;
  review: { professionalId: string; at: Date } | null;
};

function toSampleSummary(row: SampleSummaryRow): SampleSummary {
  const { recordSetId, patient, generatedAtUtc, reviewedBy, ...rest } = row;
  return {
    recordSetId,
    patient,
    data: { ...rest, generatedAt: sampleInstant(generatedAtUtc) },
    review: reviewedBy ? { professionalId: reviewedBy.professionalId, at: sampleInstant(reviewedBy.reviewedAtUtc) } : null,
  };
}

/** The patient's summary for one record set (screen 26). */
export function summaryForRecordSet(recordSetId: string): SampleSummary | undefined {
  const row = summaryRows.find((s) => s.recordSetId === recordSetId);
  return row ? toSampleSummary(row) : undefined;
}

/** New until the professional opens it, viewed once opened, reviewed once that professional marked the summary reviewed. */
export type ShareStatus = "new" | "viewed" | "reviewed";

export type SampleShare = {
  id: string;
  professionalId: string;
  summary: SampleSummary;
  sharedAt: Date;
  /** Every share ends shareDefaultDays after it was made (the patient's own choice of end date comes with screen 27). */
  expiresAt: Date;
  status: ShareStatus;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toSampleShare(row: SampleShareRow): SampleShare | undefined {
  const summaryRow = summaryRows.find((s) => s.id === row.summaryId);
  if (!summaryRow) return undefined;
  const summary = toSampleSummary(summaryRow);
  const sharedAt = sampleInstant(row.sharedAtUtc);
  const status: ShareStatus =
    summary.review?.professionalId === row.professionalId ? "reviewed" : row.viewedAtUtc ? "viewed" : "new";
  return {
    id: row.id,
    professionalId: row.professionalId,
    summary,
    sharedAt,
    expiresAt: new Date(sharedAt.getTime() + business.shareDefaultDays * DAY_MS),
    status,
  };
}

/** The shares a professional can open now, newest first. Ended shares are gone from the list (task 3.10). */
export function sharesFor(professionalId: string, now: Date = new Date()): SampleShare[] {
  return shareRows
    .filter((r) => r.professionalId === professionalId)
    .map(toSampleShare)
    .filter((s): s is SampleShare => !!s && s.expiresAt > now)
    .sort((a, b) => b.sharedAt.getTime() - a.sharedAt.getTime());
}

/** One share, only for the professional it was made for and only before it ends; anything else is refused (undefined). */
export function shareFor(id: string, professionalId: string, now: Date = new Date()): SampleShare | undefined {
  return sharesFor(professionalId, now).find((s) => s.id === id);
}
/* ---------------- Profile builder (screen 29) ---------------- */

/** A US state or DC for the city and licence pickers, bilingual (data/sample/us-states.json). */
export type UsState = { code: string; nameEn: string; nameAr: string };
export const usStates = usStatesJson as UsState[];
export const usStateByCode = (code: string) => usStates.find((s) => s.code === code);
export const usStateByName = (nameEn: string) => usStates.find((s) => s.nameEn === nameEn);

export type CredentialKind = "licence" | "board" | "other";
export type BoardStatus = "certified" | "eligible";
export type SampleCredentialFile = { id: string; name: string; kind: CredentialKind; sizeBytes: number; uploadedAtUtc: string };

/**
 * What a doctor entered in the builder beyond the registry row (data/sample/builder.json): licence, board status and the
 * names of the uploaded credential files (the prototype stores names, never files). The submitted and decided instants and
 * the reviewer's note are what the builder's submitted and rejected previews read; instants go through sampleInstant.
 * Rows without an entry here start from the registry row alone.
 */
export type SampleBuilderRow = {
  id: string;
  licenceState: string | null;
  licenceNumber: string | null;
  boardStatus: BoardStatus | null;
  /** Null: use the board named in profiles.json. */
  boardName: string | null;
  videoLink: string;
  files: SampleCredentialFile[];
  submittedAtUtc: string | null;
  decidedAtUtc: string | null;
  rejection: { fileId: string; reasonEn: string; reasonAr: string } | null;
};

const sampleBuilderRows = builderJson as unknown as SampleBuilderRow[];

export function builderRowFor(id: string): SampleBuilderRow | undefined {
  return sampleBuilderRows.find((r) => r.id === id);
}

/* ---------------- Patient sign-in (screen 18) ---------------- */

/** The address the sign-in code step shows when it is opened by URL (?step=code). Synthetic, on the reserved example.com domain. */
export const signInSampleEmail = "noura@example.com";

/* ---------------- Patient settings (screen 28) ---------------- */
// Appended block (wave 4). The signed-in patient's settings (data/sample/patient-settings.json): her name in both scripts, the
// reserved example.com email, an optional phone, her zone and calendar choice, which optional emails are on, whether she has
// uploads, and when the ?state=deletionRequested preview asked for her account to be deleted (shifted with sampleInstant, so
// the deletion date always lies ahead). Production reads the profiles row through the session; the page language is the URL.
import patientSettingsJson from "@/data/sample/patient-settings.json";

export type PatientEmailKey = "summaryReady" | "shareOpened" | "news";
export type SamplePatientSettings = {
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  timeZone: string;
  hijri: boolean;
  emails: Record<PatientEmailKey, boolean>;
  hasUploads: boolean;
  deletionRequestedAt: Date;
};

export function samplePatientSettings(): SamplePatientSettings {
  const { deletionRequestedAtUtc, ...rest } = patientSettingsJson;
  return { ...rest, deletionRequestedAt: sampleInstant(deletionRequestedAtUtc) };
}
/* ---------------- Receipts (screen 23) ---------------- */
// Imported here, not at the top, so this section stays one appended block (ES imports are hoisted either way). Local names
// carry a receipt prefix so another screen's own import of bookings.json cannot collide with this one.
import receiptBookingsJson from "@/data/sample/bookings.json";
import receiptsJson from "@/data/sample/receipts.json";
import { refundFor, type CancelledBy, type RefundReason } from "@/lib/refunds";

type ReceiptBookingRow = {
  id: string;
  doctorId: string;
  patientFirstName: string;
  startsAtUtc: string;
  visitType: "video" | "phone";
  status: "upcoming" | "done" | "cancelled" | "refunded";
  feeUsdCents: number;
  platformFeeUsdCents: number;
  cardProcessingUsdCents: number;
  doctorTimeZone: string;
};

export type ReceiptCardBrand = "visa" | "mastercard";
export type ReceiptWallet = "applePay" | "googlePay";
export type ReceiptRefundStatus = "pending" | "succeeded";

/** Payment facts per booking (data/sample/receipts.json), as the payment_intent.succeeded and charge.refunded webhooks store them. */
type ReceiptRow = {
  bookingId: string;
  receiptNumber: string;
  currency: string;
  paidAtUtc: string;
  paymentMethod: { wallet: ReceiptWallet | null; brand: ReceiptCardBrand; last4: string };
  cancellation: { atUtc: string; by: CancelledBy } | null;
  refund: { id: string; createdAtUtc: string; status: ReceiptRefundStatus } | null;
};

/**
 * One receipt: a paid booking with its three lines as charged (the booking row, never recomputed from today's fee), how it was
 * paid, and any cancellation and refund. Instants go through sampleInstant. The refund amount follows the refund rule in
 * lib/refunds.ts; production reads the amount Stripe refunded from the stored refund row.
 */
export type SampleReceipt = {
  id: string;
  receiptNumber: string;
  doctorId: string;
  visitType: "video" | "phone";
  visitStatus: "upcoming" | "done" | "cancelled";
  startsAt: Date;
  doctorTimeZone: string;
  paidAt: Date;
  currency: string;
  doctorFeeCents: number;
  platformFeeCents: number;
  cardProcessingCents: number;
  totalCents: number;
  paymentMethod: ReceiptRow["paymentMethod"];
  cancellation: { at: Date; by: CancelledBy; reason: RefundReason } | null;
  refunds: Array<{ id: string; at: Date; status: ReceiptRefundStatus; amountCents: number }>;
};

const receiptBookingRows = receiptBookingsJson as unknown as ReceiptBookingRow[];
const receiptRows = receiptsJson as unknown as ReceiptRow[];

function toReceipt(r: ReceiptRow): SampleReceipt | undefined {
  const b = receiptBookingRows.find((row) => row.id === r.bookingId);
  // Only the signed-in patient's bookings resolve (production: RLS); anyone else's receipt is simply not found.
  if (!b || b.patientFirstName !== samplePatient.firstNameEn) return undefined;
  const startsAt = sampleInstant(b.startsAtUtc);
  const totalCents = b.feeUsdCents + b.platformFeeUsdCents + b.cardProcessingUsdCents;
  const cancelledAt = r.cancellation ? sampleInstant(r.cancellation.atUtc) : null;
  const due = r.cancellation && cancelledAt ? refundFor(totalCents, startsAt, cancelledAt, r.cancellation.by) : null;
  return {
    id: b.id,
    receiptNumber: r.receiptNumber,
    doctorId: b.doctorId,
    visitType: b.visitType,
    // The visit box says what happened to the visit; the money side (refunded or not) is the refunds list below.
    visitStatus: b.status === "refunded" ? "cancelled" : b.status,
    startsAt,
    doctorTimeZone: b.doctorTimeZone,
    paidAt: sampleInstant(r.paidAtUtc),
    currency: r.currency,
    doctorFeeCents: b.feeUsdCents,
    platformFeeCents: b.platformFeeUsdCents,
    cardProcessingCents: b.cardProcessingUsdCents,
    totalCents,
    paymentMethod: r.paymentMethod,
    cancellation: r.cancellation && cancelledAt && due ? { at: cancelledAt, by: r.cancellation.by, reason: due.reason } : null,
    refunds:
      r.refund && due && due.amountCents > 0
        ? [{ id: r.refund.id, at: sampleInstant(r.refund.createdAtUtc), status: r.refund.status, amountCents: due.amountCents }]
        : [],
  };
}

/** The signed-in patient's receipts (samplePatient), newest payment first. Production reads the session's bookings under RLS. */
export function patientReceipts(): SampleReceipt[] {
  return receiptRows
    .map(toReceipt)
    .filter((r): r is SampleReceipt => !!r)
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
}

/** One receipt by booking id, only if it is the signed-in patient's; anything else is undefined (the not-found state). */
export function patientReceiptById(id: string): SampleReceipt | undefined {
  return patientReceipts().find((r) => r.id === id);
}
/* ---------------- Patient bookings (screens 21, 22, 23 and 27 read the same rows) ---------------- */
// Imported here, not at the top, so this section stays one appended block (ES imports are hoisted either way).
import bookingsJson from "@/data/sample/bookings.json";
import bookingVisitsJson from "@/data/sample/booking-visits.json";
import type { FeeLines } from "@/lib/fees";

/** Stored status. "upcoming" is paid and booked; "cancelled" was cancelled with no refund; "refunded" was cancelled and paid back. */
export type PatientBookingStatus = "upcoming" | "done" | "cancelled" | "refunded";

/** A booking as data/sample/bookings.json stores it: UTC instants, money in minor units, the three lines as charged (rule P1). */
type PatientBookingRow = {
  id: string;
  doctorId: string;
  patientFirstName: string;
  startsAtUtc: string;
  visitType: "video" | "phone";
  status: PatientBookingStatus;
  feeUsdCents: number;
  platformFeeUsdCents: number;
  cardProcessingUsdCents: number;
  patientTimeZone: string;
  doctorTimeZone: string;
  joinUrl?: string | null;
  bookedAtUtc?: string;
  cancelledAtUtc?: string | null;
  cancelledBy?: "patient" | "doctor" | null;
};

/** What a row may leave to data/sample/booking-visits.json: the visit length, the meeting link and when it was cancelled. */
type PatientBookingVisitRow = { bookingId: string; durationMinutes: number; joinUrl: string | null; cancelledAtUtc: string | null };

/**
 * A booking as the patient portal reads it. Every instant goes through sampleInstant, so upcoming visits stay ahead. `paid` is
 * what the payment charged, line by line, never recomputed from today's rates (rule P1); `totalCents` is its sum.
 */
export type PatientBooking = {
  id: string;
  doctorId: string;
  doctor: SampleDoctor;
  status: PatientBookingStatus;
  visitType: "video" | "phone";
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  patientTimeZone: string;
  doctorTimeZone: string;
  paid: FeeLines;
  totalCents: number;
  /** The doctor's own meeting link for a video visit (handoff: no hosted video); phone visits have none, the doctor rings. */
  joinUrl: string | null;
  bookedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: "patient" | "doctor" | null;
};

const patientBookingRows = bookingsJson as unknown as PatientBookingRow[];
const patientBookingVisitRows = bookingVisitsJson as unknown as PatientBookingVisitRow[];

function toPatientBooking(r: PatientBookingRow, doctor: SampleDoctor, now: Date): PatientBooking {
  const visit = patientBookingVisitRows.find((v) => v.bookingId === r.id);
  // Prototype: the default slot length stands in for the doctor's own (availability settings) until task 3.3.
  const durationMinutes = visit?.durationMinutes ?? business.slotLengthMinutesDefault;
  const startsAt = sampleInstant(r.startsAtUtc);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  // A paid visit stays upcoming (and joinable) until its slot has ended, then reads as done.
  const status: PatientBookingStatus = r.status === "upcoming" && endsAt.getTime() <= now.getTime() ? "done" : r.status;
  const { feeUsdCents: doctorFeeCents, platformFeeUsdCents: platformFeeCents, cardProcessingUsdCents: cardProcessingCents } = r;
  const totalCents = doctorFeeCents + platformFeeCents + cardProcessingCents;
  const joinUrl = r.joinUrl ?? visit?.joinUrl ?? null;
  const cancelledAtUtc = r.cancelledAtUtc ?? visit?.cancelledAtUtc ?? null;
  return {
    id: r.id,
    doctorId: r.doctorId,
    doctor,
    status,
    visitType: r.visitType,
    startsAt,
    endsAt,
    durationMinutes,
    patientTimeZone: r.patientTimeZone,
    doctorTimeZone: r.doctorTimeZone,
    paid: { doctorFeeCents, platformFeeCents, cardProcessingCents, totalCents },
    totalCents,
    joinUrl: r.visitType === "video" ? joinUrl : null,
    bookedAt: r.bookedAtUtc ? sampleInstant(r.bookedAtUtc) : null,
    cancelledAt: cancelledAtUtc ? sampleInstant(cancelledAtUtc) : null,
    cancelledBy: r.cancelledBy ?? null,
  };
}

/**
 * Every booking of one patient, earliest visit first. The prototype matches the patient's first name (samplePatient is Noura);
 * production reads the signed-in patient's rows through RLS.
 */
export function bookingsForPatient(firstNameEn: string, now: Date = new Date()): PatientBooking[] {
  return patientBookingRows
    .filter((r) => r.patientFirstName === firstNameEn)
    .flatMap((r) => {
      const doctor = sampleDoctors.find((d) => d.id === r.doctorId);
      return doctor ? [toPatientBooking(r, doctor, now)] : [];
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** One booking by id. Production reads it through RLS, so only the signed-in patient's own bookings resolve. */
export function patientBookingById(id: string, now: Date = new Date()): PatientBooking | undefined {
  const row = patientBookingRows.find((b) => b.id === id);
  const doctor = row && sampleDoctors.find((d) => d.id === row.doctorId);
  return row && doctor ? toPatientBooking(row, doctor, now) : undefined;
}
/* ---------------- Sharing and consent (screen 27) ---------------- */
// Appended block (screen 27, task 3.10). The patient's side of the same share rows screen 36 reads (summaries.json `shares`),
// mapped by the same toSampleShare, so a share has the same dates and status on both sides and ends for the patient exactly when
// it leaves the professional's list (expiresAt <= now). The doctors a patient can share with are the doctors of their upcoming
// bookings: the rows in data/sample/bookings.json whose patientFirstName is the signed-in patient's.
type SharingBookingRow = {
  id: string;
  doctorId: string;
  patientFirstName: string;
  startsAtUtc: string;
  visitType: "video" | "phone";
  status: "upcoming" | "done" | "cancelled" | "refunded";
};

/** A visit the signed-in patient booked and has not had yet. Its doctor is someone they can share their summary with. */
export type PatientUpcomingVisit = { bookingId: string; doctor: SampleDoctor; startsAt: Date; visitType: "video" | "phone" };

/** A share of the patient's summary as the patient reads it: screen 36's share plus the doctor and when they first opened it. */
export type PatientShare = SampleShare & { doctor: SampleDoctor; viewedAt: Date | null };

export type PatientSharing = {
  /** The patient's records summary; undefined until they have uploaded records and the summary is ready. */
  summary: SampleSummary | undefined;
  /** Every share of that summary, live or ended, newest first. Live means expiresAt > now, the same test sharesFor uses. */
  shares: PatientShare[];
  /** The patient's upcoming visits, one per doctor (the earliest), soonest first. */
  visits: PatientUpcomingVisit[];
};

const isSignedInPatient = (firstNameEn: string) => firstNameEn === samplePatient.firstNameEn;

/** Everything the sharing page (screen 27) reads for the signed-in patient. Production reads the session and RLS-scoped rows. */
export function patientSharing(now: Date = new Date()): PatientSharing {
  const summaryRow = summaryRows.find((s) => isSignedInPatient(s.patient.firstNameEn));
  const shares = summaryRow
    ? shareRows
        .filter((row) => row.summaryId === summaryRow.id)
        .flatMap((row): PatientShare[] => {
          const share = toSampleShare(row);
          const doctor = doctorById(row.professionalId);
          return share && doctor ? [{ ...share, doctor, viewedAt: row.viewedAtUtc ? sampleInstant(row.viewedAtUtc) : null }] : [];
        })
        .sort((a, b) => b.sharedAt.getTime() - a.sharedAt.getTime())
    : [];
  const doctorsSeen = new Set<string>();
  const visits = (bookingsJson as unknown as SharingBookingRow[])
    .filter((b) => isSignedInPatient(b.patientFirstName) && b.status === "upcoming")
    .map((b) => ({ row: b, startsAt: sampleInstant(b.startsAtUtc) }))
    .filter((v) => v.startsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .flatMap(({ row, startsAt }): PatientUpcomingVisit[] => {
      const doctor = doctorById(row.doctorId);
      if (!doctor || doctorsSeen.has(doctor.id)) return [];
      doctorsSeen.add(doctor.id);
      return [{ bookingId: row.id, doctor, startsAt, visitType: row.visitType }];
    });
  return { summary: summaryRow ? toSampleSummary(summaryRow) : undefined, shares, visits };
}
/* ---------------- Records upload and processing (screens 24 and 25) ---------------- */
// Imported here so this section stays one appended block (ES imports are hoisted either way). Synthetic rows only
// (data/sample/records.json): file names and sizes, never a file. rs_001..rs_003 are the sets behind sum_001..sum_003.
import recordsJson from "@/data/sample/records.json";
import type { DraftFile, FailureReason, PageStatus, PipelineStep, RecordFileKind, RecordSetStatus, UnreadableReason } from "@/lib/records";

export type RecordPage = { status: PageStatus; reason?: UnreadableReason };
export type RecordFile = { id: string; name: string; kind: RecordFileKind; sizeBytes: number; pages: RecordPage[] };

type RecordSetRow = {
  id: string;
  patientFirstNameEn: string;
  status: RecordSetStatus;
  /** The step the set is on (queued and processing) or stopped at (failed); null once done. */
  step: PipelineStep | null;
  createdAtUtc: string;
  paidAtUtc: string | null;
  finishedAtUtc: string | null;
  summaryId: string | null;
  /** Failed sets: why, and the file and page (within that file) the pipeline stopped on. */
  failure: { reason: FailureReason; fileId: string; filePage: number } | null;
  files: RecordFile[];
};

/** A record set as the patient's pages read it, instants shifted with sampleInstant. Only accepted files are part of a set. */
export type SampleRecordSet = Omit<RecordSetRow, "createdAtUtc" | "paidAtUtc" | "finishedAtUtc"> & {
  createdAt: Date;
  paidAt: Date | null;
  finishedAt: Date | null;
};

const recordsData = recordsJson as unknown as { draft: { files: DraftFile[]; checking: string[] }; sets: RecordSetRow[] };

function toRecordSet(row: RecordSetRow): SampleRecordSet {
  const { createdAtUtc, paidAtUtc, finishedAtUtc, ...rest } = row;
  return {
    ...rest,
    createdAt: sampleInstant(createdAtUtc),
    paidAt: paidAtUtc ? sampleInstant(paidAtUtc) : null,
    finishedAt: finishedAtUtc ? sampleInstant(finishedAtUtc) : null,
  };
}

/** The signed-in patient's record sets, newest first. Production: RLS returns only the patient's own rows. */
export function recordSetsFor(patientFirstNameEn: string = samplePatient.firstNameEn): SampleRecordSet[] {
  return recordsData.sets
    .filter((s) => s.patientFirstNameEn === patientFirstNameEn)
    .map(toRecordSet)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** One set, only for its own patient; another patient's set or an unknown id is undefined (the page answers 404). */
export function recordSetFor(id: string, patientFirstNameEn: string = samplePatient.firstNameEn): SampleRecordSet | undefined {
  return recordSetsFor(patientFirstNameEn).find((s) => s.id === id);
}

/** The upload flow's sample files (screen 24's previews): `checking` lists the ids still being checked in ?state=validating. */
export function sampleUploadDraft(): { files: DraftFile[]; checking: string[] } {
  return recordsData.draft;
}
/* ---------------- Booking: slot picker and checkout (screens 19 and 20) ---------------- */
// Appended block. The picker offers the same hand-authored open times the profile shows (profiles.json, through upcomingSlots),
// so a time tapped on the profile is the time pre-selected there. Holds and bookings are not subtracted until task 3.2.

// The practice's US state gives the doctor's zone when there is no availability schedule (only doc_002 has one).
const STATE_TIME_ZONES: Readonly<Record<string, string>> = {
  California: "America/Los_Angeles",
  Illinois: "America/Chicago",
  Michigan: "America/Detroit",
  "New York": "America/New_York",
  Ohio: "America/New_York",
  Texas: "America/Chicago",
};

/** The doctor's own IANA zone: the availability schedule's zone, else the zone of the practice's state ("Chicago, Illinois"). */
export function doctorTimeZone(d: SampleDoctor): string {
  const schedule = availabilityData.schedules.find((s) => s.doctorId === d.id);
  if (schedule) return schedule.timeZone;
  const state = d.cityEn.split(",").pop()?.trim() ?? "";
  return STATE_TIME_ZONES[state] ?? "America/New_York";
}

/** First-visit length in minutes: the doctor's slot length, else the default. */
export function visitMinutesFor(doctorId: string): number {
  return availabilityData.schedules.find((s) => s.doctorId === doctorId)?.slotMinutes ?? business.slotLengthMinutesDefault;
}

/** The times a patient can book now: the doctor's open times, minus any closer than the doctor's lead time (rule P8). */
export function bookableSlots(doctorId: string, now: Date = new Date()): Date[] {
  const leadHours = availabilityData.schedules.find((s) => s.doctorId === doctorId)?.leadTimeHours ?? business.leadTimeHoursDefault;
  const notBefore = now.getTime() + leadHours * 3_600_000;
  return upcomingSlots(doctorId).filter((s) => s.getTime() >= notBefore);
}

/**
 * The answers the prototype's held, failed and paying previews show (?state=held on the picker, ?state=failed on checkout): the
 * signed-in patient (samplePatient) booking doc_002 for her child. Synthetic; the phone follows the Saudi mobile pattern.
 */
export const sampleBookingAnswers = {
  visit: "video",
  forWhom: "child",
  ageGroup: "child",
  reasonEn: "Ear infections keep coming back, four since the start of the year. We want a second opinion on ear tubes.",
  reasonAr: "التهابات الأذن تتكرر، أربع مرات منذ بداية السنة. نريد رأياً ثانياً في أنابيب الأذن.",
  locationCountry: "SA",
  phoneCountry: "SA",
  phoneNational: "501234567",
} as const;

/* ---------------- Audit log (screen 47) ---------------- */
// Appended block. data/sample/audit.json holds the log oldest first, the way an append-only table grows; auditEntries reads it
// newest first. Ids and first names only: no emails, no surnames for patients, no record content. Professionals resolve
// through doctors.json; an id doctors.json no longer has (doc_021) is a removed profile, so its name is gone from the log too.
// Instants are authored for 12 Oct to 8 Nov 2026 and shifted with sampleInstant, so the newest entries stay recent.
import auditJson from "@/data/sample/audit.json";
import type { AuditAction, AuditActorKind, AuditChange, AuditCheckKind, AuditCheckResult, AuditDetail, AuditTargetType } from "@/lib/audit";

/** Who an entry names as its actor. Admins and patients carry a first name; professionals read their name from doctors.json. */
export type AuditActor = { id: string; kind: AuditActorKind; firstNameEn?: string; firstNameAr?: string };

type AuditCheckRow = { kind: AuditCheckKind; source: string; result: AuditCheckResult; checkedAtUtc: string; by: string };
type AuditEntryRow = {
  id: string;
  atUtc: string;
  actorId: string;
  action: AuditAction;
  target: { type: AuditTargetType; id: string; doctorId?: string };
  changes: AuditChange[];
  details: AuditDetail[];
  verification: { reviewer: string | null; checks: AuditCheckRow[] } | null;
  note: { en: string; ar: string } | null;
  requestId: string;
  stripeEventId: string | null;
};

/** One primary-source check (rule A1): what was checked, against which source, the result, when and by whom. */
export type AuditCheck = Omit<AuditCheckRow, "checkedAtUtc"> & { checkedAt: Date };

export type SampleAuditEntry = Omit<AuditEntryRow, "atUtc" | "verification"> & {
  at: Date;
  /** Verification events only: the checks behind the decision and the reviewer who made it (null while checks are recorded). */
  verification: { reviewer: string | null; checks: AuditCheck[] } | null;
};

const auditData = auditJson as unknown as { actors: AuditActor[]; entries: AuditEntryRow[] };

export const auditActors: readonly AuditActor[] = auditData.actors;

export function auditActorById(id: string): AuditActor | undefined {
  return auditData.actors.find((a) => a.id === id);
}

/** The whole log, newest first. An entry the sample clock would put after `now` is left out: a log never holds the future. */
export function auditEntries(now: Date = new Date()): SampleAuditEntry[] {
  return auditData.entries
    .map(({ atUtc, verification, ...row }) => ({
      ...row,
      at: sampleInstant(atUtc),
      verification: verification
        ? {
            reviewer: verification.reviewer,
            checks: verification.checks.map(({ checkedAtUtc, ...c }) => ({ ...c, checkedAt: sampleInstant(checkedAtUtc) })),
          }
        : null,
    }))
    .filter((e) => e.at.getTime() <= now.getTime())
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id));
}

/* ---------------- Outreach and invites (screen 46, tasks 2.3 and 4.5) ---------------- */
// Appended block. The admin view of data/sample/invites.json: every invite with its tracking facts and a derived status, plus
// the unclaimed registry doctors still to invite. Rows inv_001..inv_003 are screen 9's claim demos and carry no tracking
// fields; inv_004..inv_013 add them. Instants go through sampleInstant (authored up to 8 Nov, so they stay in the past);
// screen 9 reads the same rows unshifted, which only moves its own three dates. inv_013 (`preview: "justSent"`) is the invite
// the ?state=just-sent preview adds: left out otherwise, and dated now. Production derives the same facts from the invites
// table (token stored as a hash), the Resend delivery webhook (bounces) and the claim page (opens).

/** Why a send bounced, as the Resend webhook reports it: no such mailbox, or the receiving server refused the email. */
export type OutreachBounce = "noMailbox" | "rejected";

type OutreachInviteRow = SampleInvite & {
  /** When the claim page was first opened from this link. Email opens are not tracked. */
  openedAtUtc?: string | null;
  bouncedAtUtc?: string | null;
  bounce?: OutreachBounce | null;
  revokedAtUtc?: string | null;
  /** The language the email went out in; screen 9's rows predate the choice and went out in English. */
  language?: "ar" | "en";
  preview?: "justSent";
};

/** One status per invite, first match wins: revoked, claimed, bounced, expired, opened, else sent (not opened yet). */
export type OutreachStatus = "sent" | "opened" | "claimed" | "expired" | "bounced" | "revoked";

export type OutreachInvite = {
  id: string;
  doctor: SampleDoctor;
  email: string;
  language: "ar" | "en";
  status: OutreachStatus;
  sentAt: Date;
  expiresAt: Date;
  openedAt?: Date;
  claimedAt?: Date;
  bouncedAt?: Date;
  bounce?: OutreachBounce;
  revokedAt?: Date;
};

const outreachRows = invitesJson as unknown as OutreachInviteRow[];

/** Sent and opened invites still work: the doctor can claim from them, and a new invite would replace them. */
export const outreachIsLive = (i: Pick<OutreachInvite, "status">) => i.status === "sent" || i.status === "opened";

function toOutreachInvite(row: OutreachInviteRow, now: Date, validDays: number): OutreachInvite | undefined {
  const doctor = sampleDoctors.find((d) => d.id === row.doctorId);
  if (!doctor) return undefined;
  const at = (iso: string | null | undefined) => (iso ? sampleInstant(iso) : undefined);
  // The preview invite goes out "now", so its link works for the full validity period from this moment.
  const justSent = row.preview === "justSent";
  // sampleInvites already carries shifted instants; this block reads the same rows raw, so it shifts them once here.
  const sentAt = justSent ? now : sampleInstant(row.sentAtUtc);
  const expiresAt = justSent ? new Date(now.getTime() + validDays * 86_400_000) : sampleInstant(row.expiresAtUtc);
  const claimedAt = at(row.usedAtUtc);
  const bouncedAt = at(row.bouncedAtUtc);
  const revokedAt = at(row.revokedAtUtc);
  const status: OutreachStatus = revokedAt
    ? "revoked"
    : claimedAt
      ? "claimed"
      : bouncedAt
        ? "bounced"
        : expiresAt.getTime() <= now.getTime()
          ? "expired"
          : row.openedAtUtc
            ? "opened"
            : "sent";
  return {
    id: row.id,
    doctor,
    email: row.email,
    language: row.language ?? "en",
    status,
    sentAt,
    expiresAt,
    openedAt: at(row.openedAtUtc),
    claimedAt,
    bouncedAt,
    bounce: row.bounce ?? undefined,
    revokedAt,
  };
}

/**
 * Every invite, newest first. `justSent` adds the ?state=just-sent preview invite at the top. `validDays` is
 * outreach.inviteValidDays from config/business.ts, passed in so this block adds no import.
 */
export function outreachInvites(validDays: number, { justSent = false }: { justSent?: boolean } = {}, now: Date = new Date()): OutreachInvite[] {
  return outreachRows
    .filter((r) => r.preview !== "justSent" || justSent)
    .flatMap((r) => toOutreachInvite(r, now, validDays) ?? [])
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
}

/**
 * Unclaimed registry doctors with no live invite, in registry order, each with their latest invite when one expired, bounced
 * or was revoked (they come back here to be invited again). Doctors with a live invite are on the sent list instead.
 */
export function outreachCandidates(invites: OutreachInvite[]): Array<{ doctor: SampleDoctor; last?: OutreachInvite }> {
  const blocked = doctorsWithRemovalRequests();
  return sampleDoctors
    .filter((d) => d.state === "unclaimed" && !blocked.has(d.id))
    .flatMap((doctor) => {
      const mine = invites.filter((i) => i.doctor.id === doctor.id);
      if (mine.some(outreachIsLive)) return [];
      return [{ doctor, last: mine[0] }];
    });
}

/* ---------------- Removal requests (screen 41) ---------------- */
// Appended block. Imported here, not at the top, so this section stays one appended block (ES imports are hoisted either way).
// The rows are what screen 10's remove branch would insert into the removal queue (task 2.8): the four fields the doctor typed,
// the page language they used, when the request arrived, when the confirmation link was opened, and any admin question or
// decision. Synthetic; emails use the reserved example.com domain.
import removalsJson from "@/data/sample/removals.json";
import type { RemovalReason } from "@/app/[locale]/doctors/[id]/this-is-me/validation";

/** Stored status: open (waiting on us), infoRequested (we asked the doctor a question), confirmed (removed, 410) or refused. */
export type RemovalStatus = "open" | "infoRequested" | "confirmed" | "refused";

type RemovalRow = {
  id: string;
  doctorId: string;
  requesterName: string;
  requesterEmail: string;
  npi: string;
  reason: RemovalReason;
  details: string;
  locale: "ar" | "en";
  receivedAtUtc: string;
  emailConfirmedAtUtc: string | null;
  status: RemovalStatus;
  infoRequest: { askedAtUtc: string; askedBy: string; question: string } | null;
  decision: { decidedAtUtc: string; decidedBy: string; reason: string | null } | null;
};

/** One removal request as the admin queue reads it, instants shifted with removalInstant. */
export type SampleRemovalRequest = Omit<RemovalRow, "receivedAtUtc" | "emailConfirmedAtUtc" | "infoRequest" | "decision"> & {
  doctor: SampleDoctorDetails;
  receivedAt: Date;
  emailConfirmedAt: Date | null;
  infoRequest: { askedAt: Date; askedBy: string; question: string } | null;
  decision: { decidedAt: Date; decidedBy: string; reason: string | null } | null;
};

const removalsData = removalsJson as unknown as { authoredNowUtc: string; requests: RemovalRow[] };

/**
 * Prototype clock for the removal queue only. sampleInstant shifts in whole days, which moves an hour-level SLA by up to 24 hours
 * over a day, so a request could not stay amber (36 to 48 hours old) whenever the prototype is opened. Here the instant the rows
 * were authored against (`authoredNowUtc`) maps to the real now, to the minute: rm_001 is always about 6 hours old, rm_002 about
 * 40 and rm_003 about 53. Gone with task 1.5, when received_at comes from the database.
 */
export function removalInstant(iso: string, now: Date = new Date()): Date {
  return sampleInstantExact(iso, removalsData.authoredNowUtc, now);
}

/** Doctors whose removal was confirmed (screen 41): their profile answers 410 and no public or admin list offers them. */
export function removedDoctorIds(): Set<string> {
  return new Set(removalsData.requests.filter((r) => r.status === "confirmed").map((r) => r.doctorId));
}

/** Doctors with a removal request open, waiting on them, or confirmed: outreach (46) never invites them. */
export function doctorsWithRemovalRequests(): Set<string> {
  return new Set(removalsData.requests.filter((r) => r.status !== "refused").map((r) => r.doctorId));
}

/** Every removal request, newest first. Only rows whose doctor exists resolve. Production reads the queue under admin RLS. */
export function removalRequests(now: Date = new Date()): SampleRemovalRequest[] {
  const at = (iso: string) => removalInstant(iso, now);
  return removalsData.requests
    .flatMap((r): SampleRemovalRequest[] => {
      const doctor = doctorById(r.doctorId);
      if (!doctor) return [];
      return [
        {
          ...r,
          doctor,
          receivedAt: at(r.receivedAtUtc),
          emailConfirmedAt: r.emailConfirmedAtUtc ? at(r.emailConfirmedAtUtc) : null,
          infoRequest: r.infoRequest ? { askedAt: at(r.infoRequest.askedAtUtc), askedBy: r.infoRequest.askedBy, question: r.infoRequest.question } : null,
          decision: r.decision ? { decidedAt: at(r.decision.decidedAtUtc), decidedBy: r.decision.decidedBy, reason: r.decision.reason } : null,
        },
      ];
    })
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
}

/** One removal request by id, or undefined (the in-shell not-found state). */
export function removalRequestById(id: string, now: Date = new Date()): SampleRemovalRequest | undefined {
  return removalRequests(now).find((r) => r.id === id);
}

/* ---------------- Members and subscriptions, admin (screen 42) ---------------- */
// Appended block (wave 5). The admin members list: every verified professional with their membership, if any, and the Stripe
// facts the subscription webhooks store (data/sample/membership-billing.json): customer and subscription ids for the Dashboard
// links, when it started, free months an admin granted, and the last invoice. No amounts are stored: the invoice amount is the
// list price for the plan's interval (config/business.ts). doc_002 has one row per screen-33 preview state in memberships.json;
// the admin list shows its active row (mem_active), the one /professional/membership?state=active shows. Imported here, not at
// the top, so this section stays one appended block (ES imports are hoisted either way).
import membershipBillingJson from "@/data/sample/membership-billing.json";

export type MembershipInvoiceStatus = "paid" | "failed";

/** Stripe facts per membership, instants shifted with sampleInstant. `compUntil`: no charge until then (free months). */
export type SampleMemberBilling = {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  startedAt: Date;
  compUntil: Date | null;
  lastInvoice: { id: string; number: string; status: MembershipInvoiceStatus; at: Date } | null;
};

/** One professional as the admin members list reads them. No membership row means the free Claimed plan (status none). */
export type AdminMemberRow = {
  doctor: SampleDoctor;
  membership: SampleMembership | null;
  billing: SampleMemberBilling | null;
  /** The doctor's own zone: the one their membership page shows dates in. */
  doctorTimeZone: string;
};

type SampleMemberBillingRow = {
  membershipId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  startedAtUtc: string;
  compUntilUtc: string | null;
  lastInvoice: { id: string; number: string; status: MembershipInvoiceStatus; atUtc: string } | null;
};
const memberBillingRows = membershipBillingJson as unknown as SampleMemberBillingRow[];
const ADMIN_LISTED_PROFESSIONAL_ROW = "mem_active";

function shiftedMembership(row: SampleMembershipRow): SampleMembership {
  const at = (iso: string | null) => (iso ? sampleInstant(iso) : null);
  return {
    id: row.id,
    doctorId: row.doctorId,
    status: row.status,
    interval: row.interval,
    currentPeriodEnd: at(row.currentPeriodEndUtc),
    paymentFailedAt: at(row.paymentFailedAtUtc),
    cancelledAt: at(row.cancelledAtUtc),
    timeZone: row.timeZone,
  };
}

function shiftedBilling(row: SampleMemberBillingRow): SampleMemberBilling {
  const invoice = row.lastInvoice;
  return {
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    startedAt: sampleInstant(row.startedAtUtc),
    compUntil: row.compUntilUtc ? sampleInstant(row.compUntilUtc) : null,
    lastInvoice: invoice ? { id: invoice.id, number: invoice.number, status: invoice.status, at: sampleInstant(invoice.atUtc) } : null,
  };
}

/** Every verified professional with their membership, in doctor order. Production reads memberships joined to profiles (admin RLS). */
export function adminMemberRows(): AdminMemberRow[] {
  return verifiedDoctors().map((doctor) => {
    const listed = (m: SampleMembershipRow) =>
      m.doctorId === doctor.id && m.status !== "none" && (doctor.id !== sampleProfessional.id || m.id === ADMIN_LISTED_PROFESSIONAL_ROW);
    const row = sampleMembershipRows.find(listed);
    const billing = row ? memberBillingRows.find((b) => b.membershipId === row.id) : undefined;
    return {
      doctor,
      membership: row ? shiftedMembership(row) : null,
      billing: billing ? shiftedBilling(billing) : null,
      doctorTimeZone: row?.timeZone ?? doctorTimeZone(doctor),
    };
  });
}

/** One professional's row on the admin list, or undefined when they are not on it (not verified, or no such id). */
export function adminMemberRow(doctorId: string): AdminMemberRow | undefined {
  return adminMemberRows().find((r) => r.doctor.id === doctorId);
}
/* ---------------- Credential review queue (screen 38) ---------------- */
// Appended block (wave 5). The admin review reads the claims through the builder rows above (builderRowFor) and the doctor rows;
// this adds what only the review needs (data/sample/credential-reviews.json): registry values that differ from the doctor's
// entries, and the checks behind the decided previews. Imported here so the block stays one appended section.
import credentialReviewsJson from "@/data/sample/credential-reviews.json";

/** The four checks of a claim (rule A1): licence at the state board, board at ABMS or AOA, sanctions, and the photo (rule C4). */
export type ReviewCheckKey = "licence" | "board" | "sanctions" | "photo";

/** Registry fields as the CMS file had them, where they differ from the doctor's current entries. */
export type RegistryAsFiled = { doctorId: string; cityEn?: string; cityAr?: string; specialtyEn?: string; specialtyAr?: string };

/** The checks a decided preview shows: the decision instant, the licence expiry read at the source and the source per check. */
export type SampleDecidedPreview = {
  doctorId: string;
  decidedAt: Date;
  /** Calendar date (YYYY-MM-DD) as the primary source shows it; format it in UTC. */
  licenceExpiresOn: string;
  sources: Record<ReviewCheckKey, string>;
};

const credentialReviews = credentialReviewsJson as unknown as {
  registryAsFiled: RegistryAsFiled[];
  decidedPreviews: Array<Omit<SampleDecidedPreview, "decidedAt"> & { decidedAtUtc: string }>;
};

export function registryAsFiledFor(doctorId: string): RegistryAsFiled | undefined {
  return credentialReviews.registryAsFiled.find((r) => r.doctorId === doctorId);
}

export function decidedPreviewFor(doctorId: string): SampleDecidedPreview | undefined {
  const row = credentialReviews.decidedPreviews.find((r) => r.doctorId === doctorId);
  if (!row) return undefined;
  const { decidedAtUtc, ...rest } = row;
  return { ...rest, decidedAt: sampleInstant(decidedAtUtc) };
}
/* ---------------- Admin payments, refunds and payouts (screen 43) ---------------- */
// Appended block (screen 43, tasks 3.4 and 3.11). The admin's view of the same payments the patient's receipts read (23) and
// the doctor's payouts page shows (35), so the three views of one payment agree: each payment is the receipt row mapped by
// toReceipt above (lines as charged, the refund amount by the refund rule), plus the Stripe ids from data/sample/payments.json
// and the doctor's connected account. doc_002's account is the "enabled" row of payouts.json, the one screen 35 shows.
// Prototype: every payment is Noura's (receipts.json); production reads all patients' rows under the admin role (task 3.11)
// and the payout lists from Stripe's API. Money state in these rows is written only by the webhook handlers (ADR-6).
import adminPaymentsJson from "@/data/sample/payments.json";

/** Who started a refund: the cancel action on a cancellation (task 3.6), or an admin from this screen (task 3.4). */
export type AdminRefundBy = { kind: "automatic"; cancelledBy: CancelledBy } | { kind: "admin"; adminId: string };

/**
 * One refund of a payment. "succeeded" is what the charge.refunded webhook stored; "pending" is a request Stripe has accepted
 * but whose webhook has not been handled yet, so the receipt and the booking do not show it yet. `reason` is the refund rule's
 * reason for a cancellation, "byRule" for an admin's refund of a visit still ahead by the rule, or "override" for a refund in
 * full that the rule would not give.
 */
export type AdminRefund = {
  id: string;
  paymentId: string;
  at: Date;
  amountCents: number;
  status: "pending" | "succeeded";
  reason: RefundReason | "byRule" | "override";
  by: AdminRefundBy;
  noteEn: string | null;
  noteAr: string | null;
  idempotencyKey: string;
};

export type AdminPayment = Omit<SampleReceipt, "refunds"> & {
  doctor: SampleDoctor;
  patient: { nameEn: string; nameAr: string; email: string };
  stripe: { paymentIntentId: string; transferId: string; accountId: string | null };
  refunds: AdminRefund[];
};

export type AdminPayoutAccount = PayoutAccount & { doctor: SampleDoctor };

type AdminChargeRow = { bookingId: string; paymentIntentId: string; transferId: string };
type AdminAccountRow = Omit<SamplePayoutRow, "sample" | "doctorTimeZone"> & { payoutsSample?: PayoutStatus };
type AdminPendingRefundRow = {
  bookingId: string;
  kind: "full" | "rule";
  requestedBy: string;
  requestedAtUtc: string;
  idempotencyKey: string;
  noteEn: string | null;
  noteAr: string | null;
};

const adminPaymentsData = adminPaymentsJson as unknown as {
  charges: AdminChargeRow[];
  accounts: AdminAccountRow[];
  pendingRefund: AdminPendingRefundRow;
};

/** The one idempotency key per payment's refund: a second request for the same payment returns the same Stripe refund. */
export const adminRefundKey = (paymentId: string) => `refund-${paymentId}`;

/** Every connected account the admin sees, as the account.updated webhook stores it (payout lists come from Stripe's API). */
export function adminPayoutAccounts(): AdminPayoutAccount[] {
  return adminPaymentsData.accounts.flatMap((row): AdminPayoutAccount[] => {
    const doctor = sampleDoctors.find((d) => d.id === row.doctorId);
    if (!doctor) return [];
    if (row.payoutsSample) {
      // The signed-in doctor's own row, so this list and screen 35 show the same account, next payout and last payouts.
      const shared = samplePayoutAccount(row.payoutsSample);
      if (!shared) return [];
      const { doctorId: _id, doctorTimeZone: _zone, ...account } = shared;
      void _id;
      void _zone;
      return [{ ...account, doctor }];
    }
    const { doctorId: _doctorId, payoutsSample: _sample, nextPayout, recentPayouts, ...account } = row;
    void _doctorId;
    void _sample;
    return [
      {
        ...account,
        doctor,
        nextPayout: nextPayout
          ? { arrivesAt: sampleInstant(nextPayout.arrivalUtc), amountCents: nextPayout.amountCents, currency: nextPayout.currency }
          : null,
        recentPayouts: recentPayouts.map((p) => ({
          id: p.id,
          arrivesAt: sampleInstant(p.arrivalUtc),
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
        })),
      },
    ];
  });
}

/**
 * Every payment, newest first. `withPendingSample` adds the sample refund request on bk_009 (an admin's refund in full that
 * Stripe accepted but whose charge.refunded webhook has not been handled): the ?state=webhook-pending preview.
 */
export function adminPayments({ withPendingSample = false }: { withPendingSample?: boolean } = {}): AdminPayment[] {
  const settings = samplePatientSettings();
  const accounts = adminPayoutAccounts();
  const pending = adminPaymentsData.pendingRefund;
  return receiptRows
    .flatMap((row): AdminPayment[] => {
      const receipt = toReceipt(row);
      const doctor = receipt ? sampleDoctors.find((d) => d.id === receipt.doctorId) : undefined;
      const charge = adminPaymentsData.charges.find((c) => c.bookingId === row.bookingId);
      if (!receipt || !doctor || !charge) return [];
      const reason = receipt.cancellation?.reason ?? "platform";
      const by: AdminRefundBy = { kind: "automatic", cancelledBy: receipt.cancellation?.by ?? "platform" };
      const refunds: AdminRefund[] = receipt.refunds.map((x) => ({
        id: x.id,
        paymentId: receipt.id,
        at: x.at,
        amountCents: x.amountCents,
        status: x.status,
        reason,
        by,
        noteEn: null,
        noteAr: null,
        idempotencyKey: adminRefundKey(receipt.id),
      }));
      if (withPendingSample && pending.bookingId === receipt.id && refunds.length === 0) {
        // In full on a late patient cancellation, which the rule refunds nothing for: an override, so the note says why.
        const byRule = reason === "patientLate" ? 0 : receipt.totalCents;
        refunds.push({
          id: pending.idempotencyKey,
          paymentId: receipt.id,
          at: sampleInstant(pending.requestedAtUtc),
          amountCents: pending.kind === "full" ? receipt.totalCents : byRule,
          status: "pending",
          reason: pending.kind === "full" && byRule < receipt.totalCents ? "override" : reason,
          by: { kind: "admin", adminId: pending.requestedBy },
          noteEn: pending.noteEn,
          noteAr: pending.noteAr,
          idempotencyKey: pending.idempotencyKey,
        });
      }
      return [
        {
          ...receipt,
          doctor,
          patient: { nameEn: settings.nameEn, nameAr: settings.nameAr, email: settings.email },
          stripe: {
            paymentIntentId: charge.paymentIntentId,
            transferId: charge.transferId,
            accountId: accounts.find((a) => a.doctor.id === doctor.id)?.stripeAccountId ?? null,
          },
          refunds,
        },
      ];
    })
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
}

/* ---------------- Screen 40, admin specialty list (appended block) ---------------- */
// What /admin/specialties edits beyond the names and count in specialties.json: the NPPES taxonomy codes mapped to each group
// (task 1.5 writes the real mapping) and the search words in each script (rule S2). The search box (screen 5) does not read the
// search words yet; task 2.1 wires them in.
import specialtyTermsJson from "@/data/sample/specialty-terms.json";

export type SpecialtyTerms = { slug: string; taxonomyCodes: string[]; synonymsAr: string[]; synonymsEn: string[] };
/** One row of the admin specialty list: the directory row plus its codes, search words, body system and whether patients see it. */
export type SampleAdminSpecialty = SampleSpecialty & Omit<SpecialtyTerms, "slug"> & { systemId: string | null; shown: boolean };

const specialtyTermsData = specialtyTermsJson as { terms: SpecialtyTerms[]; draftSystem: Omit<SampleBodySystem, "specialties"> };

/** Every specialty as the admin list shows it, in specialties.json order. All are shown: the directory lists every one today. */
export function adminSpecialties(): SampleAdminSpecialty[] {
  const terms = new Map(specialtyTermsData.terms.map((t) => [t.slug, t]));
  return sampleSpecialties.map((s) => {
    const t = terms.get(s.slug);
    return {
      ...s,
      taxonomyCodes: t?.taxonomyCodes ?? [],
      synonymsAr: t?.synonymsAr ?? [],
      synonymsEn: t?.synonymsEn ?? [],
      systemId: sampleBodySystems.find((b) => b.specialties.includes(s.slug))?.id ?? null,
      shown: true,
    };
  });
}

/** A body system drafted but not filled yet, for the admin list's empty-group preview (?state=empty). It is not in
 *  body-systems.json, so the directory never shows it (the directory drops a group with no specialty). */
export const sampleDraftBodySystem = specialtyTermsData.draftSystem;
/* ---------------- Admin listings (screen 39, task 2.8) ---------------- */
// Appended block. Every professional row as the admin listings table reads it. The status is derived, so it cannot disagree
// with the public pages: the card state in doctors.json (unclaimed, pending, verified; "suspended" on the one suspended sample,
// doc_391), then the claim invite (screen 9) and the builder's review decision (screen 29) split "pending" into claimed, in
// review and rejected. data/sample/listings.json adds what only admin sees: licence expiry (rule A2), the claim and review
// instants and the suspension. Instants and licence dates go through sampleInstant; verifiedOn stays a fixed calendar date.
import listingsJson from "@/data/sample/listings.json";

/** The planned professionals.status values (architecture, critical flow 3), plus "inReview" for a claim waiting on admin. */
export type ListingStatus = "unclaimed" | "claimed" | "inReview" | "verified" | "rejected" | "suspended" | "removed";
export const listingStatuses: readonly ListingStatus[] = ["unclaimed", "claimed", "inReview", "verified", "rejected", "suspended", "removed"];

type ListingRow = {
  id: string;
  /** Calendar date the medical licence expires (YYYY-MM-DD). */
  licenceExpiresOn: string | null;
  claimedAtUtc: string | null;
  submittedAtUtc: string | null;
  suspension: { atUtc: string; byAdminId: string; reasonEn: string; reasonAr: string } | null;
};

const listingRows = listingsJson as unknown as ListingRow[];

/** Doctors under an admin suspension (screen 39): hidden from every public surface while it lasts, listed as Suspended for admin. */
export function suspendedDoctorIds(): Set<string> {
  return new Set(listingRows.filter((r) => r.suspension).map((r) => r.id));
}

export type SampleListing = {
  doctor: SampleDoctor;
  status: ListingStatus;
  /** Rows not yet verified: where the public facts came from, and the file date (UTC midnight). */
  registry: { source: RegistrySource; asOf: Date } | null;
  claimedAt: Date | null;
  submittedAt: Date | null;
  /** Rejected rows: when admin decided, and the reason the doctor sees (screen 29's rejected preview). */
  decidedAt: Date | null;
  rejection: { reasonEn: string; reasonAr: string } | null;
  /** Verified and suspended rows (dates at UTC midnight). */
  verifiedOn: Date | null;
  licenceExpiresOn: Date | null;
  board: string | null;
  licenceStateEn: string | null;
  licenceStateAr: string | null;
  suspension: { at: Date; byEn: string; byAr: string; reasonEn: string | null; reasonAr: string | null } | null;
  removedAt: Date | null;
};

const utcDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

function listingFor(d: SampleDoctor): SampleListing {
  const row = listingRows.find((r) => r.id === d.id);
  const profile = profileFor(d.id);
  const builder = builderRowFor(d.id);
  const invite = sampleInvites.find((i) => i.doctorId === d.id && i.usedAtUtc);
  const removal = removalsData.requests.find((r) => r.doctorId === d.id && r.status === "confirmed");
  // builder.json owns submission and decision dates; a claim is rejected only while the decision is newer than the submission.
  const submittedAtUtc = builder?.submittedAtUtc ?? row?.submittedAtUtc ?? null;
  const rejected = !!builder?.rejection && !!builder.decidedAtUtc && !!submittedAtUtc && builder.decidedAtUtc > submittedAtUtc;
  const status: ListingStatus = removal
    ? "removed"
    : row?.suspension
      ? "suspended"
      : d.state === "verified" || d.state === "unclaimed"
        ? d.state
        : rejected
        ? "rejected"
        : submittedAtUtc
          ? "inReview"
          : "claimed";
  const verifiedish = status === "verified" || status === "suspended";
  const s = row?.suspension;
  const by = s && s.byAdminId === sampleAdmin.id ? sampleAdmin : null;
  return {
    doctor: d,
    status,
    registry: !verifiedish && profile?.registrySource && profile.registryAsOf ? { source: profile.registrySource, asOf: utcDate(profile.registryAsOf) } : null,
    claimedAt: row?.claimedAtUtc ? sampleInstant(row.claimedAtUtc) : invite?.usedAtUtc ? new Date(invite.usedAtUtc) : null,
    submittedAt: (status === "inReview" || status === "rejected") && submittedAtUtc ? sampleInstant(submittedAtUtc) : null,
    decidedAt: status === "rejected" && builder?.decidedAtUtc ? sampleInstant(builder.decidedAtUtc) : null,
    rejection: status === "rejected" && builder?.rejection ? { reasonEn: builder.rejection.reasonEn, reasonAr: builder.rejection.reasonAr } : null,
    verifiedOn: verifiedish && d.verifiedOn ? utcDate(d.verifiedOn) : null,
    licenceExpiresOn: verifiedish && row?.licenceExpiresOn ? sampleInstant(`${row.licenceExpiresOn}T00:00:00Z`) : null,
    board: verifiedish ? (profile?.board ?? null) : null,
    licenceStateEn: verifiedish ? (profile?.licenceStateEn ?? null) : null,
    licenceStateAr: verifiedish ? (profile?.licenceStateAr ?? null) : null,
    suspension:
      status === "suspended" && s
        ? { at: sampleInstant(s.atUtc), byEn: by?.nameEn ?? s.byAdminId, byAr: by?.nameAr ?? s.byAdminId, reasonEn: s.reasonEn, reasonAr: s.reasonAr }
        : null,
    removedAt: removal?.decision ? removalInstant(removal.decision.decidedAtUtc) : null,
  };
}

/** Every listing, in data order. Production pages these from Postgres by status, specialty and name (indexed, see architecture). */
export function sampleListings(): SampleListing[] {
  return sampleDoctors.map(listingFor);
}
/* ---------------- AI jobs and costs (screen 45) ---------------- */
// Appended block. data/sample/ai-jobs.json holds one records-pipeline job per record set: job_001..job_006 run rs_001..rs_006
// above, and their status, step, files and times come from records.json, so the admin and the patient see the same job at the
// same step. job_007..job_010 run `extraSets`, sets of other synthetic patients that only the admin sees (same row shape, pages
// stored compactly). Usage is per step, and per file for the extract step: names and sizes only, never page content.
import aiJobsJson from "@/data/sample/ai-jobs.json";

/** What a step or a file cost, as lib/ai logs it to ai_calls (task 1.9). costMicros is in millionths of aiLimits.costCurrency. */
export type AiUsage = { calls: number; retries: number; inputTokens: number; outputTokens: number; costMicros: number };
export type AiFileUsage = AiUsage & { fileId: string };
/** One pipeline step of a job. finishedAt is null while it runs; steps not reached yet are absent. */
export type AiJobStep = { step: PipelineStep; startedAt: Date; finishedAt: Date | null; usage: AiUsage | null; files: AiFileUsage[] | null };
export type SampleAiJob = {
  id: string;
  /** 1 for the first run; a retry after a failure runs attempt 2 from the failed page, with the same quote. */
  attempt: number;
  patientFirstNameEn: string;
  patientFirstNameAr: string;
  set: SampleRecordSet;
  steps: AiJobStep[];
};

type AiExtraFileRow = Omit<RecordFile, "pages"> & { pageCount: number; otherPages: Record<string, PageStatus> };
type AiExtraSetRow = Omit<RecordSetRow, "files"> & { files: AiExtraFileRow[] };
type AiJobRow = {
  id: string;
  recordSetId: string;
  patientFirstNameAr: string;
  attempt: number;
  steps: Array<{ step: PipelineStep; startedAtUtc: string; finishedAtUtc: string | null; usage?: AiUsage; files?: AiFileUsage[] }>;
};

const aiJobsData = aiJobsJson as unknown as { alertPreview: { jobId: string; shiftDays: number }; extraSets: AiExtraSetRow[]; jobs: AiJobRow[] };

function expandAiExtraSet(row: AiExtraSetRow): RecordSetRow {
  return {
    ...row,
    files: row.files.map(({ pageCount, otherPages, ...file }) => ({
      ...file,
      pages: Array.from({ length: pageCount }, (_, k) => ({ status: otherPages[String(k + 1)] ?? "read" })),
    })),
  };
}

/**
 * Every job, newest first. `alertPreview` (the page's ?state=alert) moves the alertPreview job forward by its shiftDays, so the
 * day that passed the daily spend alert is today. Production reads ai_jobs and ai_calls with the service role, admin only.
 */
export function sampleAiJobs({ alertPreview = false }: { alertPreview?: boolean } = {}): SampleAiJob[] {
  const sets = new Map<string, RecordSetRow>([...recordsData.sets, ...aiJobsData.extraSets.map(expandAiExtraSet)].map((s) => [s.id, s]));
  return aiJobsData.jobs
    .flatMap((row): SampleAiJob[] => {
      const setRow = sets.get(row.recordSetId);
      if (!setRow) return [];
      const shift = alertPreview && row.id === aiJobsData.alertPreview.jobId ? aiJobsData.alertPreview.shiftDays * DAY_MS : 0;
      const at = (d: Date) => new Date(d.getTime() + shift);
      const set = toRecordSet(setRow);
      return [
        {
          id: row.id,
          attempt: row.attempt,
          patientFirstNameEn: setRow.patientFirstNameEn,
          patientFirstNameAr: row.patientFirstNameAr,
          set: { ...set, createdAt: at(set.createdAt), paidAt: set.paidAt && at(set.paidAt), finishedAt: set.finishedAt && at(set.finishedAt) },
          steps: row.steps.map((s) => ({
            step: s.step,
            startedAt: at(sampleInstant(s.startedAtUtc)),
            finishedAt: s.finishedAtUtc ? at(sampleInstant(s.finishedAtUtc)) : null,
            usage: s.usage ?? null,
            files: s.files ?? null,
          })),
        },
      ];
    })
    .sort((a, b) => b.set.createdAt.getTime() - a.set.createdAt.getTime());
}

export function sampleAiJobById(id: string, options?: { alertPreview?: boolean }): SampleAiJob | undefined {
  return sampleAiJobs(options).find((j) => j.id === id);
}
