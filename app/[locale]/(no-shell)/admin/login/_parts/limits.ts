// When a paused admin sign-in may start again (rule F5: the pause message says when to retry). Rounded up to the whole minute
// so the time the card names is never earlier than the real end of the pause.
import { adminSignIn } from "@/config/business";

const MINUTE_MS = 60_000;

export function pausedUntil(now: Date = new Date()): Date {
  return new Date(Math.ceil((now.getTime() + adminSignIn.lockMinutes * MINUTE_MS) / MINUTE_MS) * MINUTE_MS);
}

/** Where a signed-in admin lands: the first section of the admin portal (lib/portal-nav). */
export const ADMIN_HOME = "/admin/review";

/** The card counts its steps for the admin: work email, emailed code, authenticator (or recovery) code. */
export const SIGN_IN_STEPS = 3;
