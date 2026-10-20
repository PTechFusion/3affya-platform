"use server";
// Availability save (screen 30). Prototype stub: it checks the whole model the editor sent, converts it to what would be
// stored (UTC instants plus the rule zone), and returns { ok } without writing anything.
// Task 2.6 replaces the stub: the professional comes from the Supabase session (never from the client), the rules and
// exceptions are replaced in one transaction on availability_rules and availability_exceptions (RLS: own rows only), idempotent
// on a schedule version the editor sends, and Accepting new patients flips on only when the stored rule count goes from zero to
// one or more (rule B6). Nothing slow runs here, so the editor can save on every change.
import { availabilityFor } from "@/lib/sample";
import { PROTOTYPE_DOCTOR_ID, parseModel, storedFromModel, todayIn } from "./model";

export type SaveAvailabilityResult = { ok: true; acceptingNewPatients: boolean } | { ok: false; error: "validation" | "unavailable" };

export async function saveAvailability(raw: unknown): Promise<SaveAvailabilityResult> {
  const now = new Date();
  const model = parseModel(raw, now);
  if (!model) return { ok: false, error: "validation" };
  if (!availabilityFor(PROTOTYPE_DOCTOR_ID)) return { ok: false, error: "unavailable" };

  const stored = storedFromModel(model, todayIn(model.timeZone, now));
  // Rule B6: no weekly hours, nothing to book, so not accepting; the first saved hours turn it on.
  return { ok: true, acceptingNewPatients: stored.rules.length > 0 };
}
