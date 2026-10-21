// The eight transactional emails (screen 49, task 2.9 templates; 3.3 and 3.4 send the booking and refund ones). Each module
// exports subject(locale, data), preheader(locale, data) and render(locale, data) -> { html, text }, built on the one layout
// (layout.ts) with copy under email.* in messages/*.json (Arabic stays needs_review until Dr Ayman approves it). Flows send
// through send.ts; nothing in this folder reads the clock or the database, so a template is a pure function of its data.
import { bookingConfirmedEmail, type BookingConfirmedData } from "./booking-confirmed";
import { claimApprovedEmail, type ClaimApprovedData } from "./claim-approved";
import { claimReceivedEmail, type ClaimReceivedData } from "./claim-received";
import { claimRejectedEmail, type ClaimRejectedData } from "./claim-rejected";
import { inviteEmail, type InviteData } from "./invite";
import { otpEmail, type OtpData } from "./otp";
import type { EmailTemplate } from "./parts";
import { refundEmail, type RefundData } from "./refund";
import { removalConfirmedEmail, type RemovalConfirmedData } from "./removal-confirmed";

export type TemplateDataMap = {
  invite: InviteData;
  otp: OtpData;
  claimReceived: ClaimReceivedData;
  claimApproved: ClaimApprovedData;
  claimRejected: ClaimRejectedData;
  removalConfirmed: RemovalConfirmedData;
  bookingConfirmed: BookingConfirmedData;
  refund: RefundData;
};

export type TemplateName = keyof TemplateDataMap;
export type TemplateData<N extends TemplateName> = TemplateDataMap[N];

export const emailTemplates: { [N in TemplateName]: EmailTemplate<TemplateDataMap[N]> } = {
  invite: inviteEmail,
  otp: otpEmail,
  claimReceived: claimReceivedEmail,
  claimApproved: claimApprovedEmail,
  claimRejected: claimRejectedEmail,
  removalConfirmed: removalConfirmedEmail,
  bookingConfirmed: bookingConfirmedEmail,
  refund: refundEmail,
};

/** In the order the preview lists them: the doctor's journey, then the patient's. */
export const templateNames = Object.keys(emailTemplates) as TemplateName[];

export const isTemplateName = (value: string): value is TemplateName => (templateNames as string[]).includes(value);

export function getTemplate<N extends TemplateName>(name: N): EmailTemplate<TemplateDataMap[N]> {
  return emailTemplates[name];
}

export type { EmailAttachment, EmailTemplate } from "./parts";
export type { RenderedEmail, RenderOptions } from "./layout";
