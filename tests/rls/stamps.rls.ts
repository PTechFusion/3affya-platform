// The database, not the caller, stamps the time of each one-way write the API allows (the guard triggers, round 2 of the
// L1 schema): a share's viewed_at (its professional) and revoked_at (its patient), a summary's reviewed_at, a booking's
// done_at, a consent's withdrawn_at and a profile's deletion_requested_at. Each is sent here with a far-past value; the
// stored value must be the database's now(), checked as within a minute of this machine's clock. A withdrawn consent
// stays withdrawn at its first time; done_at (marked by mistake) and deletion_requested_at ("keep my account") can be
// cleared by their owner. Server code (the service role) is not stamped: a backfill keeps the value it sends.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "./support/clients";
import { buildWorld, MINUTE, type World } from "./support/fixtures";
import { PERMISSION_DENIED, readAsService, type Match, type Row } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("stamps");
});

afterAll(async () => {
  await w?.cleanup();
});

const FAR_PAST = "2001-02-03T04:05:06.000Z";
const FAR_FUTURE = "2099-02-03T04:05:06.000Z";

async function expectUpdated(client: Client, table: string, match: Match, values: Row, label: string): Promise<Row> {
  const { error, count } = await client.from(table).update(values, { count: "exact" }).match(match);
  expect(error, `${label}: ${error?.message}`).toBeNull();
  expect(count, `${label}: rows updated`).toBe(1);
  const row = await readAsService(w.service, table, match);
  expect(row, `${label}: ${table} ${JSON.stringify(match)} is gone`).not.toBeNull();
  return row as Row;
}

async function expectGuardRefuses(client: Client, table: string, match: Match, values: Row, label: string): Promise<void> {
  const before = await readAsService(w.service, table, match);
  expect(before, `fixture ${table} ${JSON.stringify(match)}`).not.toBeNull();
  const { error, count } = await client.from(table).update(values, { count: "exact" }).match(match);
  expect(error, `${label}: ${table} update ${JSON.stringify(values)} went through (count ${count})`).not.toBeNull();
  expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
  expect(await readAsService(w.service, table, match), `${label}: ${table} changed`).toEqual(before);
}

function expectStampedNow(value: unknown, label: string): void {
  expect(value, `${label} was not stored`).not.toBeNull();
  const at = Date.parse(String(value));
  expect(Number.isNaN(at), `${label} stored ${String(value)}`).toBe(false);
  expect(Math.abs(at - Date.now()), `${label} stored ${String(value)}, not the database's now()`).toBeLessThan(MINUTE);
}

describe("a share and its summary", () => {
  it("professional B records the first view with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.professionalB.client, "record_shares", { id: w.ids.shareB }, { viewed_at: FAR_PAST }, "professionalB");
    expectStampedNow(row.viewed_at, "record_shares.viewed_at");
  });

  it("professional B marks the summary reviewed with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(
      w.personas.professionalB.client,
      "record_summaries",
      { id: w.ids.summaryB },
      { reviewed_by_professional_id: w.ids.professionalB, reviewed_at: FAR_PAST },
      "professionalB",
    );
    expect(row.reviewed_by_professional_id).toBe(w.ids.professionalB);
    expectStampedNow(row.reviewed_at, "record_summaries.reviewed_at");
  });

  it("patient B ends the share with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.patientB.client, "record_shares", { id: w.ids.shareB }, { revoked_at: FAR_PAST }, "patientB");
    expectStampedNow(row.revoked_at, "record_shares.revoked_at");
  });
});

// On the fixture visit that has started: a visit still ahead cannot be marked done (bookings.rls.ts).
describe("a booking's done_at", () => {
  const booking = () => ({ id: w.ids.bookingAStarted });

  it("professional A marks the visit done with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.professionalA.client, "bookings", booking(), { done_at: FAR_PAST }, "professionalA");
    expectStampedNow(row.done_at, "bookings.done_at");
  });

  it("control: professional A clears done_at (marked by mistake)", async () => {
    const row = await expectUpdated(w.personas.professionalA.client, "bookings", booking(), { done_at: null }, "professionalA");
    expect(row.done_at).toBeNull();
  });

  it("professional A marks it done again with a far-future time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.professionalA.client, "bookings", booking(), { done_at: FAR_FUTURE }, "professionalA");
    expectStampedNow(row.done_at, "bookings.done_at");
  });

  it("control: server code is not stamped (a service-role backfill keeps the time it sends)", async () => {
    const { error } = await w.service.from("bookings").update({ done_at: FAR_PAST }).eq("id", w.ids.bookingB);
    expect(error, error?.message).toBeNull();
    const row = await readAsService(w.service, "bookings", { id: w.ids.bookingB });
    expect(Date.parse(String(row?.done_at))).toBe(Date.parse(FAR_PAST));
  });
});

describe("a consent's withdrawn_at", () => {
  const consent = () => ({ id: w.ids.consentA });
  let withdrawnAt: unknown;

  it("patient A withdraws with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.patientA.client, "consents", consent(), { withdrawn_at: FAR_PAST }, "patientA");
    expectStampedNow(row.withdrawn_at, "consents.withdrawn_at");
    withdrawnAt = row.withdrawn_at;
  });

  it("patient A cannot take the withdrawal back", async () => {
    await expectGuardRefuses(w.personas.patientA.client, "consents", consent(), { withdrawn_at: null }, "patientA");
  });

  it("patient A cannot re-date the withdrawal, earlier or later", async () => {
    for (const value of [FAR_PAST, FAR_FUTURE]) {
      await expectGuardRefuses(w.personas.patientA.client, "consents", consent(), { withdrawn_at: value }, "patientA");
    }
    expect((await readAsService(w.service, "consents", consent()))?.withdrawn_at).toBe(withdrawnAt);
  });
});

describe("a profile's deletion request", () => {
  const profile = () => ({ id: w.user("patientA") });

  it("patient A requests deletion with a far-past time; the database stores now()", async () => {
    const row = await expectUpdated(w.personas.patientA.client, "profiles", profile(), { deletion_requested_at: FAR_PAST }, "patientA");
    expectStampedNow(row.deletion_requested_at, "profiles.deletion_requested_at");
  });

  it("control: patient A clears the request (keep my account)", async () => {
    const row = await expectUpdated(w.personas.patientA.client, "profiles", profile(), { deletion_requested_at: null }, "patientA");
    expect(row.deletion_requested_at).toBeNull();
  });
});
