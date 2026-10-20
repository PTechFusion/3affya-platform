"use server";
// AI job server actions (screen 45, task 3.11). Prototype stubs: each re-checks the job id and that the job is in a state the
// action applies to (never trust the client), then returns the { ok, error } union. Nothing is started, stopped or written.
// The real versions first resolve the signed-in admin with the TOTP factor on the server ("notAllowed" otherwise), write an
// audit_log row, and send an Inngest event idempotent on a key stored in the database:
// - retryAiJob: records.retry for a failed job, keyed on job id plus the next attempt number, so a double click queues one
//   retry. It runs records.process again from the failed page with the same quote: no second quote, no new charge (task 3.8).
// - cancelAiJob: records.cancel; the Inngest function stops at the next step boundary and the patient is not charged.
// Money state is written only by the Stripe webhook handler, never here.
import { jobStatus } from "@/lib/ai-jobs";
import { sampleAiJobById } from "@/lib/sample";

export type JobActionResult = { ok: true } | { ok: false; error: "notFound" | "state" | "unavailable" | "notAllowed" };

const ID = /^job_[0-9]{3}$/;

export async function retryAiJob(input: { id: unknown }): Promise<JobActionResult> {
  const job = typeof input.id === "string" && ID.test(input.id) ? sampleAiJobById(input.id) : undefined;
  if (!job) return { ok: false, error: "notFound" };
  if (jobStatus(job) !== "failed") return { ok: false, error: "state" };
  return { ok: true };
}

export async function cancelAiJob(input: { id: unknown }): Promise<JobActionResult> {
  const job = typeof input.id === "string" && ID.test(input.id) ? sampleAiJobById(input.id) : undefined;
  if (!job) return { ok: false, error: "notFound" };
  const status = jobStatus(job);
  if (status !== "queued" && status !== "processing") return { ok: false, error: "state" };
  return { ok: true };
}
