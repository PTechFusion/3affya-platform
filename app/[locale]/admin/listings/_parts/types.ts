// What the listings page hands its client parts (the drawer and the Undo bar). Everything is formatted on the server: dates in
// the admin's zone (or UTC for calendar dates), numbers through lib/format, so the client renders strings, never raw instants.
import type { BadgeTone, NoticeTone } from "@/components/ui";
import type { DoctorCardData, DoctorCardState } from "@/components/brand/DoctorCard";
import type { ListingStatus } from "@/lib/sample";
import type { ChangeKind } from "./listings";

export type DrawerView = {
  id: string;
  name: string;
  status: ListingStatus;
  statusLabel: string;
  statusTone: BadgeTone;
  notice: { tone: NoticeTone; title: string; lines: string[]; action?: { href: string; label: string } } | null;
  /** The public card exactly as patients see it, or null when patients see none (suspended, removed). */
  card: { data: DoctorCardData; state: DoctorCardState } | null;
  /** Shown instead of the card when there is none. */
  noCard: string | null;
  profileHref: string | null;
  details: Array<{ term: string; value: string; ltr?: boolean }>;
  editable: boolean;
  nameAr: string;
  specialty: string;
  canSuspend: boolean;
  canUnsuspend: boolean;
};

export type SpecialtyOption = { value: string; label: string };

export type ToastView = { kind: ChangeKind; id: string; message: string };
