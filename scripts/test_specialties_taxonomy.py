"""Unit tests for the specialty seed and the taxonomy mapping (task 1.5, lane L1). Standard library only; no database.

    python -m unittest scripts/test_specialties_taxonomy.py

The shortlist coverage test reads the shortlist's codes extract (a CSV with a `code` column, one row per distinct code)
from SHORTLIST_CODES_CSV and is skipped, saying so, when that variable is not set. The extract is registry-derived and
lives outside the repo.
"""

from __future__ import annotations

import ast
import csv
import json
import os
import pathlib
import re
import sys
import tempfile
import unittest
from collections import Counter

SCRIPTS = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

import map_taxonomy  # noqa: E402
import seed_specialties  # noqa: E402
from seed_common import SAMPLE_DIR  # noqa: E402
from specialty_groups import SPECIALTY_GROUPS  # noqa: E402
from taxonomy_map import TAXONOMY_MAP, UNMAPPED  # noqa: E402

NUCC_CODE = re.compile(r"^[0-9]{3}[0-9A-Z]{6}X$")


class SlugRule(unittest.TestCase):
    # Expected values are what private.slugify (supabase/migrations/20261020000100_l1_foundation.sql) returns for the
    # same input on the local stack.
    CASES = {
        "Preventive, occupational & aerospace medicine": "preventive-occupational-aerospace-medicine",
        "Surgical oncology & cellular/transplant programs": "surgical-oncology-cellular-transplant-programs",
        "Hand, spine, foot/ankle & pediatric orthopedics": "hand-spine-foot-ankle-pediatric-orthopedics",
        "Physician assistants / associates": "physician-assistants-associates",
        "Women's health": "women-s-health",
        "Crème Brûlée Café": "creme-brulee-cafe",
        "naïve façade": "naive-facade",
        "Ñandú": "nandu",
        "São Paulo": "sao-paulo",
        "Ångström": "angstrom",
        "Dvořák": "dvorak",
        "İstanbul": "istanbul",
        "Straße": "strasse",
        "Æsir Œuvre": "aesir-oeuvre",
        "Søren Łódź": "soren-lodz",
        "Ðorđe Þór": "dorde-thor",
        "Kırıkkale": "kirikkale",
        "Xẞy ħaĦa": "xssy-haha",
        "ﬁne ligature": "fine-ligature",
        "½ dose": "1-2-dose",
        "résumé—draft": "resume-draft",
        "--Already-slugged--": "already-slugged",
        "طب الأسرة": "",
        "   ": "",
    }

    def test_tricky_names(self):
        for value, expected in self.CASES.items():
            with self.subTest(value=value):
                self.assertEqual(seed_specialties.slugify(value), expected)

    def test_none(self):
        self.assertEqual(seed_specialties.slugify(None), "")


class SpecialtyRows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = seed_specialties.specialty_rows()
        cls.sample = json.loads((SAMPLE_DIR / "specialties.json").read_text(encoding="utf-8"))

    def test_104_unique_valid_slugs(self):
        slugs = [row["slug"] for row in self.rows]
        self.assertEqual(len(slugs), 104)
        self.assertEqual(len(set(slugs)), 104)
        for slug in slugs:
            self.assertRegex(slug, seed_specialties.SLUG_PATTERN)

    def test_positions_follow_the_cards(self):
        self.assertEqual([row["position"] for row in self.rows], list(range(1, 105)))

    def test_24_sample_slugs_and_names_kept(self):
        by_slug = {row["slug"]: row for row in self.rows}
        self.assertEqual(len(self.sample), 24)
        for entry in self.sample:
            with self.subTest(slug=entry["slug"]):
                row = by_slug[entry["slug"]]
                self.assertEqual((row["name_en"], row["name_ar"]), (entry["nameEn"], entry["nameAr"]))
                self.assertEqual(row["name_source"], "sample")
                card = SPECIALTY_GROUPS[row["position"] - 1]
                self.assertEqual(card["sample_slug"], entry["slug"])

    def test_other_80_slugged_from_their_title(self):
        others = [row for row in self.rows if row["name_source"] != "sample"]
        self.assertEqual(len(others), 80)
        for row in others:
            self.assertEqual(row["slug"], seed_specialties.slugify(row["name_en"]))
            self.assertIsNone(row["body_system"])
            self.assertEqual((row["synonyms_en"], row["synonyms_ar"]), ([], []))

    def test_sample_body_systems_and_search_words(self):
        systems = json.loads((SAMPLE_DIR / "body-systems.json").read_text(encoding="utf-8"))
        terms = json.loads((SAMPLE_DIR / "specialty-terms.json").read_text(encoding="utf-8"))["terms"]
        system_of = {slug: system["id"] for system in systems for slug in system["specialties"]}
        terms_of = {term["slug"]: term for term in terms}
        for row in self.rows:
            if row["name_source"] == "sample":
                self.assertEqual(row["body_system"], system_of[row["slug"]])
                self.assertEqual(row["synonyms_en"], terms_of[row["slug"]]["synonymsEn"])
                self.assertEqual(row["synonyms_ar"], terms_of[row["slug"]]["synonymsAr"])

    def test_snapshot_diff_reports_a_changed_title(self):
        cards = [
            {key: group[key] for key in ("position", "page", "section_en", "section_ar", "name_en", "name_ar")}
            for group in SPECIALTY_GROUPS
        ]
        self.assertEqual(seed_specialties.snapshot_differences(cards), [])
        cards[4] = {**cards[4], "name_en": "Cardiology"}
        self.assertEqual(len(seed_specialties.snapshot_differences(cards)), 1)
        self.assertEqual(len(seed_specialties.snapshot_differences(cards[:-1])), 2)


class TaxonomyMap(unittest.TestCase):
    def test_every_slug_is_one_of_the_104(self):
        slugs = set(seed_specialties.group_slugs())
        self.assertEqual(sorted({slug for slug in TAXONOMY_MAP.values() if slug not in slugs}), [])
        map_taxonomy.check_mapping(slugs)

    def test_no_code_in_both_dicts(self):
        self.assertEqual(sorted(set(TAXONOMY_MAP) & set(UNMAPPED)), [])

    def test_codes_have_the_nucc_format(self):
        for code in list(TAXONOMY_MAP) + list(UNMAPPED):
            self.assertRegex(code, NUCC_CODE)

    def test_no_code_written_twice_in_the_source(self):
        # A repeated key in a dict literal silently replaces the first; parse the file to catch it.
        tree = ast.parse((SCRIPTS / "taxonomy_map.py").read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.AnnAssign) and isinstance(node.value, ast.Dict):
                keys = Counter(key.value for key in node.value.keys)
                with self.subTest(target=node.target.id):
                    self.assertEqual([key for key, n in keys.items() if n > 1], [])

    def test_every_reason_is_one_line_of_text(self):
        for code, reason in UNMAPPED.items():
            self.assertTrue(reason and "\n" not in reason, code)

    def test_groups_partition_the_codes(self):
        wanted = map_taxonomy.desired_codes(seed_specialties.group_slugs())
        flat = [code for codes in wanted.values() for code in codes]
        self.assertEqual(len(flat), len(set(flat)))
        self.assertEqual(set(flat), set(TAXONOMY_MAP))
        self.assertEqual(len(wanted), 104)

    def test_every_drafted_sample_code_is_still_decided(self):
        # A sample code stays mapped, or is UNMAPPED on purpose with a reason that says it corrects the sample.
        terms = json.loads((SAMPLE_DIR / "specialty-terms.json").read_text(encoding="utf-8"))["terms"]
        for term in terms:
            for code in term["taxonomyCodes"]:
                with self.subTest(code=code):
                    if code not in TAXONOMY_MAP:
                        self.assertIn("sample correction", UNMAPPED.get(code, ""), f"{code} (sample {term['slug']})")

    # The review of 20 Oct 2026 settled these codes; a change to one of them is a new decision, not a tidy-up.
    REVIEWED = {
        "101YP1600X": "clinical-social-work-counseling-family-therapy",
        "103TS0200X": "clinical-counseling-health-psychology",
        "104100000X": None,
        "1041S0200X": None,
        "106S00000X": None,
        "146M00000X": None,
        "146N00000X": None,
        "156FX1700X": "prosthetics-orthotics-assistive-technology",
        "163WM1400X": "registered-nursing-specialist-nursing",
        "170100000X": None,
        "171M00000X": "paramedicine-community-health-patient-navigation",
        "183500000X": None,
        "207PP0204X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
        "207QB0505X": "endocrinology",
        "207RH0003X": None,
        "207SG0207X": "medical-genetics-genomics",
        "207YX0602X": "allergy",
        "2080P0203X": "pediatric-neurology-acute-complex-care",
        "2080P0204X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
        "2084D0003X": "diagnostic-radiology-subspecialty-imaging",
        "208D00000X": None,
        "208M00000X": None,
        "246ZX2200X": None,
    }

    def test_reviewed_codes_keep_their_decision(self):
        for code, slug in self.REVIEWED.items():
            with self.subTest(code=code):
                self.assertEqual(TAXONOMY_MAP.get(code), slug)
                self.assertEqual(code in UNMAPPED, slug is None)

    def test_all_shortlist_codes_covered(self):
        path = os.environ.get("SHORTLIST_CODES_CSV")
        if not path or not pathlib.Path(path).is_file():
            self.skipTest("set SHORTLIST_CODES_CSV to the shortlist codes extract (CSV with a code column) to run this")
        with open(path, encoding="utf-8-sig", newline="") as handle:
            codes = [row["code"].strip() for row in csv.DictReader(handle)]
        self.assertGreater(len(codes), 0)
        covered = set(TAXONOMY_MAP) | set(UNMAPPED)
        self.assertEqual(sorted(set(codes) - covered), [], "codes in neither TAXONOMY_MAP nor UNMAPPED")
        both = [code for code in codes if code in TAXONOMY_MAP and code in UNMAPPED]
        self.assertEqual(both, [])


class Exceptions(unittest.TestCase):
    def test_unmapped_and_unknown_codes_are_listed_never_defaulted(self):
        mapped = next(iter(TAXONOMY_MAP))
        unmapped = next(iter(UNMAPPED))
        unknown = "999Z99999X"
        self.assertNotIn(unknown, TAXONOMY_MAP)
        counts = Counter({mapped: 5, unmapped: 3, unknown: 7, map_taxonomy.BLANK: 1, "12345": 2})
        rows = map_taxonomy.build_exceptions(counts, {unknown: Counter({"Other": 7})}, {})
        by_code = {row["code"]: row for row in rows}
        self.assertNotIn(mapped, by_code)
        self.assertEqual(by_code[unmapped]["reason"], UNMAPPED[unmapped])
        self.assertEqual(by_code[unknown]["reason"], map_taxonomy.NOT_IN_MAP)
        self.assertEqual(by_code[unknown]["profession"], "Other")
        self.assertEqual(by_code["12345"]["reason"], "not a NUCC taxonomy code")
        self.assertEqual([row["code"] for row in rows][0], unknown)  # most rows first
        summary = map_taxonomy.summarise(counts)
        self.assertEqual((summary["mapped_codes"], summary["mapped_rows"]), (1, 5))
        self.assertEqual((summary["unmapped_codes"], summary["unmapped_rows"]), (4, 13))

    def test_codes_csv_reader(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / "codes.csv"
            path.write_text(
                "code,count,profession\n207R00000X,4,Physician\n 207q00000x ,2,Physician\n", encoding="utf-8"
            )
            counts, professions, _ = map_taxonomy.read_codes_csv(path)
        self.assertEqual(counts, Counter({"207R00000X": 4, "207Q00000X": 2}))
        self.assertEqual(professions["207R00000X"].most_common(1)[0][0], "Physician")


class ReportSections(unittest.TestCase):
    def test_each_script_keeps_the_other_section(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / "report.md"
            seed_specialties.write_report_section("map_taxonomy", ["## Mapping", "first"], path)
            seed_specialties.write_report_section("seed_specialties", ["## Groups"], path)
            seed_specialties.write_report_section("map_taxonomy", ["## Mapping", "second"], path)
            text = path.read_text(encoding="utf-8")
        self.assertTrue(text.startswith(seed_specialties.REPORT_TITLE))
        self.assertLess(text.index("## Groups"), text.index("## Mapping"))
        self.assertIn("second", text)
        self.assertNotIn("first", text)
        self.assertEqual(text.count("<!-- section:map_taxonomy -->"), 1)


class _FakeConnection:
    def __init__(self):
        self.committed = self.rolled_back = False

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


class DryRunReports(unittest.TestCase):
    """A dry run prints its report section and leaves output/specialties_report.md alone; a committed run writes it.
    map_taxonomy.py writes the exceptions file either way (documented: it is built from the input file alone)."""

    def run_seed(self, *args):
        from unittest import mock
        import contextlib
        import io

        conn = _FakeConnection()
        result = {"inserted": [], "updated": [], "unchanged": 104, "extra": []}
        with mock.patch.object(seed_specialties, "connect", return_value=conn), \
                mock.patch.object(seed_specialties, "upsert", return_value=result), \
                mock.patch.object(seed_specialties, "write_report_section") as write, \
                contextlib.redirect_stdout(io.StringIO()) as out:
            code = seed_specialties.main(["--database-url", "postgresql://127.0.0.1:1/x", *args])
        return code, conn, write, out.getvalue()

    def test_seed_specialties_dry_run_prints_the_section(self):
        code, conn, write, out = self.run_seed("--dry-run")
        self.assertEqual(code, 0)
        self.assertTrue(conn.rolled_back and not conn.committed)
        write.assert_not_called()
        self.assertIn("## Specialty groups (seed_specialties.py)", out)
        self.assertIn("dry run (rolled back)", out)
        self.assertIn("not written", out)
        code, conn, write, _ = self.run_seed()
        self.assertTrue(conn.committed)
        write.assert_called_once()
        self.assertEqual(write.call_args.args[0], "seed_specialties")

    def run_map(self, *args):
        from unittest import mock
        import contextlib
        import io

        conn = _FakeConnection()
        db = {"changed": [], "missing_groups": [], "skipped_codes": [], "groups_with_codes": 103, "codes_written": 386}
        with tempfile.TemporaryDirectory() as folder:
            codes = pathlib.Path(folder) / "codes.csv"
            codes.write_text("code,count\n207R00000X,4\n999Z99999X,2\n", encoding="utf-8")
            exceptions = pathlib.Path(folder) / "out" / "taxonomy_exceptions.csv"
            real_write_exceptions = map_taxonomy.write_exceptions  # writes into the temporary folder, never output/
            with mock.patch.object(map_taxonomy, "connect", return_value=conn), \
                    mock.patch.object(map_taxonomy, "apply_to_database", return_value=db), \
                    mock.patch.object(map_taxonomy, "write_report_section") as write, \
                    mock.patch.object(map_taxonomy, "write_exceptions",
                                      side_effect=lambda rows: real_write_exceptions(rows, exceptions)) as write_csv, \
                    contextlib.redirect_stdout(io.StringIO()) as out:
                code = map_taxonomy.main(["--codes-csv", str(codes), "--database-url", "postgresql://127.0.0.1:1/x", *args])
        return code, conn, write, write_csv, out.getvalue()

    def test_map_taxonomy_dry_run_prints_the_section(self):
        code, conn, write, write_csv, out = self.run_map("--dry-run")
        self.assertEqual(code, 0)
        self.assertTrue(conn.rolled_back and not conn.committed)
        write.assert_not_called()
        write_csv.assert_called_once()  # the exceptions file is the input file's, dry run or not
        self.assertIn("## Taxonomy mapping (map_taxonomy.py)", out)
        self.assertIn("dry run (rolled back)", out)
        code, conn, write, write_csv, _ = self.run_map()
        self.assertTrue(conn.committed)
        write.assert_called_once()
        self.assertEqual(write.call_args.args[0], "map_taxonomy")


if __name__ == "__main__":
    unittest.main()
