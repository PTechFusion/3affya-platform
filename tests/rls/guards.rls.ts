// The guard triggers (private.*_guard_*) refuse value changes that column grants cannot express. A professional cannot
// verify its own listing or move it to any status but pending_review, nor change board or licence details once verified;
// on a booking the patient alone ticks prepared and the professional alone sets done_at (on a visit that has started:
// bookings.rls.ts has the rest of the done rules). Each refusal is a 42501 from the guard (not a check violation further
// on), with a control showing the same account can make the allowed change.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "./support/clients";
import { buildWorld, type World } from "./support/fixtures";
import { PERMISSION_DENIED, readAsService, type Match, type Row } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("guards");
});

afterAll(async () => {
  await w?.cleanup();
});

async function expectGuardRefuses(client: Client, table: string, match: Match, values: Row, label: string): Promise<void> {
  const before = await readAsService(w.service, table, match);
  expect(before, `fixture ${table} ${JSON.stringify(match)}`).not.toBeNull();
  const { error, count } = await client.from(table).update(values, { count: "exact" }).match(match);
  expect(error, `${label}: ${table} update ${JSON.stringify(values)} went through (count ${count})`).not.toBeNull();
  expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
  expect(await readAsService(w.service, table, match), `${label}: ${table} changed`).toEqual(before);
}

async function expectUpdated(client: Client, table: string, match: Match, values: Row, label: string): Promise<Row> {
  const { error, count } = await client.from(table).update(values, { count: "exact" }).match(match);
  expect(error, `${label}: ${error?.message}`).toBeNull();
  expect(count, `${label}: rows updated`).toBe(1);
  const row = await readAsService(w.service, table, match);
  expect(row).toMatchObject(values);
  return row as Row;
}

describe("listing status", () => {
  it("the pending professional cannot verify its own listing", async () => {
    await expectGuardRefuses(
      w.personas.professionalPending.client,
      "professionals",
      { id: w.ids.professionalPending },
      { status: "verified" },
      "professionalPending",
    );
  });

  for (const status of ["pending_review", "suspended", "unclaimed", "removed"] as const) {
    it(`a verified professional cannot move its listing to ${status}`, async () => {
      await expectGuardRefuses(w.personas.professionalA.client, "professionals", { id: w.ids.professionalA }, { status }, "professionalA");
    });
  }
});

describe("verified details change through a new review", () => {
  it("a verified professional cannot change board_name", async () => {
    await expectGuardRefuses(
      w.personas.professionalA.client,
      "professionals",
      { id: w.ids.professionalA },
      { board_name: "Self-awarded Board" },
      "professionalA",
    );
  });

  it("a verified professional cannot change board_status or licence_state", async () => {
    const client = w.personas.professionalA.client;
    await expectGuardRefuses(client, "professionals", { id: w.ids.professionalA }, { board_status: "eligible" }, "professionalA");
    await expectGuardRefuses(client, "professionals", { id: w.ids.professionalA }, { licence_state: "CA" }, "professionalA");
  });

  it("a verified professional cannot change its licence number", async () => {
    await expectGuardRefuses(
      w.personas.professionalA.client,
      "professional_private",
      { professional_id: w.ids.professionalA },
      { licence_number: "LIC-SELF-SET" },
      "professionalA",
    );
  });

  it("control: the same professional still changes its video link and bio", async () => {
    const client = w.personas.professionalA.client;
    await expectUpdated(client, "professional_private", { professional_id: w.ids.professionalA }, { video_link: `https://video.example.com/rls-new-${w.runId}` }, "professionalA");
    await expectUpdated(client, "professionals", { id: w.ids.professionalA }, { bio_en: "Guard control bio" }, "professionalA");
  });

  it("control: a listing that is not verified yet changes its board name and licence number", async () => {
    const client = w.personas.professionalPending.client;
    await expectUpdated(client, "professionals", { id: w.ids.professionalPending }, { board_name: "Synthetic Board, corrected" }, "professionalPending");
    await expectUpdated(client, "professional_private", { professional_id: w.ids.professionalPending }, { licence_number: "LIC-P-CORRECTED" }, "professionalPending");
  });
});

describe("booking writes", () => {
  const booking = () => ({ id: w.ids.bookingA });
  const started = () => ({ id: w.ids.bookingAStarted });

  it("control: patient A ticks its checklist", async () => {
    await expectUpdated(w.personas.patientA.client, "bookings", booking(), { prepared: ["records", "questions"] }, "patientA");
  });

  it("patient A cannot set done_at", async () => {
    await expectGuardRefuses(w.personas.patientA.client, "bookings", booking(), { done_at: new Date().toISOString() }, "patientA");
  });

  it("professional A cannot set prepared", async () => {
    await expectGuardRefuses(w.personas.professionalA.client, "bookings", booking(), { prepared: ["records", "medicines"] }, "professionalA");
  });

  it("control: professional A marks the visit that has started done", async () => {
    const row = await w.personas.professionalA.client
      .from("bookings")
      .update({ done_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", w.ids.bookingAStarted);
    expect(row.error, row.error?.message).toBeNull();
    expect(row.count).toBe(1);
    expect((await readAsService(w.service, "bookings", started()))?.done_at).not.toBeNull();
  });

  it("patient A cannot clear done_at afterwards", async () => {
    await expectGuardRefuses(w.personas.patientA.client, "bookings", started(), { done_at: null }, "patientA");
  });

  it("neither side writes any other booking column", async () => {
    for (const [persona, values] of [
      ["patientA", { status: "cancelled" }],
      ["patientA", { join_url: "https://attacker.example.com/room" }],
      ["professionalA", { doctor_fee_cents: 1 }],
      ["professionalA", { patient_id: w.user("patientB") }],
    ] as const) {
      await expectGuardRefuses(w.personas[persona].client, "bookings", booking(), values, persona);
    }
  });
});
