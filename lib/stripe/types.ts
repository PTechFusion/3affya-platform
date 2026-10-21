// Row types for public.stripe_events (supabase/migrations/20261021000100_l2_stripe_events.sql), declared here because
// lib/db/types.ts is generated from L1's schema and does not list this lane's table yet (lanes README, section 4). Once
// the types are regenerated after the merges, switch these to Tables<"stripe_events"> and friends from lib/db/types.ts
// and drop StripeEventsDatabase; the shapes below follow the generator's output, so nothing else changes.
import type { Json } from "@/lib/db/types";

// Type aliases, not interfaces: supabase-js needs rows assignable to Record<string, unknown>, which an interface is not.

/** One webhook event as stored. Instants are ISO 8601 strings in UTC, as PostgREST returns timestamptz. */
export type StripeEventRow = {
  event_id: string;
  type: string;
  created_at: string;
  received_at: string;
  attempted_at: string;
  payload: Json;
  handled_at: string | null;
  error: string | null;
};

export type StripeEventInsert = {
  event_id: string;
  type: string;
  created_at: string;
  received_at?: string;
  attempted_at?: string;
  payload: Json;
  handled_at?: string | null;
  error?: string | null;
};

export type StripeEventUpdate = Partial<StripeEventInsert>;

/** The one table this lane adds, in the shape supabase-js expects, so lib/stripe/events.ts gets typed queries. */
export type StripeEventsDatabase = {
  public: {
    Tables: {
      stripe_events: {
        Row: StripeEventRow;
        Insert: StripeEventInsert;
        Update: StripeEventUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
