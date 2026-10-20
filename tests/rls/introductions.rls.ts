// Introduction requests (migration 10, round 4 of the L1 schema; screen 32, tasks 2.9, 3.3 and 3.12): what a patient
// sends a verified professional before any payment, with the concern and, from the light intake chat, a transcript the
// patient may delete. The patient sends its own request (first names and gender come from the profile, never from the
// caller), names only its own intake consent, withdraws an open request and ticks its checklist; the addressed
// professional reads it and declines an open one; the database stamps withdrawn_at and answered_at; nobody reopens a
// request, and only the webhook (service role) marks one booked. Deleting the patient's account keeps the request as a
// line without who it was or the chat (trigger profiles_scrub_introduction_requests).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import type { Client } from "./support/clients";
import {
  buildWorld,
  DAY,
  HOUR,
  intakeTranscript,
  isoIn,
  LISTING_TIMEOUT_MS,
  MINUTE,
  type Account,
  type World,
} from "./support/fixtures";
import {
  expectInsertRefused,
  expectReadAllowed,
  expectReadRefused,
  must,
  PERMISSION_DENIED,
  readAsService,
  type Match,
  type Row,
} from "./support/refusal";

let w: World;

const PROFILE = { first_name_en: "Rls", first_name_ar: "رلس", gender: "f" };
const PROFILE_ON_REQUEST = { patient_first_name_en: "Rls", patient_first_name_ar: "رلس", patient_gender: "f" };
const FORGED = { patient_first_name_en: "Forged", patient_first_name_ar: "مزور", patient_gender: "m" };
const FAR_PAST = "2001-02-03T04:05:06.000Z";
const CONCERN = "Synthetic concern (fixture)";

beforeAll(async () => {
  w = await buildWorld("introductions");
  // Patient A's profile carries the names and gender a request copies.
  must(await w.service.from("profiles").update(PROFILE).eq("id", w.user("patientA")).select("id"), "profile patientA");
});

afterAll(async () => {
  await w?.cleanup();
});

// Patient A's request to professional A, unless a test says otherwise.
function request(extra: Row = {}): Row {
  return {
    patient_id: w.user("patientA"),
    professional_id: w.ids.professionalA,
    requested_start: isoIn(5 * DAY),
    visit_type: "video",
    concern: CONCERN,
    concern_locale: "en",
    patient_time_zone: business.defaultTimeZone,
    transcript: intakeTranscript(),
    ...extra,
  };
}

async function send(client: Client, payload: Row, label: string): Promise<string> {
  const { data, error } = await client.from("introduction_requests").insert(payload).select("id").single();
  expect(error, `${label}: request refused: ${error?.message}`).toBeNull();
  return (data as { id: string }).id;
}

async function intakeConsent(client: Client, userId: string): Promise<string> {
  const { data, error } = await client
    .from("consents")
    .insert({ user_id: userId, kind: "intakeChat", copy_version: "intake.consent.v1", locale: "en" })
    .select("id")
    .single();
  expect(error, `intake consent: ${error?.message}`).toBeNull();
  return (data as { id: string }).id;
}

async function expectUpdated(client: Client, id: string, values: Row, label: string): Promise<Row> {
  const { error, count } = await client.from("introduction_requests").update(values, { count: "exact" }).eq("id", id);
  expect(error, `${label}: ${error?.message}`).toBeNull();
  expect(count, `${label}: rows updated`).toBe(1);
  const row = await readAsService(w.service, "introduction_requests", { id });
  expect(row, `${label}: request ${id} is gone`).not.toBeNull();
  return row as Row;
}

async function expectGuardRefuses(client: Client, id: string, values: Row, label: string): Promise<void> {
  const before = await readAsService(w.service, "introduction_requests", { id });
  expect(before, `fixture request ${id}`).not.toBeNull();
  const { error, count } = await client.from("introduction_requests").update(values, { count: "exact" }).eq("id", id);
  expect(error, `${label}: update ${JSON.stringify(values)} went through (count ${count})`).not.toBeNull();
  expect(error?.code, `${label}: ${error?.message}`).toBe(PERMISSION_DENIED);
  expect(await readAsService(w.service, "introduction_requests", { id }), `${label}: request changed`).toEqual(before);
}

function expectStampedNow(value: unknown, label: string): void {
  expect(value, `${label} was not stored`).not.toBeNull();
  const at = Date.parse(String(value));
  expect(Number.isNaN(at), `${label} stored ${String(value)}`).toBe(false);
  expect(Math.abs(at - Date.now()), `${label} stored ${String(value)}, not the database's now()`).toBeLessThan(MINUTE);
}

async function expectCheckRefuses(client: Client, payload: Row, constraint: string): Promise<void> {
  const { error } = await client.from("introduction_requests").insert(payload);
  expect(error, `a request breaking ${constraint} was stored`).not.toBeNull();
  expect(error?.code, error?.message).toBe("23514");
  expect(error?.message).toContain(constraint);
}

describe("sending a request", () => {
  const patient = () => w.personas.patientA.client;

  it("patient A sends a request to a verified listing: open, received now, with its profile's first names and gender", async () => {
    const id = await send(patient(), request(), "patientA");
    const row = await readAsService(w.service, "introduction_requests", { id });
    expect(row).toMatchObject({
      ...PROFILE_ON_REQUEST,
      status: "open",
      patient_id: w.user("patientA"),
      professional_id: w.ids.professionalA,
      concern: CONCERN,
      answered_at: null,
      withdrawn_at: null,
      booking_id: null,
    });
    expectStampedNow(row?.received_at, "introduction_requests.received_at");
  });

  it("patient A cannot send its first names or gender itself (not insert-granted, 42501)", async () => {
    for (const [column, value] of Object.entries(FORGED)) {
      await expectInsertRefused(patient(), "introduction_requests", request({ [column]: value }), `patientA (${column})`);
    }
  });

  it("nor the columns the database and the webhook write: status, booking_id, received_at, answered_at, withdrawn_at", async () => {
    const forged: Row = {
      status: "booked",
      booking_id: w.ids.bookingA,
      received_at: FAR_PAST,
      answered_at: FAR_PAST,
      withdrawn_at: FAR_PAST,
    };
    for (const [column, value] of Object.entries(forged)) {
      await expectInsertRefused(patient(), "introduction_requests", request({ [column]: value }), `patientA (${column})`);
    }
  });

  it("the profile's values replace what the service client sends, too", async () => {
    const { data, error } = await w.service
      .from("introduction_requests")
      .insert(request(FORGED))
      .select("patient_first_name_en, patient_first_name_ar, patient_gender")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data).toEqual(PROFILE_ON_REQUEST);
  });

  it("a request naming another patient is refused", async () => {
    await expectInsertRefused(patient(), "introduction_requests", request({ patient_id: w.user("patientB") }), "patientA");
  });

  it("a request to a listing that is pending review is refused", async () => {
    await expectInsertRefused(
      patient(),
      "introduction_requests",
      request({ professional_id: w.ids.professionalPending }),
      "patientA",
    );
  });

  // Unclaimed registry listings are public, but nobody answers for them yet. The insert can wait out the registry
  // import's slug lock, hence the longer timeout.
  it("a request to an unclaimed registry listing is refused", async () => {
    const { id } = await w.insertListing({
      first_name: "Rls",
      last_name: `Registry${w.runId}`,
      name_en: "Dr Rls Registry",
      city_en: "Testville",
    });
    expect((await readAsService(w.service, "professionals", { id }))?.status).toBe("unclaimed");
    await expectInsertRefused(patient(), "introduction_requests", request({ professional_id: id }), "patientA");
  }, LISTING_TIMEOUT_MS);

  it("a requested time in the past is refused", async () => {
    await expectInsertRefused(patient(), "introduction_requests", request({ requested_start: isoIn(-HOUR) }), "patientA");
  });

  it("naming another patient's intake consent, or its own consent of another kind, is refused", async () => {
    const consentB = await intakeConsent(w.personas.patientB.client, w.user("patientB"));
    await expectInsertRefused(patient(), "introduction_requests", request({ consent_id: consentB }), "patientA (B's consent)");
    // consentA is patient A's records-processing consent.
    await expectInsertRefused(patient(), "introduction_requests", request({ consent_id: w.ids.consentA }), "patientA (recordsProcessing)");
  });

  it("naming its own intake consent after withdrawing it is refused", async () => {
    const consent = await intakeConsent(patient(), w.user("patientA"));
    const { error } = await patient().from("consents").update({ withdrawn_at: new Date().toISOString() }).eq("id", consent);
    expect(error, `withdrawing the consent: ${error?.message}`).toBeNull();
    expect((await readAsService(w.service, "consents", { id: consent }))?.withdrawn_at, "the consent was not withdrawn").not.toBeNull();
    await expectInsertRefused(patient(), "introduction_requests", request({ consent_id: consent }), "patientA (withdrawn consent)");
  });

  it("control: naming its own intake consent is accepted", async () => {
    const consent = await intakeConsent(patient(), w.user("patientA"));
    const id = await send(patient(), request({ consent_id: consent }), "patientA");
    expect((await readAsService(w.service, "introduction_requests", { id }))?.consent_id).toBe(consent);
  });

  it("a concern without its language, a transcript that is not an array, or one over 64 KB fails its check (23514)", async () => {
    await expectCheckRefuses(patient(), request({ concern_locale: null }), "introduction_requests_concern_locale");
    await expectCheckRefuses(patient(), request({ transcript: { role: "user", text: "not an array" } }), "introduction_requests_transcript_check");
    const long = [{ role: "user", text: "x".repeat(64 * 1024), at: new Date().toISOString() }];
    await expectCheckRefuses(patient(), request({ transcript: long }), "introduction_requests_transcript_check");
  });
});

describe("who reads a request", () => {
  const filters = (): Match[] => [{ id: w.ids.requestA }, { patient_id: w.user("patientA") }, { professional_id: w.ids.professionalA }];

  it("professional A, to whom it is addressed, reads it with the concern and the transcript; patient A reads its own", async () => {
    const row = await expectReadAllowed(w.personas.professionalA.client, "introduction_requests", { id: w.ids.requestA }, "professionalA");
    expect(row.concern).toBe(CONCERN);
    expect(row.transcript).not.toBeNull();
    await expectReadAllowed(w.personas.patientA.client, "introduction_requests", { id: w.ids.requestA }, "patientA");
  });

  it("another professional, another patient and anon read none of patient A's requests", async () => {
    for (const persona of ["professionalB", "patientB", "anon"] as const) {
      await expectReadRefused(w.personas[persona].client, "introduction_requests", filters(), persona);
    }
  });
});

describe("withdrawing and declining", () => {
  const patient = () => w.personas.patientA.client;
  const professional = () => w.personas.professionalA.client;
  let withdrawn: string;
  let declined: string;

  it("patient A withdraws an open request; the database stamps withdrawn_at", async () => {
    withdrawn = await send(patient(), request(), "patientA");
    const row = await expectUpdated(patient(), withdrawn, { status: "withdrawn" }, "patientA");
    expect(row.status).toBe("withdrawn");
    expect(row.answered_at).toBeNull();
    expectStampedNow(row.withdrawn_at, "introduction_requests.withdrawn_at");
  });

  it("patient A cannot write withdrawn_at or answered_at itself (not update-granted)", async () => {
    const open = await send(patient(), request(), "patientA");
    for (const values of [{ withdrawn_at: FAR_PAST }, { status: "withdrawn", withdrawn_at: FAR_PAST }, { answered_at: FAR_PAST }]) {
      await expectGuardRefuses(patient(), open, values, "patientA");
    }
  });

  it("patient A cannot reopen a withdrawn request, and professional A cannot decline it", async () => {
    await expectGuardRefuses(patient(), withdrawn, { status: "open" }, "patientA");
    await expectGuardRefuses(professional(), withdrawn, { status: "declined" }, "professionalA");
  });

  it("patient A cannot decline its own request, nor mark it booked", async () => {
    const open = await send(patient(), request(), "patientA");
    for (const status of ["declined", "booked"]) await expectGuardRefuses(patient(), open, { status }, `patientA (${status})`);
  });

  it("professional A declines an open request; the database stamps answered_at", async () => {
    declined = await send(patient(), request(), "patientA");
    const row = await expectUpdated(professional(), declined, { status: "declined" }, "professionalA");
    expect(row.status).toBe("declined");
    expect(row.withdrawn_at).toBeNull();
    expectStampedNow(row.answered_at, "introduction_requests.answered_at");
  });

  it("professional A cannot withdraw an open request or mark it booked, nor write answered_at itself", async () => {
    const open = await send(patient(), request(), "patientA");
    for (const values of [{ status: "withdrawn" }, { status: "booked" }, { answered_at: FAR_PAST }]) {
      await expectGuardRefuses(professional(), open, values, `professionalA (${JSON.stringify(values)})`);
    }
  });

  it("a declined request is not reopened by professional A, nor withdrawn by patient A", async () => {
    await expectGuardRefuses(professional(), declined, { status: "open" }, "professionalA");
    await expectGuardRefuses(patient(), declined, { status: "withdrawn" }, "patientA");
  });
});

describe("the transcript and the checklist", () => {
  const patient = () => w.personas.patientA.client;
  const professional = () => w.personas.professionalA.client;
  const rewritten = [{ role: "assistant", text: "Rewritten (fixture)", at: FAR_PAST }];

  it("patient A ticks its checklist", async () => {
    const row = await expectUpdated(patient(), w.ids.requestA, { prepared: ["records", "questions"] }, "patientA");
    expect(row.prepared).toEqual(["records", "questions"]);
  });

  it("professional A cannot touch the checklist", async () => {
    await expectGuardRefuses(professional(), w.ids.requestA, { prepared: ["records", "medicines"] }, "professionalA");
  });

  it("professional A can neither delete nor rewrite the transcript", async () => {
    await expectGuardRefuses(professional(), w.ids.requestA, { transcript: null }, "professionalA (delete)");
    await expectGuardRefuses(professional(), w.ids.requestA, { transcript: rewritten }, "professionalA (rewrite)");
  });

  it("patient A cannot rewrite the transcript, or empty it to an empty chat", async () => {
    await expectGuardRefuses(patient(), w.ids.requestA, { transcript: rewritten }, "patientA (rewrite)");
    await expectGuardRefuses(patient(), w.ids.requestA, { transcript: [] }, "patientA (empty)");
  });

  it("patient A deletes the transcript (null); the request stays and professional A still reads it", async () => {
    const row = await expectUpdated(patient(), w.ids.requestA, { transcript: null }, "patientA");
    expect(row.transcript).toBeNull();
    expect(row.concern).toBe(CONCERN);
    const seen = await expectReadAllowed(professional(), "introduction_requests", { id: w.ids.requestA }, "professionalA");
    expect(seen.transcript).toBeNull();
  });

  it("and cannot bring a transcript back", async () => {
    await expectGuardRefuses(patient(), w.ids.requestA, { transcript: intakeTranscript() }, "patientA");
  });
});

describe("server code: a paid request becomes a booking", () => {
  it("status 'booked' without answered_at fails (23514, introduction_requests_answered), with it is stored", async () => {
    const id = await send(w.personas.patientA.client, request(), "patientA");
    const bad = await w.service.from("introduction_requests").update({ status: "booked", booking_id: w.ids.bookingA }).eq("id", id);
    expect(bad.error, "a request was booked without answered_at").not.toBeNull();
    expect(bad.error?.code, bad.error?.message).toBe("23514");
    expect(bad.error?.message).toContain("introduction_requests_answered");
    const good = await w.service
      .from("introduction_requests")
      .update({ status: "booked", booking_id: w.ids.bookingA, answered_at: new Date().toISOString() })
      .eq("id", id)
      .select("status, booking_id")
      .single();
    expect(good.error, good.error?.message).toBeNull();
    expect(good.data).toEqual({ status: "booked", booking_id: w.ids.bookingA });
    // Booked is final for the API: neither side moves it.
    await expectGuardRefuses(w.personas.patientA.client, id, { status: "withdrawn" }, "patientA (booked)");
    await expectGuardRefuses(w.personas.professionalA.client, id, { status: "declined" }, "professionalA (booked)");
  });

  it("one booking answers one request (23505), and 'withdrawn' needs its time (23514, introduction_requests_withdrawn)", async () => {
    const id = await send(w.personas.patientA.client, request(), "patientA");
    const twice = await w.service
      .from("introduction_requests")
      .update({ status: "booked", booking_id: w.ids.bookingA, answered_at: new Date().toISOString() })
      .eq("id", id);
    expect(twice.error, "a second request took the same booking").not.toBeNull();
    expect(twice.error?.code, twice.error?.message).toBe("23505");
    const unstamped = await w.service.from("introduction_requests").update({ status: "withdrawn" }).eq("id", id);
    expect(unstamped.error, "a request was withdrawn without withdrawn_at").not.toBeNull();
    expect(unstamped.error?.code, unstamped.error?.message).toBe("23514");
    expect(unstamped.error?.message).toContain("introduction_requests_withdrawn");
  });
});

describe("deleting the patient's account", () => {
  let leaver: Account;
  let requestId: string;

  beforeAll(async () => {
    leaver = await w.addAccount("leaver", "patient");
    must(await w.service.from("profiles").update(PROFILE).eq("id", leaver.userId).select("id"), "profile leaver");
    const consent = await intakeConsent(leaver.client, leaver.userId);
    requestId = await send(leaver.client, request({ patient_id: leaver.userId, consent_id: consent }), "leaver");
  });

  it("control: the leaver's request carries its names, gender, transcript and intake consent", async () => {
    const row = await readAsService(w.service, "introduction_requests", { id: requestId });
    expect(row).toMatchObject({ ...PROFILE_ON_REQUEST, patient_id: leaver.userId, concern: CONCERN });
    expect(row?.transcript).not.toBeNull();
    expect(row?.consent_id).not.toBeNull();
  });

  it("the Auth admin API deletes the account; the request stays as a line without patient, names, gender or transcript", async () => {
    const before = await readAsService(w.service, "introduction_requests", { id: requestId });
    const { error } = await w.service.auth.admin.deleteUser(leaver.userId);
    expect(error, error?.message).toBeNull();
    expect(await readAsService(w.service, "profiles", { id: leaver.userId }), "the profile outlived the account").toBeNull();
    const row = await readAsService(w.service, "introduction_requests", { id: requestId });
    expect(row, "the request went with the account").not.toBeNull();
    expect(row).toMatchObject({
      patient_id: null,
      patient_first_name_en: null,
      patient_first_name_ar: null,
      patient_gender: null,
      transcript: null,
      // The consent row went with the account (on delete cascade), so the link is cleared.
      consent_id: null,
      status: "open",
      professional_id: w.ids.professionalA,
      concern: CONCERN,
      concern_locale: "en",
      visit_type: before?.visit_type,
      requested_start: before?.requested_start,
      patient_time_zone: business.defaultTimeZone,
    });
  });

  it("professional A still reads the line", async () => {
    await expectReadAllowed(w.personas.professionalA.client, "introduction_requests", { id: requestId }, "professionalA");
  });
});
