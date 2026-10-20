// When a rate-limited patient may ask for a new code (rule F5: the limit message says when to retry). Rounded up to the whole
// minute so the time the page names is never earlier than the real unlock.
import { signInLimits } from "@/config/business";

const MINUTE_MS = 60_000;

export function retryAfterLock(now: Date = new Date()): Date {
  return new Date(Math.ceil((now.getTime() + signInLimits.lockMinutes * MINUTE_MS) / MINUTE_MS) * MINUTE_MS);
}
