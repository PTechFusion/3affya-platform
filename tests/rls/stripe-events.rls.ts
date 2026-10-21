// stripe_events (lane L2, task 1.8; supabase/migrations/20261021000100_l2_stripe_events.sql): the Stripe webhook's
// idempotency ledger is service role only. Every API persona (anonymous, patient, professional, and admins with and
// without TOTP) is refused every read and write of it; the service role, which the webhook holds through
// createServiceClient({ kind: "system", name: "stripe-webhook" }), inserts and reads. tables.ts lists the table under
// OTHER_LANE_TABLES, so the matrix leaves it to this file. Rows are synthetic events, created and removed here.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, type PersonaKey, type World } from "./support/fixtures";
import {
  expectDeleteRefused,
  expectInsertRefused,
  expectReadRefused,
  expectRowExists,
  expectUpdateRefused,
  must,
  type Row,
} from "./support/refusal";

const TABLE = "stripe_events";
const ATTACKERS: readonly PersonaKey[] = ["anon", "patientA", "professionalA", "admin", "adminNoTotp"];

let w: World;
let eventId: string;

function syntheticEvent(id: string): Row {
  return {
    event_id: id,
    type: "payment_intent.succeeded",
    created_at: new Date().toISOString(),
    payload: { id, object: "event", type: "payment_intent.succeeded", data: { object: { object: "payment_intent", amount: 100 } } },
  };
}

beforeAll(async () => {
  w = await buildWorld("stripeevents");
  eventId = `evt_rlstest${w.runId}`;
  must(await w.service.from(TABLE).insert(syntheticEvent(eventId)).select("event_id"), "service role inserts the fixture event");
});

afterAll(async () => {
  if (w) await w.service.from(TABLE).delete().like("event_id", `evt_rlstest${w.runId}%`);
  await w?.cleanup();
});

describe("stripe_events is service role only", () => {
  it("control: the service role reads the event it inserted", async () => {
    const row = await expectRowExists(w.service, TABLE, { event_id: eventId });
    expect(row).toMatchObject({ type: "payment_intent.succeeded", handled_at: null, error: null });
  });

  for (const attacker of ATTACKERS) {
    describe(`as ${attacker}`, () => {
      it("SELECT is refused", async () => {
        await expectReadRefused(w.personas[attacker].client, TABLE, [{ event_id: eventId }, { type: "payment_intent.succeeded" }], attacker);
      });

      it("INSERT is refused", async () => {
        await expectInsertRefused(w.personas[attacker].client, TABLE, syntheticEvent(`${eventId}${attacker.toLowerCase()}`), attacker);
      });

      it("UPDATE is refused and the row is unchanged", async () => {
        await expectUpdateRefused(
          w.personas[attacker].client,
          w.service,
          TABLE,
          { event_id: eventId },
          { handled_at: new Date().toISOString(), error: "forged" },
          attacker,
        );
      });

      it("DELETE is refused and the row is still there", async () => {
        await expectDeleteRefused(w.personas[attacker].client, w.service, TABLE, { event_id: eventId }, attacker);
      });
    });
  }
});
