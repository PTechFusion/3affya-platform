// Booking rules from round 3 of the L1 schema (migration 4). No two live visits (upcoming or done) of one professional
// overlap, whatever their start times (exclusion constraint bookings_no_overlap, 23P01); a cancelled or refunded one may.
// The professional marks a visit done only once it has started and while it is upcoming: the database stamps done_at,
// moves the status to 'done' and back to 'upcoming' when the mark is cleared, and a done visit always has its time.
// Deleting a patient's account is refused while a visit is still ahead; afterwards the bookings stay, for the payment
// records, unlinked and without the patient's names, phone and concern. Receipts and refunds name their subject: a visit
// (with its booking) or the processing of a record set (without one). Money rows are the webhook's, so the fixtures
// here are written by the service client.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import type { Client } from "./support/clients";
import { buildWorld, HOUR, MINUTE, randomHex, type Account, type World } from "./support/fixtures";
import { must, PERMISSION_DENIED, readAsService, type Match, type Row } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("bookings");
});

afterAll(async () => {
  await w?.cleanup();
});

const FAR_PAST = "2001-02-03T04:05:06.000Z";

async function startOf(bookingId: string): Promise<number> {
  const row = await readAsService(w.service, "bookings", { id: bookingId });
  return Date.parse(String(row?.starts_at));
}

// Rows with different keys in one request: defaultToNull false, so a missing key takes the column default.
async function insertBookings(rows: Row[], what: string): Promise<void> {
  must(await w.service.from("bookings").insert(rows, { defaultToNull: false }).select("id"), what);
}

async function expectGuardRefuses(client: Client, match: Match, values: Row, label: string): Promise<void> {
  const before = await readAsService(w.service, "bookings", match);
  expect(before, `fixture booking ${JSON.stringify(match)}`).not.toBeNull();
  const { error, count } = await client.from("bookings").update(values, { count: "exact" }).match(match);
  expect(error, `${label}: bookings update ${JSON.stringify(values)} went through (count ${count})`).not.toBeNull();
  expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
  expect(await readAsService(w.service, "bookings", match), `${label}: booking changed`).toEqual(before);
}

function expectNow(value: unknown, label: string): void {
  const at = Date.parse(String(value));
  expect(Number.isNaN(at), `${label} stored ${String(value)}`).toBe(false);
  expect(Math.abs(at - Date.now()), `${label} stored ${String(value)}, not the database's now()`).toBeLessThan(MINUTE);
}

describe("no two live visits of one professional overlap", () => {
  it("a live booking overlapping booking A with a different start is refused (23P01, bookings_no_overlap)", async () => {
    const start = (await startOf(w.ids.bookingA)) + 15 * MINUTE;
    for (const extra of [{}, { status: "done", done_at: new Date().toISOString() }] as Row[]) {
      const row = w.bookingRow(w.user("patientB"), w.ids.professionalA, start, extra);
      const { error } = await w.service.from("bookings").insert(row);
      expect(error, `an overlapping ${String(extra.status ?? "upcoming")} booking was stored`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23P01");
      expect(error?.message).toContain("bookings_no_overlap");
      expect(await readAsService(w.service, "bookings", { id: row.id })).toBeNull();
    }
  });

  it("a cancelled or a refunded booking may overlap it", async () => {
    const start = (await startOf(w.ids.bookingA)) + 15 * MINUTE;
    const ended = { cancelled_at: new Date().toISOString(), cancelled_by: "patient" };
    const rows = [
      w.bookingRow(w.user("patientB"), w.ids.professionalA, start, { status: "cancelled", ...ended }),
      w.bookingRow(w.user("patientB"), w.ids.professionalA, start + 5 * MINUTE, { status: "refunded", ...ended }),
    ];
    const { error } = await w.service.from("bookings").insert(rows);
    expect(error, error?.message).toBeNull();
  });

  it("control: two professionals' visits at the same time do not conflict (bookings A and B share a start)", async () => {
    expect(await startOf(w.ids.bookingA)).toBe(await startOf(w.ids.bookingB));
  });
});

describe("the done mark and the checklist", () => {
  const professional = () => w.personas.professionalA.client;
  const started = () => ({ id: w.ids.bookingAStarted });

  it("the professional cannot mark a visit that is still ahead done (42501)", async () => {
    expect(await startOf(w.ids.bookingA)).toBeGreaterThan(Date.now());
    await expectGuardRefuses(professional(), { id: w.ids.bookingA }, { done_at: new Date().toISOString() }, "professionalA");
  });

  it("nor a cancelled or a refunded visit that has started (42501)", async () => {
    const begun = Math.floor(Date.now() / HOUR) * HOUR - 3 * HOUR;
    const ended = { cancelled_at: new Date(begun - HOUR).toISOString(), cancelled_by: "doctor" };
    const cancelled = w.bookingRow(w.user("patientA"), w.ids.professionalA, begun, { status: "cancelled", ...ended });
    const refunded = w.bookingRow(w.user("patientA"), w.ids.professionalA, begun, { status: "refunded", ...ended });
    await insertBookings([cancelled, refunded], "cancelled and refunded bookings");
    for (const row of [cancelled, refunded]) {
      await expectGuardRefuses(professional(), { id: row.id }, { done_at: new Date().toISOString() }, `professionalA (${String(row.status)})`);
    }
  });

  it("marking the visit that has started done sets status 'done' and stamps now()", async () => {
    const { error, count } = await professional().from("bookings").update({ done_at: FAR_PAST }, { count: "exact" }).match(started());
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    const row = await readAsService(w.service, "bookings", started());
    expect(row?.status).toBe("done");
    expectNow(row?.done_at, "bookings.done_at");
  });

  it("clearing the mark sets the status back to 'upcoming'", async () => {
    const { error, count } = await professional().from("bookings").update({ done_at: null }, { count: "exact" }).match(started());
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    expect(await readAsService(w.service, "bookings", started())).toMatchObject({ status: "upcoming", done_at: null });
  });

  it("status 'done' without done_at is refused, for the service client too (23514, bookings_done_have_time)", async () => {
    const before = await readAsService(w.service, "bookings", started());
    const update = await w.service.from("bookings").update({ status: "done" }).match(started());
    expect(update.error, "a booking was moved to done without done_at").not.toBeNull();
    expect(update.error?.code, update.error?.message).toBe("23514");
    expect(update.error?.message).toContain("bookings_done_have_time");
    expect(await readAsService(w.service, "bookings", started())).toEqual(before);
    const begun = Math.floor(Date.now() / HOUR) * HOUR - 5 * HOUR;
    const row = w.bookingRow(w.user("patientA"), w.ids.professionalA, begun, { status: "done" });
    const insert = await w.service.from("bookings").insert(row);
    expect(insert.error, "a done booking without done_at was stored").not.toBeNull();
    expect(insert.error?.code, insert.error?.message).toBe("23514");
    expect(insert.error?.message).toContain("bookings_done_have_time");
  });

  it("the patient's checklist takes no item twice (23514)", async () => {
    const before = await readAsService(w.service, "bookings", { id: w.ids.bookingA });
    const { error } = await w.personas.patientA.client.from("bookings").update({ prepared: ["records", "records"] }).eq("id", w.ids.bookingA);
    expect(error, "a duplicate checklist item was stored").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("bookings_prepared_check");
    expect(await readAsService(w.service, "bookings", { id: w.ids.bookingA })).toEqual(before);
  });
});

describe("deleting a patient's account", () => {
  let leaver: Account;
  let ahead: Row & { id: string };
  let past: Row & { id: string };
  const identifying = {
    patient_first_name_en: "Rls",
    patient_first_name_ar: "رلس",
    patient_phone: "+966500000000",
    concern: "Synthetic concern (fixture)",
    concern_locale: "en",
  };

  beforeAll(async () => {
    leaver = await w.addAccount("leaver", "patient");
    // A visit days ahead and one that took place seven hours ago, both with professional A.
    ahead = w.bookingRow(leaver.userId, w.ids.professionalA, Date.parse(w.slot(40).slot_start), identifying);
    const begun = Math.floor(Date.now() / HOUR) * HOUR - 7 * HOUR;
    past = w.bookingRow(leaver.userId, w.ids.professionalA, begun, { ...identifying, status: "done", done_at: new Date(begun + HOUR).toISOString() });
    await insertBookings([ahead, past], "the leaver's bookings");
  });

  it("the Auth admin API refuses while the patient has a visit still ahead; the account and its bookings stay", async () => {
    const { error } = await w.service.auth.admin.deleteUser(leaver.userId);
    expect(error, "an account with an upcoming visit was deleted").not.toBeNull();
    const user = await w.service.auth.admin.getUserById(leaver.userId);
    expect(user.error, user.error?.message).toBeNull();
    expect(user.data.user?.id).toBe(leaver.userId);
    expect(await readAsService(w.service, "profiles", { id: leaver.userId }), "the profile was deleted").not.toBeNull();
    for (const booking of [ahead, past]) {
      expect(await readAsService(w.service, "bookings", { id: booking.id })).toMatchObject({ patient_id: leaver.userId, ...identifying });
    }
  });

  it("once the visit is cancelled the delete succeeds, and the bookings stay unlinked, without names, phone or concern", async () => {
    must(
      await w.service
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "patient" })
        .eq("id", ahead.id)
        .select("id"),
      "cancel the visit ahead",
    );
    const { error } = await w.service.auth.admin.deleteUser(leaver.userId);
    expect(error, error?.message).toBeNull();
    expect(await readAsService(w.service, "profiles", { id: leaver.userId }), "the profile outlived the account").toBeNull();
    for (const booking of [ahead, past]) {
      const row = await readAsService(w.service, "bookings", { id: booking.id });
      expect(row, "the booking went with the account").not.toBeNull();
      expect(row).toMatchObject({
        patient_id: null,
        patient_first_name_en: null,
        patient_first_name_ar: null,
        patient_phone: null,
        concern: null,
        concern_locale: null,
        professional_id: w.ids.professionalA,
        doctor_fee_cents: w.fees.doctorFeeCents,
        payment_intent_id: booking.payment_intent_id,
      });
    }
  });
});

describe("receipts and refunds name their subject", () => {
  const receipt = (extra: Row): Row => ({
    patient_id: w.user("patientA"),
    receipt_number: `RLS-${w.runId}-${randomHex(3)}`,
    currency: business.currencyPresentment,
    amount_cents: w.fees.totalCents,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: `pi_rlstest_${w.runId}_${randomHex(4)}`,
    ...extra,
  });
  const refund = (extra: Row): Row => ({
    patient_id: w.user("patientA"),
    amount_cents: w.fees.totalCents,
    currency: business.currencyPresentment,
    reason: "platform",
    initiated_by: "admin",
    idempotency_key: `rls-test-${w.runId}-refund-${randomHex(4)}`,
    ...extra,
  });

  async function expectCheckRefuses(table: string, payload: Row, constraint: string): Promise<void> {
    const { error } = await w.service.from(table).insert(payload);
    expect(error, `${table} ${JSON.stringify(payload)} was stored`).not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain(constraint);
  }

  it("a 'records' receipt with a booking is refused (23514, receipts_subject)", async () => {
    await expectCheckRefuses("receipts", receipt({ subject: "records", booking_id: w.ids.bookingAStarted }), "receipts_subject");
  });

  it("a 'booking' receipt without a booking is refused (23514, receipts_subject)", async () => {
    await expectCheckRefuses("receipts", receipt({ subject: "booking" }), "receipts_subject");
    await expectCheckRefuses("receipts", receipt({}), "receipts_subject");
  });

  it("a 'booking' receipt naming a record set is refused (23514, receipts_records_have_no_booking)", async () => {
    await expectCheckRefuses(
      "receipts",
      receipt({ booking_id: w.ids.bookingAStarted, record_set_id: w.ids.setA }),
      "receipts_records_have_no_booking",
    );
  });

  it("the same subject rules hold for refunds (23514, refunds_subject, refunds_records_have_no_booking)", async () => {
    await expectCheckRefuses("refunds", refund({ subject: "records", booking_id: w.ids.bookingA }), "refunds_subject");
    await expectCheckRefuses("refunds", refund({ subject: "booking" }), "refunds_subject");
    await expectCheckRefuses(
      "refunds",
      refund({ booking_id: w.ids.bookingA, record_set_id: w.ids.setA }),
      "refunds_records_have_no_booking",
    );
  });

  it("control: a 'records' receipt for a set and a 'booking' receipt for a visit are stored", async () => {
    const { error } = await w.service
      .from("receipts")
      .insert([receipt({ subject: "records", record_set_id: w.ids.setA }), receipt({ booking_id: w.ids.bookingAStarted })], {
        defaultToNull: false,
      });
    expect(error, error?.message).toBeNull();
  });
});
