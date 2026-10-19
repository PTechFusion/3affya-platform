// Sample data for the prototype. Real rows arrive with Supabase in task 1.5; pages read through here, never the JSON shape directly,
// so the swap to generated types is one file.
import doctorsJson from "@/data/sample/doctors.json";
import specialtiesJson from "@/data/sample/specialties.json";
import bodySystemsJson from "@/data/sample/body-systems.json";
import invitesJson from "@/data/sample/invites.json";
import profilesJson from "@/data/sample/profiles.json";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import { formatDate, formatMoney, formatTimeInZone, type Locale } from "@/lib/format";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";

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

// Prototype only: sample slots were authored for 10 to 23 Nov 2026. Every instant is shifted so the first authored day is
// always tomorrow, so "next available" and "within 72 h" stay meaningful whenever the prototype is opened. Gone with task 1.5.
const SAMPLE_ANCHOR_UTC = Date.UTC(2026, 10, 9);
export function sampleInstant(iso: string): Date {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(Date.parse(iso) + (today - SAMPLE_ANCHOR_UTC));
}
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

/** Translator for the `languages` namespace: language codes and dialect names. */
export type LanguageLabels = (key: string) => string;

export function toDoctorCardData(d: SampleDoctor, locale: Locale, timeZone: string, tl: LanguageLabels): DoctorCardData {
  const languages = d.languages
    .map((l) => (l.dialect ? `${tl(l.code)} (${tl(`dialect.${l.dialect}`)})` : tl(l.code)))
    .join(locale === "ar" ? "، " : ", ");
  const next = d.nextAvailableUtc ? sampleInstant(d.nextAvailableUtc) : undefined;
  return {
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    specialtyEn: d.specialtyEn,
    specialtyAr: d.specialtyAr,
    cityEn: d.cityEn,
    cityAr: d.cityAr,
    photoUrl: d.photoUrl ?? undefined,
    languages,
    visitTypes: d.visitTypes,
    ages: d.ages,
    tags: d.tags,
    trainingLines: d.training,
    yearsInPractice: d.yearsInPractice ?? undefined,
    // Rule C5: the card price is the all-in total the patient pays, never the doctor fee alone.
    feeLabel: d.feeUsdCents != null ? formatMoney(feeLines(d.feeUsdCents).totalCents, business.currencyPresentment, locale) : undefined,
    nextAvailableLabel: next ? `${formatDate(next, timeZone, locale)} · ${formatTimeInZone(next, timeZone, locale)}` : undefined,
    // verifiedOn is a calendar date, not an instant: format it in UTC so a viewer west of UTC does not see the day before.
    verifiedOnLabel: d.verifiedOn ? formatDate(new Date(`${d.verifiedOn}T00:00:00Z`), "UTC", locale) : undefined,
    boardCertified: d.boardCertified,
  };
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
