// Task 1.4: "profiles.role mirrors app_metadata.role via trigger" (ADR-8). The role is set only through the Auth admin
// API (app_metadata), mirrored into profiles by private.sync_profile_from_auth, and never writable by the user: not
// through profiles, not through user_metadata. An unknown role fails loudly instead of defaulting. This file creates its
// own short-lived accounts and deletes them afterwards.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serviceClient, sessionClaims, signedInClient, type Client } from "./support/clients";
import { randomHex } from "./support/fixtures";
import { PERMISSION_DENIED, readAsService } from "./support/refusal";

let service: Client;
const runId = `roles${Date.now().toString(36)}${randomHex(2)}`;
const password = `Rls-${randomHex(12)}`;
const created: string[] = [];
let counter = 0;

function nextEmail(label: string): string {
  counter += 1;
  return `rls-${label}-${counter}-${runId}@example.com`;
}

async function createAccount(email: string, appMetadata: Record<string, unknown>) {
  const result = await service.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: appMetadata });
  if (result.data.user) created.push(result.data.user.id);
  return result;
}

function idOf(user: { id: string } | null): string {
  if (!user) throw new Error("createUser returned no user");
  return user.id;
}

async function mirroredRole(userId: string): Promise<unknown> {
  return (await readAsService(service, "profiles", { id: userId }))?.role;
}

beforeAll(() => {
  service = serviceClient();
});

afterAll(async () => {
  const failures: string[] = [];
  for (const id of created) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) failures.push(`${id}: ${error.message}`);
  }
  if (failures.length > 0) throw new Error(`role test cleanup incomplete:\n${failures.join("\n")}`);
});

describe("profiles.role mirrors app_metadata.role", () => {
  for (const role of ["patient", "professional", "admin"] as const) {
    it(`createUser with role ${role} gives a profile with role ${role}`, async () => {
      const { data, error } = await createAccount(nextEmail(role), { role });
      expect(error, error?.message).toBeNull();
      expect(await mirroredRole(idOf(data.user))).toBe(role);
    });
  }

  it("createUser without a role gives a patient (email OTP sign-up sets none)", async () => {
    const { data, error } = await createAccount(nextEmail("norole"), {});
    expect(error, error?.message).toBeNull();
    expect(await mirroredRole(idOf(data.user))).toBe("patient");
  });

  it("auth.admin.updateUserById moves the mirrored role, each way", async () => {
    const { data, error } = await createAccount(nextEmail("moves"), { role: "patient" });
    expect(error, error?.message).toBeNull();
    const id = idOf(data.user);
    for (const role of ["professional", "admin", "patient"] as const) {
      const updated = await service.auth.admin.updateUserById(id, { app_metadata: { role } });
      expect(updated.error, updated.error?.message).toBeNull();
      expect(await mirroredRole(id), `after updateUserById to ${role}`).toBe(role);
    }
  });

  it("an unknown role is refused at createUser, and no account or profile is left behind", async () => {
    const email = nextEmail("unknown");
    const { data, error } = await createAccount(email, { role: "superuser" });
    expect(error, "createUser with an unknown role succeeded").not.toBeNull();
    expect(data.user).toBeNull();
    const profiles = await service.from("profiles").select("id").eq("email", email);
    expect(profiles.error, profiles.error?.message).toBeNull();
    expect(profiles.data).toEqual([]);
    await expect(signedInClient(email, password)).rejects.toThrow();
  });

  it("an unknown role is refused at updateUserById and the mirrored role stays", async () => {
    const { data, error } = await createAccount(nextEmail("staysput"), { role: "professional" });
    expect(error, error?.message).toBeNull();
    const id = idOf(data.user);
    const updated = await service.auth.admin.updateUserById(id, { app_metadata: { role: "owner" } });
    expect(updated.error, "updateUserById with an unknown role succeeded").not.toBeNull();
    expect(await mirroredRole(id)).toBe("professional");
  });
});

describe("a user cannot change its own role", () => {
  it("profiles.role is not writable through the API", async () => {
    const email = nextEmail("selfpromote");
    const { data, error } = await createAccount(email, { role: "patient" });
    expect(error, error?.message).toBeNull();
    const id = idOf(data.user);
    const client = await signedInClient(email, password);
    const attempt = await client.from("profiles").update({ role: "admin" }, { count: "exact" }).eq("id", id);
    expect(attempt.error, "a patient updated its own role").not.toBeNull();
    expect(attempt.error?.code).toBe(PERMISSION_DENIED);
    expect(await mirroredRole(id)).toBe("patient");
  });

  it("a role in user_metadata (which the user controls) is ignored", async () => {
    const email = nextEmail("usermeta");
    const { data, error } = await createAccount(email, { role: "patient" });
    expect(error, error?.message).toBeNull();
    const id = idOf(data.user);
    const client = await signedInClient(email, password);
    const updated = await client.auth.updateUser({ data: { role: "admin" } });
    expect(updated.error, updated.error?.message).toBeNull();
    expect(await mirroredRole(id)).toBe("patient");
    const refreshed = await client.auth.refreshSession();
    expect(refreshed.error, refreshed.error?.message).toBeNull();
    const claims = await sessionClaims(client);
    expect((claims.app_metadata as { role?: unknown } | undefined)?.role).toBe("patient");
    // Still no admin reach: ai_jobs is admin-only.
    const jobs = await client.from("ai_jobs").select("id").limit(1);
    expect(jobs.error, jobs.error?.message).toBeNull();
    expect(jobs.data).toEqual([]);
  });
});
