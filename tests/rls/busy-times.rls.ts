// public.professional_busy_times (migration 4, round 4 of the L1 schema; tasks 2.6 and 3.2): the times a verified
// professional cannot be booked, for any visitor's slot picker, as bare (starts_at, ends_at) intervals with no patient
// data. Professional B carries the fixture world's live hold (patient B) and upcoming booking; this file adds, through
// the service client as the webhook and the hold flow write them, an expired hold the minute sweep has not removed yet
// (still 'held') and a cancelled booking, both inside the range asked for and both left out of the answer. A listing
// that is not verified answers nothing, and so does a reversed, empty or over-100-day range.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import type { Client } from "./support/clients";
import { buildWorld, DAY, HOUR, MINUTE, type Account, type World } from "./support/fixtures";
import { must, readAsService, type Row } from "./support/refusal";

let w: World;
let lapsed: Account;
let expiredHold: Row & { id: string };
let cancelled: Row & { id: string };

// The window the slot picker would ask for: from now to a week ahead (the fixture hold is three days out, the booking
// four).
const WEEK = 7 * DAY;
const RANGE_CAP_DAYS = 100;

interface Interval {
  starts: number;
  ends: number;
}

beforeAll(async () => {
  w = await buildWorld("busy");
  // A second patient: one live hold per patient, and patient B's is the fixture's live hold.
  lapsed = await w.addAccount("lapsed", "patient");
  const createdAt = Date.now() - 2 * HOUR;
  expiredHold = {
    id: randomUUID(),
    patient_id: lapsed.userId,
    professional_id: w.ids.professionalB,
    ...w.slot(5),
    status: "held",
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(createdAt + business.slotHoldMinutes * MINUTE).toISOString(),
    visit_type: "video",
  };
  must(await w.service.from("slot_holds").insert(expiredHold).select("id"), "expired hold");
  const ended = { status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "patient" };
  cancelled = w.bookingRow(w.user("patientA"), w.ids.professionalB, Date.parse(w.slot(8).slot_start), ended);
  must(await w.service.from("bookings").insert(cancelled).select("id"), "cancelled booking");
});

afterAll(async () => {
  await w?.cleanup();
});

async function busy(client: Client, professional: string, fromMs: number, toMs: number): Promise<Row[]> {
  const { data, error } = await client.rpc("professional_busy_times", {
    professional,
    from_at: new Date(fromMs).toISOString(),
    to_at: new Date(toMs).toISOString(),
  });
  expect(error, `professional_busy_times: ${error?.message}`).toBeNull();
  return (data ?? []) as Row[];
}

function intervals(rows: Row[]): Interval[] {
  return rows.map((row) => ({ starts: Date.parse(String(row.starts_at)), ends: Date.parse(String(row.ends_at)) }));
}

async function intervalOf(table: "slot_holds" | "bookings", id: string): Promise<Interval> {
  const row = await readAsService(w.service, table, { id });
  expect(row, `fixture ${table} ${id}`).not.toBeNull();
  const [start, end] = table === "slot_holds" ? ["slot_start", "slot_end"] : ["starts_at", "ends_at"];
  return { starts: Date.parse(String(row?.[start])), ends: Date.parse(String(row?.[end])) };
}

// Professional B's live hold, then its upcoming booking (the answer is ordered by start). The fixture hold expires
// business.slotHoldMinutes after the world was built, so it is checked to be live still.
async function expected(): Promise<Interval[]> {
  const hold = await readAsService(w.service, "slot_holds", { id: w.ids.holdB });
  expect(Date.parse(String(hold?.expires_at)), "the fixture hold expired before the test ran").toBeGreaterThan(Date.now());
  return [await intervalOf("slot_holds", w.ids.holdB), await intervalOf("bookings", w.ids.bookingB)];
}

async function setStatusB(status: string): Promise<void> {
  const { error } = await w.service.from("professionals").update({ status }).eq("id", w.ids.professionalB);
  expect(error, error?.message).toBeNull();
}

describe("a verified listing's busy times", () => {
  for (const persona of ["anon", "patientA", "professionalA"] as const) {
    it(`${persona} gets exactly professional B's live hold and upcoming booking, as (starts_at, ends_at) only`, async () => {
      const now = Date.now();
      const rows = await busy(w.personas[persona].client, w.ids.professionalB, now, now + WEEK);
      for (const row of rows) expect(Object.keys(row).sort(), `${persona}: columns of a busy time`).toEqual(["ends_at", "starts_at"]);
      expect(intervals(rows)).toEqual(await expected());
    });
  }

  it("the expired hold and the cancelled booking are not in it, though both fall inside the range", async () => {
    const now = Date.now();
    const lapsedHold = await intervalOf("slot_holds", expiredHold.id);
    const cancelledVisit = await intervalOf("bookings", cancelled.id);
    for (const ended of [lapsedHold, cancelledVisit]) {
      expect(ended.starts).toBeGreaterThan(now);
      expect(ended.ends).toBeLessThan(now + WEEK);
    }
    const answer = intervals(await busy(w.personas.anon.client, w.ids.professionalB, now, now + WEEK));
    expect(answer).not.toContainEqual(lapsedHold);
    expect(answer).not.toContainEqual(cancelledVisit);
  });

  it("no patient data appears in the result", async () => {
    const now = Date.now();
    const text = JSON.stringify(await busy(w.personas.anon.client, w.ids.professionalB, now, now + WEEK));
    const hold = await readAsService(w.service, "slot_holds", { id: w.ids.holdB });
    const booking = await readAsService(w.service, "bookings", { id: w.ids.bookingB });
    for (const secret of [
      w.user("patientB"),
      lapsed.userId,
      w.ids.holdB,
      w.ids.bookingB,
      String(hold?.concern),
      String(booking?.payment_intent_id),
      String(booking?.patient_first_name_en),
      "video",
    ]) {
      expect(text, `the busy times carry ${secret}`).not.toContain(secret);
    }
  });
});

describe("what answers nothing", () => {
  it("a listing that is pending review or suspended, even with a live hold and an upcoming booking", async () => {
    try {
      for (const status of ["pending_review", "suspended"]) {
        await setStatusB(status);
        for (const persona of ["anon", "patientA"] as const) {
          const now = Date.now();
          expect(await busy(w.personas[persona].client, w.ids.professionalB, now, now + WEEK), `${persona} (${status})`).toEqual([]);
        }
      }
    } finally {
      await setStatusB("verified");
    }
    // Control: verified again, the same call answers.
    const now = Date.now();
    expect(intervals(await busy(w.personas.anon.client, w.ids.professionalB, now, now + WEEK))).toEqual(await expected());
  });

  it("a past range: a visit that has ended is nobody's business, though it was a live booking", async () => {
    const now = Date.now();
    const visitStart = now - DAY;
    const past = w.bookingRow(w.user("patientA"), w.ids.professionalB, visitStart, {
      status: "done",
      done_at: new Date(visitStart + HOUR).toISOString(),
    });
    must(await w.service.from("bookings").insert(past).select("id"), "past booking");
    try {
      const pastVisit = await intervalOf("bookings", past.id as string);
      expect(pastVisit.ends, "the fixture visit has not ended").toBeLessThan(now);
      expect(await busy(w.personas.anon.client, w.ids.professionalB, now - 2 * DAY, now - MINUTE)).toEqual([]);
      const answer = intervals(await busy(w.personas.anon.client, w.ids.professionalB, now - 2 * DAY, now + WEEK));
      expect(answer).not.toContainEqual(pastVisit);
      expect(answer).toEqual(await expected());
    } finally {
      await w.service.from("bookings").delete().eq("id", past.id as string);
    }
  });

  it("a reversed range and an empty range", async () => {
    const now = Date.now();
    expect(await busy(w.personas.anon.client, w.ids.professionalB, now + WEEK, now)).toEqual([]);
    expect(await busy(w.personas.anon.client, w.ids.professionalB, now + WEEK, now + WEEK)).toEqual([]);
  });

  it(`a range over ${RANGE_CAP_DAYS} days; exactly ${RANGE_CAP_DAYS} days still answers`, async () => {
    const now = Date.now();
    expect(await busy(w.personas.anon.client, w.ids.professionalB, now, now + RANGE_CAP_DAYS * DAY + MINUTE)).toEqual([]);
    expect(intervals(await busy(w.personas.anon.client, w.ids.professionalB, now, now + RANGE_CAP_DAYS * DAY))).toEqual(await expected());
  });
});
