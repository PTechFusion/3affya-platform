"""Unit tests for scripts/build_dev_seed.py (the dev seed, task 1.5).

Run: python -m unittest discover -s scripts -p "test_build_dev_seed.py" -v

What they pin: the readable id scheme, the slug rule, the sample clock in SQL (run against the local database when it is
up), parity of the Python fee and refund rules with lib/fees.ts and lib/refunds.ts (run with Node's type stripping when
Node is installed), the specialty rows against seed_specialties.py and map_taxonomy.py, the round-2 columns
(actor_system, concern_locale, a reasonless unreadable page, registry_as_filed against its trigger) and the round-3
constraints (done_at on done bookings, no overlapping live bookings, storage paths inside the allowlists, receipt subjects,
the share snapshot left to its trigger). The database and Node tests skip, with the reason, when their tool is not
available; the database tests only read, or roll back what they write.

Optional settings (test-only): SEED_TEST_DB_CONTAINER (default supabase_db_3affya-platform) and SEED_TEST_DB_NAME
(default postgres; e.g. a scratch database the seed was applied to).
"""

from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_dev_seed as seed  # noqa: E402
import map_taxonomy  # noqa: E402
import seed_specialties  # noqa: E402
from specialty_groups import SPECIALTY_GROUPS  # noqa: E402

REPO = seed.REPO_ROOT
DB_CONTAINER = os.environ.get("SEED_TEST_DB_CONTAINER", "supabase_db_3affya-platform")
# Another database in the same container (e.g. a scratch copy the seed was applied to); default the stack's own.
DB_NAME = os.environ.get("SEED_TEST_DB_NAME", "postgres")

_BUILT: seed.SeedBuilder | None = None


def built() -> seed.SeedBuilder:
    global _BUILT
    if _BUILT is None:
        _BUILT = seed.build()
    return _BUILT


def psql_available() -> str | None:
    """None when the local database answers, else why it does not."""
    if not shutil.which("docker"):
        return "docker is not installed"
    try:
        out = subprocess.run(
            ["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", DB_NAME, "-At", "-c", "select 1"],
            capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as error:
        return f"docker exec failed: {error}"
    return None if out.returncode == 0 and out.stdout.strip() == "1" else f"{DB_CONTAINER} is not answering"


def run_psql(sql_text: str) -> list[str]:
    out = subprocess.run(
        ["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", DB_NAME, "-At", "-q", "-v", "ON_ERROR_STOP=1"],
        input=sql_text, capture_output=True, text=True, encoding="utf-8", timeout=60)
    if out.returncode:
        raise AssertionError(out.stderr)
    return [line for line in out.stdout.splitlines() if line]


# Resolves the repo's "@/..." imports to .ts files so Node's type stripping can load lib/*.ts and config/business.ts.
NODE_HOOKS = """
import { existsSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = process.env.SEED_TEST_REPO_ROOT;
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = ROOT + "/" + specifier.slice(2);
    for (const candidate of [base + ".ts", base]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
"""


def run_node(script: str) -> object:
    """Runs an ES module that may import "@/..." TypeScript modules; returns the JSON it prints."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = pathlib.Path(tmp)
        (tmp_path / "hooks.mjs").write_text(NODE_HOOKS, encoding="utf-8")
        (tmp_path / "register.mjs").write_text(
            'import { register } from "node:module";\nregister(new URL("./hooks.mjs", import.meta.url));\n', encoding="utf-8")
        (tmp_path / "main.mjs").write_text(script, encoding="utf-8")
        env = {**os.environ, "SEED_TEST_REPO_ROOT": REPO.as_posix()}
        out = subprocess.run(["node", "--no-warnings", "--experimental-strip-types", "--import", "./register.mjs", "main.mjs"],
                             cwd=tmp, capture_output=True, text=True, encoding="utf-8", env=env, timeout=60)
        if out.returncode:
            raise AssertionError(out.stderr)
        return json.loads(out.stdout)


class IdSchemeTest(unittest.TestCase):
    def test_examples_keep_the_sample_number_visible(self) -> None:
        self.assertEqual(seed.uid("professional", seed.sample_number("doc_002")), "d0c00000-0000-4000-8000-000000000002")
        self.assertEqual(seed.uid("professional", seed.sample_number("doc_391")), "d0c00000-0000-4000-8000-000000000391")
        self.assertEqual(seed.uid("booking", seed.sample_number("bk_004")), "b0000000-0000-4000-8000-000000000004")
        self.assertEqual(seed.uid("record_set", seed.sample_number("rs_001")), "5e700000-0000-4000-8000-000000000001")
        self.assertEqual(seed.uid("record_file", 3, 1), "f11e0000-0000-4000-8001-000000000003")
        self.assertEqual(seed.uid("membership", "a00"), "3e300000-0000-4000-8000-000000000a00")

    def test_map_names_the_ids_l6_looks_for(self) -> None:
        mapping = {sample: uid for sample, uid, _ in built().idmap}
        self.assertEqual(mapping["doc_002"], "d0c00000-0000-4000-8000-000000000002")
        self.assertEqual(mapping["bk_004"], "b0000000-0000-4000-8000-000000000004")
        self.assertEqual(mapping["rs_001"], "5e700000-0000-4000-8000-000000000001")
        self.assertEqual(mapping["sh_001"], "5ba4e000-0000-4000-8000-000000000001")
        self.assertEqual(mapping["pat_001"], "ca5e0000-0000-4000-8000-000000000001")
        self.assertEqual(mapping["adm_001"], "ad000000-0000-4000-8000-000000000001")

    def test_ids_are_unique_rfc4122_version_4(self) -> None:
        ids = [uid for _, uid, _ in built().idmap]
        self.assertEqual(len(ids), len(set(ids)))
        for value in ids:
            parsed = uuid.UUID(value)
            self.assertEqual(parsed.version, 4, value)
            self.assertEqual(parsed.variant, uuid.RFC_4122, value)

    def test_every_uuid_in_the_seed_has_a_known_prefix(self) -> None:
        prefixes = {p for p, _ in seed.ID_PREFIXES.values()} | {seed.GOTRUE_INSTANCE_ID[:8]}
        for value in set(re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", built().sql())):
            self.assertIn(value[:8], prefixes, value)

    def test_rejects_numbers_that_do_not_fit(self) -> None:
        with self.assertRaises(seed.SeedError):
            seed.uid("professional", 10**12)
        with self.assertRaises(seed.SeedError):
            seed.uid("record_page", 1, 1000)


class SlugRuleTest(unittest.TestCase):
    def test_examples(self) -> None:
        self.assertEqual(seed.slugify("Preventive, occupational & aerospace medicine"), "preventive-occupational-aerospace-medicine")
        self.assertEqual(seed.slugify("Physician assistants / associates"), "physician-assistants-associates")
        self.assertEqual(seed.slugify("  Sjögren--Clinic  "), "sjogren-clinic")
        self.assertEqual(seed.slugify("Speech-language pathology & swallowing care"), "speech-language-pathology-swallowing-care")

    def test_104_groups_keep_sample_slugs_and_slug_the_rest(self) -> None:
        sample_slugs = {s["slug"] for s in json.loads((REPO / "data" / "sample" / "specialties.json").read_text(encoding="utf-8"))}
        slugs = []
        for group in SPECIALTY_GROUPS:
            slug = group["sample_slug"] or seed.slugify(group["name_en"])
            self.assertRegex(slug, r"^[a-z0-9]+(-[a-z0-9]+)*$")
            slugs.append(slug)
        self.assertEqual(len(slugs), 104)
        self.assertEqual(len(set(slugs)), 104)
        self.assertEqual({g["sample_slug"] for g in SPECIALTY_GROUPS if g["sample_slug"]}, sample_slugs)

    def test_matches_private_slugify_in_the_database(self) -> None:
        reason = psql_available()
        if reason:
            self.skipTest(reason)
        names = [g["name_en"] for g in SPECIALTY_GROUPS] + ["Sjögren & Ünal / Clinic"]
        values = ", ".join("(" + seed.q(n) + ")" for n in names)
        got = run_psql(f"select private.slugify(n) from (values {values}) as v(n);")
        self.assertEqual(got, [seed.slugify(n) for n in names])


class TimeShiftSqlTest(unittest.TestCase):
    ANCHOR = dt.date(2026, 11, 9)

    def test_python_sample_clock(self) -> None:
        today = dt.date(2026, 10, 26)
        self.assertEqual(seed.sample_shift_days(today, self.ANCHOR), -14)
        self.assertEqual(seed.sample_instant("2026-11-12T06:00:00Z", today, self.ANCHOR),
                         dt.datetime(2026, 10, 29, 6, 0, tzinfo=dt.timezone.utc))
        now = dt.datetime(2026, 10, 26, 9, 41, 37, tzinfo=dt.timezone.utc)
        self.assertEqual(seed.sample_instant_exact("2026-11-09T06:20:00Z", "2026-11-09T12:00:00Z", now),
                         dt.datetime(2026, 10, 26, 4, 1, tzinfo=dt.timezone.utc))

    def test_anchor_is_read_from_card_data(self) -> None:
        self.assertEqual(seed.Sources().anchor, self.ANCHOR)

    def test_every_authored_instant_is_wrapped(self) -> None:
        sql_text = built().sql()
        body = sql_text[sql_text.index("set client_encoding"):]
        wrappers = ("pg_temp.si(", "pg_temp.si_iso(", "pg_temp.si_exact(", "pg_temp.si_wall(", "timestamptz ")
        for match in re.finditer(r"'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)'", body):
            before = body[max(0, match.start() - 20):match.start()]
            is_authored_now = before.endswith(", ") and "pg_temp.si_exact(" in body[max(0, match.start() - 60):match.start()]
            self.assertTrue(before.endswith(wrappers) or is_authored_now, f"bare instant {match.group(1)} after {before!r}")

    def test_sql_helpers_shift_like_lib_card_data(self) -> None:
        reason = psql_available()
        if reason:
            self.skipTest(reason)
        helpers = "\n".join(built().helpers())
        got = run_psql(
            "set timezone = 'UTC';\nset seed.today = '2026-10-26';\nset seed.now = '2026-10-26 09:41:37+00';\n" + helpers + "\n"
            "select pg_temp.seed_shift_days();\n"
            "select pg_temp.si('2026-11-12T06:00:00Z');\n"
            # A Chicago midnight in CST (after the 1 Nov DST change) shifted 14 days back is a midnight in CDT.
            "select pg_temp.si_wall('2026-11-12T06:00:00Z', 'America/Chicago');\n"
            "select pg_temp.si_exact('2026-11-09T06:20:00Z', '2026-11-09T12:00:00Z');\n"
            "select pg_temp.sd('2028-03-31');\n"
            "select pg_temp.si_iso('2026-11-15T18:00:00Z');\n")
        self.assertEqual(got, [
            "-14",
            "2026-10-29 06:00:00+00",
            "2026-10-29 05:00:00+00",
            "2026-10-26 04:01:00+00",
            "2028-03-17",
            "2026-11-01T18:00:00Z",
        ])


class FeeAndRefundParityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.src = seed.Sources()
        cls.sample = cls.src.sample

    def fees(self) -> list[int]:
        fees = {d["feeUsdCents"] for d in self.sample["doctors"] if d["feeUsdCents"]}
        fees |= {b["feeUsdCents"] for b in self.sample["bookings"]}
        return sorted(fees)

    def test_fee_lines_reproduce_the_booked_lines(self) -> None:
        for b in self.sample["bookings"]:
            lines = seed.fee_lines(b["feeUsdCents"], self.src.business)
            self.assertEqual((lines["platformFeeCents"], lines["cardProcessingCents"]),
                             (b["platformFeeUsdCents"], b["cardProcessingUsdCents"]), b["id"])

    def refund_cases(self) -> list[tuple[int, str, str, str]]:
        bookings = {b["id"]: b for b in self.sample["bookings"]}
        cases = []
        for r in self.sample["receipts"]:
            if r.get("cancellation"):
                b = bookings[r["bookingId"]]
                total = b["feeUsdCents"] + b["platformFeeUsdCents"] + b["cardProcessingUsdCents"]
                cases.append((total, b["startsAtUtc"], r["cancellation"]["atUtc"], r["cancellation"]["by"]))
        cutoff = self.src.business["fullRefundCutoffHours"]
        start = dt.datetime(2026, 11, 20, 17, 0, tzinfo=dt.timezone.utc)
        for delta_s, by in ((cutoff * 3600, "patient"), (cutoff * 3600 + 1, "patient"), (cutoff * 3600 - 1, "patient"),
                            (60, "doctor"), (60, "platform")):
            cancelled = start - dt.timedelta(seconds=delta_s)
            cases.append((30900, start.isoformat().replace("+00:00", "Z"), cancelled.isoformat().replace("+00:00", "Z"), by))
        return cases

    def test_parity_with_lib_fees_and_lib_refunds(self) -> None:
        if not shutil.which("node"):
            self.skipTest("node is not installed")
        cases = self.refund_cases()
        result = run_node(
            'import { feeLines } from "@/lib/fees";\n'
            'import { refundFor } from "@/lib/refunds";\n'
            'import { business } from "@/config/business";\n'
            f"const fees = {json.dumps(self.fees())};\n"
            f"const cases = {json.dumps(cases)};\n"
            "console.log(JSON.stringify({\n"
            "  fees: fees.map((f) => feeLines(f)),\n"
            "  refunds: cases.map(([t, s, c, by]) => refundFor(t, new Date(s), new Date(c), by)),\n"
            "  business: { firstVisitPlatformFeePct: business.firstVisitPlatformFeePct, cardProcessingPct: business.cardProcessingPct,\n"
            "    cardProcessingFixedCents: business.cardProcessingFixedCents, fullRefundCutoffHours: business.fullRefundCutoffHours,\n"
            "    shareDefaultDays: business.shareDefaultDays, slotLengthMinutesDefault: business.slotLengthMinutesDefault },\n"
            "}));\n")
        self.assertEqual(result["fees"], [seed.fee_lines(f, self.src.business) for f in self.fees()])
        expected = [seed.refund_for(t, seed.parse_instant(s), seed.parse_instant(c), by, self.src.business) for t, s, c, by in cases]
        self.assertEqual(result["refunds"], expected)
        for key, value in result["business"].items():
            self.assertEqual(self.src.business[key], value, key)


class SpecialtyRowsTest(unittest.TestCase):
    """After a reset, seed_specialties.py and map_taxonomy.py must find nothing to change."""

    def test_rows_are_what_seed_specialties_writes(self) -> None:
        columns = ("slug", "name_en", "name_ar", "body_system", "position", "synonyms_en", "synonyms_ar")
        ours = [tuple(row[c] for c in columns) for row in built().specialty_rows()]
        theirs = [tuple(row[c] for c in columns) for row in seed_specialties.specialty_rows()]
        self.assertEqual(ours, theirs)

    def test_codes_are_what_map_taxonomy_writes(self) -> None:
        rows = built().specialty_rows()
        wanted = map_taxonomy.desired_codes([row["slug"] for row in rows])
        self.assertEqual({row["slug"]: row["taxonomy_codes"] for row in rows}, wanted)
        self.assertEqual(sum(len(row["taxonomy_codes"]) for row in rows), len(map_taxonomy.TAXONOMY_MAP))

    def test_the_seed_keeps_the_sorted_order(self) -> None:
        sql_text = built().sql()
        for row in built().specialty_rows():
            if row["taxonomy_codes"]:
                self.assertIn(f"unnest({seed.text_array(row['taxonomy_codes'])}) with ordinality as u(c, n)", sql_text)
                self.assertIn("order by u.n)", sql_text)

    def test_drafted_sample_codes_are_not_seeded(self) -> None:
        # internal-medicine's drafted 208M00000X (hospitalist) is UNMAPPED in the reviewed mapping.
        rows = {row["slug"]: row for row in built().specialty_rows()}
        self.assertNotIn("208M00000X", rows["internal-medicine"]["taxonomy_codes"])
        self.assertIn("internal-medicine", {slug for slug, _, _ in built().taxonomy_differences})


class RoundTwoColumnsTest(unittest.TestCase):
    def test_system_actors(self) -> None:
        self.assertEqual([seed.system_actor_name(a) for a in ("sys_stripe", "sys_pipeline", "sys_scheduler", "sys_registry")],
                         ["stripe", "pipeline", "scheduler", "registry"])
        for bad in ("stripe", "sys_Stripe", "sys_", "sys_two words"):
            with self.assertRaises(seed.SeedError):
                seed.system_actor_name(bad)

    def test_every_system_entry_names_its_system(self) -> None:
        audit = built().s["audit"]
        kinds = {a["id"]: a["kind"] for a in audit["actors"]}
        system_rows = [line for line in built().sql().splitlines() if ", null, 'system', " in line]
        self.assertEqual(len(system_rows), sum(1 for e in audit["entries"] if kinds[e["actorId"]] == "system"))
        for line in system_rows:
            self.assertRegex(line, r", null, 'system', '(stripe|pipeline|scheduler|registry)', ")

    def test_concern_locale_is_the_stored_text(self) -> None:
        self.assertEqual(seed.concern_sql({"concernEn": "Ear pain", "concernAr": "ألم في الأذن"}), ("'ألم في الأذن'", "'ar'"))
        self.assertEqual(seed.concern_sql({"concernEn": "Ear pain", "concernAr": ""}), ("'Ear pain'", "'en'"))
        self.assertEqual(seed.concern_sql({}), ("null", "null"))

    def test_reasonless_unreadable_page_stays_null(self) -> None:
        sql_text = built().sql()
        self.assertIn("(17, 'unreadable', null, 0)", sql_text)
        self.assertNotIn("seeded as 'blurry'", "\n".join(built().report_lines()))
        self.assertEqual(seed.unreadable_item_fields({"doc": "d1", "page": 1}), {"label": "unreadable", "details": {"reason": None}})
        self.assertEqual(seed.unreadable_item_fields({"reason": "handwritten"}),
                         {"label": "handwritten", "details": {"reason": "handwritten"}})

    def test_snapshot_keys_are_the_trigger_keys(self) -> None:
        migration = (REPO / "supabase" / "migrations" / "20261020000300_l1_directory.sql").read_text(encoding="utf-8")
        body = migration[migration.index("create function private.professionals_snapshot_registry"):]
        body = body[body.index("jsonb_build_object("):body.index("where professional_id = new.id")]
        pairs = re.findall(r"'(\w+)', (to_jsonb\(old\.\w+\)|old\.\w+)", body)
        self.assertEqual([(k, v.replace("old.", "p.")) for k, v in pairs], list(seed.REGISTRY_AS_FILED_KEYS))

    def test_snapshot_rows_are_the_listings_that_left_unclaimed(self) -> None:
        b = built()
        sql_text, rows = b.registry_as_filed_sql()
        left = [d for d, status in b.professional_status.items() if status != "unclaimed"]
        self.assertEqual(rows, len(left))
        for doc in left:
            self.assertIn(f"({seed.q(b.professional_id(doc))}::uuid, ", sql_text)
        self.assertIn("jsonb_build_object('cityEn', 'Detroit', 'stateCode', 'MI', 'cityAr', 'ديترويت')", sql_text)

    def test_practice_country_and_cms_as_of(self) -> None:
        lines = built().sql().splitlines()
        line = next(row for row in lines if row.startswith("  ('d0c00000-0000-4000-8000-000000000009'"))
        self.assertIn("'MI', 'US', ", line)
        self.assertIn("'cms', date '2026-10-01', date '2026-10-01', ", line)
        line = next(row for row in lines if row.startswith("  ('d0c00000-0000-4000-8000-000000000002'"))
        self.assertIn("'IL', 'US', ", line)
        self.assertIn(", null, null, null, pg_temp.si(", line)  # registry_source, registry_as_of, cms_as_of

    def test_snapshot_equals_the_trigger_in_the_database(self) -> None:
        """Writes the seed's snapshot, then lets the trigger write its own (status to unclaimed and back) and compares,
        all in one rolled-back transaction on the sample doctors already in the local database."""
        reason = psql_available()
        if reason:
            self.skipTest(reason)
        b = built()
        ids = [b.professional_id(d) for d, status in b.professional_status.items() if status != "unclaimed"]
        id_list = ", ".join(f"{seed.q(i)}::uuid" for i in ids)
        present = run_psql(f"select count(*) from public.professionals where id in ({id_list});")
        if present != [str(len(ids))]:
            self.skipTest("the sample doctors are not in the local database")
        sql_text, _ = b.registry_as_filed_sql()
        got = run_psql("\n".join([
            "begin;",
            sql_text,
            f"create temp table seeded on commit drop as select professional_id, registry_as_filed from public.professional_private "
            f"where professional_id in ({id_list});",
            f"update public.professional_private set registry_as_filed = null where professional_id in ({id_list});",
            # An unclaimed row has no account (professionals_unclaimed_no_account): unlink and relink with the status.
            f"create temp table was on commit drop as select id, status, user_id from public.professionals where id in ({id_list});",
            f"update public.professionals set status = 'unclaimed', user_id = null where id in ({id_list});",
            "update public.professionals p set status = w.status, user_id = w.user_id from was w where w.id = p.id;",
            "select right(s.professional_id::text, 3) || ' ' || coalesce((select string_agg(e.key || '=' || e.value::text, ',' "
            "order by e.key) from jsonb_each(s.registry_as_filed) e where pp.registry_as_filed -> e.key is distinct from e.value), '') "
            "|| ' ' || (select count(*) from jsonb_object_keys(s.registry_as_filed))::text "
            "from seeded s join public.professional_private pp using (professional_id) order by 1;",
            "rollback;",
        ]))
        # Only the fields credential-reviews.json files differently may differ (doc_010's city; its state is the same).
        filed_city = 'cityAr="ديترويت",cityEn="Detroit"'
        keys = len(seed.REGISTRY_AS_FILED_KEYS)
        expected = sorted(f"{i[-3:]} {filed_city if i.endswith('010') else ''} {keys}" for i in ids)
        self.assertEqual(got, expected)


def migration_name_pattern(migration: str, constraint: str) -> re.Pattern[str]:
    """The object-name part of a storage_path allowlist check, as the migration writes it (after the last folder)."""
    text = (REPO / "supabase" / "migrations" / migration).read_text(encoding="utf-8")
    body = text[text.index(f"constraint {constraint}"):]
    match = re.search(r"\|\| '/([^']+)\$'\)\)", body)
    if not match:
        raise AssertionError(f"{constraint}: allowlist pattern not found in {migration}")
    return re.compile(match.group(1))


class RoundThreeTest(unittest.TestCase):
    """What the round-3 constraints refuse: done bookings without done_at, overlapping live bookings, storage paths
    outside the allowlists, receipts without a subject, shares whose patient snapshot would be empty."""

    def test_storage_object_names_fit_the_allowlist(self) -> None:
        cases = {
            ("f1", "ent-clinic-letter.pdf"): "f1-ent-clinic-letter.pdf",
            ("f_002_1", "Illinois-medical-licence-2026.pdf"): "f_002_1-Illinois-medical-licence-2026.pdf",
            ("f1", "Lab results (March).PDF"): "f1-Lab_results_March.PDF",
            ("f2", "résumé.v2.final.docx"): "f2-resume_v2_final.docx",
            ("f3", "Ünal Ço.JPG"): "f3-Unal_Co.JPG",
            ("f4", "تقرير طبي.pdf"): "f4-.pdf",
            ("f5", "../../other/scan.pdf"): "f5-_other_scan.pdf",
            ("f6", "100%.pdf"): "f6-100.pdf",
            ("f7", "archive.tar.gz"): "f7-archive_tar.gz",
            ("f8", "no-extension"): "f8-no-extension",
            ("f9", "x.toolongextension"): "f9-x_toolongextension",
            ("f10", "photo."): "f10-photo",
        }
        records = migration_name_pattern("20261020000700_l1_records.sql", "record_files_path_in_set_folder")
        credentials = migration_name_pattern("20261020000300_l1_directory.sql", "credentials_path_in_own_folder")
        for (file_id, name), expected in cases.items():
            with self.subTest(name=name):
                got = seed.storage_object_name(file_id, name)
                self.assertEqual(got, expected)
                self.assertRegex(got, records)
                self.assertTrue(records.fullmatch(got) and credentials.fullmatch(got), got)
                self.assertEqual(seed.storage_object_name(file_id, name), got)  # deterministic

    def test_every_seeded_storage_path_fits_its_migration(self) -> None:
        sql_text = built().sql()
        records = migration_name_pattern("20261020000700_l1_records.sql", "record_files_path_in_set_folder")
        credentials = migration_name_pattern("20261020000300_l1_directory.sql", "credentials_path_in_own_folder")
        uuid_re = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        # record_files rows: (id, set_id, patient_id, position, name, kind, mime_type, size_bytes, storage_path, ...);
        # credentials rows: (id, professional_id, kind, file_name, storage_path, ...).
        record_paths = re.findall(
            rf"^  \('f11e0000-[^']+', '({uuid_re})', '({uuid_re})', .*?, '({uuid_re})/({uuid_re})/([^']*)', 'accepted'",
            sql_text, re.M)
        credential_paths = re.findall(rf"^  \('c4ed0000-[^']+', '({uuid_re})', '\w+', '[^']*', '({uuid_re})/([^']*)', ",
                                      sql_text, re.M)
        self.assertEqual(len(record_paths), dict((t, n) for t, n, _ in built().counts)["record_files"])
        self.assertEqual(len(credential_paths), dict((t, n) for t, n, _ in built().counts)["credentials"])
        for set_id, patient_id, folder_patient, folder_set, name in record_paths:
            self.assertEqual((folder_patient, folder_set), (patient_id, set_id), name)
            self.assertTrue(records.fullmatch(name), name)
        for professional_id, folder, name in credential_paths:
            self.assertEqual(folder, professional_id, name)
            self.assertTrue(credentials.fullmatch(name), name)
        self.assertEqual(built().renamed_files, [])  # the sample's names already fit

    def test_overlapping_visits(self) -> None:
        at = lambda h, m: dt.datetime(2026, 11, 10, h, m, tzinfo=dt.timezone.utc)  # noqa: E731
        visits = [
            ("doc_a", "v1", at(10, 0), at(10, 30)),
            ("doc_a", "v2", at(10, 15), at(10, 45)),
            ("doc_a", "v3", at(10, 45), at(11, 15)),  # touches v2's end: no overlap ([start, end) ranges)
            ("doc_b", "v4", at(10, 0), at(10, 30)),  # another professional
        ]
        self.assertEqual(seed.overlapping_visits(visits), [("doc_a", "v1", "v2")])
        self.assertEqual(seed.overlapping_visits(visits[2:]), [])

    def test_done_bookings_carry_the_doctors_mark(self) -> None:
        done_check = next(c for c in built().checks if c.startswith("Done bookings"))
        for booking in ("bk_002", "bk_006", "bk_007"):
            self.assertIn(f"{booking} (the end of the visit)", done_check)
        self.assertIn("int_005 (introductions.json doneAtUtc)", done_check)
        rows = [line for line in built().sql().splitlines() if line.startswith("  ('b") and ", 'done', " in line]
        self.assertEqual(len(rows), 4)
        for line in rows:
            done_at = line.rsplit(", ", 2)[1]
            self.assertNotEqual(done_at, "null", line[:60])
        self.assertTrue(any(c.startswith("Live bookings") and "no two of one professional overlap" in c
                            for c in built().checks))

    def test_receipts_and_refunds_are_booking_payments(self) -> None:
        sql_text = built().sql()
        self.assertIn("insert into public.receipts (id, subject, booking_id,", sql_text)
        self.assertIn("insert into public.refunds (id, subject, booking_id,", sql_text)
        counts = dict((t, n) for t, n, _ in built().counts)
        self.assertEqual(len(re.findall(r"^  \('(ec000000|4ef00000)-[^']+', 'booking', 'b[01]000000-", sql_text, re.M)),
                         counts["receipts"] + counts["refunds"])

    def test_shares_leave_the_snapshot_to_the_trigger(self) -> None:
        sql_text = built().sql()
        insert_line = next(line for line in sql_text.splitlines() if line.startswith("insert into public.record_shares"))
        self.assertNotIn("patient_first_name", insert_line)
        self.assertNotIn("patient_gender", insert_line)
        self.assertTrue(any(c.startswith("Shares: 3;") for c in built().checks))
        # The profiles section comes first, so the trigger finds the names and the gender.
        self.assertLess(sql_text.index("update public.profiles set"), sql_text.index("insert into public.record_shares"))

    def test_slug_rule_is_seed_specialties(self) -> None:
        self.assertIs(seed.slugify, seed_specialties.slugify)

    def test_seed_satisfies_the_round_3_schema(self) -> None:
        """On a database without the dev seed, applies seed.sql in a rolled-back transaction; on one with it, reads the
        seeded rows. Either way the rows the round-3 constraints are about must hold."""
        reason = psql_available()
        if reason:
            self.skipTest(reason)
        checks = "\n".join([
            "select 'done without done_at', count(*) from public.bookings where status = 'done' and done_at is null;",
            "select 'done with done_at', count(*) from public.bookings where status = 'done' and done_at is not null "
            "and id::text ~ '^b[01]000000-';",
            "select 'shares with snapshot', count(*) from public.record_shares where id::text like '5ba4e000-%' "
            "and patient_first_name_en is not null and patient_first_name_ar is not null and patient_gender is not null;",
            "select 'booking receipts', count(*) from public.receipts where id::text like 'ec000000-%' and subject = 'booking';",
            "select 'overlaps', count(*) from public.bookings a join public.bookings b on a.professional_id = b.professional_id "
            "and a.id < b.id and tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at) "
            "where a.status in ('upcoming', 'done') and b.status in ('upcoming', 'done');",
        ])
        present = run_psql("select count(*) from public.professionals where id::text like 'd0c00000-%';")
        if present == ["0"]:
            got = run_psql("begin;\n" + built().sql() + "\n" + checks + "\nrollback;\n")
        else:
            got = run_psql(checks)
        counts = dict((t, n) for t, n, _ in built().counts)
        self.assertEqual(got, [
            "done without done_at|0",
            "done with done_at|4",
            "shares with snapshot|3",
            f"booking receipts|{counts['receipts']}",
            "overlaps|0",
        ])


class DeterminismTest(unittest.TestCase):
    def test_two_builds_are_byte_identical(self) -> None:
        self.assertEqual(seed.build().sql(), seed.build().sql())

    def test_committed_seed_is_current(self) -> None:
        self.assertEqual(seed.SEED_PATH.read_text(encoding="utf-8"), built().sql(),
                         "supabase/seed.sql is stale: run python scripts/build_dev_seed.py")

    def test_no_generation_timestamp_and_example_com_only(self) -> None:
        text = built().sql()
        self.assertNotIn(dt.date.today().isoformat(), text.split("set client_encoding")[0])
        for email in set(re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", text)):
            self.assertTrue(email.endswith("@example.com"), email)


if __name__ == "__main__":
    unittest.main()
