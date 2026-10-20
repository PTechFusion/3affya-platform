// Profile builder model (screen 29): the draft, its six steps, the field rules and the publish checklist. Pure and shared by
// the client (validate on blur, live checklist) and the server actions (never trust the client). Error codes name the
// sub-rule so the message can say what to fix (rules F4 F5 L4); the word "invalid" never appears.
// Required to submit is only what admin verifies (rule B2): photo, name, specialty, NPI, licence, board and the files that
// back them. Everything else is "complete later" and never blocks Save and continue.
import { business } from "@/config/business";
import { MB, boardIsNamed, toMb } from "@/lib/credentials";
import type { BoardStatus, CredentialKind } from "@/lib/sample";

/* ---------------- Steps ---------------- */

/** Section order from the layout call, in chunks of 2 to 6 fields with a heading each (rule F3). */
export const STEPS = ["photo", "location", "visits", "credentials", "training", "expertise"] as const;
export type StepId = (typeof STEPS)[number];
export const isStepId = (v: unknown): v is StepId => typeof v === "string" && (STEPS as readonly string[]).includes(v);

/** Where the doctor is in claim, review and publishing. Registry: claimed, nothing submitted; uploaded: credentials in,
 *  not yet submitted; submitted: waiting for admin; rejected: admin returned it with a reason; live: just approved;
 *  editing: a verified, published profile being changed. */
export type Stage = "registry" | "uploaded" | "submitted" | "rejected" | "live" | "editing";
export const isVerifiedStage = (s: Stage) => s === "live" || s === "editing";

/* ---------------- Draft ---------------- */

export type FileStatus = "pending" | "rejected" | "verified";
export type DraftFile = { id: string; name: string; kind: CredentialKind; sizeBytes: number; status: FileStatus };
export type VisitType = "video" | "phone";
export type Ages = "adults" | "children" | "allAges";

export type Draft = {
  /** Object URL of a chosen photo (client only), the stored photo path, or "" for none. */
  photoUrl: string;
  nameEn: string;
  nameAr: string;
  specialty: string;
  yearsInPractice: string;
  stateCode: string;
  cityEn: string;
  cityAr: string;
  langAr: boolean;
  dialect: string;
  langEn: boolean;
  visitTypes: VisitType[];
  ages: Ages;
  feeUsd: string;
  videoLink: string;
  licenceState: string;
  licenceNumber: string;
  boardStatus: BoardStatus | "";
  boardName: string;
  files: DraftFile[];
  medicalSchool: string;
  graduationYear: string;
  training: string[];
  bioEn: string;
  bioAr: string;
  tags: string[];
};

export const DIALECTS = ["Gulf", "Levantine", "Egyptian", "Iraqi", "Moroccan"] as const;

/** Length limits are format facts, not business numbers; the tag limits are Dr Ayman's (config/business.ts). */
export const LIMITS = {
  nameMax: 100,
  cityMax: 60,
  licenceMax: 20,
  boardMax: 120,
  schoolMax: 120,
  trainingMax: 120,
  trainingLinesMax: 4,
  bioMax: 1200,
  yearsMax: 70,
  gradYearMin: 1950,
  tagsMax: business.expertiseTagsMax,
  tagMaxChars: business.expertiseTagMaxChars,
} as const;

/* ---------------- Field rules ---------------- */

export const TEXT_FIELDS = [
  "nameEn",
  "nameAr",
  "yearsInPractice",
  "cityEn",
  "cityAr",
  "feeUsd",
  "videoLink",
  "licenceNumber",
  "boardName",
  "medicalSchool",
  "graduationYear",
  "bioEn",
  "bioAr",
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type ErrorCode =
  | "nameMissing"
  | "nameTooLong"
  | "nameArLatin"
  | "yearsDigits"
  | "yearsRange"
  | "cityTooLong"
  | "feeDigits"
  | "feeZero"
  | "linkHttps"
  | "linkFormat"
  | "licenceChars"
  | "licenceTooLong"
  | "boardNotNamed"
  | "boardTooLong"
  | "schoolTooLong"
  | "gradDigits"
  | "gradRange"
  | "trainingTooLong"
  | "bioTooLong"
  | "photoType"
  | "photoSize"
  | "photoStock"
  | "fileType"
  | "fileSize"
  | "tagEmpty"
  | "tagTooLong"
  | "tagDuplicate"
  | "tagsFull";

/** Error keys: a text field, one training line ("training.0"), or the photo, file and tag pickers. */
export type ErrorKey = TextField | `training.${number}` | "photo" | `file.${CredentialKind}` | "tag";
export type FieldErrors = Partial<Record<ErrorKey, ErrorCode>>;

/** Text fields per step, in screen order. Save and continue checks these; the pickers check themselves when used. */
export const STEP_FIELDS: Record<StepId, readonly TextField[]> = {
  photo: ["nameEn", "nameAr"],
  location: ["yearsInPractice", "cityEn", "cityAr"],
  visits: ["feeUsd", "videoLink"],
  credentials: ["licenceNumber", "boardName"],
  training: ["medicalSchool", "graduationYear", "bioEn", "bioAr"],
  expertise: [],
};

const ARABIC_LETTER = /[؀-ۿ]/;
const LATIN_LETTER = /[A-Za-z]/;
// boardIsNamed and toMb live in lib/credentials (shared with the credential review, screen 38) and are re-exported here.
export { boardIsNamed, toMb };
export const digitsOnly = (raw: string) => raw.trim().replace(/[\s,]/g, "");
export const normaliseLicence = (raw: string) => raw.trim().replace(/\s+/g, "");

export function validateText(field: TextField, raw: string, draft: Pick<Draft, "boardStatus">, thisYear: number): ErrorCode | undefined {
  const value = raw.trim();
  switch (field) {
    case "nameEn":
      if (!value) return "nameMissing";
      return value.length > LIMITS.nameMax ? "nameTooLong" : undefined;
    case "nameAr":
      if (!value) return undefined;
      if (!ARABIC_LETTER.test(value) && LATIN_LETTER.test(value)) return "nameArLatin";
      return value.length > LIMITS.nameMax ? "nameTooLong" : undefined;
    case "yearsInPractice": {
      const v = digitsOnly(value);
      if (!v) return undefined;
      if (!/^\d+$/.test(v)) return "yearsDigits";
      return Number(v) > LIMITS.yearsMax ? "yearsRange" : undefined;
    }
    case "cityEn":
    case "cityAr":
      return value.length > LIMITS.cityMax ? "cityTooLong" : undefined;
    case "feeUsd": {
      const v = digitsOnly(value);
      if (!v) return undefined;
      if (!/^\d+$/.test(v)) return "feeDigits";
      return Number(v) === 0 ? "feeZero" : undefined;
    }
    case "videoLink": {
      if (!value) return undefined;
      if (!/^https:\/\//i.test(value)) return "linkHttps";
      try {
        const url = new URL(value);
        return url.hostname.includes(".") ? undefined : "linkFormat";
      } catch {
        return "linkFormat";
      }
    }
    case "licenceNumber": {
      const v = normaliseLicence(value);
      if (!v) return undefined;
      if (!/^[A-Za-z0-9-]+$/.test(v)) return "licenceChars";
      return v.length > LIMITS.licenceMax ? "licenceTooLong" : undefined;
    }
    case "boardName":
      if (draft.boardStatus !== "certified" || !value) return undefined;
      if (value.length > LIMITS.boardMax) return "boardTooLong";
      return boardIsNamed(value) ? undefined : "boardNotNamed";
    case "medicalSchool":
      return value.length > LIMITS.schoolMax ? "schoolTooLong" : undefined;
    case "graduationYear": {
      if (!value) return undefined;
      if (!/^\d{4}$/.test(value)) return "gradDigits";
      const y = Number(value);
      return y < LIMITS.gradYearMin || y > thisYear ? "gradRange" : undefined;
    }
    case "bioEn":
    case "bioAr":
      return value.length > LIMITS.bioMax ? "bioTooLong" : undefined;
  }
}

export function validateTrainingLine(raw: string): ErrorCode | undefined {
  return raw.trim().length > LIMITS.trainingMax ? "trainingTooLong" : undefined;
}

/** Everything Save and continue checks for one step. Missing required items are not errors; the checklist shows them. */
export function validateStep(step: StepId, draft: Draft, thisYear: number): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const code = validateText(field, draft[field], draft, thisYear);
    if (code) errors[field] = code;
  }
  if (step === "training") {
    draft.training.forEach((line, i) => {
      const code = validateTrainingLine(line);
      if (code) errors[`training.${i}`] = code;
    });
  }
  return errors;
}

export function validateAll(draft: Draft, thisYear: number): FieldErrors {
  return STEPS.reduce<FieldErrors>((all, step) => ({ ...all, ...validateStep(step, draft, thisYear) }), {});
}

/** A tag the doctor typed, checked against the list it would join (task 2.5: text only, up to 10, 30 characters each). */
export function validateTag(raw: string, tags: string[]): ErrorCode | undefined {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return "tagEmpty";
  if (tags.length >= LIMITS.tagsMax) return "tagsFull";
  if (value.length > LIMITS.tagMaxChars) return "tagTooLong";
  if (tags.some((t) => t.toLocaleLowerCase() === value.toLocaleLowerCase())) return "tagDuplicate";
  return undefined;
}

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const CREDENTIAL_TYPES = ["application/pdf", "image/jpeg", "image/png"];
/** Prototype check for obvious stock photos by file name (rule C4); admin review is the real check (screen 38). */
const STOCK_NAME = /shutterstock|istock|gettyimages|adobestock|dreamstime|depositphotos|123rf/i;

export function validatePhotoFile(file: { name: string; type: string; size: number }): ErrorCode | undefined {
  if (!PHOTO_TYPES.includes(file.type)) return "photoType";
  if (file.size > business.photoMaxMb * MB) return "photoSize";
  return STOCK_NAME.test(file.name) ? "photoStock" : undefined;
}

export function validateCredentialFile(file: { type: string; size: number }): ErrorCode | undefined {
  if (!CREDENTIAL_TYPES.includes(file.type)) return "fileType";
  return file.size > business.credentialMaxMb * MB ? "fileSize" : undefined;
}


/* ---------------- Publish checklist ---------------- */

export const REQUIRED_ITEMS = ["photo", "name", "specialty", "npi", "licence", "board", "files"] as const;
export const LATER_ITEMS = ["languages", "visits", "bio", "tags", "availability"] as const;
export type ChecklistKey = (typeof REQUIRED_ITEMS)[number] | (typeof LATER_ITEMS)[number];

export const ITEM_STEP: Record<ChecklistKey, StepId> = {
  photo: "photo",
  name: "photo",
  specialty: "location",
  npi: "location",
  licence: "credentials",
  board: "credentials",
  files: "credentials",
  languages: "visits",
  visits: "visits",
  bio: "training",
  tags: "expertise",
  availability: "expertise",
};

export type MissingCode =
  | "photoMissing"
  | "nameMissing"
  | "specialtyMissing"
  | "npiMissing"
  | "licenceMissing"
  | "boardStatusMissing"
  | "boardNameMissing"
  | "licenceFileMissing"
  | "boardFileMissing"
  | "fileRejected"
  | "languagesMissing"
  | "visitTypeMissing"
  | "feeMissing"
  | "bioMissing"
  | "tagsMissing"
  | "availabilityMissing";

/** Facts the draft does not hold: the registry NPI and whether weekly hours are published (screen 30). */
export type ChecklistContext = { npi: string; hasAvailability: boolean; thisYear: number };

const usable = (draft: Draft, kind: CredentialKind) => draft.files.some((f) => f.kind === kind && f.status !== "rejected");

/** Undefined when the item is complete, otherwise what is missing. */
export function missingFor(key: ChecklistKey, draft: Draft, ctx: ChecklistContext): MissingCode | undefined {
  switch (key) {
    case "photo":
      return draft.photoUrl ? undefined : "photoMissing";
    case "name":
      return validateText("nameEn", draft.nameEn, draft, ctx.thisYear) ? "nameMissing" : undefined;
    case "specialty":
      return draft.specialty ? undefined : "specialtyMissing";
    case "npi":
      return ctx.npi ? undefined : "npiMissing";
    case "licence":
      return draft.licenceState && normaliseLicence(draft.licenceNumber) && !validateText("licenceNumber", draft.licenceNumber, draft, ctx.thisYear)
        ? undefined
        : "licenceMissing";
    case "board":
      if (!draft.boardStatus) return "boardStatusMissing";
      return draft.boardStatus === "certified" && !boardIsNamed(draft.boardName) ? "boardNameMissing" : undefined;
    case "files": {
      const rejectedOnly = (kind: CredentialKind) => !usable(draft, kind) && draft.files.some((f) => f.kind === kind && f.status === "rejected");
      if (rejectedOnly("licence") || (draft.boardStatus === "certified" && rejectedOnly("board"))) return "fileRejected";
      if (!usable(draft, "licence")) return "licenceFileMissing";
      return draft.boardStatus === "certified" && !usable(draft, "board") ? "boardFileMissing" : undefined;
    }
    case "languages":
      return draft.langAr || draft.langEn ? undefined : "languagesMissing";
    case "visits":
      if (!draft.visitTypes.length) return "visitTypeMissing";
      return digitsOnly(draft.feeUsd) && !validateText("feeUsd", draft.feeUsd, draft, ctx.thisYear) ? undefined : "feeMissing";
    case "bio":
      return draft.bioEn.trim() || draft.bioAr.trim() ? undefined : "bioMissing";
    case "tags":
      return draft.tags.length ? undefined : "tagsMissing";
    case "availability":
      return ctx.hasAvailability ? undefined : "availabilityMissing";
  }
}

export function missingRequired(draft: Draft, ctx: ChecklistContext): ChecklistKey[] {
  return REQUIRED_ITEMS.filter((key) => missingFor(key, draft, ctx));
}

/* ---------------- Wire format ---------------- */

/** What the client sends a server action: the draft without the photo's object URL (the prototype uploads nothing). */
export type DraftPayload = Omit<Draft, "photoUrl"> & { hasPhoto: boolean };

export function toPayload(draft: Draft): DraftPayload {
  const { photoUrl, ...rest } = draft;
  return { ...rest, hasPhoto: Boolean(photoUrl) };
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const bool = (v: unknown) => v === true;
const KINDS: readonly CredentialKind[] = ["licence", "board", "other"];
const STATUSES: readonly FileStatus[] = ["pending", "rejected", "verified"];

/** Rebuilds a draft from untrusted input on the server: unknown keys dropped, wrong types emptied, lists capped. */
export function draftFromPayload(raw: unknown): Draft {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);
  const visitTypes = list(p.visitTypes, 2).filter((v): v is VisitType => v === "video" || v === "phone");
  const ages: Ages = p.ages === "children" || p.ages === "allAges" ? p.ages : "adults";
  const boardStatus = p.boardStatus === "certified" || p.boardStatus === "eligible" ? p.boardStatus : "";
  const files = list(p.files, 12).flatMap((f): DraftFile[] => {
    const r = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    const kind = KINDS.find((k) => k === r.kind);
    const status = STATUSES.find((s) => s === r.status) ?? "pending";
    return kind ? [{ id: str(r.id, 64), name: str(r.name, 255), kind, sizeBytes: typeof r.sizeBytes === "number" ? r.sizeBytes : 0, status }] : [];
  });
  return {
    photoUrl: bool(p.hasPhoto) ? "uploaded" : "",
    nameEn: str(p.nameEn),
    nameAr: str(p.nameAr),
    specialty: str(p.specialty, 64),
    yearsInPractice: str(p.yearsInPractice, 16),
    stateCode: str(p.stateCode, 4),
    cityEn: str(p.cityEn),
    cityAr: str(p.cityAr),
    langAr: bool(p.langAr),
    dialect: DIALECTS.find((d) => d === p.dialect) ?? "",
    langEn: bool(p.langEn),
    visitTypes,
    ages,
    feeUsd: str(p.feeUsd, 16),
    videoLink: str(p.videoLink),
    licenceState: str(p.licenceState, 4),
    licenceNumber: str(p.licenceNumber, 64),
    boardStatus,
    boardName: str(p.boardName),
    files,
    medicalSchool: str(p.medicalSchool),
    graduationYear: str(p.graduationYear, 8),
    training: list(p.training, LIMITS.trainingLinesMax).map((t) => str(t)),
    bioEn: str(p.bioEn, 5000),
    bioAr: str(p.bioAr, 5000),
    tags: list(p.tags, LIMITS.tagsMax).map((t) => str(t, 200)),
  };
}
