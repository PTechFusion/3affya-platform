// The fixture world each RLS test file builds in beforeAll and removes in afterAll: fresh personas with a unique run id,
// and through the service client at least one real row per tenant in each of the 26 L1 tables, so every cross-tenant
// attempt aims at a row that exists. "A" is the attacking side, "B" the other tenant; professionalPending owns the
// listing that is not public. Synthetic data only, on example.com addresses.
//
// Deleting a record set queues its storage folder in private.storage_purges (round 3); cleanup removes the objects first,
// then marks the run's queued folders purged, so the purge job never sees them. An AI job outlives its set (set_id goes
// null), so the run's jobs are removed by their idempotency key.
//
// Other agents write to the same local database at the same time (the 66k registry import among them), so nothing here
// assumes a table is empty or counts a whole table. Rows are found and removed by the run's own ids, and cleanup also
// sweeps by tenant column so a row a failing test let through is removed too. audit_log rows stay (append-only by
// design); theirs have target_id starting rls-test-. The import holds the advisory lock the slug trigger takes for its
// whole transaction, so inserts into professionals (and specialties) are retried while that lock is held.
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { aiLimits, business, outreach } from "../../../config/business";
import { feeLines, type FeeLines } from "../../../lib/fees";
import sampleDoctors from "../../../data/sample/doctors.json";
import { anonClient, serviceClient, signedInClient, type Client } from "./clients";
import { must, type Row } from "./refusal";
import { msLeftInStep, totp } from "./totp";

export const PERSONA_KEYS = [
  "patientA",
  "patientB",
  "professionalA",
  "professionalB",
  "professionalPending",
  "admin",
  "adminNoTotp",
  "anon",
] as const;
export type PersonaKey = (typeof PERSONA_KEYS)[number];
export type UserPersonaKey = Exclude<PersonaKey, "anon">;
export type AppRole = "patient" | "professional" | "admin";

const PERSONA_ROLES: Record<UserPersonaKey, AppRole> = {
  patientA: "patient",
  patientB: "patient",
  professionalA: "professional",
  professionalB: "professional",
  professionalPending: "professional",
  admin: "admin",
  adminNoTotp: "admin",
};

export interface Persona {
  key: PersonaKey;
  role: AppRole | null;
  userId: string | null;
  email: string | null;
  client: Client;
}

type ListingKey = "professionalA" | "professionalB" | "professionalPending";

export interface WorldIds {
  specialtyShown: string;
  specialtyHidden: string;
  professionalA: string;
  professionalB: string;
  professionalPending: string;
  tagA: string;
  tagB: string;
  tagPending: string;
  credentialA: string;
  credentialB: string;
  ruleA: string;
  ruleB: string;
  rulePending: string;
  exceptionA: string;
  exceptionB: string;
  exceptionPending: string;
  holdA: string;
  holdB: string;
  bookingA: string;
  /** Patient A with professional A, started an hour or two ago: the visit a professional may mark done. */
  bookingAStarted: string;
  bookingB: string;
  receiptA: string;
  receiptB: string;
  refundA: string;
  refundB: string;
  membershipA: string;
  membershipB: string;
  bannerA: string;
  bannerB: string;
  inviteA: string;
  inviteB: string;
  removalA: string;
  removalB: string;
  setA: string;
  setADraft: string;
  setB: string;
  setBDraft: string;
  setB2: string;
  fileA: string;
  fileB: string;
  fileBDraft: string;
  fileB2: string;
  pageA: string;
  pageB: string;
  pageB2: string;
  itemA: string;
  itemB: string;
  itemB2: string;
  summaryA: string;
  summaryB: string;
  summaryB2: string;
  shareB: string;
  shareB2Expired: string;
  consentA: string;
  consentB: string;
  aiJobA: string;
  aiJobB: string;
  auditRow: number;
}

export interface WorldPaths {
  recordsA: string;
  recordsB: string;
  recordsB2: string;
  credentialA: string;
  credentialB: string;
}

/** An extra signed-in account a test file creates for itself (World.addAccount); cleanup deletes it. */
export interface Account {
  userId: string;
  email: string;
  role: AppRole;
  client: Client;
}

export interface World {
  /** Lower-case letters and digits, unique per file and run. */
  runId: string;
  service: Client;
  personas: Record<PersonaKey, Persona>;
  ids: WorldIds;
  npis: Record<ListingKey, string>;
  paths: WorldPaths;
  /** The booking lines the fixture bookings carry (lib/fees.ts on a sample doctor's fee). */
  fees: FeeLines;
  /** target_id of the fixture audit_log row. */
  auditTargetId: string;
  /** The auth user id of a persona. */
  user(key: UserPersonaKey): string;
  /** A fresh synthetic NPI; cleanup removes any professionals row that ends up carrying it. */
  newNpi(): string;
  /**
   * Inserts a professionals row as the service client with a fresh synthetic NPI, waiting out another writer's slug
   * lock (up to LOCK_WAIT_BUDGET_MS, so call it from a hook or a test with LISTING_TIMEOUT_MS). Cleanup removes it.
   */
  insertListing(row: Row): Promise<{ id: string; npi: string }>;
  /** Creates and signs in one more account with the given role; cleanup deletes it unless a test already did. */
  addAccount(label: string, role: AppRole): Promise<Account>;
  /** A free slot on a fixture listing, n hours after the run's first slot. */
  slot(n: number): { slot_start: string; slot_end: string };
  /**
   * A complete bookings row (fresh id and payment intent, the fixture fee lines, one slot long) for the service client to
   * insert; nothing is written. Cleanup removes bookings by professional and by patient.
   */
  bookingRow(patientId: string | null, professionalId: string, startMs: number, extra?: Row): Row & { id: string };
  cleanup(): Promise<void>;
}

/* ---------------- small helpers ---------------- */

export const SYNTHETIC_PDF = new TextEncoder().encode("%PDF-1.4\n% synthetic RLS-suite fixture, no patient data\n%%EOF\n");
export const PDF = "application/pdf";
// A 1x1 transparent PNG: the public cards bucket takes images only.
export const SYNTHETIC_PNG = new Uint8Array(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
);
export const PNG = "image/png";

export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function isoIn(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// The slug trigger (professionals) and the taxonomy-code trigger (specialties) each take one transaction advisory lock,
// and the registry import holds the slug lock for its whole transaction, minutes at a time. PostgREST stops waiting for
// a lock after its lock_timeout (8 s locally) with 55P03, or for the statement with 57014; a statement cancelled that way
// wrote nothing, so it is sent again until LOCK_WAIT_BUDGET_MS has passed. A hook or test that inserts a listing needs
// a timeout above the budget: LISTING_TIMEOUT_MS (vitest.config.ts sets hookTimeout above it).
export const LOCK_WAIT_BUDGET_MS = 6 * MINUTE;
export const LISTING_TIMEOUT_MS = LOCK_WAIT_BUDGET_MS + 2 * MINUTE;
const LOCK_RETRY_CODES = new Set(["55P03", "57014"]);
const LOCK_RETRY_PAUSE_MS = 2_000;

export async function retryWhileLocked<T extends { error: { code?: string } | null }>(run: () => PromiseLike<T>): Promise<T> {
  const deadline = Date.now() + LOCK_WAIT_BUDGET_MS;
  for (;;) {
    const result = await run();
    const code = result.error?.code;
    if (code === undefined || !LOCK_RETRY_CODES.has(code) || Date.now() >= deadline) return result;
    await delay(LOCK_RETRY_PAUSE_MS);
  }
}

// Luhn check digit of an NPI: the Luhn sum over "80840" followed by the first nine digits. The prefix contributes 24.
function npiCheckDigit(firstNine: string): number {
  let sum = 24;
  const digits = firstNine.split("").map(Number).reverse();
  digits.forEach((digit, index) => {
    if (index % 2 === 0) {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digit;
    }
  });
  return (10 - (sum % 10)) % 10;
}

// Valid format for the schema (^[12][0-9]{9}$) with a check digit that is deliberately wrong. Every real NPI passes the
// Luhn check, so a synthetic one can never collide with a registry row being imported beside the suite.
export function syntheticNpi(): string {
  let firstNine = String(1 + randomInt(2));
  for (let i = 0; i < 8; i++) firstNine += String(randomInt(10));
  const wrong = (npiCheckDigit(firstNine) + 1 + randomInt(9)) % 10;
  return `${firstNine}${wrong}`;
}

function sampleDoctorFeeCents(): number {
  const doctors = sampleDoctors as Array<{ feeUsdCents?: number | null }>;
  const fee = doctors.find((doctor) => typeof doctor.feeUsdCents === "number")?.feeUsdCents;
  if (typeof fee !== "number") throw new Error("data/sample/doctors.json has no feeUsdCents to build fixture bookings from");
  return fee;
}

async function createAuthUser(service: Client, email: string, password: string, role: AppRole): Promise<string> {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error || !data.user) throw new Error(`createUser ${email} failed: ${error?.message ?? "no user"}`);
  return data.user.id;
}

// Enrols a TOTP factor on a signed-in client and passes the challenge, leaving the client on an aal2 session.
export async function passTotp(client: Client): Promise<void> {
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `rls-${randomHex(3)}` });
  if (enrolled.error) throw new Error(`TOTP enrol failed: ${enrolled.error.message}`);
  if (msLeftInStep() < 3_000) await delay(msLeftInStep() + 250);
  const verified = await client.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: totp(enrolled.data.totp.secret),
  });
  if (verified.error) throw new Error(`TOTP verify failed: ${verified.error.message}`);
}

// The row carries its id, so a request whose answer was lost after the row was written is recognised, not repeated.
async function insertListing(service: Client, row: Row & { id: string }): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const npi = syntheticNpi();
    const { error } = await retryWhileLocked(() => service.from("professionals").insert({ ...row, npi }));
    if (!error) return npi;
    if (error.code === "23505" && error.message.includes("npi")) continue;
    const written = await service.from("professionals").select("npi").eq("id", row.id).maybeSingle();
    if (written.data) return (written.data as { npi: string }).npi;
    throw new Error(`insert professional failed: ${error.code} ${error.message}`);
  }
  throw new Error("five synthetic NPIs in a row collided; giving up");
}

async function storageTree(service: Client, bucket: string, prefix: string, depth: number): Promise<string[]> {
  const { data, error } = await service.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefix} failed: ${error.message}`);
  const paths: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      if (depth > 0) paths.push(...(await storageTree(service, bucket, path, depth - 1)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

export async function removeStorageFolders(service: Client, bucket: string, roots: string[]): Promise<void> {
  const paths: string[] = [];
  for (const root of roots) paths.push(...(await storageTree(service, bucket, root, 3)));
  if (paths.length === 0) return;
  const { error } = await service.storage.from(bucket).remove(paths);
  if (error) throw new Error(`remove ${paths.length} objects from ${bucket} failed: ${error.message}`);
}

export interface PendingPurge {
  id: number;
  bucket_id: string;
  prefix: string;
}

export async function pendingPurges(service: Client): Promise<PendingPurge[]> {
  const { data, error } = await service.rpc("pending_storage_purges", { max_rows: 1000 });
  if (error) throw new Error(`pending_storage_purges failed: ${error.message}`);
  return (data ?? []) as PendingPurge[];
}

// Marks the queued records folders of these patients purged (cleanup removed their objects already).
async function markPurged(service: Client, patients: string[]): Promise<void> {
  for (const row of await pendingPurges(service)) {
    if (row.bucket_id !== "records" || !patients.some((id) => row.prefix.startsWith(`${id}/`))) continue;
    const { error } = await service.rpc("mark_storage_purged", { purge_id: row.id });
    if (error) throw new Error(`mark_storage_purged ${row.id} failed: ${error.message}`);
  }
}

async function upload(service: Client, bucket: string, path: string): Promise<void> {
  const { error } = await service.storage.from(bucket).upload(path, SYNTHETIC_PDF, { contentType: PDF, upsert: false });
  if (error) throw new Error(`fixture upload ${bucket}/${path} failed: ${error.message}`);
}

/* ---------------- the world ---------------- */

export async function buildWorld(area: string): Promise<World> {
  const service = serviceClient();
  const runId = `${area.toLowerCase().replace(/[^a-z0-9]/g, "")}${Date.now().toString(36)}${randomHex(2)}`;
  const password = `Rls-${randomHex(12)}`;
  const extraNpis: string[] = [];
  const userIds: Partial<Record<UserPersonaKey, string>> = {};
  const extraUserIds: string[] = [];
  const listingIds: string[] = [];
  const specialtyPrefix = `rls-test-${runId}`;

  const cleanup = async (): Promise<void> => {
    const failures: string[] = [];
    const step = async (what: string, run: () => Promise<unknown>) => {
      try {
        await run();
      } catch (error) {
        failures.push(`${what}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    const check = async (what: string, query: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await query;
      if (error) throw new Error(`${what}: ${error.message}`);
    };
    const users = [...Object.values(userIds), ...extraUserIds];
    const listings = [...listingIds];

    await step("records objects", () => removeStorageFolders(service, "records", users));
    await step("credential objects", () => removeStorageFolders(service, "credentials", listings));
    await step("cards objects", () => removeStorageFolders(service, "cards", listings));
    // Money rows restrict deleting a booking, and bookings and removal requests restrict deleting a listing.
    await step("money and bookings", async () => {
      const bookingIds = new Set<string>();
      for (const [column, values] of [["professional_id", listings], ["patient_id", users]] as const) {
        if (values.length === 0) continue;
        const { data, error } = await service.from("bookings").select("id").in(column, values);
        if (error) throw new Error(error.message);
        for (const row of (data ?? []) as Array<{ id: string }>) bookingIds.add(row.id);
      }
      const ids = [...bookingIds];
      if (users.length > 0) {
        await check("refunds by patient", service.from("refunds").delete().in("patient_id", users));
        // Records receipts have no booking (subject 'records').
        await check("receipts by patient", service.from("receipts").delete().in("patient_id", users));
      }
      if (ids.length > 0) {
        await check("refunds", service.from("refunds").delete().in("booking_id", ids));
        await check("receipts", service.from("receipts").delete().in("booking_id", ids));
        await check("bookings", service.from("bookings").delete().in("id", ids));
      }
    });
    // Record sets (and with them summaries and shares), consents and holds first, so nothing of the run's patients is
    // left hanging off a listing when the listings go.
    if (users.length > 0) {
      await step("record sets", () => check("record_sets", service.from("record_sets").delete().in("patient_id", users)));
      await step("consents", () => check("consents", service.from("consents").delete().in("user_id", users)));
      await step("slot holds", () => check("slot_holds", service.from("slot_holds").delete().in("patient_id", users)));
    }
    // Listings before accounts: deleting the account of a claimed listing only takes the listing down to 'removed'
    // (profiles_release_listing) and leaves the row behind.
    if (listings.length > 0) {
      await step("removal requests", () => check("removal_requests", service.from("removal_requests").delete().in("professional_id", listings)));
      await step("listings", () => check("professionals", service.from("professionals").delete().in("id", listings)));
    }
    if (extraNpis.length > 0) {
      await step("injected listings", () => check("professionals by npi", service.from("professionals").delete().in("npi", extraNpis)));
    }
    if (users.length > 0) {
      await step("listings by account", () => check("professionals by user", service.from("professionals").delete().in("user_id", users)));
    }
    await step("specialties", () => check("specialties", service.from("specialties").delete().like("slug", `${specialtyPrefix}%`)));
    await step("ai jobs", () => check("ai_jobs", service.from("ai_jobs").delete().like("idempotency_key", `rls-test-${runId}-%`)));
    for (const id of users) {
      await step(`auth user ${id}`, async () => {
        const { error } = await service.auth.admin.deleteUser(id);
        // 404: a test already deleted this account (the account-deletion cases in listings.rls.ts and bookings.rls.ts).
        if (error && error.status !== 404) throw new Error(error.message);
      });
    }
    // Last, after every set (and account) is gone: the objects were removed at the start, so the folders the deletes
    // queued are marked purged.
    if (users.length > 0) await step("storage purge queue", () => markPurged(service, users));
    if (failures.length > 0) throw new Error(`RLS fixture cleanup incomplete:\n${failures.join("\n")}`);
  };

  const populate = async (): Promise<World> => {
    /* personas */
    const personas = {} as Record<PersonaKey, Persona>;
    for (const key of Object.keys(PERSONA_ROLES) as UserPersonaKey[]) {
      const role = PERSONA_ROLES[key];
      const email = `rls-${key.toLowerCase()}-${runId}@example.com`;
      const userId = await createAuthUser(service, email, password, role);
      userIds[key] = userId;
      personas[key] = { key, role, userId, email, client: await signedInClient(email, password) };
    }
    personas.anon = { key: "anon", role: null, userId: null, email: null, client: anonClient() };
    await passTotp(personas.admin.client);
    const user = (key: UserPersonaKey): string => {
      const id = userIds[key];
      if (!id) throw new Error(`no user for ${key}`);
      return id;
    };

    for (const key of ["patientA", "patientB"] as const) {
      must(
        await service
          .from("profiles")
          .update({ name_en: `Rls ${key}`, first_name_en: "Rls", country: "SA", time_zone: business.defaultTimeZone })
          .eq("id", user(key))
          .select("id"),
        `profile ${key}`,
      );
    }

    /* specialties */
    const ids = {
      specialtyShown: randomUUID(),
      specialtyHidden: randomUUID(),
      professionalA: randomUUID(),
      professionalB: randomUUID(),
      professionalPending: randomUUID(),
    } as WorldIds;
    must(
      await retryWhileLocked(() => service
        .from("specialties")
        .insert([
          { id: ids.specialtyShown, slug: `${specialtyPrefix}-shown`, name_en: "RLS test (shown)", name_ar: "اختبار", position: 900, shown: true },
          { id: ids.specialtyHidden, slug: `${specialtyPrefix}-hidden`, name_en: "RLS test (hidden)", name_ar: "اختبار", position: 901, shown: false },
        ])
        .select("id")),
      "specialties",
    );

    /* listings */
    const today = new Date().toISOString().slice(0, 10);
    const fee = sampleDoctorFeeCents();
    const listing = (key: ListingKey, label: string, status: string): Row & { id: string } => ({
      id: ids[key],
      user_id: user(key),
      status,
      source: "self",
      first_name: "Rls",
      last_name: `${label}${runId}`,
      name_en: `Dr Rls ${label}`,
      city_en: "Testville",
      state_code: "NY",
      specialty_id: ids.specialtyShown,
      languages: ["ar", "en"],
      visit_types: ["video", "phone"],
      board_status: "certified",
      board_name: "Synthetic Board of Testing",
      licence_state: "NY",
      bio_en: `Synthetic listing ${label} for the RLS suite.`,
      fee_cents: fee,
      time_zone: "America/New_York",
      accepting_new_patients: status === "verified",
      verified_on: status === "verified" ? today : null,
    });
    const npis = {} as Record<ListingKey, string>;
    for (const [key, label, status] of [
      ["professionalA", "Alpha", "verified"],
      ["professionalB", "Bravo", "verified"],
      ["professionalPending", "Pending", "pending_review"],
    ] as const) {
      // Tracked before the insert, so cleanup sweeps the row even when the insert's answer is lost.
      listingIds.push(ids[key]);
      npis[key] = await insertListing(service, listing(key, label, status));
    }
    // Stripe live on both verified listings, so can_take_bookings is true (trigger); private fields to watch.
    for (const [key, letter] of [["professionalA", "a"], ["professionalB", "b"], ["professionalPending", "p"]] as const) {
      const live = key !== "professionalPending";
      must(
        await service
          .from("professional_private")
          .update({
            video_link: `https://video.example.com/rls-${letter}-${runId}`,
            licence_number: `LIC-${letter.toUpperCase()}-${runId.slice(-6)}`,
            stripe_charges_enabled: live,
            stripe_payouts_enabled: live,
          })
          .eq("professional_id", ids[key])
          .select("professional_id"),
        `professional_private ${key}`,
      );
    }

    must(
      await service
        .from("professional_specialties")
        .insert(
          (["professionalA", "professionalB", "professionalPending"] as const).map((key) => ({
            professional_id: ids[key],
            specialty_id: ids.specialtyShown,
            is_primary: true,
          })),
        )
        .select("professional_id"),
      "professional_specialties",
    );

    Object.assign(ids, {
      tagA: randomUUID(),
      tagB: randomUUID(),
      tagPending: randomUUID(),
      credentialA: randomUUID(),
      credentialB: randomUUID(),
      ruleA: randomUUID(),
      ruleB: randomUUID(),
      rulePending: randomUUID(),
      exceptionA: randomUUID(),
      exceptionB: randomUUID(),
      exceptionPending: randomUUID(),
    });
    must(
      await service
        .from("expertise_tags")
        .insert([
          { id: ids.tagA, professional_id: ids.professionalA, locale: "en", title: "Synthetic A", nugget: "Fixture", position: 0 },
          { id: ids.tagB, professional_id: ids.professionalB, locale: "en", title: "Synthetic B", nugget: "Fixture", position: 0 },
          { id: ids.tagPending, professional_id: ids.professionalPending, locale: "en", title: "Synthetic P", nugget: "Fixture", position: 0 },
        ])
        .select("id"),
      "expertise_tags",
    );

    const paths: WorldPaths = {
      credentialA: `${ids.professionalA}/licence-${runId}.pdf`,
      credentialB: `${ids.professionalB}/licence-${runId}.pdf`,
      recordsA: "",
      recordsB: "",
      recordsB2: "",
    };
    must(
      await service
        .from("credentials")
        .insert([
          { id: ids.credentialA, professional_id: ids.professionalA, kind: "licence", file_name: "licence.pdf", storage_path: paths.credentialA, mime_type: PDF, size_bytes: SYNTHETIC_PDF.byteLength },
          { id: ids.credentialB, professional_id: ids.professionalB, kind: "licence", file_name: "licence.pdf", storage_path: paths.credentialB, mime_type: PDF, size_bytes: SYNTHETIC_PDF.byteLength },
        ])
        .select("id"),
      "credentials",
    );

    const ruleStart = Date.now() + 14 * DAY;
    const ruleRow = (id: string, professional: string, offsetDays: number) => ({
      id,
      professional_id: professional,
      time_zone: "America/New_York",
      starts_at: new Date(ruleStart + offsetDays * DAY).toISOString(),
      ends_at: new Date(ruleStart + offsetDays * DAY + 4 * HOUR).toISOString(),
    });
    must(
      await service
        .from("availability_rules")
        .insert([
          ruleRow(ids.ruleA, ids.professionalA, 0),
          ruleRow(ids.ruleB, ids.professionalB, 0),
          ruleRow(ids.rulePending, ids.professionalPending, 0),
        ])
        .select("id"),
      "availability_rules",
    );
    const exceptionRow = (id: string, professional: string) => ({
      id,
      professional_id: professional,
      kind: "off",
      starts_at: new Date(ruleStart + 7 * DAY).toISOString(),
      ends_at: new Date(ruleStart + 7 * DAY + 8 * HOUR).toISOString(),
    });
    must(
      await service
        .from("availability_exceptions")
        .insert([
          exceptionRow(ids.exceptionA, ids.professionalA),
          exceptionRow(ids.exceptionB, ids.professionalB),
          exceptionRow(ids.exceptionPending, ids.professionalPending),
        ])
        .select("id"),
      "availability_exceptions",
    );

    /* holds, bookings and money */
    const firstSlot = Math.ceil((Date.now() + 3 * DAY) / HOUR) * HOUR;
    const slot = (n: number) => ({
      slot_start: new Date(firstSlot + n * HOUR).toISOString(),
      slot_end: new Date(firstSlot + n * HOUR + business.slotLengthMinutesDefault * MINUTE).toISOString(),
    });
    Object.assign(ids, {
      holdA: randomUUID(),
      holdB: randomUUID(),
      bookingA: randomUUID(),
      bookingAStarted: randomUUID(),
      bookingB: randomUUID(),
      receiptA: randomUUID(),
      receiptB: randomUUID(),
      refundA: randomUUID(),
      refundB: randomUUID(),
    });
    const holdRow = (id: string, patient: UserPersonaKey, professional: string, n: number) => ({
      id,
      patient_id: user(patient),
      professional_id: professional,
      ...slot(n),
      expires_at: isoIn(business.slotHoldMinutes * MINUTE),
      visit_type: "video",
      concern: "Synthetic concern",
      concern_locale: "en",
    });
    must(
      await service
        .from("slot_holds")
        .insert([holdRow(ids.holdA, "patientA", ids.professionalA, 0), holdRow(ids.holdB, "patientB", ids.professionalB, 0)])
        .select("id"),
      "slot_holds",
    );

    const fees = feeLines(fee);
    const bookingRow = (patientId: string | null, professionalId: string, startMs: number, extra: Row = {}): Row & { id: string } => ({
      id: randomUUID(),
      patient_id: patientId,
      professional_id: professionalId,
      payment_intent_id: `pi_rlstest_${runId}_${randomHex(4)}`,
      visit_type: "video",
      starts_at: new Date(startMs).toISOString(),
      ends_at: new Date(startMs + business.slotLengthMinutesDefault * MINUTE).toISOString(),
      patient_time_zone: business.defaultTimeZone,
      professional_time_zone: "America/New_York",
      patient_first_name_en: "Rls",
      currency: business.currencyPresentment,
      doctor_fee_cents: fees.doctorFeeCents,
      platform_fee_cents: fees.platformFeeCents,
      card_processing_cents: fees.cardProcessingCents,
      ...extra,
    });
    // Bookings A and B are days ahead (the slot 24 hours after the first); the started one began on the hour, one to two
    // hours ago.
    const startedAt = Math.floor(Date.now() / HOUR) * HOUR - HOUR;
    must(
      await service
        .from("bookings")
        .insert([
          bookingRow(user("patientA"), ids.professionalA, firstSlot + 24 * HOUR, { id: ids.bookingA }),
          bookingRow(user("patientA"), ids.professionalA, startedAt, { id: ids.bookingAStarted }),
          bookingRow(user("patientB"), ids.professionalB, firstSlot + 24 * HOUR, { id: ids.bookingB }),
        ])
        .select("id"),
      "bookings",
    );
    const receiptRow = (id: string, booking: string, patient: UserPersonaKey, letter: string) => ({
      id,
      booking_id: booking,
      patient_id: user(patient),
      receipt_number: `RLS-${runId}-${letter}`,
      currency: business.currencyPresentment,
      amount_cents: fees.totalCents,
      paid_at: new Date().toISOString(),
      card_brand: "visa",
      card_last4: "4242",
      stripe_payment_intent_id: `pi_rlstest_${runId}_${letter}`,
    });
    must(
      await service
        .from("receipts")
        .insert([
          receiptRow(ids.receiptA, ids.bookingA, "patientA", "a"),
          receiptRow(ids.receiptB, ids.bookingB, "patientB", "b"),
        ])
        .select("id"),
      "receipts",
    );
    const refundRow = (id: string, booking: string, receipt: string, patient: UserPersonaKey, letter: string) => ({
      id,
      booking_id: booking,
      receipt_id: receipt,
      patient_id: user(patient),
      status: "pending",
      amount_cents: fees.totalCents,
      currency: business.currencyPresentment,
      reason: "patientEarly",
      initiated_by: "automatic",
      idempotency_key: `rls-test-${runId}-refund-${letter}`,
    });
    must(
      await service
        .from("refunds")
        .insert([
          refundRow(ids.refundA, ids.bookingA, ids.receiptA, "patientA", "a"),
          refundRow(ids.refundB, ids.bookingB, ids.receiptB, "patientB", "b"),
        ])
        .select("id"),
      "refunds",
    );

    /* memberships, banners, invites, removals */
    Object.assign(ids, {
      membershipA: randomUUID(),
      membershipB: randomUUID(),
      bannerA: randomUUID(),
      bannerB: randomUUID(),
      inviteA: randomUUID(),
      inviteB: randomUUID(),
      removalA: randomUUID(),
      removalB: randomUUID(),
    });
    must(
      await service
        .from("memberships")
        .insert([
          { id: ids.membershipA, professional_id: ids.professionalA, status: "active", interval: "month", started_at: new Date().toISOString(), current_period_end: isoIn(30 * DAY) },
          { id: ids.membershipB, professional_id: ids.professionalB, status: "active", interval: "month", started_at: new Date().toISOString(), current_period_end: isoIn(30 * DAY) },
        ])
        .select("id"),
      "memberships",
    );
    must(
      await service
        .from("banners")
        .insert([
          { id: ids.bannerA, professional_id: ids.professionalA, active: true, current_period_end: isoIn(30 * DAY) },
          { id: ids.bannerB, professional_id: ids.professionalB, active: true, current_period_end: isoIn(30 * DAY) },
        ])
        .select("id"),
      "banners",
    );
    must(
      await service
        .from("invites")
        .insert([
          { id: ids.inviteA, professional_id: ids.professionalA, email: `rls-invite-a-${runId}@example.com`, token_hash: randomHex(32), expires_at: isoIn(outreach.inviteValidDays * DAY) },
          { id: ids.inviteB, professional_id: ids.professionalB, email: `rls-invite-b-${runId}@example.com`, token_hash: randomHex(32), expires_at: isoIn(outreach.inviteValidDays * DAY) },
        ])
        .select("id"),
      "invites",
    );
    must(
      await service
        .from("removal_requests")
        .insert([
          { id: ids.removalA, professional_id: ids.professionalA, requester_name: "Rls Alpha", requester_email: `rls-removal-a-${runId}@example.com`, npi: npis.professionalA, reason: "wrongDetails", locale: "en" },
          { id: ids.removalB, professional_id: ids.professionalB, requester_name: "Rls Bravo", requester_email: `rls-removal-b-${runId}@example.com`, npi: npis.professionalB, reason: "wrongDetails", locale: "en" },
        ])
        .select("id"),
      "removal_requests",
    );

    /* records */
    Object.assign(ids, {
      setA: randomUUID(),
      setADraft: randomUUID(),
      setB: randomUUID(),
      setBDraft: randomUUID(),
      setB2: randomUUID(),
      fileA: randomUUID(),
      fileB: randomUUID(),
      fileBDraft: randomUUID(),
      fileB2: randomUUID(),
      pageA: randomUUID(),
      pageB: randomUUID(),
      pageB2: randomUUID(),
      itemA: randomUUID(),
      itemB: randomUUID(),
      itemB2: randomUUID(),
      summaryA: randomUUID(),
      summaryB: randomUUID(),
      summaryB2: randomUUID(),
      shareB: randomUUID(),
      shareB2Expired: randomUUID(),
      consentA: randomUUID(),
      consentB: randomUUID(),
      aiJobA: randomUUID(),
      aiJobB: randomUUID(),
    });
    const done = { status: "done", page_count: 1, accepted_bytes: SYNTHETIC_PDF.byteLength, finished_at: new Date().toISOString() };
    // Rows with different keys go in one request with defaultToNull false, so a missing key takes the column default.
    must(
      await service
        .from("record_sets")
        .insert([
          { id: ids.setA, patient_id: user("patientA"), ...done },
          { id: ids.setADraft, patient_id: user("patientA"), status: "draft" },
          { id: ids.setB, patient_id: user("patientB"), ...done },
          { id: ids.setBDraft, patient_id: user("patientB"), status: "draft" },
          { id: ids.setB2, patient_id: user("patientB"), ...done },
        ], { defaultToNull: false })
        .select("id"),
      "record_sets",
    );
    paths.recordsA = `${user("patientA")}/${ids.setA}/synthetic-a.pdf`;
    paths.recordsB = `${user("patientB")}/${ids.setB}/synthetic-b.pdf`;
    paths.recordsB2 = `${user("patientB")}/${ids.setB2}/synthetic-b2.pdf`;
    const sha256 = createHash("sha256").update(SYNTHETIC_PDF).digest("hex");
    const fileRow = (id: string, set: string, patient: UserPersonaKey, path: string, status: string) => ({
      id,
      set_id: set,
      patient_id: user(patient),
      position: 0,
      name: path.split("/").pop(),
      kind: "pdf",
      mime_type: PDF,
      size_bytes: SYNTHETIC_PDF.byteLength,
      storage_path: path,
      status,
      page_count: status === "accepted" ? 1 : null,
      sha256,
    });
    must(
      await service
        .from("record_files")
        .insert([
          fileRow(ids.fileA, ids.setA, "patientA", paths.recordsA, "accepted"),
          fileRow(ids.fileB, ids.setB, "patientB", paths.recordsB, "accepted"),
          fileRow(ids.fileBDraft, ids.setBDraft, "patientB", `${user("patientB")}/${ids.setBDraft}/synthetic-draft.pdf`, "checking"),
          fileRow(ids.fileB2, ids.setB2, "patientB", paths.recordsB2, "accepted"),
        ])
        .select("id"),
      "record_files",
    );
    const pageRow = (id: string, set: string, file: string, patient: UserPersonaKey) => ({
      id,
      set_id: set,
      file_id: file,
      patient_id: user(patient),
      page_number: 1,
      set_page_number: 1,
      status: "read",
      extracted_at: new Date().toISOString(),
    });
    must(
      await service
        .from("record_pages")
        .insert([
          pageRow(ids.pageA, ids.setA, ids.fileA, "patientA"),
          pageRow(ids.pageB, ids.setB, ids.fileB, "patientB"),
          pageRow(ids.pageB2, ids.setB2, ids.fileB2, "patientB"),
        ])
        .select("id"),
      "record_pages",
    );
    const itemRow = (id: string, set: string, page: string, patient: UserPersonaKey) => ({
      id,
      set_id: set,
      patient_id: user(patient),
      source_page_id: page,
      type: "condition",
      label: "Synthetic condition (fixture)",
      confidence: 0.9,
    });
    must(
      await service
        .from("record_items")
        .insert([
          itemRow(ids.itemA, ids.setA, ids.pageA, "patientA"),
          itemRow(ids.itemB, ids.setB, ids.pageB, "patientB"),
          itemRow(ids.itemB2, ids.setB2, ids.pageB2, "patientB"),
        ])
        .select("id"),
      "record_items",
    );
    const summaryRow = (id: string, set: string, patient: UserPersonaKey) => ({
      id,
      set_id: set,
      patient_id: user(patient),
      data: { documents: [], conditions: [{ label: "Synthetic condition (fixture)" }] },
    });
    must(
      await service
        .from("record_summaries")
        .insert([
          summaryRow(ids.summaryA, ids.setA, "patientA"),
          summaryRow(ids.summaryB, ids.setB, "patientB"),
          summaryRow(ids.summaryB2, ids.setB2, "patientB"),
        ])
        .select("id"),
      "record_summaries",
    );
    must(
      await service
        .from("record_shares")
        .insert([
          // Live: patient B shares set B with professional B.
          { id: ids.shareB, summary_id: ids.summaryB, patient_id: user("patientB"), professional_id: ids.professionalB, expires_at: isoIn(business.shareDefaultDays * DAY) },
          // Already expired: set B2 was shared with professional B and the share ran out.
          { id: ids.shareB2Expired, summary_id: ids.summaryB2, patient_id: user("patientB"), professional_id: ids.professionalB, shared_at: isoIn(-10 * DAY), expires_at: isoIn(-3 * DAY) },
        ], { defaultToNull: false })
        .select("id"),
      "record_shares",
    );
    must(
      await service
        .from("consents")
        .insert([
          { id: ids.consentA, user_id: user("patientA"), kind: "recordsProcessing", copy_version: "records.consent.v1", locale: "en", record_set_id: ids.setA },
          { id: ids.consentB, user_id: user("patientB"), kind: "recordsProcessing", copy_version: "records.consent.v1", locale: "en", record_set_id: ids.setB },
        ])
        .select("id"),
      "consents",
    );
    must(
      await service
        .from("ai_jobs")
        .insert([
          { id: ids.aiJobA, set_id: ids.setA, attempt: 1, status: "done", idempotency_key: `rls-test-${runId}-job-a`, cost_currency: aiLimits.costCurrency },
          { id: ids.aiJobB, set_id: ids.setB, attempt: 1, status: "done", idempotency_key: `rls-test-${runId}-job-b`, cost_currency: aiLimits.costCurrency },
        ])
        .select("id"),
      "ai_jobs",
    );

    /* audit_log: one row the suite can aim at; it stays (append-only) */
    const auditTargetId = `rls-test-${runId}-fixture`;
    const audit = must(
      await service
        .from("audit_log")
        .insert({
          actor_kind: "system",
          actor_system: "rls_test",
          action: "rlsTest.fixture",
          target_type: "rlsTest",
          target_id: auditTargetId,
        })
        .select("id")
        .single(),
      "audit_log",
    ) as { id: number };
    ids.auditRow = audit.id;

    /* storage */
    await upload(service, "records", paths.recordsA);
    await upload(service, "records", paths.recordsB);
    await upload(service, "records", paths.recordsB2);
    await upload(service, "credentials", paths.credentialA);
    await upload(service, "credentials", paths.credentialB);

    return {
      runId,
      service,
      personas,
      ids,
      npis,
      paths,
      fees,
      auditTargetId,
      user,
      newNpi: () => {
        const npi = syntheticNpi();
        extraNpis.push(npi);
        return npi;
      },
      insertListing: async (row) => {
        const id = typeof row.id === "string" ? row.id : randomUUID();
        listingIds.push(id);
        return { id, npi: await insertListing(service, { ...row, id }) };
      },
      addAccount: async (label, role) => {
        const email = `rls-${label.toLowerCase().replace(/[^a-z0-9]/g, "")}-${runId}@example.com`;
        const userId = await createAuthUser(service, email, password, role);
        extraUserIds.push(userId);
        return { userId, email, role, client: await signedInClient(email, password) };
      },
      slot,
      bookingRow,
      cleanup,
    };
  };

  try {
    return await populate();
  } catch (error) {
    // A half-built world is removed before the error surfaces, so a failed setup leaves nothing behind.
    await cleanup().catch(() => undefined);
    throw error;
  }
}
