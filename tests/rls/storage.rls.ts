// Storage object policies (migration 9). records/{patient_id}/{set_id}/{file}: the patient uploads into its own draft
// set and reads its own files; nobody else reads them through the API, a professional with a live share included (round
// 3: server code checks the share and mints a short signed URL with the service role, so a link cannot outlive the share).
// credentials/{professional_id}/{file}: the professional and an aal2 admin only (task 2.4); its owner deletes a file only
// while its credentials row is pending review. cards (public to read by URL): the professional writes only
// cards/{professional_id}/photo/..., never another folder nor the renderer's card/ folder. The Storage API answers "not
// found" for an object RLS hides, so a refusal is 400, 403 or 404, checked after the service client has shown the object
// exists.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { storageRules } from "../../config/business";
import { buildWorld, PDF, PNG, SYNTHETIC_PDF, SYNTHETIC_PNG, type World } from "./support/fixtures";
import {
  expectDownloadAllowed,
  expectDownloadRefused,
  expectListRefused,
  expectSignRefused,
  expectUploadRefused,
  objectExists,
} from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("storage");
});

afterAll(async () => {
  await w?.cleanup();
});

describe("records bucket", () => {
  it("control: each patient downloads its own records object", async () => {
    await expectDownloadAllowed(w.personas.patientA.client, "records", w.paths.recordsA, "patientA");
    await expectDownloadAllowed(w.personas.patientB.client, "records", w.paths.recordsB, "patientB");
  });

  for (const persona of ["patientA", "professionalA", "anon", "adminNoTotp"] as const) {
    it(`${persona} cannot download patient B's records object`, async () => {
      await expectDownloadRefused(w.personas[persona].client, w.service, "records", w.paths.recordsB, persona);
    });
  }

  // The service client lists the object under the prefix first, so an empty list here is a refusal, not a wrong prefix.
  it("patient A cannot list patient B's set folder", async () => {
    await expectListRefused(
      w.personas.patientA.client,
      w.service,
      "records",
      `${w.user("patientB")}/${w.ids.setB}`,
      "synthetic-b.pdf",
      "patientA",
    );
  });

  it("control: patient B lists its own set folder", async () => {
    const { data, error } = await w.personas.patientB.client.storage.from("records").list(`${w.user("patientB")}/${w.ids.setB}`);
    expect(error, error?.message).toBeNull();
    expect((data ?? []).map((entry) => entry.name)).toContain("synthetic-b.pdf");
  });

  it("patient A cannot delete patient B's records object", async () => {
    await w.personas.patientA.client.storage.from("records").remove([w.paths.recordsB]);
    expect(await objectExists(w.service, "records", w.paths.recordsB), "patient B's object was deleted").toBe(true);
  });

  it("patient A cannot overwrite or move patient B's records object", async () => {
    const client = w.personas.patientA.client.storage.from("records");
    const overwrite = await client.upload(w.paths.recordsB, new TextEncoder().encode("%PDF-1.4 overwritten"), { contentType: PDF, upsert: true });
    expect(overwrite.error, "patient A overwrote patient B's object").not.toBeNull();
    const moved = await client.move(w.paths.recordsB, `${w.user("patientA")}/${w.ids.setADraft}/taken.pdf`);
    expect(moved.error, "patient A moved patient B's object").not.toBeNull();
    const { data } = await w.service.storage.from("records").download(w.paths.recordsB);
    expect(new Uint8Array(await (data as Blob).arrayBuffer())).toEqual(SYNTHETIC_PDF);
  });

  it("patient A cannot upload into patient B's folder, draft set or not", async () => {
    const client = w.personas.patientA.client;
    const patientB = w.user("patientB");
    await expectUploadRefused(client, w.service, "records", `${patientB}/${w.ids.setBDraft}/intruder.pdf`, SYNTHETIC_PDF, PDF, "patientA");
    await expectUploadRefused(client, w.service, "records", `${patientB}/${w.ids.setB}/intruder.pdf`, SYNTHETIC_PDF, PDF, "patientA");
  });

  it("patient A cannot file an upload under its own id but patient B's draft set", async () => {
    await expectUploadRefused(
      w.personas.patientA.client,
      w.service,
      "records",
      `${w.user("patientA")}/${w.ids.setBDraft}/misfiled.pdf`,
      SYNTHETIC_PDF,
      PDF,
      "patientA",
    );
  });

  it("patient A cannot upload into its own set once it is no longer a draft", async () => {
    await expectUploadRefused(w.personas.patientA.client, w.service, "records", `${w.user("patientA")}/${w.ids.setA}/late.pdf`, SYNTHETIC_PDF, PDF, "patientA");
  });

  it("control: patient A uploads into its own draft set", async () => {
    const path = `${w.user("patientA")}/${w.ids.setADraft}/upload.pdf`;
    const { error } = await w.personas.patientA.client.storage.from("records").upload(path, SYNTHETIC_PDF, { contentType: PDF });
    expect(error, error?.message).toBeNull();
    expect(await objectExists(w.service, "records", path)).toBe(true);
  });

  it("patient A cannot delete the files of its own set while the pipeline works on it; once it stops, it can", async () => {
    const path = `${w.user("patientA")}/${w.ids.setA}/in-pipeline.pdf`;
    const stored = await w.service.storage.from("records").upload(path, SYNTHETIC_PDF, { contentType: PDF });
    expect(stored.error, stored.error?.message).toBeNull();
    const before = await w.service.from("record_sets").select("status").eq("id", w.ids.setA).single();
    expect(before.error, before.error?.message).toBeNull();
    const original = (before.data as { status: string }).status;
    try {
      for (const status of ["queued", "processing"]) {
        const moved = await w.service.from("record_sets").update({ status }).eq("id", w.ids.setA);
        expect(moved.error, moved.error?.message).toBeNull();
        await w.personas.patientA.client.storage.from("records").remove([path]);
        expect(await objectExists(w.service, "records", path), `the file of a ${status} set was deleted`).toBe(true);
      }
    } finally {
      await w.service.from("record_sets").update({ status: original }).eq("id", w.ids.setA);
    }
    const { error } = await w.personas.patientA.client.storage.from("records").remove([path]);
    expect(error, error?.message).toBeNull();
    expect(await objectExists(w.service, "records", path), "the file of a stopped set could not be deleted").toBe(false);
  });

  it("anonymous cannot upload anywhere in records", async () => {
    await expectUploadRefused(w.personas.anon.client, w.service, "records", `${w.user("patientA")}/${w.ids.setADraft}/anon.pdf`, SYNTHETIC_PDF, PDF, "anon");
  });

  // Round 3: a client that may select an object chooses its signed URL's lifetime, so no professional selects records
  // objects; server code mints the link after checking the share (L6).
  it("professional B, with a live share, cannot download, list or sign the shared set's file through its own client", async () => {
    const client = w.personas.professionalB.client;
    const live = await w.service.from("record_shares").select("revoked_at, expires_at").eq("id", w.ids.shareB).single();
    expect(live.data?.revoked_at, "the share is live").toBeNull();
    expect(Date.parse(String(live.data?.expires_at))).toBeGreaterThan(Date.now());
    await expectDownloadRefused(client, w.service, "records", w.paths.recordsB, "professionalB");
    await expectListRefused(client, w.service, "records", `${w.user("patientB")}/${w.ids.setB}`, "synthetic-b.pdf", "professionalB");
    await expectSignRefused(client, w.service, "records", w.paths.recordsB, storageRules.recordsSignedUrlSeconds, "professionalB");
  });

  it("control: patient B signs its own file, and the link serves it", async () => {
    const { data, error } = await w.personas.patientB.client.storage
      .from("records")
      .createSignedUrl(w.paths.recordsB, storageRules.recordsSignedUrlSeconds);
    expect(error, error?.message).toBeNull();
    const response = await fetch(String(data?.signedUrl), { signal: AbortSignal.timeout(30_000) });
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(SYNTHETIC_PDF);
  });

  it("professional B cannot download the file of a set whose share has expired", async () => {
    await expectDownloadRefused(w.personas.professionalB.client, w.service, "records", w.paths.recordsB2, "professionalB");
  });

  it("once patient B ends the share, professional B still cannot download or sign the file", async () => {
    const { error } = await w.personas.patientB.client
      .from("record_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", w.ids.shareB);
    expect(error, error?.message).toBeNull();
    const client = w.personas.professionalB.client;
    await expectDownloadRefused(client, w.service, "records", w.paths.recordsB, "professionalB");
    await expectSignRefused(client, w.service, "records", w.paths.recordsB, storageRules.recordsSignedUrlSeconds, "professionalB");
  });

  it("control: patient B still downloads its file after ending the share", async () => {
    await expectDownloadAllowed(w.personas.patientB.client, "records", w.paths.recordsB, "patientB");
  });
});

describe("credentials bucket", () => {
  it("control: professional B downloads its own credential and an aal2 admin reviews it", async () => {
    await expectDownloadAllowed(w.personas.professionalB.client, "credentials", w.paths.credentialB, "professionalB");
    await expectDownloadAllowed(w.personas.admin.client, "credentials", w.paths.credentialB, "admin");
  });

  for (const persona of ["patientA", "patientB", "professionalA", "anon", "adminNoTotp"] as const) {
    it(`${persona} cannot read professional B's credential object`, async () => {
      await expectDownloadRefused(w.personas[persona].client, w.service, "credentials", w.paths.credentialB, persona);
    });
  }

  it("professional A cannot upload into professional B's folder", async () => {
    await expectUploadRefused(
      w.personas.professionalA.client,
      w.service,
      "credentials",
      `${w.ids.professionalB}/planted.pdf`,
      SYNTHETIC_PDF,
      PDF,
      "professionalA",
    );
  });

  it("a patient cannot upload a credential", async () => {
    await expectUploadRefused(w.personas.patientA.client, w.service, "credentials", `${w.ids.professionalA}/patient.pdf`, SYNTHETIC_PDF, PDF, "patientA");
  });

  it("professional A cannot delete professional B's credential object", async () => {
    await w.personas.professionalA.client.storage.from("credentials").remove([w.paths.credentialB]);
    expect(await objectExists(w.service, "credentials", w.paths.credentialB), "professional B's credential was deleted").toBe(true);
  });

  // The credentials table keeps a decided file as the review's evidence (credentials_delete_own_pending, "insert, delete
  // while pending"); its stored object must outlive the decision too.
  it("professional B cannot delete the stored file of a credential that has been reviewed", async () => {
    const decided = await w.service
      .from("credentials")
      .update({ review_status: "accepted", reviewed_at: new Date().toISOString(), reviewed_by: w.user("admin") })
      .eq("id", w.ids.credentialB)
      .select("review_status")
      .single();
    expect(decided.error, decided.error?.message).toBeNull();
    const rowDelete = await w.personas.professionalB.client.from("credentials").delete({ count: "exact" }).eq("id", w.ids.credentialB);
    expect(rowDelete.count, "the decided credential row was deleted").toBe(0);
    await w.personas.professionalB.client.storage.from("credentials").remove([w.paths.credentialB]);
    expect(await objectExists(w.service, "credentials", w.paths.credentialB), "the reviewed credential's file was deleted").toBe(true);
  });

  it("professional B cannot delete the stored file of a credential that was rejected", async () => {
    const path = `${w.ids.professionalB}/rejected-${w.runId}.pdf`;
    const inserted = await w.service
      .from("credentials")
      .insert({
        id: randomUUID(),
        professional_id: w.ids.professionalB,
        kind: "board",
        file_name: "board.pdf",
        storage_path: path,
        mime_type: PDF,
        size_bytes: SYNTHETIC_PDF.byteLength,
        review_status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: w.user("admin"),
        rejection_reason_en: "Synthetic rejection (RLS fixture)",
      })
      .select("id")
      .single();
    expect(inserted.error, inserted.error?.message).toBeNull();
    const uploaded = await w.service.storage.from("credentials").upload(path, SYNTHETIC_PDF, { contentType: PDF });
    expect(uploaded.error, uploaded.error?.message).toBeNull();
    await w.personas.professionalB.client.storage.from("credentials").remove([path]);
    expect(await objectExists(w.service, "credentials", path), "the rejected credential's file was deleted").toBe(true);
  });

  // The file goes first, while its row is still there and pending: the storage policy reads that row.
  it("control: professional A deletes the file of a credential still pending review, then takes back the row", async () => {
    const client = w.personas.professionalA.client;
    expect((await w.service.from("credentials").select("review_status").eq("id", w.ids.credentialA).single()).data).toEqual({
      review_status: "pending",
    });
    const removed = await client.storage.from("credentials").remove([w.paths.credentialA]);
    expect(removed.error, removed.error?.message).toBeNull();
    expect(await objectExists(w.service, "credentials", w.paths.credentialA), "the pending credential's file is still there").toBe(false);
    const row = await client.from("credentials").delete({ count: "exact" }).eq("id", w.ids.credentialA);
    expect(row.error, row.error?.message).toBeNull();
    expect(row.count).toBe(1);
  });
});

describe("cards bucket", () => {
  const REPLACEMENT_PNG = new Uint8Array([...SYNTHETIC_PNG, ...new TextEncoder().encode("synthetic replacement")]);
  // Professional B's photo, professional A's own photo, and A's ID card image as the renderer (service role) writes it.
  const photoB = () => `${w.ids.professionalB}/photo/b-${w.runId}.png`;
  const photoA = () => `${w.ids.professionalA}/photo/a-${w.runId}.png`;
  const cardA = () => `${w.ids.professionalA}/card/card-${w.runId}.png`;

  beforeAll(async () => {
    for (const path of [photoB(), photoA(), cardA()]) {
      const { error } = await w.service.storage.from("cards").upload(path, SYNTHETIC_PNG, { contentType: PNG });
      if (error) throw new Error(`fixture upload cards/${path} failed: ${error.message}`);
    }
  });

  async function storedBytes(path: string): Promise<Uint8Array> {
    const { data, error } = await w.service.storage.from("cards").download(path);
    expect(error, `service download of cards/${path} failed: ${error?.message}`).toBeNull();
    return new Uint8Array(await (data as Blob).arrayBuffer());
  }

  it("professional A cannot upload into professional B's folder, nor replace B's photo", async () => {
    const cards = w.personas.professionalA.client.storage.from("cards");
    await expectUploadRefused(
      w.personas.professionalA.client,
      w.service,
      "cards",
      `${w.ids.professionalB}/photo/planted-${w.runId}.png`,
      SYNTHETIC_PNG,
      PNG,
      "professionalA",
    );
    const upsert = await cards.upload(photoB(), REPLACEMENT_PNG, { contentType: PNG, upsert: true });
    expect(upsert.error, "professional A upserted over professional B's photo").not.toBeNull();
    const update = await cards.update(photoB(), REPLACEMENT_PNG, { contentType: PNG });
    expect(update.error, "professional A replaced professional B's photo").not.toBeNull();
    expect(await storedBytes(photoB())).toEqual(SYNTHETIC_PNG);
  });

  it("professional A cannot move professional B's photo out, nor its own photo into B's folder", async () => {
    const cards = w.personas.professionalA.client.storage.from("cards");
    const taken = `${w.ids.professionalA}/photo/taken-${w.runId}.png`;
    const out = await cards.move(photoB(), taken);
    expect(out.error, "professional A moved professional B's photo").not.toBeNull();
    expect(await objectExists(w.service, "cards", photoB()), "professional B's photo is gone").toBe(true);
    expect(await objectExists(w.service, "cards", taken), "professional B's photo arrived in A's folder").toBe(false);
    const pushed = `${w.ids.professionalB}/photo/pushed-${w.runId}.png`;
    const into = await cards.move(photoA(), pushed);
    expect(into.error, "professional A moved its photo into professional B's folder").not.toBeNull();
    expect(await objectExists(w.service, "cards", photoA()), "professional A's photo is gone").toBe(true);
    expect(await objectExists(w.service, "cards", pushed), "an object arrived in professional B's folder").toBe(false);
  });

  it("professional A cannot delete professional B's photo", async () => {
    await w.personas.professionalA.client.storage.from("cards").remove([photoB()]);
    expect(await objectExists(w.service, "cards", photoB()), "professional B's photo was deleted").toBe(true);
  });

  it("professional A cannot write the renderer's card/ folder, nor its own folder outside photo/", async () => {
    const client = w.personas.professionalA.client;
    const own = w.ids.professionalA;
    await expectUploadRefused(client, w.service, "cards", `${own}/card/forged-${w.runId}.png`, SYNTHETIC_PNG, PNG, "professionalA");
    await expectUploadRefused(client, w.service, "cards", `${own}/loose-${w.runId}.png`, SYNTHETIC_PNG, PNG, "professionalA");
    const upsert = await client.storage.from("cards").upload(cardA(), REPLACEMENT_PNG, { contentType: PNG, upsert: true });
    expect(upsert.error, "professional A replaced the rendered ID card").not.toBeNull();
    expect(await storedBytes(cardA())).toEqual(SYNTHETIC_PNG);
    await client.storage.from("cards").remove([cardA()]);
    expect(await objectExists(w.service, "cards", cardA()), "professional A deleted the rendered ID card").toBe(true);
  });

  for (const persona of ["patientA", "anon", "adminNoTotp"] as const) {
    it(`${persona} cannot write cards`, async () => {
      const client = w.personas[persona].client;
      await expectUploadRefused(
        client,
        w.service,
        "cards",
        `${w.ids.professionalA}/photo/${persona.toLowerCase()}-${w.runId}.png`,
        SYNTHETIC_PNG,
        PNG,
        persona,
      );
      const upsert = await client.storage.from("cards").upload(photoA(), REPLACEMENT_PNG, { contentType: PNG, upsert: true });
      expect(upsert.error, `${persona} replaced professional A's photo`).not.toBeNull();
      await client.storage.from("cards").remove([photoA()]);
      expect(await storedBytes(photoA()), `${persona} changed or deleted professional A's photo`).toEqual(SYNTHETIC_PNG);
    });
  }

  it("control: professional A uploads, replaces and deletes a photo in its own photo/ folder", async () => {
    const cards = w.personas.professionalA.client.storage.from("cards");
    const path = `${w.ids.professionalA}/photo/upload-${w.runId}.png`;
    const uploaded = await cards.upload(path, SYNTHETIC_PNG, { contentType: PNG });
    expect(uploaded.error, uploaded.error?.message).toBeNull();
    expect(await storedBytes(path)).toEqual(SYNTHETIC_PNG);
    const replaced = await cards.upload(path, REPLACEMENT_PNG, { contentType: PNG, upsert: true });
    expect(replaced.error, replaced.error?.message).toBeNull();
    expect(await storedBytes(path)).toEqual(REPLACEMENT_PNG);
    const removed = await cards.remove([path]);
    expect(removed.error, removed.error?.message).toBeNull();
    expect(await objectExists(w.service, "cards", path), "professional A's photo is still there").toBe(false);
  });

  it("control: anon fetches a photo by its public URL", async () => {
    const { data } = w.personas.anon.client.storage.from("cards").getPublicUrl(photoB());
    const response = await fetch(data.publicUrl, { signal: AbortSignal.timeout(30_000) });
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(SYNTHETIC_PNG);
  });
});
