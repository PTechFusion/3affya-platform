// Positive controls for the RLS suite, so no refusal elsewhere passes only because nothing works: owners read their own
// rows, public-by-design rows are public, the writes the policies allow go through, the aal2 admin reads a row from each
// of the 27 tables while the same role without TOTP reads none of them, the aal2 admin still writes nothing through the
// API (server code only), and the refusal checks themselves fail when the operation is in fact allowed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import { sessionClaims } from "./support/clients";
import { buildWorld, DAY, isoIn, LISTING_TIMEOUT_MS, PDF, SYNTHETIC_PDF, type PersonaKey, type World } from "./support/fixtures";
import {
  expectDeleteRefused,
  expectDownloadRefused,
  expectInsertRefused,
  expectReadAllowed,
  expectReadRefused,
  expectUpdateRefused,
  expectUploadRefused,
  readAsService,
  type Match,
} from "./support/refusal";
import { TABLE_CASES, type TableName } from "./support/tables";

let w: World;

beforeAll(async () => {
  w = await buildWorld("controls");
});

afterAll(async () => {
  await w?.cleanup();
});

const OWN_ROWS: Array<[PersonaKey, TableName, (w: World) => Match]> = [
  ["patientA", "profiles", (w) => ({ id: w.user("patientA") })],
  ["patientA", "slot_holds", (w) => ({ id: w.ids.holdA })],
  ["patientA", "bookings", (w) => ({ id: w.ids.bookingA })],
  ["patientA", "receipts", (w) => ({ id: w.ids.receiptA })],
  ["patientA", "refunds", (w) => ({ id: w.ids.refundA })],
  ["patientA", "record_sets", (w) => ({ id: w.ids.setA })],
  ["patientA", "record_files", (w) => ({ id: w.ids.fileA })],
  ["patientA", "record_pages", (w) => ({ id: w.ids.pageA })],
  ["patientA", "record_items", (w) => ({ id: w.ids.itemA })],
  ["patientA", "record_summaries", (w) => ({ id: w.ids.summaryA })],
  ["patientA", "consents", (w) => ({ id: w.ids.consentA })],
  ["patientA", "introduction_requests", (w) => ({ id: w.ids.requestA })],
  ["patientB", "record_shares", (w) => ({ id: w.ids.shareB })],
  ["professionalA", "profiles", (w) => ({ id: w.user("professionalA") })],
  ["professionalA", "professionals", (w) => ({ id: w.ids.professionalA })],
  ["professionalA", "professional_private", (w) => ({ professional_id: w.ids.professionalA })],
  ["professionalA", "professional_specialties", (w) => ({ professional_id: w.ids.professionalA })],
  ["professionalA", "expertise_tags", (w) => ({ id: w.ids.tagA })],
  ["professionalA", "credentials", (w) => ({ id: w.ids.credentialA })],
  ["professionalA", "availability_rules", (w) => ({ id: w.ids.ruleA })],
  ["professionalA", "availability_exceptions", (w) => ({ id: w.ids.exceptionA })],
  ["professionalA", "bookings", (w) => ({ id: w.ids.bookingA })],
  ["professionalA", "memberships", (w) => ({ id: w.ids.membershipA })],
  ["professionalA", "banners", (w) => ({ id: w.ids.bannerA })],
  ["professionalA", "introduction_requests", (w) => ({ id: w.ids.requestA })],
  ["professionalB", "record_shares", (w) => ({ id: w.ids.shareB })],
  ["professionalPending", "professionals", (w) => ({ id: w.ids.professionalPending })],
  ["professionalPending", "professional_private", (w) => ({ professional_id: w.ids.professionalPending })],
  ["professionalPending", "availability_rules", (w) => ({ id: w.ids.rulePending })],
];

describe("owners read their own rows", () => {
  for (const [persona, table, match] of OWN_ROWS) {
    it(`${persona} reads its ${table} row`, async () => {
      await expectReadAllowed(w.personas[persona].client, table, match(w), persona);
    });
  }
});

describe("public by design (not cross-tenant violations)", () => {
  const PUBLIC_ROWS: Array<[TableName, (w: World) => Match]> = [
    ["professionals", (w) => ({ id: w.ids.professionalB })],
    ["professional_specialties", (w) => ({ professional_id: w.ids.professionalB })],
    ["expertise_tags", (w) => ({ id: w.ids.tagB })],
    ["availability_rules", (w) => ({ id: w.ids.ruleB })],
    ["availability_exceptions", (w) => ({ id: w.ids.exceptionB })],
    ["specialties", (w) => ({ id: w.ids.specialtyShown })],
  ];
  for (const persona of ["anon", "patientA", "professionalA"] as const) {
    it(`${persona} reads professional B's verified listing, its links, tags and availability, and shown specialties`, async () => {
      for (const [table, match] of PUBLIC_ROWS) await expectReadAllowed(w.personas[persona].client, table, match(w), persona);
    });
  }

  // The insert can wait out the registry import's slug lock, hence the longer timeout.
  it("anon reads an unclaimed registry listing but none of its private side", async () => {
    const { id } = await w.insertListing({
      first_name: "Rls",
      last_name: `Registry${w.runId}`,
      name_en: "Dr Rls Registry",
      city_en: "Testville",
    });
    await expectReadAllowed(w.personas.anon.client, "professionals", { id }, "anon");
    await expectReadAllowed(w.personas.patientA.client, "professionals", { id }, "patientA");
    await expectReadRefused(w.personas.anon.client, "professional_private", [{ professional_id: id }], "anon");
  }, LISTING_TIMEOUT_MS);

  it("anon reads none of the pending_review listing or its children", async () => {
    const pending = w.ids.professionalPending;
    await expectReadRefused(w.personas.anon.client, "professionals", [{ id: pending }], "anon");
    for (const table of ["professional_specialties", "expertise_tags", "availability_rules", "availability_exceptions"] as const) {
      await expectReadRefused(w.personas.anon.client, table, [{ professional_id: pending }], "anon");
    }
  });

  it("no listing that is claimed, rejected, suspended or removed is public, nor are its children", async () => {
    const pending = w.ids.professionalPending;
    try {
      for (const status of ["claimed", "rejected", "suspended", "removed"] as const) {
        const moved = await w.service.from("professionals").update({ status }).eq("id", pending).select("status").single();
        expect(moved.error, moved.error?.message).toBeNull();
        for (const persona of ["anon", "patientA", "professionalA"] as const) {
          const client = w.personas[persona].client;
          await expectReadRefused(client, "professionals", [{ id: pending }], `${persona} (${status})`);
          for (const table of ["professional_specialties", "expertise_tags", "availability_rules", "availability_exceptions"] as const) {
            await expectReadRefused(client, table, [{ professional_id: pending }], `${persona} (${status})`);
          }
        }
      }
    } finally {
      await w.service.from("professionals").update({ status: "pending_review" }).eq("id", pending);
    }
    expect((await readAsService(w.service, "professionals", { id: pending }))?.status).toBe("pending_review");
  });
});

describe("the writes the policies allow", () => {
  it("professional A updates its own bio", async () => {
    const bio = `Updated bio ${w.runId}`;
    const { error, count } = await w.personas.professionalA.client
      .from("professionals")
      .update({ bio_en: bio }, { count: "exact" })
      .eq("id", w.ids.professionalA);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    expect((await readAsService(w.service, "professionals", { id: w.ids.professionalA }))?.bio_en).toBe(bio);
  });

  it("patient A updates its own profile name", async () => {
    const { error, count } = await w.personas.patientA.client
      .from("profiles")
      .update({ name_en: "Rls Patient Renamed" }, { count: "exact" })
      .eq("id", w.user("patientA"));
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    expect((await readAsService(w.service, "profiles", { id: w.user("patientA") }))?.name_en).toBe("Rls Patient Renamed");
  });

  it("patient A creates its own draft record set", async () => {
    const { data, error } = await w.personas.patientA.client
      .from("record_sets")
      .insert({ patient_id: w.user("patientA") })
      .select("id, status, patient_id")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data).toMatchObject({ status: "draft", patient_id: w.user("patientA") });
  });

  it("patient A cannot create a set that is not a draft", async () => {
    await expectInsertRefused(w.personas.patientA.client, "record_sets", { patient_id: w.user("patientA"), status: "done" }, "patientA");
  });

  it("patient A adds a file row to its own draft set, but not to a set that is done", async () => {
    const client = w.personas.patientA.client;
    const patientA = w.user("patientA");
    const file = (set: string, name: string) => ({
      set_id: set,
      patient_id: patientA,
      position: 3,
      name,
      kind: "pdf",
      mime_type: PDF,
      size_bytes: SYNTHETIC_PDF.byteLength,
      storage_path: `${patientA}/${set}/${name}`,
    });
    const { data, error } = await client.from("record_files").insert(file(w.ids.setADraft, "added.pdf")).select("id, status").single();
    expect(error, error?.message).toBeNull();
    expect(data?.status).toBe("checking");
    await expectInsertRefused(client, "record_files", file(w.ids.setA, "late.pdf"), "patientA");
  });

  it("professional A manages its own availability and expertise tags", async () => {
    const client = w.personas.professionalA.client;
    const professional = w.ids.professionalA;
    const rule = await client
      .from("availability_rules")
      .insert({ professional_id: professional, time_zone: "America/New_York", starts_at: isoIn(50 * DAY), ends_at: isoIn(50 * DAY + 2 * 3_600_000) })
      .select("id")
      .single();
    expect(rule.error, rule.error?.message).toBeNull();
    const ruleId = (rule.data as { id: string }).id;
    const moved = await client.from("availability_rules").update({ time_zone: "UTC" }, { count: "exact" }).eq("id", ruleId);
    expect(moved.error, moved.error?.message).toBeNull();
    expect(moved.count).toBe(1);
    const exception = await client
      .from("availability_exceptions")
      .insert({ professional_id: professional, kind: "extra", starts_at: isoIn(51 * DAY), ends_at: isoIn(51 * DAY + 3_600_000) })
      .select("id")
      .single();
    expect(exception.error, exception.error?.message).toBeNull();
    const tag = await client
      .from("expertise_tags")
      .insert({ professional_id: professional, locale: "ar", title: "Synthetic tag", position: 1 })
      .select("id")
      .single();
    expect(tag.error, tag.error?.message).toBeNull();
    for (const [table, id] of [
      ["availability_rules", ruleId],
      ["availability_exceptions", (exception.data as { id: string }).id],
      ["expertise_tags", (tag.data as { id: string }).id],
    ] as const) {
      const removed = await client.from(table).delete({ count: "exact" }).eq("id", id);
      expect(removed.error, removed.error?.message).toBeNull();
      expect(removed.count, `${table} row deleted`).toBe(1);
    }
  });

  it("patient A records a consent for its own set", async () => {
    const { data, error } = await w.personas.patientA.client
      .from("consents")
      .insert({ user_id: w.user("patientA"), kind: "recordsShare", copy_version: "rlsTest.v1", locale: "ar", record_set_id: w.ids.setA })
      .select("id, user_id")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data?.user_id).toBe(w.user("patientA"));
  });

  it("patient A shares its own summary with a verified professional, who then reads it", async () => {
    const { data, error } = await w.personas.patientA.client
      .from("record_shares")
      .insert({
        summary_id: w.ids.summaryA,
        patient_id: w.user("patientA"),
        professional_id: w.ids.professionalA,
        expires_at: isoIn(business.shareDefaultDays * DAY),
      })
      .select("id")
      .single();
    expect(error, error?.message).toBeNull();
    const shareId = (data as { id: string }).id;
    await expectReadAllowed(w.personas.professionalA.client, "record_shares", { id: shareId }, "professionalA");
    await expectReadAllowed(w.personas.professionalA.client, "record_summaries", { id: w.ids.summaryA }, "professionalA");
  });

  it("patient A cannot share with a listing that is not verified", async () => {
    await expectInsertRefused(
      w.personas.patientA.client,
      "record_shares",
      {
        summary_id: w.ids.summaryA,
        patient_id: w.user("patientA"),
        professional_id: w.ids.professionalPending,
        expires_at: isoIn(business.shareDefaultDays * DAY),
      },
      "patientA",
    );
  });

  it("a listing moved to claimed by the service client is submitted for review by its own professional", async () => {
    const pending = w.ids.professionalPending;
    const moved = await w.service.from("professionals").update({ status: "claimed" }).eq("id", pending).select("status").single();
    expect(moved.error, moved.error?.message).toBeNull();
    const { error, count } = await w.personas.professionalPending.client
      .from("professionals")
      .update({ status: "pending_review" }, { count: "exact" })
      .eq("id", pending);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    const row = await readAsService(w.service, "professionals", { id: pending });
    expect(row?.status).toBe("pending_review");
    expect(row?.review_submitted_at, "the guard stamps review_submitted_at").not.toBeNull();
  });
});

describe("admin with TOTP (aal2)", () => {
  it("holds an aal2 session", async () => {
    expect((await sessionClaims(w.personas.admin.client)).aal).toBe("aal2");
  });

  for (const c of TABLE_CASES) {
    it(`reads ${c.table}`, async () => {
      for (const target of [c.read(w), c.update(w, "admin"), c.remove(w)]) {
        await expectReadAllowed(w.personas.admin.client, c.table, target.match, "admin");
      }
    });
  }
});

describe("admin without TOTP (aal1)", () => {
  it("holds an aal1 session on an admin account, and reads its own profile", async () => {
    expect((await sessionClaims(w.personas.adminNoTotp.client)).aal).toBe("aal1");
    const own = await expectReadAllowed(w.personas.adminNoTotp.client, "profiles", { id: w.user("adminNoTotp") }, "adminNoTotp");
    expect(own.role).toBe("admin");
  });

  for (const c of TABLE_CASES) {
    it(`reads none of the admin-only ${c.table} rows`, async () => {
      const target = c.read(w);
      await expectReadRefused(w.personas.adminNoTotp.client, c.table, [target.match, ...target.tenantFilters], "adminNoTotp");
    });
  }
});

describe("admin with TOTP writes nothing through the API (server code only)", () => {
  for (const c of TABLE_CASES) {
    it(`INSERT, UPDATE and DELETE on ${c.table} are refused`, async () => {
      const admin = w.personas.admin.client;
      await expectInsertRefused(admin, c.table, c.insert(w, "admin"), "admin");
      const target = c.update(w, "admin");
      await expectUpdateRefused(admin, w.service, c.table, target.match, target.values, "admin");
      await expectDeleteRefused(admin, w.service, c.table, c.remove(w).match, "admin");
    });
  }
});

// Last: these do the allowed thing on purpose (patient B renames itself, deletes its hold, uploads a file). Each check
// must fail with its own "it was allowed" message: a bare toThrow() would also pass on an unrelated failure (a missing
// fixture, a 500, a check violation), which proves nothing about the check (review L1Q-9).
describe("the refusal checks are not vacuous", () => {
  it("each check fails, saying the operation was allowed, when the owner does the same thing", async () => {
    const owner = w.personas.patientB.client;
    const patientB = w.user("patientB");
    await expect(expectReadRefused(owner, "bookings", [{ id: w.ids.bookingB }], "self-test")).rejects.toThrow(
      /^self-test: bookings rows visible for /,
    );
    await expect(expectInsertRefused(owner, "record_sets", { patient_id: patientB }, "self-test")).rejects.toThrow(
      /^self-test: insert into record_sets was accepted/,
    );
    await expect(
      expectUpdateRefused(owner, w.service, "profiles", { id: patientB }, { name_en: "Self-test" }, "self-test"),
    ).rejects.toThrow(/^self-test: update of profiles \{.*\} affected rows/);
    await expect(expectDeleteRefused(owner, w.service, "slot_holds", { id: w.ids.holdB }, "self-test")).rejects.toThrow(
      /^self-test: delete from slot_holds \{.*\} affected rows/,
    );
    await expect(expectDownloadRefused(owner, w.service, "records", w.paths.recordsB, "self-test")).rejects.toThrow(
      /^self-test: records\/.+ was downloaded/,
    );
    await expect(
      expectUploadRefused(owner, w.service, "records", `${patientB}/${w.ids.setBDraft}/self-test.pdf`, SYNTHETIC_PDF, PDF, "self-test"),
    ).rejects.toThrow(/^self-test: upload to records\/.+ was accepted/);
  });
});
