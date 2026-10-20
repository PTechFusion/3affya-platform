// What the sharing page hands its client part: plain, already-formatted values (dates in the patient's zone, names in the page
// language), so the browser formats nothing that could differ from the server render.
import type { ShareStatus } from "@/lib/sample";

/** One share of the patient's summary. `ended` is set once it no longer opens for the doctor; `fresh` marks one just made. */
export type ShareRowView = {
  id: string;
  doctorId: string;
  /** "Dr Omar Khalil" in the page language. */
  name: string;
  specialty: string;
  sharedOn: string;
  expiresOn: string;
  /** Whole days left, the same count the professional's list shows (0 in the last 24 hours). */
  daysLeft: number;
  status: ShareStatus;
  /** The day the doctor first opened it, if they have. */
  viewedOn: string | null;
  ended: { reason: "stopped" | "expired"; on: string } | null;
  fresh: boolean;
};

/** A doctor the patient has an upcoming visit with: someone they may share with. */
export type VisitView = { doctorId: string; name: string; specialty: string; visitOn: string };

/** One length the patient can pick in the share sheet, with the day the share would end. */
export type LengthView = { days: number; until: string };

/** The change a prototype state opens on, so its Undo bar shows (B10). */
export type InitialChange = { kind: "shared" | "stopped"; shareId: string } | null;
