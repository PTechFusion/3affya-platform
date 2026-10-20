// Supabase clients for the RLS suite: the service client (bypasses RLS; fixtures, cleanup and the "is the row still
// there" re-reads only), the anon client (no session) and a signed-in client per persona. No session is persisted and
// tokens are not refreshed: each client lives for one test file. Every request has an explicit timeout.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

export type Client = SupabaseClient;

const REQUEST_TIMEOUT_MS = 30_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchWithTimeout },
};

function stack() {
  return inject("rlsStack");
}

export function serviceClient(): Client {
  const env = stack();
  return createClient(env.url, env.serviceKey, options);
}

export function anonClient(): Client {
  const env = stack();
  return createClient(env.url, env.anonKey, options);
}

export async function signedInClient(email: string, password: string): Promise<Client> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

// Tables and views PostgREST exposes in `public`, from its OpenAPI description as the service role sees it. The matrix
// checks it has a case for each, so a table added later without one fails the suite.
export async function exposedTables(): Promise<string[]> {
  const env = stack();
  const response = await fetchWithTimeout(`${env.url}/rest/v1/`, {
    headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, Accept: "application/openapi+json" },
  });
  if (!response.ok) throw new Error(`PostgREST OpenAPI description answered HTTP ${response.status}`);
  const description = (await response.json()) as { definitions?: Record<string, unknown> };
  return Object.keys(description.definitions ?? {}).sort();
}

// The claims of the client's current access token (aal, role), read without verifying: the server already did.
export async function sessionClaims(client: Client): Promise<Record<string, unknown>> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}
