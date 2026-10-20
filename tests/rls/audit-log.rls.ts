// Task 1.4: "audit_log update attempt fails in the test". audit_log is append-only (ADR-2): no UPDATE or DELETE privilege
// for any API role, the service role included, and triggers that refuse both even for the table owner, which
// public.schema_security_report() probes inside rolled-back subtransactions. A signed-in user appends rows that name
// itself, as its own role; an admin row needs the TOTP session. actor_system (which system wrote a system entry) is
// server code's alone: not granted to signed-in users, and only on a row whose actor kind is 'system'. Round 3: a patient
// or a professional appends only the events of its own vocabulary (lib/audit.ts) and names only a listing it is part of,
// and every entry is size-capped, for server code too (a row can never be removed). Rows this file appends stay, marked
// rls-test-.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import type { Client } from "./support/clients";
import { buildWorld, DAY, isoIn, type World } from "./support/fixtures";
import { expectInsertRefused, expectRowExists, PERMISSION_DENIED, readAsService } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("audit");
});

afterAll(async () => {
  await w?.cleanup();
});

const MUTATORS = ["patientA", "professionalA", "admin", "adminNoTotp", "anon", "service"] as const;
type Mutator = (typeof MUTATORS)[number];

function clientOf(who: Mutator): Client {
  return who === "service" ? w.service : w.personas[who].client;
}

describe("audit_log rows cannot be changed or removed", () => {
  for (const who of MUTATORS) {
    it(`UPDATE as ${who} fails and the row is unchanged`, async () => {
      const match = { id: w.ids.auditRow };
      const before = await expectRowExists(w.service, "audit_log", match);
      const { error, count } = await clientOf(who)
        .from("audit_log")
        .update({ action: "rlsTest.tampered", target_id: "rls-test-tampered" }, { count: "exact" })
        .match(match);
      expect(error, `${who} updated an audit_log row (count ${count})`).not.toBeNull();
      expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
      expect(await readAsService(w.service, "audit_log", match)).toEqual(before);
    });

    it(`DELETE as ${who} fails and the row is still there`, async () => {
      const match = { id: w.ids.auditRow };
      const before = await expectRowExists(w.service, "audit_log", match);
      const { error, count } = await clientOf(who).from("audit_log").delete({ count: "exact" }).match(match);
      expect(error, `${who} deleted an audit_log row (count ${count})`).not.toBeNull();
      expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
      expect(await readAsService(w.service, "audit_log", match)).toEqual(before);
    });
  }
});

describe("public.schema_security_report()", () => {
  it("reports RLS and policies on every public table, no anon writes, no audit_log mutation, and refuses the owner", async () => {
    await expectRowExists(w.service, "audit_log", { id: w.ids.auditRow });
    const { data, error } = await w.service.rpc("schema_security_report");
    expect(error, error?.message).toBeNull();
    const report = data as Record<string, unknown>;
    expect(report.tablesWithoutRls, "tables without RLS").toEqual([]);
    expect(report.tablesWithoutPolicies, "tables without a policy").toEqual([]);
    expect(report.anonWritePrivileges, "anon write privileges").toEqual([]);
    expect(report.auditLogMutationPrivileges, "UPDATE/DELETE/TRUNCATE on audit_log").toEqual([]);
    expect(report.auditLogOwnerUpdate, "owner UPDATE probe").toBe("refused");
    expect(report.auditLogOwnerDelete, "owner DELETE probe").toBe("refused");
    expect(report.auditLogOwnerTruncate, "owner TRUNCATE probe").toBe("refused");
  });

  for (const who of ["anon", "patientA", "admin"] as const) {
    it(`is not callable as ${who}`, async () => {
      const { data, error } = await w.personas[who].client.rpc("schema_security_report");
      expect(data).toBeNull();
      expect(error, `${who} ran the security report`).not.toBeNull();
      expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
    });
  }
});

// An event of each kind's own vocabulary, so a refusal below is about the actor, not the event (admins take any event).
const OWN_EVENT: Record<string, string> = {
  patient: "booking.cancelled",
  professional: "listing.edited",
  admin: "rlsTest.selfInsert",
  system: "rlsTest.selfInsert",
};

const row = (actor: string | null, kind: string, label: string, action = OWN_EVENT[kind] ?? "rlsTest.selfInsert") => ({
  actor_id: actor,
  actor_kind: kind,
  action,
  target_type: "rlsTest",
  target_id: `rls-test-${w.runId}-${label}`,
});

async function appended(label: string, columns = "actor_id, actor_kind") {
  const { data, error } = await w.service
    .from("audit_log")
    .select(columns)
    .eq("target_id", `rls-test-${w.runId}-${label}`);
  expect(error, error?.message).toBeNull();
  return data ?? [];
}

describe("a signed-in user appends rows naming itself only", () => {
  for (const [persona, kind] of [
    ["patientA", "patient"],
    ["professionalA", "professional"],
    ["admin", "admin"],
  ] as const) {
    it(`${persona} appends a row naming itself as ${kind}`, async () => {
      const label = `self-${persona.toLowerCase()}`;
      const { error } = await w.personas[persona].client.from("audit_log").insert(row(w.user(persona), kind, label));
      expect(error, error?.message).toBeNull();
      expect(await appended(label)).toEqual([{ actor_id: w.user(persona), actor_kind: kind }]);
    });
  }

  it("patient A cannot name patient B as the actor", async () => {
    await expectInsertRefused(w.personas.patientA.client, "audit_log", row(w.user("patientB"), "patient", "forged-actor"), "patientA");
    expect(await appended("forged-actor")).toEqual([]);
  });

  it("professional A cannot name professional B as the actor", async () => {
    await expectInsertRefused(
      w.personas.professionalA.client,
      "audit_log",
      row(w.user("professionalB"), "professional", "forged-professional"),
      "professionalA",
    );
    expect(await appended("forged-professional")).toEqual([]);
  });

  for (const kind of ["professional", "admin", "system"] as const) {
    it(`patient A cannot append a row as ${kind}`, async () => {
      const label = `forged-kind-${kind}`;
      await expectInsertRefused(w.personas.patientA.client, "audit_log", row(w.user("patientA"), kind, label), "patientA");
      expect(await appended(label)).toEqual([]);
    });
  }

  it("an admin without TOTP cannot append an admin row", async () => {
    await expectInsertRefused(w.personas.adminNoTotp.client, "audit_log", row(w.user("adminNoTotp"), "admin", "admin-aal1"), "adminNoTotp");
    expect(await appended("admin-aal1")).toEqual([]);
  });

  it("nobody back-dates a row: created_at is not writable through the API", async () => {
    await expectInsertRefused(
      w.personas.patientA.client,
      "audit_log",
      { ...row(w.user("patientA"), "patient", "backdated"), created_at: "2020-01-01T00:00:00Z" },
      "patientA",
    );
    expect(await appended("backdated")).toEqual([]);
  });

  it("anonymous cannot append at all", async () => {
    await expectInsertRefused(w.personas.anon.client, "audit_log", row(null, "system", "anon"), "anon");
    expect(await appended("anon")).toEqual([]);
  });
});

// The same self-naming rows without actor_system are accepted above, so each refusal here is the column grant's.
describe("actor_system is written by server code only, on system entries", () => {
  for (const [persona, kind] of [
    ["patientA", "patient"],
    ["professionalA", "professional"],
    ["admin", "admin"],
  ] as const) {
    it(`${persona} cannot write actor_system, even on a row naming itself (the column is not granted)`, async () => {
      const label = `actor-system-${persona.toLowerCase()}`;
      await expectInsertRefused(
        w.personas[persona].client,
        "audit_log",
        { ...row(w.user(persona), kind, label), actor_system: "stripe" },
        persona,
      );
      expect(await appended(label)).toEqual([]);
    });
  }

  it("the service client cannot put actor_system on a row whose actor is not the system", async () => {
    const { error } = await w.service
      .from("audit_log")
      .insert({ ...row(w.user("patientA"), "patient", "actor-system-on-patient"), actor_system: "stripe" });
    expect(error, "actor_system was stored on a patient's entry").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("audit_log_actor_system");
    expect(await appended("actor-system-on-patient")).toEqual([]);
  });

  it("the service client cannot store an actor_system that is not lower snake case", async () => {
    const { error } = await w.service.from("audit_log").insert({ ...row(null, "system", "actor-system-format"), actor_system: "Stripe Webhook" });
    expect(error, "a malformed actor_system was stored").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(await appended("actor-system-format")).toEqual([]);
  });

  it("the service client cannot append a system entry that does not name its system", async () => {
    const { error } = await w.service.from("audit_log").insert(row(null, "system", "actor-system-missing"));
    expect(error, "a system entry without actor_system was stored").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("audit_log_system_named");
    expect(await appended("actor-system-missing")).toEqual([]);
  });

  it("control: the service client appends a system entry naming its system", async () => {
    const { error } = await w.service.from("audit_log").insert({ ...row(null, "system", "actor-system-ok"), actor_system: "rls_test" });
    expect(error, error?.message).toBeNull();
    expect(await appended("actor-system-ok", "actor_id, actor_kind, actor_system")).toEqual([
      { actor_id: null, actor_kind: "system", actor_system: "rls_test" },
    ]);
  });
});

describe("each role appends only its own events, naming only a listing it is part of", () => {
  // Patient A has bookings with professional A only, and no share until the test below makes one with professional B.
  it("patient A cannot append an admin's or a professional's event", async () => {
    for (const action of ["verification.approved", "listing.edited"]) {
      const label = `patient-event-${action.replace(/[^a-z]/gi, "")}`;
      await expectInsertRefused(w.personas.patientA.client, "audit_log", row(w.user("patientA"), "patient", label, action), "patientA");
      expect(await appended(label)).toEqual([]);
    }
  });

  it("patient A cannot append share.created naming a listing it has no booking or share with", async () => {
    for (const [listing, name] of [
      [w.ids.professionalB, "b"],
      [w.ids.professionalPending, "pending"],
    ] as const) {
      const label = `patient-share-unrelated-${name}`;
      await expectInsertRefused(
        w.personas.patientA.client,
        "audit_log",
        { ...row(w.user("patientA"), "patient", label, "share.created"), target_professional_id: listing },
        "patientA",
      );
      expect(await appended(label)).toEqual([]);
    }
  });

  it("patient A appends share.created naming the professional it has just shared with", async () => {
    const client = w.personas.patientA.client;
    const share = await client.from("record_shares").insert({
      summary_id: w.ids.summaryA,
      patient_id: w.user("patientA"),
      professional_id: w.ids.professionalB,
      expires_at: isoIn(business.shareDefaultDays * DAY),
    });
    expect(share.error, share.error?.message).toBeNull();
    const label = "patient-share-created";
    const { error } = await client
      .from("audit_log")
      .insert({ ...row(w.user("patientA"), "patient", label, "share.created"), target_professional_id: w.ids.professionalB });
    expect(error, error?.message).toBeNull();
    expect(await appended(label, "actor_id, action, target_professional_id")).toEqual([
      { actor_id: w.user("patientA"), action: "share.created", target_professional_id: w.ids.professionalB },
    ]);
  });

  it("patient A appends booking.cancelled naming the professional of its booking", async () => {
    const label = "patient-booking-cancelled";
    const { error } = await w.personas.patientA.client
      .from("audit_log")
      .insert({ ...row(w.user("patientA"), "patient", label), target_professional_id: w.ids.professionalA });
    expect(error, error?.message).toBeNull();
    expect(await appended(label)).toHaveLength(1);
  });

  it("professional A cannot append share.created, a patient's or an admin's event", async () => {
    for (const action of ["share.created", "booking.cancelled", "verification.approved"]) {
      const label = `professional-event-${action.replace(/[^a-z]/gi, "")}`;
      await expectInsertRefused(
        w.personas.professionalA.client,
        "audit_log",
        row(w.user("professionalA"), "professional", label, action),
        "professionalA",
      );
      expect(await appended(label)).toEqual([]);
    }
  });

  it("professional A cannot name another listing", async () => {
    const label = "professional-other-listing";
    await expectInsertRefused(
      w.personas.professionalA.client,
      "audit_log",
      { ...row(w.user("professionalA"), "professional", label), target_professional_id: w.ids.professionalB },
      "professionalA",
    );
    expect(await appended(label)).toEqual([]);
  });

  it("professional A appends listing.edited on its own listing", async () => {
    const label = "professional-own-listing";
    const { error } = await w.personas.professionalA.client
      .from("audit_log")
      .insert({ ...row(w.user("professionalA"), "professional", label), target_professional_id: w.ids.professionalA });
    expect(error, error?.message).toBeNull();
    expect(await appended(label, "actor_id, action, target_professional_id")).toEqual([
      { actor_id: w.user("professionalA"), action: "listing.edited", target_professional_id: w.ids.professionalA },
    ]);
  });
});

// The caps count the jsonb's text form in bytes: changes and details 32768, verification 16384, note 8192.
describe("entries are size-capped, for server code too", () => {
  const systemRow = (label: string) => ({ ...row(null, "system", label), actor_system: "rls_test" });
  const oversized: Array<[string, unknown]> = [
    ["changes", [{ field: "bio_en", kind: "text", old: "x".repeat(33_000), new: "y" }]],
    ["details", [{ kind: "note", value: "x".repeat(33_000) }]],
    ["verification", { reviewer: "rls_test", checks: [{ kind: "licence", source: "x".repeat(17_000) }] }],
    ["note", { en: "x".repeat(9_000), ar: "x" }],
  ];
  for (const [column, value] of oversized) {
    it(`the service client cannot store ${column} over its cap (23514)`, async () => {
      const label = `cap-${column}`;
      const { error } = await w.service.from("audit_log").insert({ ...systemRow(label), [column]: value });
      expect(error, `an oversized ${column} was stored`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain(`audit_log_${column}_check`);
      expect(await appended(label)).toEqual([]);
    });
  }

  it("control: the service client stores an entry of the same shape well under the cap", async () => {
    const label = "cap-control";
    const { error } = await w.service
      .from("audit_log")
      .insert({ ...systemRow(label), changes: [{ field: "bio_en", kind: "text", old: "x".repeat(4_000), new: "y" }] });
    expect(error, error?.message).toBeNull();
    expect(await appended(label)).toHaveLength(1);
  });
});
