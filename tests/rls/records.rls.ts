// Records rules from round 3 of the L1 schema (migrations 3, 7 and 9). A stored file's path is an allowlist, not a
// prefix: exactly {patient_id}/{set_id}/<name> for record_files and {professional_id}/<name> for credentials, a name of
// letters, digits, '_' and '-' with one optional extension, because supabase-js resolves '..', './' and '%2e%2e' in an
// object URL before sending it and a crafted path would reach another folder. A patient deletes its own set, but not one
// the pipeline is working on (queued or processing). Deleting a set queues its storage folder for the purge job
// (private.storage_purges, read and marked through two service-only functions); its AI jobs keep their cost history and
// its records receipt the payment, with the link set to null.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aiLimits, business } from "../../config/business";
import { buildWorld, PDF, pendingPurges, randomHex, SYNTHETIC_PDF, type World } from "./support/fixtures";
import { expectDeleteRefused, must, PERMISSION_DENIED, readAsService, type Row } from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("records");
});

afterAll(async () => {
  await w?.cleanup();
});

// The ways a path could leave its folder, appended to the owner's folder: '..' up into another tenant's folder, the same
// percent-encoded, './', a backslash, an extra segment and a space.
function escapes(own: string, other: string): Array<[string, string]> {
  return [
    ["'..' segments", `${own}/../../${other}/x.pdf`],
    ["'%2e%2e' segments", `${own}/%2e%2e/%2E%2E/${other}/x.pdf`],
    ["a './' segment", `${own}/./x.pdf`],
    ["a backslash", `${own}/..\\..\\x.pdf`],
    ["an extra segment", `${own}/sub/x.pdf`],
    ["a space", `${own}/my scan.pdf`],
  ];
}

describe("storage_path is an allowlist", () => {
  let position = 10;
  const recordFile = (path: string): Row => ({
    set_id: w.ids.setADraft,
    patient_id: w.user("patientA"),
    position: position++,
    name: "scan.pdf",
    kind: "pdf",
    mime_type: PDF,
    size_bytes: SYNTHETIC_PDF.byteLength,
    storage_path: path,
  });
  const credential = (path: string): Row => ({
    professional_id: w.ids.professionalA,
    kind: "other",
    file_name: "scan.pdf",
    storage_path: path,
    mime_type: PDF,
    size_bytes: SYNTHETIC_PDF.byteLength,
  });
  const ownSet = () => `${w.user("patientA")}/${w.ids.setADraft}`;
  const otherSet = () => `${w.user("patientB")}/${w.ids.setB}`;

  for (const index of [0, 1, 2, 3, 4, 5]) {
    it(`a record_files path with ${escapes("own", "other")[index]?.[0]} is refused (23514), even in the patient's own draft set`, async () => {
      const [, path] = escapes(ownSet(), otherSet())[index] as [string, string];
      const { error } = await w.personas.patientA.client.from("record_files").insert(recordFile(path));
      expect(error, `record_files path ${path} was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain("record_files_path_in_set_folder");
      expect(await readAsService(w.service, "record_files", { storage_path: path })).toBeNull();
    });

    it(`a credentials path with ${escapes("own", "other")[index]?.[0]} is refused (23514), even in the professional's own folder`, async () => {
      const [, path] = escapes(w.ids.professionalA, w.ids.professionalB)[index] as [string, string];
      const { error } = await w.personas.professionalA.client.from("credentials").insert(credential(path));
      expect(error, `credentials path ${path} was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain("credentials_path_in_own_folder");
      expect(await readAsService(w.service, "credentials", { storage_path: path })).toBeNull();
    });
  }

  it("the service client is held to the same paths", async () => {
    const [, recordsPath] = escapes(ownSet(), otherSet())[0] as [string, string];
    const records = await w.service.from("record_files").insert(recordFile(recordsPath));
    expect(records.error?.code, records.error?.message).toBe("23514");
    const [, credentialPath] = escapes(w.ids.professionalA, w.ids.professionalB)[0] as [string, string];
    const credentials = await w.service.from("credentials").insert(credential(credentialPath));
    expect(credentials.error?.code, credentials.error?.message).toBe("23514");
  });

  it("control: '<patient>/<set>/f1-scan.pdf' and '<professional>/f1-scan.pdf' are accepted", async () => {
    const file = await w.personas.patientA.client.from("record_files").insert(recordFile(`${ownSet()}/f1-scan.pdf`));
    expect(file.error, file.error?.message).toBeNull();
    const licence = await w.personas.professionalA.client
      .from("credentials")
      .insert(credential(`${w.ids.professionalA}/f1-scan.pdf`));
    expect(licence.error, licence.error?.message).toBeNull();
  });
});

describe("deleting a record set", () => {
  const working: Record<string, string> = {};
  let recordsReceipt: string;

  beforeAll(async () => {
    // Two sets the pipeline is working on, and a records payment for done set A.
    for (const status of ["queued", "processing"] as const) {
      const set = must(
        await w.service.from("record_sets").insert({ patient_id: w.user("patientA"), status }).select("id").single(),
        `${status} set`,
      ) as { id: string };
      working[status] = set.id;
    }
    const receipt = must(
      await w.service
        .from("receipts")
        .insert({
          subject: "records",
          record_set_id: w.ids.setA,
          patient_id: w.user("patientA"),
          receipt_number: `RLS-${w.runId}-records`,
          currency: business.currencyPresentment,
          amount_cents: business.recordsBlockPriceCents,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: `pi_rlstest_${w.runId}_${randomHex(4)}`,
        })
        .select("id")
        .single(),
      "records receipt",
    ) as { id: string };
    recordsReceipt = receipt.id;
  });

  for (const status of ["queued", "processing"] as const) {
    it(`patient A cannot delete its set while it is ${status}`, async () => {
      await expectDeleteRefused(w.personas.patientA.client, w.service, "record_sets", { id: working[status] as string }, "patientA");
    });
  }

  it("control: patient A deletes its draft set and its done set", async () => {
    expect((await readAsService(w.service, "ai_jobs", { id: w.ids.aiJobA }))?.set_id).toBe(w.ids.setA);
    for (const id of [w.ids.setADraft, w.ids.setA]) {
      const { error, count } = await w.personas.patientA.client.from("record_sets").delete({ count: "exact" }).eq("id", id);
      expect(error, error?.message).toBeNull();
      expect(count, `set ${id} deleted`).toBe(1);
      expect(await readAsService(w.service, "record_sets", { id })).toBeNull();
    }
  });

  it("the set's AI job survives with set_id null (cost history stays)", async () => {
    const job = await readAsService(w.service, "ai_jobs", { id: w.ids.aiJobA });
    expect(job, "the AI job went with its set").not.toBeNull();
    expect(job).toMatchObject({ set_id: null, cost_currency: aiLimits.costCurrency });
  });

  it("the set's records receipt survives with record_set_id null", async () => {
    expect(await readAsService(w.service, "receipts", { id: recordsReceipt })).toMatchObject({
      subject: "records",
      record_set_id: null,
      booking_id: null,
      patient_id: w.user("patientA"),
    });
  });

  it("each deleted set's folder is queued for the purge job, which marks it purged once", async () => {
    const pending = await pendingPurges(w.service);
    for (const set of [w.ids.setADraft, w.ids.setA]) {
      const prefix = `${w.user("patientA")}/${set}/`;
      const queued = pending.filter((row) => row.prefix === prefix);
      expect(queued, `purge rows for ${prefix}`).toHaveLength(1);
      expect(queued[0]?.bucket_id).toBe("records");
      const id = (queued[0] as { id: number }).id;
      const marked = await w.service.rpc("mark_storage_purged", { purge_id: id });
      expect(marked.error, marked.error?.message).toBeNull();
      expect(marked.data).toBe(true);
      const again = await w.service.rpc("mark_storage_purged", { purge_id: id });
      expect(again.error, again.error?.message).toBeNull();
      expect(again.data, "a purge was marked twice").not.toBe(true);
    }
    const after = (await pendingPurges(w.service)).map((row) => row.prefix);
    expect(after).not.toContain(`${w.user("patientA")}/${w.ids.setA}/`);
    expect(after).not.toContain(`${w.user("patientA")}/${w.ids.setADraft}/`);
  });

  it("deleting a patient's account queues the folders of its sets too (the cascade fires the same trigger)", async () => {
    const leaver = await w.addAccount("setleaver", "patient");
    const set = must(
      await w.service.from("record_sets").insert({ patient_id: leaver.userId, status: "done" }).select("id").single(),
      "the leaver's set",
    ) as { id: string };
    const { error } = await w.service.auth.admin.deleteUser(leaver.userId);
    expect(error, error?.message).toBeNull();
    expect(await readAsService(w.service, "record_sets", { id: set.id }), "the set outlived the account").toBeNull();
    const queued = (await pendingPurges(w.service)).filter((row) => row.prefix === `${leaver.userId}/${set.id}/`);
    expect(queued, "purge rows for the deleted account's set").toHaveLength(1);
    const marked = await w.service.rpc("mark_storage_purged", { purge_id: (queued[0] as { id: number }).id });
    expect(marked.data).toBe(true);
  });

  it("a set nobody deleted is not queued", async () => {
    const prefixes = (await pendingPurges(w.service)).map((row) => row.prefix);
    expect(prefixes).not.toContain(`${w.user("patientB")}/${w.ids.setB}/`);
  });

  for (const persona of ["anon", "patientA", "professionalA", "admin"] as const) {
    it(`${persona} can neither read nor mark the purge queue`, async () => {
      const client = w.personas[persona].client;
      const read = await client.rpc("pending_storage_purges", { max_rows: 10 });
      expect(read.data, `${persona} read the purge queue`).toBeNull();
      expect(read.error?.code, read.error?.message).toBe(PERMISSION_DENIED);
      const mark = await client.rpc("mark_storage_purged", { purge_id: 1 });
      expect(mark.data, `${persona} marked a purge`).toBeNull();
      expect(mark.error?.code, mark.error?.message).toBe(PERMISSION_DENIED);
    });
  }
});
