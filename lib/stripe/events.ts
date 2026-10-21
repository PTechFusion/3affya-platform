// The webhook's database layer: the four writes the route makes to public.stripe_events, and nothing else. The route takes
// its client from createServiceClient({ kind: "system", name: "stripe-webhook" }); this module never builds one, so the
// unit tests replace it whole. Every request carries lib/db/client.ts's timeout.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbClient } from "@/lib/db/client";
import type { StripeEventInsert, StripeEventsDatabase } from "@/lib/stripe/types";

export type InsertOutcome = "inserted" | "duplicate";

export interface StripeEventStore {
  /** Records a verified event before any handler runs. "duplicate" when its event_id is already on file. */
  insert(row: StripeEventInsert): Promise<InsertOutcome>;
  /**
   * Takes back an event whose earlier attempt failed (an error recorded, never handled) for one more attempt. True only
   * for the one caller whose update matched, so two concurrent retries never both run the handler.
   */
  reclaimFailed(eventId: string): Promise<boolean>;
  /** A handler finished: stamps handled_at and clears any earlier error. */
  markHandled(eventId: string, handledAt: Date): Promise<void>;
  /** A handler threw: records the error on the row, which stays unhandled so Stripe's retry can take it back. */
  markFailed(eventId: string, error: string): Promise<void>;
}

/** A database call failed. Carries the PostgREST or Postgres code only: messages can quote row values. */
export class StripeEventStoreError extends Error {
  constructor(
    readonly operation: "insert" | "reclaimFailed" | "markHandled" | "markFailed",
    readonly code: string | undefined,
  ) {
    super(`stripe_events ${operation} failed${code ? ` (${code})` : ""}`);
    this.name = "StripeEventStoreError";
  }
}

export function createStripeEventStore(db: DbClient): StripeEventStore {
  // stripe_events is not in the generated Database type until it is regenerated after the merges (lib/stripe/types.ts).
  const typed = db as unknown as SupabaseClient<StripeEventsDatabase>;
  const ledger = () => typed.from("stripe_events");

  return {
    async insert(row) {
      // insert ... on conflict (event_id) do nothing returning event_id: a row back means this request recorded it.
      const { data, error } = await ledger()
        .upsert(row, { onConflict: "event_id", ignoreDuplicates: true })
        .select("event_id");
      if (error) throw new StripeEventStoreError("insert", error.code);
      return (data ?? []).length > 0 ? "inserted" : "duplicate";
    },

    async reclaimFailed(eventId) {
      const { data, error } = await ledger()
        .update({ error: null })
        .eq("event_id", eventId)
        .is("handled_at", null)
        .not("error", "is", null)
        .select("event_id");
      if (error) throw new StripeEventStoreError("reclaimFailed", error.code);
      return (data ?? []).length > 0;
    },

    async markHandled(eventId, handledAt) {
      const { error } = await ledger().update({ handled_at: handledAt.toISOString(), error: null }).eq("event_id", eventId);
      if (error) throw new StripeEventStoreError("markHandled", error.code);
    },

    async markFailed(eventId, message) {
      const { error } = await ledger().update({ error: message }).eq("event_id", eventId).is("handled_at", null);
      if (error) throw new StripeEventStoreError("markFailed", error.code);
    },
  };
}
