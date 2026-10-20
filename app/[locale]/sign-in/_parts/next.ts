// Where sign-in sends the patient afterwards. The page and the server action both read ?next= through safeNext, so a crafted
// link can never send a signed-in patient to another site (open redirect): only same-site paths under the patient portal or the
// booking flow pass; anything else falls back to the bookings list. A locale prefix is dropped, the locale-aware router adds it.
const DEFAULT_NEXT = "/patient/bookings";
const BASE = "https://3affya.invalid";
const ALLOWED = [/^\/patient(\/|$)/, /^\/book\/[^/]+(\/pay)?\/?$/];

export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return DEFAULT_NEXT;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return DEFAULT_NEXT;
  }
  // "//evil.example" and "/\evil.example" parse to another origin; reject them.
  if (url.origin !== BASE) return DEFAULT_NEXT;
  const path = url.pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  if (!ALLOWED.some((rule) => rule.test(path))) return DEFAULT_NEXT;
  return `${path}${url.search}`;
}

/** Why the patient is asked to sign in (rule F9: only at a commitment point, never to browse). Picks the lead line. */
export type SignInReason = "account" | "booking" | "upload";

export function reasonFor(next: string): SignInReason {
  if (next.startsWith("/book/")) return "booking";
  if (next.startsWith("/patient/records")) return "upload";
  return "account";
}
