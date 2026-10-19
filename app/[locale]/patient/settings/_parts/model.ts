// Shapes shared by the settings page (server) and its client parts. Every date, time and zone label is formatted on the server
// and passed as a string: Node and the browser may space times differently, which would fail hydration.
import type { PatientEmailKey } from "@/lib/sample";
import type { DetailsErrors, DetailsInput } from "./validation";

/** The groups in layout-call order, which is also the order of the desktop "On this page" list. */
export const GROUPS = ["language", "timeZone", "calendar", "emails", "details", "data", "delete"] as const;
export type GroupId = (typeof GROUPS)[number];

/** Prototype states (?state=); "default" is the page as Noura sees it. ?state=loading renders loading.tsx before this. */
export const PREVIEWS = [
  "saved",
  "invalid",
  "error",
  "exportRequested",
  "deleteUploadsConfirm",
  "empty",
  "deleteConfirm",
  "deletionRequested",
] as const;
export type Preview = (typeof PREVIEWS)[number] | "default";

/** Element ids that focus moves to after an action (the control the patient needs next). */
export const FOCUS = {
  toast: "settings-toast",
  banner: "settings-deletion-title",
  deleteAccount: "settings-delete-account",
  deleteUploads: "settings-delete-uploads",
  uploadsConfirm: "settings-uploads-confirm-title",
  accountConfirm: "settings-account-confirm-title",
  uploadRecords: "settings-upload-records",
  exportStatus: "settings-export-status",
} as const;

export type ZoneOption = { timeZone: string; label: string; now: string };
export type ZoneGroup = { label: string; zones: ZoneOption[] };
/** A date and a time with its zone named (rule P6), already formatted. */
export type When = { day: string; time: string };

export type SettingsProps = {
  preview: Preview;
  /** What the details form opens with (an edit in progress in the invalid and error states). */
  initialDetails: DetailsInput;
  initialErrors: DetailsErrors;
  /** The details as last saved: the email line under Emails and Your data, and the Undo target after a save. */
  savedDetails: DetailsInput;
  timeZone: string;
  hijri: boolean;
  emails: Record<PatientEmailKey, boolean>;
  hasUploads: boolean;
  zoneGroups: ZoneGroup[];
  hijriExample: string;
  /** When a deletion asked for now would run, and when the one already asked for (deletionRequested) runs. */
  deleteOn: When;
  scheduledOn: When;
};
