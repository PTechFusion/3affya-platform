// The one way server code reaches the database (lane L1). Server only: the service key never reaches a client bundle (it has
// no NEXT_PUBLIC_ prefix, so it is undefined in the browser) and both factories refuse to run there.
//
//   createUserClient(accessToken)  the anon key plus the signed-in user's JWT, so every query runs under RLS as that user;
//                                  with no token it is the anonymous visitor. Pages and server actions use this.
//   createServiceClient(caller)    the service key, which bypasses RLS. Only for server code that has already checked who is
//                                  calling: an admin session that passed TOTP (ADR-8), or a named system caller with no
//                                  user behind it (the Stripe webhook writes money state, Inngest jobs, scripts, and the
//                                  records signer that mints a professional's 10-minute signed URL after checking the
//                                  share is live). This factory does not verify a session: the caller builds the admin
//                                  value from verified JWT claims (lib/auth, lane L7), never from user_metadata or a
//                                  decoded token. It refuses a caller that declares the wrong role or level, so a page
//                                  cannot reach for the service key by accident.
//
// Every request has a timeout (rigor review: no outbound call without one). Misconfiguration and a refused service caller
// throw: they are deployment or programming errors, not something to show a user. Server actions still return { ok, error }.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export type { Database } from "@/lib/db/types";
export type DbClient = SupabaseClient<Database>;

/** Matches the database's statement_timeout for signed-in users, so the request and the query give up together. */
export const DB_REQUEST_TIMEOUT_MS = 8_000;

/**
 * Who may hold a service client. `admin`: role and authenticator level from the verified session's claims
 * (app_metadata.role and aal). `system`: server code with no user behind it.
 */
export type ServiceCaller =
  | { kind: "admin"; role: string | null; aal: string | null }
  | { kind: "system"; name: "stripe-webhook" | "inngest" | "script" | "records-signer" };

function assertServer(): void {
  if (typeof window !== "undefined") throw new Error("lib/db/client.ts runs on the server only");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

/** fetch with a deadline, keeping any signal the caller passed (e.g. an abortSignal() on a query). */
function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const deadline = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return fetch(input, { ...init, signal });
  };
}

function build(key: string, headers: Record<string, string>): DbClient {
  return createClient<Database>(required("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { timeout: DB_REQUEST_TIMEOUT_MS },
    global: { fetch: fetchWithTimeout(DB_REQUEST_TIMEOUT_MS), headers },
  });
}

/** A client that acts as the request's user under RLS, or as the anonymous visitor when there is no token. */
export function createUserClient(accessToken?: string | null): DbClient {
  assertServer();
  return build(required("SUPABASE_ANON_KEY"), accessToken ? { Authorization: `Bearer ${accessToken}` } : {});
}

/** A client that bypasses RLS. Refuses anyone but an admin with a TOTP session or a named system caller. */
export function createServiceClient(caller: ServiceCaller): DbClient {
  assertServer();
  if (caller.kind === "admin" && !(caller.role === "admin" && caller.aal === "aal2")) {
    throw new Error("createServiceClient: an admin caller needs the admin role and a TOTP session (aal2)");
  }
  return build(required("SUPABASE_SERVICE_ROLE_KEY"), {});
}
