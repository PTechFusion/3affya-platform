// Where the RLS suite finds the local Supabase stack. SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY come
// from the environment when set; otherwise from `npx supabase status -o env`, read at runtime so no key is ever written to
// a file. The global setup resolves them once and hands them to the test files through vitest's provide/inject.
// Keys are never logged, and an error message never quotes the CLI output (it carries the keys).
import { execSync } from "node:child_process";

export interface StackEnv {
  url: string;
  anonKey: string;
  serviceKey: string;
}

declare module "vitest" {
  interface ProvidedContext {
    rlsStack: StackEnv;
  }
}

const STACK_DOWN =
  "The local Supabase stack is not reachable, so the RLS suite cannot run. Start it with `npm run db:start` " +
  "(Docker must be running), or set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.";

const STATUS_TIMEOUT_MS = 90_000;
const HEALTH_TIMEOUT_MS = 10_000;

function parseEnvLines(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(raw.trim());
    if (match?.[1] && match[2] !== undefined) values.set(match[1], match[2]);
  }
  return values;
}

export function resolveStackEnv(repoRoot: string): StackEnv {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && anonKey && serviceKey) return { url, anonKey, serviceKey };

  let output: string;
  try {
    output = execSync("npx supabase status -o env", {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: STATUS_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch {
    throw new Error(`${STACK_DOWN} (\`npx supabase status -o env\` failed or timed out.)`);
  }
  const values = parseEnvLines(output);
  const resolved = {
    url: url ?? values.get("API_URL"),
    anonKey: anonKey ?? values.get("ANON_KEY"),
    serviceKey: serviceKey ?? values.get("SERVICE_ROLE_KEY"),
  };
  if (!resolved.url || !resolved.anonKey || !resolved.serviceKey) {
    throw new Error(`${STACK_DOWN} (\`npx supabase status -o env\` printed no API_URL, ANON_KEY or SERVICE_ROLE_KEY.)`);
  }
  return { url: resolved.url, anonKey: resolved.anonKey, serviceKey: resolved.serviceKey };
}

// One request to Auth and one to PostgREST, each with a timeout, so a stopped container fails here and not as hundreds of
// confusing test failures.
export async function assertStackReachable(env: StackEnv): Promise<void> {
  const probes = [
    { what: "Auth", url: `${env.url}/auth/v1/health` },
    { what: "PostgREST", url: `${env.url}/rest/v1/specialties?select=id&limit=1` },
  ];
  for (const probe of probes) {
    let status: number;
    try {
      const response = await fetch(probe.url, {
        headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      status = response.status;
    } catch {
      throw new Error(`${STACK_DOWN} (${probe.what} at ${env.url} did not answer.)`);
    }
    if (status >= 500) throw new Error(`${STACK_DOWN} (${probe.what} answered HTTP ${status}.)`);
  }
}
