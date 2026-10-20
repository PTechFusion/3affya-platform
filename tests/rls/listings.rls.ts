// Directory rules from round 2 of the L1 schema. A listing leaving 'unclaimed' snapshots its registry facts once into
// professional_private.registry_as_filed (the review, screen 38, shows what the doctor changed); the snapshot is the
// listing's professional's and an admin's to read, nobody else's, and not writable through the API. Deleting the account
// behind a verified listing takes the listing down ('removed', removed_at) and unlinks it, instead of being refused or
// leaving a live page with no owner. Practice and licence states are US only (USPS states, DC and the territories), and
// the training list is bounded (at most 20 lines of 1 to 300 characters). Round 3: an unclaimed row never has an account
// (a claim sets user_id and status in one statement), a listing whose names and city are in another script gets the slug
// 'listing-<last four NPI digits>', and languages and visit types take no entry twice.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildWorld,
  LISTING_TIMEOUT_MS,
  MINUTE,
  retryWhileLocked,
  type Account,
  type World,
} from "./support/fixtures";
import {
  expectReadAllowed,
  expectReadRefused,
  expectUpdateRefused,
  readAsService,
  type Row,
} from "./support/refusal";

let w: World;

beforeAll(async () => {
  w = await buildWorld("listings");
});

afterAll(async () => {
  await w?.cleanup();
});

async function privateRow(professionalId: string): Promise<Row> {
  const row = await readAsService(w.service, "professional_private", { professional_id: professionalId });
  expect(row, `professional_private row of ${professionalId}`).not.toBeNull();
  return row as Row;
}

async function serviceUpdate(id: string, values: Row): Promise<void> {
  const { error } = await w.service.from("professionals").update(values).eq("id", id).select("id").single();
  expect(error, error?.message).toBeNull();
}

describe("the registry snapshot when a listing leaves unclaimed", () => {
  let claimer: Account;
  let listingId: string;
  let snapshot: unknown;
  // The registry facts as imported (synthetic values on a synthetic NPI).
  const registry = {
    first_name: "Rls",
    middle_name: "Quinn",
    last_name: "Registry",
    name_en: "Dr Rls Q Registry",
    city_en: "Austin",
    state_code: "TX",
    practice_country: "US",
    taxonomy_code: "207RC0000X",
    registry_credential: "MD",
    medical_school: "Synthetic School of Medicine",
    graduation_year: 2001,
    group_practice: "Synthetic Group Practice",
    hospital_affiliations: ["Synthetic General Hospital", "Synthetic Children's Hospital"],
    gender: "f",
    registry_source: "nppes",
    registry_as_of: "2026-10-01",
    cms_as_of: "2026-10-02",
  };

  beforeAll(async () => {
    claimer = await w.addAccount("claimer", "professional");
    ({ id: listingId } = await w.insertListing({
      ...registry,
      last_name: `Registry${w.runId}`,
      specialty_id: w.ids.specialtyShown,
    }));
  });

  it("control: an unclaimed registry row has no snapshot", async () => {
    expect((await readAsService(w.service, "professionals", { id: listingId }))?.status).toBe("unclaimed");
    expect((await privateRow(listingId)).registry_as_filed).toBeNull();
  });

  it("the service client's claim snapshots the registry values the row had before the claim", async () => {
    // The same statement also changes the display name and city: the snapshot keeps the values from before it.
    await serviceUpdate(listingId, {
      status: "claimed",
      user_id: claimer.userId,
      claimed_at: new Date().toISOString(),
      name_en: "Dr Claimed Name",
      city_en: "Dallas",
    });
    snapshot = (await privateRow(listingId)).registry_as_filed;
    expect(snapshot).toMatchObject({
      firstName: registry.first_name,
      middleName: registry.middle_name,
      lastName: `Registry${w.runId}`,
      nameEn: registry.name_en,
      cityEn: registry.city_en,
      stateCode: registry.state_code,
      taxonomyCode: registry.taxonomy_code,
      specialtyId: w.ids.specialtyShown,
      registryCredential: registry.registry_credential,
      graduationYear: registry.graduation_year,
      hospitalAffiliations: registry.hospital_affiliations,
      gender: registry.gender,
      registrySource: registry.registry_source,
      registryAsOf: registry.registry_as_of,
      cmsAsOf: registry.cms_as_of,
    });
  });

  it("later status changes keep the first snapshot, a second claim included", async () => {
    // The owner submits for review (the one status move the guard allows it), then the service client puts the row back
    // to unclaimed (unlinking the account in the same statement), changes a registry fact and claims it again.
    const { error, count } = await claimer.client
      .from("professionals")
      .update({ status: "pending_review" }, { count: "exact" })
      .eq("id", listingId);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    expect((await privateRow(listingId)).registry_as_filed).toEqual(snapshot);
    await serviceUpdate(listingId, { status: "unclaimed", user_id: null });
    await serviceUpdate(listingId, { city_en: "Houston", state_code: "NY" });
    await serviceUpdate(listingId, { status: "claimed", user_id: claimer.userId });
    expect((await privateRow(listingId)).registry_as_filed).toEqual(snapshot);
  });

  it("anon, a patient and another professional cannot read the snapshot", async () => {
    for (const persona of ["anon", "patientA", "professionalA", "adminNoTotp"] as const) {
      await expectReadRefused(w.personas[persona].client, "professional_private", [{ professional_id: listingId }], persona);
      const column = await w.personas[persona].client.from("professional_private").select("registry_as_filed").eq("professional_id", listingId);
      if (!column.error) expect(column.data, `${persona} read registry_as_filed`).toEqual([]);
    }
  });

  it("control: the listing's own professional and an aal2 admin read it", async () => {
    const own = await expectReadAllowed(claimer.client, "professional_private", { professional_id: listingId }, "claimer");
    expect(own.registry_as_filed).toEqual(snapshot);
    const reviewed = await expectReadAllowed(w.personas.admin.client, "professional_private", { professional_id: listingId }, "admin");
    expect(reviewed.registry_as_filed).toEqual(snapshot);
  });

  it("the owner cannot rewrite its snapshot", async () => {
    await expectUpdateRefused(
      claimer.client,
      w.service,
      "professional_private",
      { professional_id: listingId },
      { registry_as_filed: { ...(snapshot as Row), nameEn: "Dr Rewritten" } },
      "claimer",
    );
  });
});

describe("deleting the account behind a verified listing", () => {
  let leaver: Account;
  let listingId: string;

  beforeAll(async () => {
    leaver = await w.addAccount("leaver", "professional");
    ({ id: listingId } = await w.insertListing({
      user_id: leaver.userId,
      status: "verified",
      verified_on: new Date().toISOString().slice(0, 10),
      source: "self",
      first_name: "Rls",
      last_name: `Leaver${w.runId}`,
      name_en: "Dr Rls Leaver",
      city_en: "Testville",
      state_code: "NY",
      specialty_id: w.ids.specialtyShown,
      accepting_new_patients: true,
    }));
  });

  it("control: anon reads the verified listing while its account exists", async () => {
    await expectReadAllowed(w.personas.anon.client, "professionals", { id: listingId }, "anon");
  });

  it("the Auth admin API deletes the account; the listing is 'removed', with removed_at and no account", async () => {
    const { error } = await w.service.auth.admin.deleteUser(leaver.userId);
    expect(error, error?.message).toBeNull();
    const row = await readAsService(w.service, "professionals", { id: listingId });
    expect(row, "the listing was deleted with the account").not.toBeNull();
    expect(row?.status).toBe("removed");
    expect(row?.user_id).toBeNull();
    expect(Math.abs(Date.parse(String(row?.removed_at)) - Date.now()), `removed_at ${String(row?.removed_at)}`).toBeLessThan(MINUTE);
    expect(await readAsService(w.service, "profiles", { id: leaver.userId }), "the profile outlived the account").toBeNull();
  });

  it("anon and signed-in users no longer read it", async () => {
    for (const persona of ["anon", "patientA", "professionalA"] as const) {
      await expectReadRefused(w.personas[persona].client, "professionals", [{ id: listingId }], persona);
    }
  });
});

describe("practice and licence states are US only; training is bounded", () => {
  for (const code of ["ON", "AE"] as const) {
    it(`professional A cannot set its practice state to '${code}'`, async () => {
      const before = await readAsService(w.service, "professionals", { id: w.ids.professionalA });
      const { error } = await w.personas.professionalA.client.from("professionals").update({ state_code: code }).eq("id", w.ids.professionalA);
      expect(error, `state_code '${code}' was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain("state_code");
      expect(await readAsService(w.service, "professionals", { id: w.ids.professionalA })).toEqual(before);
    });
  }

  it("control: professional A sets its practice state to 'TX'", async () => {
    const { error, count } = await w.personas.professionalA.client
      .from("professionals")
      .update({ state_code: "TX" }, { count: "exact" })
      .eq("id", w.ids.professionalA);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
    expect((await readAsService(w.service, "professionals", { id: w.ids.professionalA }))?.state_code).toBe("TX");
  });

  it("a listing not yet verified cannot set its licence state to 'ON' either", async () => {
    const { error } = await w.personas.professionalPending.client
      .from("professionals")
      .update({ licence_state: "ON" })
      .eq("id", w.ids.professionalPending);
    expect(error, "licence_state 'ON' was accepted").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("licence_state");
  });

  it("the training list is bounded: 21 lines, a line of 301 characters or an empty line is refused", async () => {
    const before = await readAsService(w.service, "professionals", { id: w.ids.professionalA });
    for (const training of [Array.from({ length: 21 }, (_, i) => `Line ${i + 1}`), ["x".repeat(301)], [""]]) {
      const { error } = await w.personas.professionalA.client.from("professionals").update({ training }).eq("id", w.ids.professionalA);
      expect(error, `training of ${training.length} lines (longest ${Math.max(...training.map((t) => t.length))}) was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
      expect(error?.message).toContain("training");
    }
    expect(await readAsService(w.service, "professionals", { id: w.ids.professionalA })).toEqual(before);
  });

  it("control: 20 training lines of 300 characters are accepted", async () => {
    const training = Array.from({ length: 20 }, (_, i) => `${i + 1}`.padEnd(300, "x"));
    const { error, count } = await w.personas.professionalA.client
      .from("professionals")
      .update({ training }, { count: "exact" })
      .eq("id", w.ids.professionalA);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
  });

  it("a professional cannot write practice_country (set from the registry by server code)", async () => {
    await expectUpdateRefused(
      w.personas.professionalA.client,
      w.service,
      "professionals",
      { id: w.ids.professionalA },
      { practice_country: "CA" },
      "professionalA",
    );
  });

  it("a null entry is refused in training, languages and visit types", async () => {
    const before = await readAsService(w.service, "professionals", { id: w.ids.professionalA });
    for (const values of [{ training: [null] }, { languages: [null, "ar"] }, { visit_types: ["video", null] }]) {
      const { error } = await w.personas.professionalA.client.from("professionals").update(values).eq("id", w.ids.professionalA);
      expect(error, `${JSON.stringify(values)} was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
    }
    expect(await readAsService(w.service, "professionals", { id: w.ids.professionalA })).toEqual(before);
  });

  it("a practice state set in the builder makes the practice country US", async () => {
    // A registry row practising abroad: no state, no country (as the import leaves it).
    await serviceUpdate(w.ids.professionalA, { state_code: null, practice_country: null });
    const { error } = await w.personas.professionalA.client
      .from("professionals")
      .update({ state_code: "MI" })
      .eq("id", w.ids.professionalA);
    expect(error, error?.message).toBeNull();
    const row = await readAsService(w.service, "professionals", { id: w.ids.professionalA });
    expect(row?.state_code).toBe("MI");
    expect(row?.practice_country).toBe("US");
  });
});

describe("an unclaimed registry row has no account", () => {
  let holder: Account;
  let registryId: string;

  beforeAll(async () => {
    holder = await w.addAccount("holder", "professional");
    ({ id: registryId } = await w.insertListing({
      first_name: "Rls",
      last_name: `Unlinked${w.runId}`,
      name_en: "Dr Rls Unlinked",
      city_en: "Testville",
    }));
  });

  // The slug trigger runs before the check, so the insert can wait out the registry import's slug lock.
  it("the service client cannot insert an unclaimed row with a user_id (23514)", async () => {
    const npi = w.newNpi();
    const { error } = await retryWhileLocked(() =>
      w.service.from("professionals").insert({
        npi,
        status: "unclaimed",
        user_id: holder.userId,
        first_name: "Rls",
        last_name: `Linked${w.runId}`,
        name_en: "Dr Rls Linked",
      }),
    );
    expect(error, "an unclaimed row with an account was stored").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("professionals_unclaimed_no_account");
    expect(await readAsService(w.service, "professionals", { npi })).toBeNull();
  }, LISTING_TIMEOUT_MS);

  it("nor link an account to an unclaimed row without claiming it in the same statement (23514)", async () => {
    const before = await readAsService(w.service, "professionals", { id: registryId });
    const { error } = await w.service.from("professionals").update({ user_id: holder.userId }).eq("id", registryId);
    expect(error, "an account was linked to an unclaimed row").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
    expect(error?.message).toContain("professionals_unclaimed_no_account");
    expect(await readAsService(w.service, "professionals", { id: registryId })).toEqual(before);
  });

  it("control: user_id and status 'claimed' in one statement claim it, and the claim snapshots the registry row", async () => {
    await serviceUpdate(registryId, { status: "claimed", user_id: holder.userId, claimed_at: new Date().toISOString() });
    const row = await readAsService(w.service, "professionals", { id: registryId });
    expect(row).toMatchObject({ status: "claimed", user_id: holder.userId });
    expect((await privateRow(registryId)).registry_as_filed).toMatchObject({ lastName: `Unlinked${w.runId}` });
  });
});

describe("a listing named in another script", () => {
  it("gets the slug 'listing-<last four NPI digits>' when its names and city slug to nothing", async () => {
    const { id, npi } = await w.insertListing({
      first_name: "سارة",
      last_name: "حداد",
      name_en: "Dr Sara Haddad",
      city_en: "جدة",
    });
    const slug = (await readAsService(w.service, "professionals", { id }))?.slug;
    const short = `listing-${npi.slice(-4)}`;
    if (slug !== short) {
      // Another listing already had the short form: the trigger falls back to the whole NPI.
      expect(slug).toBe(`listing-${npi}`);
      expect(await readAsService(w.service, "professionals", { slug: short }), `no other listing has ${short}`).not.toBeNull();
    }
  }, LISTING_TIMEOUT_MS);
});

describe("languages and visit types take no entry twice", () => {
  it("professional A cannot list a language or a visit type twice (23514)", async () => {
    const before = await readAsService(w.service, "professionals", { id: w.ids.professionalA });
    for (const values of [{ languages: ["ar", "en", "ar"] }, { visit_types: ["video", "phone", "video"] }]) {
      const { error } = await w.personas.professionalA.client.from("professionals").update(values).eq("id", w.ids.professionalA);
      expect(error, `${JSON.stringify(values)} was accepted`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
    }
    expect(await readAsService(w.service, "professionals", { id: w.ids.professionalA })).toEqual(before);
  });

  it("the service client cannot either", async () => {
    const { error } = await w.service.from("professionals").update({ languages: ["en", "en"] }).eq("id", w.ids.professionalB);
    expect(error, "a duplicate language was stored").not.toBeNull();
    expect(error?.code, error?.message).toBe("23514");
  });

  it("control: each language and visit type once is accepted", async () => {
    const { error, count } = await w.personas.professionalA.client
      .from("professionals")
      .update({ languages: ["ar", "en"], visit_types: ["phone", "video"] }, { count: "exact" })
      .eq("id", w.ids.professionalA);
    expect(error, error?.message).toBeNull();
    expect(count).toBe(1);
  });
});

// Round 3 bounds the other text lists the registry and Stripe write: a specialty's synonyms (at most 50 of 1 to 60
// characters, no null) and a Stripe account's open requirements (no null entry). Server code writes both.
describe("bounded lists written by server code", () => {
  it("a specialty's synonyms are bounded: 51 entries, a 61-character entry, an empty or a null entry is refused", async () => {
    const before = await readAsService(w.service, "specialties", { id: w.ids.specialtyShown });
    const cases: Array<Record<string, unknown>> = [
      { synonyms_en: Array.from({ length: 51 }, (_, i) => `Synonym ${i + 1}`) },
      { synonyms_en: ["x".repeat(61)] },
      { synonyms_en: [""] },
      { synonyms_ar: ["مرادف", null] },
    ];
    for (const values of cases) {
      const { error } = await w.service.from("specialties").update(values).eq("id", w.ids.specialtyShown);
      expect(error, `${JSON.stringify(values).slice(0, 80)} was stored`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
    }
    expect(await readAsService(w.service, "specialties", { id: w.ids.specialtyShown })).toEqual(before);
  });

  it("control: 50 synonyms of 60 characters are stored", async () => {
    const synonyms = Array.from({ length: 50 }, (_, i) => `${i + 1}`.padEnd(60, "x"));
    const { error } = await w.service.from("specialties").update({ synonyms_en: synonyms }).eq("id", w.ids.specialtyShown);
    expect(error, error?.message).toBeNull();
  });

  it("a Stripe requirement list with a null entry is refused (23514)", async () => {
    const before = await readAsService(w.service, "professional_private", { professional_id: w.ids.professionalB });
    for (const values of [{ stripe_currently_due: [null] }, { stripe_past_due: ["individual.verification.document", null] }]) {
      const { error } = await w.service.from("professional_private").update(values).eq("professional_id", w.ids.professionalB);
      expect(error, `${JSON.stringify(values)} was stored`).not.toBeNull();
      expect(error?.code, error?.message).toBe("23514");
    }
    expect(await readAsService(w.service, "professional_private", { professional_id: w.ids.professionalB })).toEqual(before);
  });

  it("control: a Stripe requirement list without nulls is stored", async () => {
    const { error } = await w.service
      .from("professional_private")
      .update({ stripe_currently_due: ["individual.verification.document"] })
      .eq("professional_id", w.ids.professionalB);
    expect(error, error?.message).toBeNull();
  });
});
