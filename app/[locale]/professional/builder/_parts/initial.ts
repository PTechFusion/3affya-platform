// Where the builder opens (server side): which doctor, which stage, and the draft pre-filled from the registry row plus
// whatever the doctor already entered (rule B1: never a blank form). Reads only lib/sample accessors.
import { profileFor, usStateByName, type SampleBuilderRow, type SampleDoctorDetails } from "@/lib/sample";
import { STEPS, isVerifiedStage, type Draft, type FileStatus, type Stage, type StepId } from "./model";

/** ?state= values that pick a stage. "pending" is the brief's "credentials uploaded (pending)". */
const STATE_STAGE: Record<string, Stage> = {
  pending: "uploaded",
  uploaded: "uploaded",
  submitted: "submitted",
  rejected: "rejected",
  live: "live",
  editing: "editing",
};

/** The sample doctor a stage preview opens when ?doctor= is absent. */
export function defaultDoctorFor(state: string | undefined): string {
  const stage = state ? STATE_STAGE[state] : undefined;
  if (stage === "uploaded" || stage === "submitted" || stage === "rejected") return "doc_009";
  if (stage === "live" || stage === "editing") return "doc_002";
  return "doc_013";
}

/**
 * The stage follows the data, and ?state= may move it only where the data supports it: verified rows are live or editing;
 * rows with uploaded files are uploaded, submitted or rejected (rejected needs the reviewer's note); everything else opens
 * pre-filled from the registry.
 */
export function stageFor(doctor: SampleDoctorDetails, row: SampleBuilderRow | undefined, state: string | undefined): Stage {
  const asked = state ? STATE_STAGE[state] : undefined;
  if (doctor.state === "verified") return asked === "live" ? "live" : "editing";
  if (row?.files.length) {
    if (asked === "submitted") return "submitted";
    if (asked === "rejected" && row.rejection) return "rejected";
    return "uploaded";
  }
  return "registry";
}

/** "Dearborn, Michigan" -> city and state code; "ديربورن، ميشيغان" -> "ديربورن". */
function splitCity(cityEn: string, cityAr: string): { city: string; stateCode: string; cityAr: string } {
  const at = cityEn.lastIndexOf(", ");
  const city = at > 0 ? cityEn.slice(0, at) : cityEn;
  const stateName = at > 0 ? cityEn.slice(at + 2) : cityEn;
  const arCity = cityAr.split("، ")[0] ?? cityAr;
  return { city, stateCode: usStateByName(stateName)?.code ?? "", cityAr: arCity };
}

export function initialDraft(doctor: SampleDoctorDetails, row: SampleBuilderRow | undefined, stage: Stage): Draft {
  const profile = profileFor(doctor.id);
  const place = splitCity(doctor.cityEn, doctor.cityAr);
  const ar = doctor.languages.find((l) => l.code === "ar");
  const fileStatus = (id: string): FileStatus =>
    isVerifiedStage(stage) ? "verified" : stage === "rejected" && row?.rejection?.fileId === id ? "rejected" : "pending";
  return {
    photoUrl: doctor.photoUrl ?? "",
    nameEn: doctor.nameEn,
    nameAr: doctor.nameAr,
    specialty: doctor.specialty,
    yearsInPractice: doctor.yearsInPractice != null ? String(doctor.yearsInPractice) : "",
    stateCode: place.stateCode,
    cityEn: place.city,
    cityAr: place.cityAr,
    langAr: Boolean(ar),
    dialect: ar?.dialect ?? "",
    langEn: doctor.languages.some((l) => l.code === "en"),
    visitTypes: doctor.visitTypes,
    ages: doctor.ages,
    feeUsd: doctor.feeUsdCents != null ? String(Math.round(doctor.feeUsdCents / 100)) : "",
    videoLink: row?.videoLink ?? "",
    licenceState: row?.licenceState ?? (profile?.licenceStateEn ? (usStateByName(profile.licenceStateEn)?.code ?? "") : ""),
    licenceNumber: row?.licenceNumber ?? "",
    boardStatus: row?.boardStatus ?? (doctor.boardCertified ? "certified" : ""),
    boardName: row?.boardName ?? profile?.board ?? "",
    files: (row?.files ?? []).map((f) => ({ id: f.id, name: f.name, kind: f.kind, sizeBytes: f.sizeBytes, status: fileStatus(f.id) })),
    medicalSchool: doctor.medicalSchool ?? "",
    graduationYear: doctor.graduationYear != null ? String(doctor.graduationYear) : "",
    training: doctor.training,
    bioEn: doctor.bioEn,
    bioAr: doctor.bioAr,
    tags: doctor.tags,
  };
}

/** ?step=1..6 opens that step; otherwise the first step with something needed to submit, or the first step when editing. */
export function initialStep(raw: string | undefined, stage: Stage, firstMissingStep: StepId | undefined): StepId {
  const n = raw ? Number(raw) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= STEPS.length) return STEPS[n - 1] ?? "photo";
  if (isVerifiedStage(stage)) return "photo";
  return firstMissingStep ?? STEPS[STEPS.length - 1] ?? "photo";
}
