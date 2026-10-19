// Sample data for the prototype. Real rows arrive with Supabase in task 1.5; pages read through here, never the JSON shape directly,
// so the swap to generated types is one file.
import doctorsJson from "@/data/sample/doctors.json";
import specialtiesJson from "@/data/sample/specialties.json";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import { formatDate, formatMoney, formatTimeInZone, type Locale } from "@/lib/format";
import { business } from "@/config/business";

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

/** Translator for the `languages` namespace: language codes and dialect names. */
export type LanguageLabels = (key: string) => string;

export function toDoctorCardData(d: SampleDoctor, locale: Locale, timeZone: string, tl: LanguageLabels): DoctorCardData {
  const languages = d.languages
    .map((l) => (l.dialect ? `${tl(l.code)} (${tl(`dialect.${l.dialect}`)})` : tl(l.code)))
    .join(locale === "ar" ? "، " : ", ");
  const next = d.nextAvailableUtc ? new Date(d.nextAvailableUtc) : undefined;
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
    feeLabel: d.feeUsdCents != null ? formatMoney(d.feeUsdCents, business.currencyPresentment, locale) : undefined,
    nextAvailableLabel: next ? `${formatDate(next, timeZone, locale)} · ${formatTimeInZone(next, timeZone, locale)}` : undefined,
    verifiedOnLabel: d.verifiedOn ? formatDate(new Date(`${d.verifiedOn}T00:00:00Z`), timeZone, locale) : undefined,
    boardCertified: d.boardCertified,
  };
}

/* ---------------- Claim invites (screen 9) ---------------- */
// One appended block, its import included, so parallel screens appending to this file merge cleanly.
import invitesJson from "@/data/sample/invites.json";

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
