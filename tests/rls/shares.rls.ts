// Critical flow 2, sharing (screen 27, task 3.10): a professional reads a patient's set only through a live share
// addressed to them. Professional B holds a live share of patient B's set B and an already expired one of set B2 (made
// by the service client with shared_at and expires_at in the past). B reads set B's summary, items, pages and files, sets
// viewed_at once and marks the summary reviewed once; professional A reads nothing; once patient B ends the share, or
// for the expired one, professional B is refused too. Round 3, making a share: the patient's first names and gender on
// it come from the profile (trigger record_shares_copy_patient), never from the caller, and a booking it names must be
// the patient's own booking with that same professional.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import { buildWorld, DAY, isoIn, type World } from "./support/fixtures";
import {
  expectInsertRefused,
  expectReadAllowed,
  expectReadRefused,
  expectUpdateRefused,
  must,
  PERMISSION_DENIED,
  readAsService,
  type Match,
  type Row,
} from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("shares");
});

afterAll(async () => {
  await w?.cleanup();
});

type SharedTable = "record_sets" | "record_summaries" | "record_items" | "record_pages" | "record_files" | "record_shares";

function liveRows(w: World): Array<[SharedTable, Match]> {
  return [
    ["record_sets", { id: w.ids.setB }],
    ["record_summaries", { id: w.ids.summaryB }],
    ["record_items", { id: w.ids.itemB }],
    ["record_pages", { id: w.ids.pageB }],
    ["record_files", { id: w.ids.fileB }],
    ["record_shares", { id: w.ids.shareB }],
  ];
}

function expiredRows(w: World): Array<[SharedTable, Match]> {
  return [
    ["record_sets", { id: w.ids.setB2 }],
    ["record_summaries", { id: w.ids.summaryB2 }],
    ["record_items", { id: w.ids.itemB2 }],
    ["record_pages", { id: w.ids.pageB2 }],
    ["record_files", { id: w.ids.fileB2 }],
    ["record_shares", { id: w.ids.shareB2Expired }],
  ];
}

describe("while the share is live", () => {
  it("professional B reads patient B's shared set, summary, items, pages, files and the share", async () => {
    for (const [table, match] of liveRows(w)) await expectReadAllowed(w.personas.professionalB.client, table, match, "professionalB");
  });

  it("professional B reads nothing of set B2, whose only share has expired", async () => {
    const expired = await readAsService(w.service, "record_shares", { id: w.ids.shareB2Expired });
    expect(Date.parse(String(expired?.expires_at))).toBeLessThan(Date.now());
    for (const [table, match] of expiredRows(w)) await expectReadRefused(w.personas.professionalB.client, table, [match], "professionalB");
  });

  it("professional A reads none of the shared rows", async () => {
    for (const [table, match] of liveRows(w)) await expectReadRefused(w.personas.professionalA.client, table, [match], "professionalA");
  });

  it("professional A can neither record a view nor mark the summary reviewed", async () => {
    const client = w.personas.professionalA.client;
    await expectUpdateRefused(client, w.service, "record_shares", { id: w.ids.shareB }, { viewed_at: new Date().toISOString() }, "professionalA");
    await expectUpdateRefused(
      client,
      w.service,
      "record_summaries",
      { id: w.ids.summaryB },
      { reviewed_by_professional_id: w.ids.professionalA, reviewed_at: new Date().toISOString() },
      "professionalA",
    );
  });

  it("professional B cannot record a view on the expired share", async () => {
    await expectUpdateRefused(
      w.personas.professionalB.client,
      w.service,
      "record_shares",
      { id: w.ids.shareB2Expired },
      { viewed_at: new Date().toISOString() },
      "professionalB",
    );
  });

  it("professional B records the first view, once", async () => {
    const client = w.personas.professionalB.client;
    const first = await client.from("record_shares").update({ viewed_at: new Date().toISOString() }, { count: "exact" }).eq("id", w.ids.shareB);
    expect(first.error, first.error?.message).toBeNull();
    expect(first.count).toBe(1);
    const viewed = (await readAsService(w.service, "record_shares", { id: w.ids.shareB }))?.viewed_at;
    expect(viewed).not.toBeNull();
    const again = await client.from("record_shares").update({ viewed_at: new Date().toISOString() }, { count: "exact" }).eq("id", w.ids.shareB);
    expect(again.error, "viewed_at was set a second time").not.toBeNull();
    expect(again.error?.code).toBe(PERMISSION_DENIED);
    expect((await readAsService(w.service, "record_shares", { id: w.ids.shareB }))?.viewed_at).toBe(viewed);
  });

  it("professional B cannot mark the summary reviewed in professional A's name", async () => {
    const before = await readAsService(w.service, "record_summaries", { id: w.ids.summaryB });
    const { error } = await w.personas.professionalB.client
      .from("record_summaries")
      .update({ reviewed_by_professional_id: w.ids.professionalA, reviewed_at: new Date().toISOString() })
      .eq("id", w.ids.summaryB);
    expect(error, "summary marked reviewed in another professional's name").not.toBeNull();
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(await readAsService(w.service, "record_summaries", { id: w.ids.summaryB })).toEqual(before);
  });

  it("professional B marks the summary reviewed, once", async () => {
    const client = w.personas.professionalB.client;
    const first = await client
      .from("record_summaries")
      .update({ reviewed_by_professional_id: w.ids.professionalB, reviewed_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", w.ids.summaryB);
    expect(first.error, first.error?.message).toBeNull();
    expect(first.count).toBe(1);
    const reviewed = await readAsService(w.service, "record_summaries", { id: w.ids.summaryB });
    expect(reviewed?.reviewed_by_professional_id).toBe(w.ids.professionalB);
    const again = await client
      .from("record_summaries")
      .update({ reviewed_by_professional_id: w.ids.professionalB, reviewed_at: new Date().toISOString() })
      .eq("id", w.ids.summaryB);
    expect(again.error, "summary marked reviewed a second time").not.toBeNull();
    expect(again.error?.code).toBe(PERMISSION_DENIED);
    expect(await readAsService(w.service, "record_summaries", { id: w.ids.summaryB })).toEqual(reviewed);
  });

  it("professional B cannot end the share; that is the patient's", async () => {
    const before = await readAsService(w.service, "record_shares", { id: w.ids.shareB });
    const { error } = await w.personas.professionalB.client
      .from("record_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", w.ids.shareB);
    expect(error, "a professional ended a share").not.toBeNull();
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(await readAsService(w.service, "record_shares", { id: w.ids.shareB })).toEqual(before);
  });
});

describe("after patient B ends the share", () => {
  it("control: patient B ends the share", async () => {
    const { error, count } = await w.personas.patientB.client
      .from("record_shares")
      .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", w.ids.shareB);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
  });

  it("patient B cannot reopen it", async () => {
    const before = await readAsService(w.service, "record_shares", { id: w.ids.shareB });
    const { error } = await w.personas.patientB.client.from("record_shares").update({ revoked_at: null }).eq("id", w.ids.shareB);
    expect(error, "an ended share was reopened").not.toBeNull();
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(await readAsService(w.service, "record_shares", { id: w.ids.shareB })).toEqual(before);
  });

  it("professional B reads none of the set, summary, items, pages, files or the share", async () => {
    for (const [table, match] of liveRows(w)) await expectReadRefused(w.personas.professionalB.client, table, [match], "professionalB");
  });

  it("control: patient B still reads all of it", async () => {
    for (const [table, match] of liveRows(w)) await expectReadAllowed(w.personas.patientB.client, table, match, "patientB");
  });
});

describe("making a share", () => {
  const profileNames = { patient_first_name_en: "Rls", patient_first_name_ar: "رلس", patient_gender: "f" };
  const forgedNames = { patient_first_name_en: "Forged", patient_first_name_ar: "مزور", patient_gender: "m" };

  beforeAll(async () => {
    // Patient A's profile carries the names and gender a share copies.
    must(
      await w.service
        .from("profiles")
        .update({ first_name_en: "Rls", first_name_ar: "رلس", gender: "f" })
        .eq("id", w.user("patientA"))
        .select("id"),
      "profile patientA",
    );
  });

  // Patient A's summary with professional A, unless a test says otherwise.
  const share = (extra: Row = {}): Row => ({
    summary_id: w.ids.summaryA,
    patient_id: w.user("patientA"),
    professional_id: w.ids.professionalA,
    expires_at: isoIn(business.shareDefaultDays * DAY),
    ...extra,
  });

  it("patient A cannot send its first names or gender itself (the columns are not insert-granted)", async () => {
    for (const [column, value] of Object.entries(forgedNames)) {
      await expectInsertRefused(w.personas.patientA.client, "record_shares", share({ [column]: value }), `patientA (${column})`);
    }
  });

  it("a share patient A makes carries the first names and gender of its profile", async () => {
    const { data, error } = await w.personas.patientA.client.from("record_shares").insert(share()).select("id").single();
    expect(error, error?.message).toBeNull();
    const row = await readAsService(w.service, "record_shares", { id: (data as { id: string }).id });
    expect(row).toMatchObject(profileNames);
  });

  it("the profile's values replace what the service client sends, too", async () => {
    const { data, error } = await w.service
      .from("record_shares")
      .insert(share(forgedNames))
      .select("patient_first_name_en, patient_first_name_ar, patient_gender")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data).toEqual(profileNames);
  });

  it("a share naming the patient's booking with a different professional is refused", async () => {
    // Booking A is patient A's visit with professional A.
    await expectInsertRefused(
      w.personas.patientA.client,
      "record_shares",
      share({ professional_id: w.ids.professionalB, booking_id: w.ids.bookingA }),
      "patientA",
    );
  });

  it("a share naming another patient's booking is refused", async () => {
    await expectInsertRefused(
      w.personas.patientA.client,
      "record_shares",
      share({ professional_id: w.ids.professionalB, booking_id: w.ids.bookingB }),
      "patientA",
    );
  });

  it("control: a share naming the patient's booking with that same professional is accepted", async () => {
    const { data, error } = await w.personas.patientA.client
      .from("record_shares")
      .insert(share({ booking_id: w.ids.bookingA }))
      .select("booking_id, professional_id")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data).toEqual({ booking_id: w.ids.bookingA, professional_id: w.ids.professionalA });
  });
});
