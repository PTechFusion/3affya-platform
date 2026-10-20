// Task 1.4: "tests/rls refuses every cross-tenant attempt as patient, professional and anonymous". For every one of the
// 27 L1 tables (support/tables.ts) and each attacker (patient A, professional A, anonymous), a SELECT, INSERT, UPDATE and
// DELETE aimed at the other tenant's row, each expected to be refused as support/refusal.ts defines it. Before the
// refusals, each table's control shows the target rows exist and their owner can read them, so no refusal is vacuous.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exposedTables } from "./support/clients";
import { buildWorld, type World } from "./support/fixtures";
import {
  expectDeleteRefused,
  expectInsertRefused,
  expectReadAllowed,
  expectReadRefused,
  expectRowExists,
  expectUpdateRefused,
} from "./support/refusal";
import { CROSS_TENANT_ATTACKERS, OTHER_LANE_TABLES, TABLE_CASES, TABLES } from "./support/tables";

let w: World;

beforeAll(async () => {
  w = await buildWorld("matrix");
});

afterAll(async () => {
  await w?.cleanup();
});

describe("matrix coverage", () => {
  it("has one case per L1 table, 27 in all", () => {
    expect(TABLE_CASES.map((c) => c.table)).toEqual([...TABLES]);
    expect(new Set(TABLES).size).toBe(27);
  });

  it("covers every table the API exposes in public (other lanes' tables excepted)", async () => {
    const exposed = await exposedTables();
    const uncovered = exposed.filter(
      (table) => !(TABLES as readonly string[]).includes(table) && !(OTHER_LANE_TABLES as readonly string[]).includes(table),
    );
    expect(uncovered, "public tables without a matrix case").toEqual([]);
  });
});

for (const c of TABLE_CASES) {
  describe(c.table, () => {
    it("control: the target rows exist and their owner reads them", async () => {
      for (const target of [c.read(w), c.update(w, "patientA"), c.remove(w)]) {
        await expectRowExists(w.service, c.table, target.match);
        await expectReadAllowed(w.personas[target.owner].client, c.table, target.match, `${target.owner} (owner)`);
      }
    });

    for (const attacker of CROSS_TENANT_ATTACKERS) {
      describe(`as ${attacker}`, () => {
        it("SELECT of the other tenant's row is refused", async () => {
          const target = c.read(w);
          await expectRowExists(w.service, c.table, target.match);
          await expectReadRefused(w.personas[attacker].client, c.table, [target.match, ...target.tenantFilters], attacker);
        });

        it("INSERT into the other tenant's space is refused", async () => {
          await expectInsertRefused(w.personas[attacker].client, c.table, c.insert(w, attacker), attacker);
        });

        it("UPDATE of the other tenant's row is refused and the row is unchanged", async () => {
          const target = c.update(w, attacker);
          await expectUpdateRefused(w.personas[attacker].client, w.service, c.table, target.match, target.values, attacker);
        });

        it("DELETE of the other tenant's row is refused and the row is still there", async () => {
          const target = c.remove(w);
          await expectDeleteRefused(w.personas[attacker].client, w.service, c.table, target.match, attacker);
        });
      });
    }
  });
}
