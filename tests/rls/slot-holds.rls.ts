// Critical flow 1, the hold before payment (task 3.2). One hold per (slot_start, professional_id): the unique constraint
// is the double-booking guard. One live hold per patient (unique index on patient_id where status is 'held'): a patient
// checks out one slot at a time, so one account cannot hoard a doctor's calendar; a consumed hold (the booked slot) does
// not count. A hold needs a bookable listing (verified, accepting new patients, Stripe charges and payouts on), a future
// slot and an expiry no more than one hour after it was made; the length itself is business.slotHoldMinutes, set by
// server code. Round 3: holds of one professional never overlap, whatever their starts (exclusion constraint
// slot_holds_no_overlap, 23P01), and a hold spans at most four hours (slot_holds_slot_span); back-to-back slots are fine.
// The fixture world gives each patient a live hold, so the file starts by letting both go.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { business } from "../../config/business";
import { buildWorld, HOUR, isoIn, MINUTE, type UserPersonaKey, type World } from "./support/fixtures";
import { expectInsertRefused, readAsService, type Row } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("holds");
});

afterAll(async () => {
  await w?.cleanup();
});

function hold(patient: UserPersonaKey, professional: string, slotIndex: number, extra: Row = {}): Row {
  return {
    professional_id: professional,
    patient_id: w.user(patient),
    ...w.slot(slotIndex),
    expires_at: isoIn(business.slotHoldMinutes * MINUTE),
    visit_type: "video",
    ...extra,
  };
}

async function holdsAt(professional: string, slotIndex: number) {
  const { data, error } = await w.service
    .from("slot_holds")
    .select("id, patient_id")
    .eq("professional_id", professional)
    .eq("slot_start", w.slot(slotIndex).slot_start);
  expect(error, error?.message).toBeNull();
  return data ?? [];
}

// The patient's holds still in status 'held', as the service client sees them.
async function liveHolds(patient: UserPersonaKey): Promise<string[]> {
  const { data, error } = await w.service.from("slot_holds").select("id").eq("patient_id", w.user(patient)).eq("status", "held");
  expect(error, error?.message).toBeNull();
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function holdAs(patient: UserPersonaKey, professional: string, slotIndex: number): Promise<string> {
  const { data, error } = await w.personas[patient].client
    .from("slot_holds")
    .insert(hold(patient, professional, slotIndex))
    .select("id, status")
    .single();
  expect(error, `${patient} could not hold slot ${slotIndex}: ${error?.message}`).toBeNull();
  expect(data?.status).toBe("held");
  return (data as { id: string }).id;
}

async function letGo(patient: UserPersonaKey, holdId: string): Promise<void> {
  const { error, count } = await w.personas[patient].client.from("slot_holds").delete({ count: "exact" }).eq("id", holdId);
  expect(error, error?.message).toBeNull();
  expect(count, `${patient} let go of hold ${holdId}`).toBe(1);
}

async function setListing(values: Row, privateValues: Row): Promise<void> {
  if (Object.keys(values).length > 0) {
    const { error } = await w.service.from("professionals").update(values).eq("id", w.ids.professionalB);
    expect(error, error?.message).toBeNull();
  }
  if (Object.keys(privateValues).length > 0) {
    const { error } = await w.service.from("professional_private").update(privateValues).eq("professional_id", w.ids.professionalB);
    expect(error, error?.message).toBeNull();
  }
}

// Holds the patients have made in this file, by the test that made them.
const held: Record<string, string> = {};

describe("one hold per slot", () => {
  it("control: each patient lets go of its fixture hold", async () => {
    await letGo("patientA", w.ids.holdA);
    await letGo("patientB", w.ids.holdB);
    expect(await liveHolds("patientA")).toEqual([]);
    expect(await liveHolds("patientB")).toEqual([]);
  });

  it("control: patient A holds a free slot with a bookable professional", async () => {
    held.a5 = await holdAs("patientA", w.ids.professionalA, 5);
  });

  it("a second hold on the same (slot_start, professional_id) is refused by the unique constraint", async () => {
    const { error } = await w.personas.patientB.client.from("slot_holds").insert(hold("patientB", w.ids.professionalA, 5));
    expect(error, "a second hold on a held slot was accepted").not.toBeNull();
    expect(error?.code, error?.message).toBe("23505");
    expect(error?.message).toContain("slot_holds_one_hold_per_slot");
    expect(await holdsAt(w.ids.professionalA, 5)).toEqual([{ id: held.a5, patient_id: w.user("patientA") }]);
  });

  it("control: patient B holds the next slot with the same professional, while patient A holds its own", async () => {
    held.b6 = await holdAs("patientB", w.ids.professionalA, 6);
    expect(await liveHolds("patientA")).toEqual([held.a5]);
  });

  it("control: patient A lets go of its own hold, freeing the slot", async () => {
    await letGo("patientA", held.a5 as string);
    expect(await holdsAt(w.ids.professionalA, 5)).toEqual([]);
  });
});

describe("one live hold per patient", () => {
  it("a patient's second held slot is refused by the unique index, with the same or another professional", async () => {
    for (const professional of [w.ids.professionalA, w.ids.professionalB]) {
      const { error } = await w.personas.patientB.client.from("slot_holds").insert(hold("patientB", professional, 7));
      expect(error, "a patient holding a slot held a second one").not.toBeNull();
      expect(error?.code, error?.message).toBe("23505");
      expect(error?.message).toContain("slot_holds_one_live_hold_per_patient");
      expect(await holdsAt(professional, 7)).toEqual([]);
    }
    expect(await liveHolds("patientB")).toEqual([held.b6]);
  });

  it("control: after letting go of the first, the patient holds again", async () => {
    await letGo("patientB", held.b6 as string);
    held.b7 = await holdAs("patientB", w.ids.professionalA, 7);
    expect(await liveHolds("patientB")).toEqual([held.b7]);
  });

  it("a consumed hold (the booked slot) does not block a new hold, and is not the patient's to let go", async () => {
    const consumed = await w.service
      .from("slot_holds")
      .update({ status: "consumed", consumed_at: new Date().toISOString() })
      .eq("id", held.b7 as string)
      .select("status")
      .single();
    expect(consumed.error, consumed.error?.message).toBeNull();
    expect(await liveHolds("patientB")).toEqual([]);
    held.b8 = await holdAs("patientB", w.ids.professionalA, 8);
    expect(await liveHolds("patientB")).toEqual([held.b8]);

    const { error, count } = await w.personas.patientB.client.from("slot_holds").delete({ count: "exact" }).eq("id", held.b7 as string);
    expect(error, error?.message).toBeNull();
    expect(count, "a patient deleted its consumed hold").toBe(0);
    expect((await readAsService(w.service, "slot_holds", { id: held.b7 as string }))?.status).toBe("consumed");
  });
});

describe("only a bookable listing can be held", () => {
  it("a hold with a listing that is not verified is refused", async () => {
    await expectInsertRefused(w.personas.patientA.client, "slot_holds", hold("patientA", w.ids.professionalPending, 7), "patientA");
  });

  it("a hold with a verified listing whose Stripe account cannot take payouts is refused", async () => {
    await setListing({}, { stripe_payouts_enabled: false });
    try {
      expect((await readAsService(w.service, "professionals", { id: w.ids.professionalB }))?.can_take_bookings).toBe(false);
      await expectInsertRefused(w.personas.patientA.client, "slot_holds", hold("patientA", w.ids.professionalB, 8), "patientA");
    } finally {
      await setListing({}, { stripe_payouts_enabled: true });
    }
    expect((await readAsService(w.service, "professionals", { id: w.ids.professionalB }))?.can_take_bookings).toBe(true);
  });

  it("a hold with a verified listing that is not accepting new patients is refused", async () => {
    await setListing({ accepting_new_patients: false }, {});
    try {
      await expectInsertRefused(w.personas.patientA.client, "slot_holds", hold("patientA", w.ids.professionalB, 9), "patientA");
    } finally {
      await setListing({ accepting_new_patients: true }, {});
    }
  });

  // Patient A lets go again, so no refusal below can come from the one-live-hold index instead of its own rule.
  it("control: the same listing is holdable again once it is bookable", async () => {
    expect(await liveHolds("patientA")).toEqual([]);
    await letGo("patientA", await holdAs("patientA", w.ids.professionalB, 9));
  });
});

describe("the hold's own fields", () => {
  it("an expiry more than one hour after the hold was made is refused", async () => {
    const { error } = await w.personas.patientA.client
      .from("slot_holds")
      .insert(hold("patientA", w.ids.professionalA, 11, { expires_at: isoIn(HOUR + 5 * MINUTE) }));
    expect(error, "a hold longer than the one-hour ceiling was accepted").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("slot_holds_expiry_ceiling");
    expect(await holdsAt(w.ids.professionalA, 11)).toEqual([]);
  });

  it("a hold on a slot that has already started is refused", async () => {
    await expectInsertRefused(
      w.personas.patientA.client,
      "slot_holds",
      hold("patientA", w.ids.professionalA, 12, { slot_start: isoIn(-HOUR), slot_end: isoIn(-HOUR / 2) }),
      "patientA",
    );
  });

  it("a patient cannot create a hold already consumed or tied to a payment", async () => {
    const client = w.personas.patientA.client;
    await expectInsertRefused(client, "slot_holds", hold("patientA", w.ids.professionalA, 13, { status: "consumed", consumed_at: new Date().toISOString() }), "patientA");
    await expectInsertRefused(client, "slot_holds", hold("patientA", w.ids.professionalA, 14, { payment_intent_id: `pi_rlsforged_${w.runId}` }), "patientA");
  });

  it("a concern without its language, or a language without a concern, is refused", async () => {
    for (const extra of [{ concern: "Ear infections keep coming back" }, { concern_locale: "en" }]) {
      const { error } = await w.personas.patientA.client
        .from("slot_holds")
        .insert(hold("patientA", w.ids.professionalA, 15, extra));
      expect(error, `${JSON.stringify(extra)} was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain("slot_holds_concern_locale");
    }
    expect(await holdsAt(w.ids.professionalA, 15)).toEqual([]);
  });

  it("control: none of the refused attempts left a hold behind", async () => {
    expect(await liveHolds("patientA")).toEqual([]);
  });
});

describe("holds of one professional do not overlap", () => {
  const length = business.slotLengthMinutesDefault;
  const at = (startMs: number, minutes: number) => ({
    slot_start: new Date(startMs).toISOString(),
    slot_end: new Date(startMs + minutes * MINUTE).toISOString(),
  });
  const slot20 = () => Date.parse(w.slot(20).slot_start);

  it("control: patient B lets go of its hold, and patient A holds slot 20 with professional A", async () => {
    await letGo("patientB", held.b8 as string);
    held.a20 = await holdAs("patientA", w.ids.professionalA, 20);
  });

  it("a hold overlapping it with a different start is refused (23P01, slot_holds_no_overlap)", async () => {
    const overlapping = at(slot20() + (length / 2) * MINUTE, length);
    const { error } = await w.personas.patientB.client.from("slot_holds").insert(hold("patientB", w.ids.professionalA, 20, overlapping));
    expect(error, "an overlapping hold was accepted").not.toBeNull();
    expect(error?.code, error?.message).toBe("23P01");
    expect(error?.message).toContain("slot_holds_no_overlap");
    expect(await liveHolds("patientB")).toEqual([]);
  });

  it("a hold spanning more than four hours is refused (23514, slot_holds_slot_span); four hours is accepted", async () => {
    const start = Date.parse(w.slot(30).slot_start);
    const client = w.personas.patientB.client;
    const tooLong = await client.from("slot_holds").insert(hold("patientB", w.ids.professionalB, 30, at(start, 4 * 60 + 1)));
    expect(tooLong.error, "a hold of four hours and a minute was accepted").not.toBeNull();
    expect(tooLong.error?.code, tooLong.error?.message).toBe("23514");
    expect(tooLong.error?.message).toContain("slot_holds_slot_span");
    expect(await liveHolds("patientB")).toEqual([]);
    const longest = await client.from("slot_holds").insert(hold("patientB", w.ids.professionalB, 30, at(start, 4 * 60))).select("id").single();
    expect(longest.error, longest.error?.message).toBeNull();
    await letGo("patientB", (longest.data as { id: string }).id);
  });

  it("control: the slot right after it (its end is the next start) is held by patient B", async () => {
    const { data, error } = await w.personas.patientB.client
      .from("slot_holds")
      .insert(hold("patientB", w.ids.professionalA, 20, at(slot20() + length * MINUTE, length)))
      .select("id")
      .single();
    expect(error, error?.message).toBeNull();
    held.b20 = (data as { id: string }).id;
    expect(await liveHolds("patientB")).toEqual([held.b20]);
    expect(await liveHolds("patientA")).toEqual([held.a20]);
    await letGo("patientB", held.b20);
    await letGo("patientA", held.a20 as string);
  });
});
