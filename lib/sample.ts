// Sample data for the prototype. Real rows arrive with Supabase in task 1.5; pages read through here, never the JSON shape directly,
// so the swap to generated types is one file.
import doctorsJson from "@/data/sample/doctors.json";
import specialtiesJson from "@/data/sample/specialties.json";
import bodySystemsJson from "@/data/sample/body-systems.json";
import invitesJson from "@/data/sample/invites.json";
import profilesJson from "@/data/sample/profiles.json";
import availabilityJson from "@/data/sample/availability.json";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import { formatDate, formatMoney, formatTimeInZone, type Locale } from "@/lib/format";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { addDays, zonedInstant, zonedParts, type StoredException, type StoredRule } from "@/lib/slots";
import builderJson from "@/data/sample/builder.json";
import usStatesJson from "@/data/sample/us-states.json";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import type { Locale } from "@/lib/format";
import { sampleInstant, toDoctorCardData, type LanguageLabels } from "@/lib/card-data";

// The card mapping and the sample clock live in lib/card-data.ts (no JSON imports, so client components can use them);
// pages keep importing them from here.
export { sampleInstant, toDoctorCardData, type LanguageLabels } from "@/lib/card-data";

export type SampleDoctor = {
  id: string;
  npi: string;
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

export const verifiedDoctors = () => sampleDoctors.filter((d) => d.state === "verified");

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

export const sampleInvites = invitesJson as SampleInvite[];

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
// Imports for this block sit here so the file stays append-only for parallel screens; ES imports are hoisted.
import payoutsJson from "@/data/sample/payouts.json";
import type { PayoutAccount, PayoutRecordStatus, PayoutStatus } from "@/lib/payouts";

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
// Imported here rather than at the top so parallel screen branches that append to this file do not collide.
import membershipsJson from "@/data/sample/memberships.json";

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
import introductionsJson from "@/data/sample/introductions.json";

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
  sharedSummary: { id: string; sharedAtUtc: string; expiresAtUtc: string; reviewedAtUtc: string | null } | null;
  doneAtUtc: string | null;
};

/** A booking or an introduction request as the professional's inbox reads it. Every instant goes through sampleInstant. */
export type SampleIntroduction = Omit<IntroductionRow, "startsAtUtc" | "receivedAtUtc" | "sharedSummary" | "doneAtUtc"> & {
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
  const { startsAtUtc, receivedAtUtc, sharedSummary, doneAtUtc, ...rest } = r;
  return {
    ...rest,
    startsAt: sampleInstant(startsAtUtc),
    receivedAt: sampleInstant(receivedAtUtc),
    sharedSummary: sharedSummary
      ? {
          id: sharedSummary.id,
          sharedAt: sampleInstant(sharedSummary.sharedAtUtc),
          expiresAt: sampleInstant(sharedSummary.expiresAtUtc),
          reviewedAt: sharedSummary.reviewedAtUtc ? sampleInstant(sharedSummary.reviewedAtUtc) : null,
        }
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
// Imported here rather than at the top so this block stays an append (wave-3 branches touch this file in parallel).
import summariesJson from "@/data/sample/summaries.json";
import type { SummaryData } from "@/components/brand/SummaryViewer";

/** The prototype's signed-in professional (screens 29 to 36). Production reads the session. */
export const sampleProfessionalId = "doc_002";

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
