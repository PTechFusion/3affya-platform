// What the server hands the client parts of screen 46. Every date is already formatted in the admin's zone (lib/format), so
// the client never formats an instant and the server and browser render the same text.
import type { BadgeTone } from "@/components/ui";
import type { OutreachBounce, OutreachStatus } from "@/lib/sample";

export type InviteRowView = {
  id: string;
  name: string;
  specialty: string;
  email: string;
  status: OutreachStatus;
  /** Date and clock time, joined (phone rows) and apart (the table's two lines). The zone is named once above the list (P6). */
  sentOn: string;
  sentDate: string;
  sentTime: string;
  expires: string;
  opened?: string;
  claimed?: string;
  bounced?: string;
  bounce?: OutreachBounce;
  revoked?: string;
  /** Sent a moment ago (the just-sent preview, or a resend on this page). */
  fresh?: boolean;
  profileHref: string;
  /** The invite form for this doctor: Invite again and Fix the address open it. */
  composeHref: string;
};

/** "Now" in the admin's zone, for a row the page changes: a revoke today, a resend now and its new expiry. */
export type NowLabels = { today: string; sentOn: string; sentDate: string; sentTime: string; expires: string };

/** Neutral while waiting, information once opened, done when claimed; expired waits on a decision, bounced needs a fix. */
export const STATUS_TONE: Record<OutreachStatus, BadgeTone> = {
  sent: "pending",
  opened: "info",
  claimed: "success",
  expired: "warning",
  bounced: "danger",
  revoked: "pending",
};

/** One language of the claim email, every line already filled in except the admin's personal line and the To address. */
export type ClaimEmailCopy = {
  lang: "ar" | "en";
  fromName: string;
  subject: string;
  preheader: string;
  headline: string;
  noteFrom: string;
  intro: string;
  factsTitle: string;
  facts: Array<{ label: string; value: string; ltr?: boolean }>;
  gives: string;
  scrutiny: string;
  button: string;
  expiry: string;
  notMe: string;
  why: string;
  optOut: string;
  entity: string;
  address: string;
};
