"""Unit tests for seed_professionals.py and enrich_cms.py (task 1.5, lane L1).

Run: python -m unittest discover -s scripts -p "test_professionals_cms.py"   (stdlib plus openpyxl)

The fixtures are tiny synthetic files built in a temporary folder with the real headers of the NPPES shortlist and the
CMS files; no registry row is copied here. The database test runs only when DATABASE_URL is set: it works inside one
transaction that is always rolled back, on NPIs that fail the NPI check digit, so they can never be a real provider's.
"""

from __future__ import annotations

import argparse
import collections
import contextlib
import csv
import datetime as dt
import io
import os
import pathlib
import re
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import enrich_cms  # noqa: E402
import seed_professionals as sp  # noqa: E402
from seed_common import REPO_ROOT  # noqa: E402

# The migration that defines private.is_us_state_code, which seed_professionals.US_STATE_CODES must match.
DIRECTORY_MIGRATION = REPO_ROOT / "supabase" / "migrations" / "20261020000300_l1_directory.sql"


def migration_us_state_codes() -> list[str]:
    """The codes in the array literal of private.is_us_state_code, in file order."""
    text = DIRECTORY_MIGRATION.read_text(encoding="utf-8")
    match = re.search(r"create function private\.is_us_state_code\(.*?\$\$(.*?)\$\$", text, re.S)
    if match is None:
        raise AssertionError(f"private.is_us_state_code not found in {DIRECTORY_MIGRATION.name}")
    return re.findall(r"'([A-Z]{2})'", match.group(1))

SHORTLIST_HEADER = [
    "NPI", "First Name", "Middle Name", "Last Name", "Credential", "Profession", "Taxonomy", "Address", "Address2", "City",
    "State", "Zip", "Phone", "Fax", "Emails", "Moved Since 2018", "Old Address", "Last Updated", "aafia_score",
    "aafia_tier", "aafia_reasons",
]
DAC_HEADER = [
    "NPI", "Ind_PAC_ID", "Ind_enrl_ID", "Provider Last Name", "Provider First Name", "Provider Middle Name", "suff", "gndr",
    "Cred", "Med_sch", "Grd_yr", "pri_spec", "sec_spec_1", "sec_spec_2", "sec_spec_3", "sec_spec_4", "sec_spec_all",
    "Telehlth", "Facility Name", "org_pac_id", "num_org_mem", "adr_ln_1", "adr_ln_2", "ln_2_sprs", "City/Town", "State",
    "ZIP Code", "Telephone Number", "ind_assgn", "grp_assgn", "adrs_id",
]
FACILITY_HEADER = [
    "NPI", "Ind_PAC_ID", "Provider Last Name", "Provider First Name", "Provider Middle Name", "suff", "facility_type",
    "Facility Affiliations Certification Number", "Facility Type Certification Number",
]
HOSPITAL_HEADER = [
    "Facility ID", "Facility Name", "Address", "City/Town", "State", "ZIP Code", "County/Parish", "Telephone Number",
    "Hospital Type", "Hospital Ownership", "Emergency Services", "Meets criteria for birthing friendly designation",
    "Hospital overall rating", "Hospital overall rating footnote", "MORT Group Measure Count",
    "Count of Facility MORT Measures", "Count of MORT Measures Better", "Count of MORT Measures No Different",
    "Count of MORT Measures Worse", "MORT Group Footnote", "Safety Group Measure Count",
    "Count of Facility Safety Measures", "Count of Safety Measures Better", "Count of Safety Measures No Different",
    "Count of Safety Measures Worse", "Safety Group Footnote", "READM Group Measure Count",
    "Count of Facility READM Measures", "Count of READM Measures Better", "Count of READM Measures No Different",
    "Count of READM Measures Worse", "READM Group Footnote", "Pt Exp Group Measure Count",
    "Count of Facility Pt Exp Measures", "Pt Exp Group Footnote", "TE Group Measure Count", "Count of Facility TE Measures",
    "TE Group Footnote",
]


def shortlist_row(npi, first, last, profession, taxonomy, city, state, middle=None, credential=None):
    """A shortlist line with every contact column filled, so a test can prove none of them is imported."""
    values = dict.fromkeys(SHORTLIST_HEADER)
    values.update({
        "NPI": npi, "First Name": first, "Middle Name": middle, "Last Name": last, "Credential": credential,
        "Profession": profession, "Taxonomy": taxonomy, "City": city, "State": state,
        "Address": "1 Example Street", "Address2": "Suite 2", "Zip": "770300000", "Phone": "5550100", "Fax": "5550101",
        "Emails": "someone@example.com", "Moved Since 2018": "Y", "Old Address": "2 Example Road",
        "Last Updated": "2026-01-01", "aafia_score": 9, "aafia_tier": "High", "aafia_reasons": "test",
    })
    return [values[c] for c in SHORTLIST_HEADER]


def dac_line(npi, school, year, gender, facility):
    values = dict.fromkeys(DAC_HEADER, "")
    values.update({"NPI": npi, "Med_sch": school, "Grd_yr": year, "gndr": gender, "Facility Name": facility,
                   "Provider Last Name": "TEST", "Provider First Name": "SAMPLE", "City/Town": "TESTVILLE",
                   "Telephone Number": "5550100"})
    return [values[c] for c in DAC_HEADER]


def write_csv(path: pathlib.Path, header, rows) -> pathlib.Path:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)
    return path


class TempDirTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()


class NameRuleTest(unittest.TestCase):
    def test_physicians_and_dentists_take_the_title(self):
        self.assertEqual(sp.display_name("Sara", "Haddad", "Physician"), "Dr Sara Haddad")
        self.assertEqual(sp.display_name("Omar", "Nasser", "Dentist"), "Dr Omar Nasser")
        self.assertEqual(sp.display_name("Omar", "Nasser", " physician "), "Dr Omar Nasser")

    def test_every_other_profession_is_name_only(self):
        for profession in ("Student", "Pharmacist", "Nurse Practitioner", "Psychologist", "Other", None):
            self.assertEqual(sp.display_name("Lina", "Saleh", profession), "Lina Saleh", profession)


class StateRuleTest(unittest.TestCase):
    def test_us_states_dc_and_territories_are_kept(self):
        for value, code in (("CA", "CA"), (" ny ", "NY"), ("DC", "DC"), ("PR", "PR"), ("GU", "GU"), ("VI", "VI"),
                            ("MP", "MP"), ("AS", "AS")):
            self.assertEqual(sp.us_state_code(value), code)

    def test_anything_else_is_null(self):
        for value in ("MAKKAH", "ONTARIO", "ON", "AE", "AP", "AA", "SA", "HAWAII", "APO  AE", "", None):
            self.assertIsNone(sp.us_state_code(value), value)

    def test_practice_country_is_us_for_a_us_code(self):
        for code in sorted(sp.US_STATE_CODES):
            self.assertEqual(sp.practice_country(code), "US", code)
            self.assertEqual(sp.practice_country(code, "RIYADH", "Riyadh"), "US", code)  # the US code decides
        for value in (None, "MAKKAH", "AE", "ca", ""):
            self.assertIsNone(sp.practice_country(value), value)  # not a US code, and no raw State to read
        # Through the parser, the way the import computes it: state_code is set only for a US code.
        cases = (("TX", "X", "US"), (" pr ", "X", "US"), ("UM", "X", "US"), ("RIYADH", "Riyadh", "SA"),
                 ("AP", "Fpo", None), (None, "X", None))
        for state, city, country in cases:
            values = dict(zip(SHORTLIST_HEADER,
                              shortlist_row("1000000004", "A", "B", "Physician", "207RC0000X", city, state)))
            row, _ = sp.parse_row(values)
            self.assertEqual(row.practice_country, country, state)
            self.assertEqual(row.state_code is not None, country == "US", state)


class CountryRuleTest(unittest.TestCase):
    """The practice country of a doctor abroad: the explicit tables in seed_professionals.py, null when they name none."""

    CASES = (
        # (State, City, country, how it was found)
        ("ONTARIO", "Toronto", "CA", "state"),
        ("ON", "Toronto", "CA", "state"),
        ("ONT.", "Lasalle", "CA", "state"),
        ("QUEBEC", "Montreal", "CA", "state"),
        ("MAKKAH", "Jeddah", "SA", "state"),
        ("MAKKAH REGION", "Jeddah", "SA", "state"),
        ("NEJD", "Riyadh", "SA", "state"),
        ("SAUDI ARABIA", "Riyadh", "SA", "state"),
        ("DUBAI", "Dubai", "AE", "state"),
        ("UNITED ARAB EMIRATES", "Abu Dhabi", "AE", "state"),
        ("  abu   dhabi ", " abu dhabi ", "AE", "state"),  # case and spacing do not matter
        ("HAWALLI", "Jabriyah", "KW", "state"),
        ("BEIRUT", "Beirut", "LB", "state"),
        ("ALEXANDRIA", "Alexandria", "EG", "state"),
        ("JORDAN", "Irbid", "JO", "state"),
        ("HARARE", "Harare", "ZW", "state"),
        # A State that names no one country: the City settles it, or nothing does.
        ("CENTRAL", "Riyadh", "SA", "state_city"),
        ("CENTRAL", "Colombo", None, "unknown"),
        ("EASTERN PROVINCE", "Dhahran", "SA", "state_city"),
        ("EASTERN PROVINCE", "Kenema", None, "unknown"),
        ("SA", "Al-Khobar", "SA", "state_city"),
        ("SA", "Riyadh", "SA", "state_city"),
        ("SA", "Adelaide", None, "unknown"),  # South Australia
        ("FOREIGN", "Dubai", "AE", "state_city"),
        ("FOREIGN", "Paris", None, "unknown"),
        ("NA", "Dubai", "AE", "state_city"),
        ("KWI", "Kuwait City", "KW", "state_city"),
        # US military mail: no country, whatever the city says, except AE with a real city (the UAE's ISO code).
        ("AE", "Apo", None, "military"),
        ("AE", "Dubai", "AE", "state_city"),
        ("AP", "Fpo", None, "military"),
        ("AA", "Dpo", None, "military"),
        ("APO  AE", "Apo", None, "unknown"),
        ("OMAN", "Muscat", None, "unknown"),  # not in the tables: null, never a guess
        (None, "Riyadh", None, "blank"),
    )

    def test_cases(self):
        for state, city, country, basis in self.CASES:
            with self.subTest(state=state, city=city):
                code = sp.us_state_code(state)
                self.assertIsNone(code)
                self.assertEqual(sp.country_basis(code, state, city), (country, basis))
                self.assertEqual(sp.practice_country(code, state, city), country)

    def test_tables_are_well_formed(self):
        countries = list(sp.ABROAD_STATE_COUNTRY.values()) + list(sp.ABROAD_STATE_CITY_COUNTRY.values())
        for country in countries:
            self.assertRegex(country, r"^[A-Z]{2}$")
        self.assertNotIn("US", countries)
        for state in sp.ABROAD_STATE_COUNTRY:
            # Keyed as the lookup keys them, and never a US code (that would be a US practice) or military mail.
            self.assertEqual(state, sp._key(state))
            self.assertNotIn(state, sp.US_STATE_CODES)
            self.assertNotIn(state, sp.MILITARY_MAIL_STATES)
        for state, city in sp.ABROAD_STATE_CITY_COUNTRY:
            self.assertEqual((state, city), (sp._key(state), sp._key(city)))
            self.assertNotIn(state, sp.US_STATE_CODES)
            self.assertNotIn(state, sp.ABROAD_STATE_COUNTRY)  # a State the table settles alone needs no city entry
        self.assertEqual(sp.MILITARY_MAIL_STATES, {"AA", "AE", "AP"})
        self.assertEqual([key for key, _ in sp.COUNTRY_BASES], ["us", "state", "state_city", "military", "unknown", "blank"])


class DoctorRuleTest(unittest.TestCase):
    """Only doctors are imported: the doctor sheets, and in them only rows whose Profession and code are a doctor's."""

    def test_doctor_rows(self):
        for profession, code in (("Physician", "207RC0000X"), ("Physician", "208M00000X"), (" physician ", "208600000x"),
                                 ("Physician", "209800000X"), ("Dentist", "1223G0001X"), ("Dentist", "122300000X"),
                                 ("DENTIST", "1223S0112X"), ("Dentist", "125Q00000X")):
            self.assertIsNone(sp.doctor_problem(profession, code), (profession, code))

    def test_rows_that_are_not_a_doctors(self):
        cases = (
            ("Student", "390200000X", "profession"),
            ("Pharmacist", "183500000X", "profession"),
            ("Nurse Practitioner", "363L00000X", "profession"),
            (None, "207RC0000X", "profession"),
            ("Physician", None, "no taxonomy code"),
            ("Physician", "1223G0001X", "Allopathic & Osteopathic Physicians"),  # a dentist's code
            ("Physician", "363A00000X", "Allopathic & Osteopathic Physicians"),  # physician assistant
            ("Dentist", "122400000X", "classification Dentist"),  # denturist
            ("Dentist", "124Q00000X", "classification Dentist"),  # dental hygienist
            ("Dentist", "207RC0000X", "classification Dentist"),
        )
        for profession, code, words in cases:
            with self.subTest(profession=profession, code=code):
                reason = sp.doctor_problem(profession, code)
                self.assertIsNotNone(reason)
                self.assertIn(words, reason)
                self.assertNotIn(code or "-", reason.replace("125Q00000X", ""))  # fixed text: never the row's code

    def test_sheet_rule(self):
        self.assertEqual(sp.DEFAULT_SHEETS, ("Physicians High", "Physicians Medium", "Dentists"))
        for sheet in sp.DOCTOR_SHEETS:
            self.assertIsNone(sp.sheet_problem(sheet))
        self.assertIn("students and non-doctors get no card and no profile", sp.sheet_problem("Other Professions"))
        self.assertIn("manual check", sp.sheet_problem("Low (review)"))
        for sheet in ("Summary", "physicians high", "Other"):
            self.assertIn("not one of the doctor sheets", sp.sheet_problem(sheet), sheet)
        for sheet in ("Other Professions", "Low (review)", "Summary"):
            self.assertIn('Only the doctor sheets are imported: "Physicians High", "Physicians Medium", "Dentists".',
                          sp.sheet_problem(sheet))

    def test_code_list_matches_the_database_function(self):
        codes = migration_us_state_codes()
        self.assertEqual(len(codes), len(set(codes)), "duplicate code in private.is_us_state_code")
        self.assertEqual(set(codes), set(sp.US_STATE_CODES))
        self.assertEqual(len(sp.US_STATE_CODES), 57)  # 50 states, DC, AS GU MP PR VI, UM


class NpiRuleTest(unittest.TestCase):
    def test_valid_npis(self):
        for value in ("1134524721", "2000000001", " 1407088511 "):
            self.assertTrue(sp.is_valid_npi(sp.npi_text(value)), value)

    def test_numbers_from_the_spreadsheet(self):
        self.assertEqual(sp.npi_text(1134524721), "1134524721")
        self.assertEqual(sp.npi_text(1134524721.0), "1134524721")

    def test_invalid_npis(self):
        for value in ("0123456789", "3123456789", "113452472", "11345247211", "11345A4721", "", None, True, 1.5):
            self.assertFalse(sp.is_valid_npi(sp.npi_text(value)), value)

    def test_parse_row_rejects_a_bad_npi_and_a_bad_taxonomy(self):
        values = dict(zip(SHORTLIST_HEADER, shortlist_row("012345678", "A", "B", "Physician", "207RC0000X", "X", "CA")))
        row, reason = sp.parse_row(values)
        self.assertIsNone(row)
        self.assertIn("NPI", reason)
        self.assertNotIn("012345678", reason)  # reasons never quote the row: the report counts them
        values = dict(zip(SHORTLIST_HEADER, shortlist_row("1134524721", "A", "B", "Physician", "BAD", "X", "CA")))
        row, reason = sp.parse_row(values)
        self.assertIsNone(row)
        self.assertIn("taxonomy", reason)
        self.assertNotIn("BAD", reason)


class ShortlistReadTest(TempDirTest):
    def build(self) -> pathlib.Path:
        import openpyxl

        workbook = openpyxl.Workbook()
        summary = workbook.active
        summary.title = "Summary"
        summary.append(["Notes"])
        sheets = {
            "Physicians High": [
                shortlist_row("1000000004", "  Sara ", "Haddad ", "Physician", "207rc0000x", " Houston ", "TX",
                              middle="  ", credential=" M.D. "),
                shortlist_row("12345", "Bad", "Npi", "Physician", "207RC0000X", "Austin", "TX"),
                shortlist_row("1000000012", "Haytham", "Alabbas", "Physician", "208600000X", "Jeddah", "MAKKAH"),
                # A student's row in a doctor sheet: not a doctor's, never imported.
                shortlist_row("1000000053", "Rami", "Odeh", "Student", "390200000X", "Chicago", "IL"),
            ],
            "Physicians Medium": [
                shortlist_row("1000000004", "Sara", "Haddad", "Physician", "207RC0000X", "Houston", "TX"),
            ],
            "Dentists": [
                shortlist_row("1000000020", "Omar", "Nasser", "Dentist", "1223G0001X", "Dearborn", "MI"),
                # A denturist under the Dentist profession: not a doctor's code, never imported.
                shortlist_row("1000000061", "Dana", "Hijazi", "Dentist", "122400000X", "Toronto", "ONTARIO"),
                # A dentist on a US military base abroad: imported, no country.
                shortlist_row("1000000079", "Karim", "Saad", "Dentist", "1223G0001X", "Apo", "AE"),
            ],
            "Other Professions": [
                shortlist_row("1000000038", "Lina", "Saleh", "Student", "390200000X", "Boston", "MA"),
                [None] * len(SHORTLIST_HEADER),
            ],
            "Low (review)": [shortlist_row("1000000046", "Never", "Imported", "Physician", "207R00000X", "Reno", "NV")],
        }
        for name, rows in sheets.items():
            sheet = workbook.create_sheet(name)
            sheet.append(SHORTLIST_HEADER)
            for row in rows:
                sheet.append(row)
        path = self.dir / "shortlist.xlsx"
        workbook.save(path)
        return path

    def test_reads_the_three_doctor_sheets_and_their_doctor_rows_only(self):
        result = sp.read_shortlist(self.build(), sp.DEFAULT_SHEETS)
        self.assertEqual(result.read_per_sheet, {"Physicians High": 4, "Physicians Medium": 1, "Dentists": 3})
        self.assertEqual(result.accepted_per_sheet, {"Physicians High": 2, "Physicians Medium": 0, "Dentists": 2})
        self.assertEqual([r.npi for r in result.rows], ["1000000004", "1000000012", "1000000020", "1000000079"])
        # Neither the student of "Other Professions" nor the "Low (review)" row is read.
        self.assertFalse({"1000000038", "1000000046"} & {r.npi for r in result.rows})
        reasons = {(r.sheet, r.row_number): r.reason for r in result.rejects}
        self.assertIn("NPI", reasons[("Physicians High", 3)])
        self.assertIn("duplicate", reasons[("Physicians Medium", 2)])
        # The rows of a doctor sheet that are not a doctor's are counted, never imported.
        self.assertEqual(sorted((r.sheet, r.npi) for r in result.not_doctors),
                         [("Dentists", "1000000061"), ("Physicians High", "1000000053")])
        self.assertEqual(result.not_doctor_counts, collections.Counter({
            ("Physicians High", "profession is not Physician or Dentist", "Student", "390200000X"): 1,
            ("Dentists", sp.doctor_problem("Dentist", "122400000X"), "Dentist", "122400000X"): 1,
        }))
        self.assertEqual((result.not_doctors_per_sheet("Dentists"), result.not_doctors_per_sheet("Physicians Medium")),
                         (1, 0))
        self.assertEqual(result.non_us_states, {"MAKKAH": 1, "AE": 1})
        self.assertEqual(result.countries(), collections.Counter({"US": 2, "SA": 1, None: 1}))
        self.assertEqual(result.country_bases, collections.Counter({"us": 2, "state": 1, "military": 1}))
        self.assertEqual(result.abroad_unsettled, collections.Counter())

    def test_other_sheets_are_refused(self):
        path = self.build()
        for sheets in (["Other Professions"], ["Physicians High", "Low (review)"], ["Summary"]):
            with self.assertRaises(SystemExit) as raised:
                sp.read_shortlist(path, sheets)
            self.assertIn("Only the doctor sheets are imported", str(raised.exception))

    def test_row_values_trimmed_and_no_contact_details(self):
        rows = {r.npi: r for r in sp.read_shortlist(self.build(), sp.DEFAULT_SHEETS).rows}
        sara = rows["1000000004"]
        self.assertEqual((sara.first_name, sara.middle_name, sara.last_name), ("Sara", None, "Haddad"))
        self.assertEqual((sara.city_en, sara.state_code, sara.taxonomy_code), ("Houston", "TX", "207RC0000X"))
        self.assertEqual(sara.practice_country, "US")
        self.assertEqual((sara.name_en, sara.registry_credential), ("Dr Sara Haddad", "M.D."))
        self.assertEqual((rows["1000000012"].state_code, rows["1000000012"].practice_country), (None, "SA"))
        self.assertEqual((rows["1000000079"].state_code, rows["1000000079"].practice_country), (None, None))
        self.assertEqual(rows["1000000020"].name_en, "Dr Omar Nasser")
        self.assertEqual(set(sp.RegistryRow.__dataclass_fields__),
                         {"npi", "first_name", "middle_name", "last_name", "name_en", "registry_credential",
                          "registry_profession", "taxonomy_code", "city_en", "state_code", "practice_country"})
        # The import compares and writes exactly the registry fields of a row (practice_country included).
        self.assertEqual(set(sp.REGISTRY_FIELDS), set(sp.RegistryRow.__dataclass_fields__) - {"npi"})
        for row in rows.values():
            text = repr(row)
            for contact in ("Example Street", "5550100", "example.com", "770300000"):
                self.assertNotIn(contact, text)

    def test_report_holds_counts_only(self):
        path = self.build()
        shortlist = sp.read_shortlist(path, sp.DEFAULT_SHEETS)
        self.assertEqual(len(shortlist.rejects), 2)
        args = argparse.Namespace(shortlist=path, sheets=list(sp.DEFAULT_SHEETS), registry_as_of=dt.date(2026, 10, 1),
                                  database_url="postgresql://user:secret@127.0.0.1:55322/postgres", dry_run=False)
        stats = {
            "inserted": 4, "updated": 0, "unchanged": 0, "skipped": [], "links_inserted": 4, "links_updated": 0,
            "links_deleted": 0, "specialties": 2, "specialties_with_codes": 2, "mapped": 4, "unmapped": 0,
            "top_unmapped": [], "final_nppes_rows": 4, "final_country_us": 2, "final_country_null": 1,
            "final_with_specialty": 4, "final_with_primary_link": 4, "final_countries": {"US": 2, "SA": 1, None: 1},
        }
        started = dt.datetime(2026, 10, 20, 9, 0, tzinfo=dt.timezone.utc)
        log = [sp.summary_line(args, shortlist, stats, started)]
        text = "\n".join(sp.report_lines(args, shortlist, stats, started, 1.0, log))
        # No registry row: no NPI (rejected, not a doctor's or imported), no name, no raw State or City, no password.
        for npi in ("12345", "1000000004", "1000000012", "1000000020", "1000000038", "1000000053", "1000000061",
                    "1000000079"):
            self.assertNotIn(npi, text)
        for word in ("Haddad", "Sara", "Hijazi", "Odeh", "secret", "MAKKAH", "Jeddah", "Toronto", "Apo"):
            self.assertNotIn(word, text)
        self.assertIn("| Physicians High | NPI is not 10 digits starting with 1 or 2 | 1 |", text)
        self.assertIn("| Physicians Medium | duplicate NPI (first sheet wins) | 1 |", text)
        self.assertIn("| Physicians High | 4 | 2 | 1 | 1 |", text)  # read, imported, not a doctor's, rejected
        self.assertIn("| Dentists | 3 | 2 | 1 | 0 |", text)
        self.assertIn("| Total | 8 | 4 | 2 | 2 |", text)
        self.assertIn(f"| Dentists | {sp.doctor_problem('Dentist', '122400000X')} | Dentist | 122400000X | 1 |", text)
        self.assertIn("| Physicians High | profession is not Physician or Dentist | Student | 390200000X | 1 |", text)
        self.assertIn("| US | 2 | 2 |", text)
        self.assertIn("| SA | 1 | 1 |", text)
        self.assertIn("| (none) | 1 | 1 |", text)
        self.assertIn("| abroad: US military mail code (AA, AE, AP), no country | 1 |", text)
        self.assertIn("| practice_country = US | 2 | 2 |", text)
        self.assertIn("| practice_country abroad (another country) | 1 | 1 |", text)
        self.assertIn("| practice_country null | 1 | 1 |", text)
        self.assertIn("doctor rows of the shortlist that pass the guard: 4; equal: yes", text)
        self.assertEqual(log[0].count("|") - 1, len(sp.RUN_LOG_COLUMNS))

    def test_database_is_described_without_credentials(self):
        try:
            import psycopg2.extensions  # noqa: F401
        except ImportError:
            self.skipTest("psycopg2 is not installed: describe_database answers '(unparsed)' without it")
        keyword = "host=db.example.com port=5432 user=seed password=s3cret dbname=postgres sslmode=require"
        self.assertEqual(sp.describe_database(keyword), "db.example.com:5432/postgres")
        self.assertEqual(sp.describe_database("host=db.example.com password='two words' dbname=x"), "db.example.com/x")
        self.assertEqual(sp.describe_database("postgresql://seed:s3cret@127.0.0.1:55322/postgres"), "127.0.0.1:55322/postgres")
        self.assertEqual(enrich_cms.describe_database(keyword), "db.example.com:5432/postgres")
        for broken in ("host=db password='s3cret", "not a connection string s3cret", "postgresql://seed:s3cret@[::1"):
            self.assertEqual(sp.describe_database(broken), "(unparsed)", broken)
        self.assertEqual(sp.describe_database(None), "(none)")
        # Through the report, as the committed file would carry it.
        path = self.build()
        shortlist = sp.read_shortlist(path, sp.DEFAULT_SHEETS)
        args = argparse.Namespace(shortlist=path, sheets=list(sp.DEFAULT_SHEETS), registry_as_of=dt.date(2026, 10, 1),
                                  database_url=keyword, dry_run=False)
        stats = {
            "inserted": 4, "updated": 0, "unchanged": 0, "skipped": [], "links_inserted": 0, "links_updated": 0,
            "links_deleted": 0, "specialties": 0, "specialties_with_codes": 0, "mapped": 0, "unmapped": 4,
            "top_unmapped": [], "final_nppes_rows": 4, "final_country_us": 3, "final_country_null": 1,
            "final_with_specialty": 0, "final_with_primary_link": 0,
        }
        started = dt.datetime(2026, 10, 20, 9, 0, tzinfo=dt.timezone.utc)
        text = "\n".join(sp.report_lines(args, shortlist, stats, started, 1.0, []))
        self.assertIn("- Database: `db.example.com:5432/postgres`", text)
        for secret in ("s3cret", "user=seed", "password"):
            self.assertNotIn(secret, text)

    def test_run_log_drops_rows_of_another_layout(self):
        report = self.dir / "report.md"
        report.write_text("# r\n\n## Run log\n\n| a | b |\n| --- | --- |\n| 2026-10-20 08:03 | 1 |\n"
                          "| 2026-10-20 08:04 | 1 | 2 |\n", encoding="utf-8")
        self.assertEqual(sp.previous_run_log(report), ["| 2026-10-20 08:03 | 1 |", "| 2026-10-20 08:04 | 1 | 2 |"])
        self.assertEqual(sp.previous_run_log(report, 3), ["| 2026-10-20 08:04 | 1 | 2 |"])
        self.assertEqual(sp.previous_run_log(self.dir / "missing.md", 3), [])

    def test_the_review_and_other_sheets_are_refused(self):
        path = str(self.build())
        for sheets, words in ((["Physicians High", "Low (review)"], "manual check"),
                              (["Other Professions"], "students and non-doctors get no card and no profile"),
                              (["Dentists", "Summary"], "not one of the doctor sheets"),
                              (["Dentists", "Dentists"], "twice")):
            with self.subTest(sheets=sheets):
                err = io.StringIO()
                with self.assertRaises(SystemExit), contextlib.redirect_stderr(err):
                    sp.parse_args(["--shortlist", path, "--registry-as-of", "2026-10-01", "--sheets", *sheets])
                self.assertIn(words, err.getvalue())
        args = sp.parse_args(["--shortlist", path, "--registry-as-of", "2026-10-01"])
        self.assertEqual(args.sheets, ["Physicians High", "Physicians Medium", "Dentists"])

    def test_registry_date_is_required(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            sp.parse_args(["--shortlist", str(self.build())])


class DacTest(TempDirTest):
    def build(self) -> pathlib.Path:
        return write_csv(self.dir / "DAC_NationalDownloadableFile.csv", DAC_HEADER, [
            # A: first line's school is OTHER (unknown), later lines name one; BETA is the most frequent practice.
            dac_line("1000000004", "OTHER", "1994", "M", "ALPHA CLINIC"),
            dac_line("1000000004", "HARVARD MEDICAL SCHOOL", "1994", "M", "BETA GROUP"),
            dac_line("1999999999", "SOMEWHERE", "2001", "F", "NOT WANTED"),
            dac_line("1000000004", "OTHER", "1994", "M", "BETA GROUP"),
            # B: a tie between two practices goes to the one seen first; a future year is unknown; gender U then F.
            dac_line("1000000012", "UNIVERSITY OF EXAMPLE", "2031", "U", "ZETA PARTNERS"),
            dac_line("1000000012", "UNIVERSITY OF EXAMPLE", "2031", "F", "ALPHA CLINIC"),
            # C: blank school and year, no practice.
            dac_line("1000000020", "", "", "F", ""),
            ["1000000038", "short line"],
        ])

    def test_dedupe_and_unknown_values(self):
        read = enrich_cms.read_dac(self.build(), {"1000000004", "1000000012", "1000000020"}, latest_year=2026)
        self.assertEqual(read.rows, 8)
        self.assertEqual(read.malformed_rows, 1)
        self.assertEqual(read.distinct_npis, 4)
        self.assertEqual(read.matched_rows, 6)
        a, b, c = (read.facts[n] for n in ("1000000004", "1000000012", "1000000020"))
        self.assertIsNone(a.medical_school)  # the first line says OTHER
        self.assertTrue(a.school_disagrees)
        self.assertEqual((a.graduation_year, a.gender, a.group_practice, a.lines), (1994, "m", "BETA GROUP", 3))
        self.assertEqual(b.medical_school, "UNIVERSITY OF EXAMPLE")
        self.assertIsNone(b.graduation_year)
        self.assertEqual((b.gender, b.group_practice), ("f", "ZETA PARTNERS"))
        self.assertEqual((c.medical_school, c.graduation_year, c.group_practice), (None, None, None))
        self.assertNotIn("1999999999", read.facts)

    def test_report_names_cms_as_of_not_the_registry_provenance(self):
        path = self.build()
        read = enrich_cms.read_dac(path, {"1000000004", "1000000012", "1000000020"}, latest_year=2026)
        updates = enrich_cms.build_updates(read.facts, None)
        args = argparse.Namespace(dac=path, facility=None, hospitals=None, as_of=dt.date(2026, 10, 2),
                                  database_url="postgresql://127.0.0.1:55322/postgres", dry_run=False)
        ctx = {
            "professionals": 4, "unclaimed": 4, "matched_npis": len(read.facts), "facility_only_npis": 0,
            "matched_not_unclaimed": 0, "dac": read, "facility": None, "hospital_names": None, "unnamed_ccns": 0,
            "school_disagrees": 1, "unknown_year": 2,
            "known": collections.Counter(medical_school=1, graduation_year=1, group_practice=2, gender=3),
        }
        stats = {"matched_unclaimed": 3, "enriched": 3, "updated": 3, "cms_as_of_changed": 3,
                 "rows_with_this_release": 3,
                 "changed": {f: 1 for f in enrich_cms.FIELDS}}
        started = dt.datetime(2026, 10, 20, 9, 0, tzinfo=dt.timezone.utc)
        log = [enrich_cms.summary_line(args, ctx, stats, started)]
        text = "\n".join(enrich_cms.report_lines(args, ctx, stats, started, 1.0, log))
        self.assertIn("stored as `cms_as_of` on enriched rows", text)
        self.assertIn("| cms_as_of = 2026-10-02 | 3 unclaimed rows with any CMS fact | 3 |", text)
        self.assertIn("are never written by this script", text)
        self.assertNotIn("registry_source = cms", text)
        for npi in ("1000000004", "1000000012", "1000000020"):
            self.assertNotIn(npi, text)
        self.assertEqual(log[0].count("|") - 1, len(enrich_cms.RUN_LOG_COLUMNS))
        self.assertEqual(len(updates), 3)

    def test_value_rules(self):
        self.assertIsNone(enrich_cms.medical_school("other"))
        self.assertIsNone(enrich_cms.medical_school("  "))
        self.assertEqual(enrich_cms.medical_school(" WAYNE STATE "), "WAYNE STATE")
        self.assertEqual(enrich_cms.graduation_year("1999", 2026), 1999)
        for value in ("1899", "2027", "19x9", "", None):
            self.assertIsNone(enrich_cms.graduation_year(value, 2026), value)
        self.assertEqual((enrich_cms.gender_code("M"), enrich_cms.gender_code("f")), ("m", "f"))
        self.assertIsNone(enrich_cms.gender_code("U"))


class HospitalTest(TempDirTest):
    def build(self):
        def hospital(ccn, name):
            values = dict.fromkeys(HOSPITAL_HEADER, "")
            values.update({"Facility ID": ccn, "Facility Name": name, "State": "TX"})
            return [values[c] for c in HOSPITAL_HEADER]

        def facility(npi, kind, ccn):
            return [npi, "0000000000", "TEST", "SAMPLE", "", "", kind, ccn, ""]

        hospitals = write_csv(self.dir / "Hospital_General_Information.csv", HOSPITAL_HEADER, [
            hospital("010001", "SOUTH EXAMPLE MEDICAL CENTER"),
            hospital("090012", "ALPHA GENERAL HOSPITAL"),
            hospital("450001", "ALPHA GENERAL HOSPITAL"),
        ])
        affiliations = write_csv(self.dir / "Facility_Affiliation.csv", FACILITY_HEADER, [
            facility("1000000004", "Hospital", "090012"),
            facility("1000000004", "Hospital", "010001"),
            facility("1000000004", "Home health agency", "017000"),
            facility("1000000004", "Hospital", "090012"),
            facility("1000000004", "Hospital", "999999"),
            facility("1000000004", "Hospital", "450001"),
            facility("1999999999", "Hospital", "010001"),
        ])
        return hospitals, affiliations

    def test_ccn_to_name(self):
        hospitals, affiliations = self.build()
        names = enrich_cms.read_hospital_names(hospitals)
        self.assertEqual(names["010001"], "SOUTH EXAMPLE MEDICAL CENTER")
        read = enrich_cms.read_facility_affiliations(affiliations, {"1000000004"})
        self.assertEqual(read.rows, 7)
        self.assertEqual(read.hospital_ccns, {"1000000004": ["090012", "010001", "999999", "450001"]})
        found, unnamed = enrich_cms.hospital_affiliations(read.hospital_ccns["1000000004"], names)
        self.assertEqual(found, ["ALPHA GENERAL HOSPITAL", "SOUTH EXAMPLE MEDICAL CENTER"])
        self.assertEqual(unnamed, 1)

    def test_without_the_hospitals_file_the_list_is_left_alone(self):
        facts = {"1000000004": enrich_cms.DacFacts("WAYNE STATE", 1999, "m", {"ALPHA": 1})}
        (update,) = enrich_cms.build_updates(facts, None)
        self.assertIsNone(update.hospital_affiliations)
        (update,) = enrich_cms.build_updates(facts, {"1000000004": ["ALPHA GENERAL HOSPITAL"]})
        self.assertEqual(update.hospital_affiliations, ["ALPHA GENERAL HOSPITAL"])
        self.assertEqual(enrich_cms.build_updates({"1000000012": enrich_cms.DacFacts(None, None, None, {})}, None), [])


class _FakeConnection:
    """Stands in for a database connection in the guard tests: records whether the run committed."""

    def __init__(self) -> None:
        self.committed = self.rolled_back = self.closed = False

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True

    def close(self) -> None:
        self.closed = True


class EnrichGuardTest(TempDirTest):
    """enrich_cms.py stops, writing nothing, on a database the registry import has not reached (F1)."""

    def test_guard_rule(self):
        floor = enrich_cms.MIN_UNCLAIMED_NPPES
        self.assertIsNone(enrich_cms.guard_problem(28_584, None))  # the doctor import
        self.assertIsNone(enrich_cms.guard_problem(28_584, 14_000))
        self.assertIsNone(enrich_cms.guard_problem(floor, 1))
        self.assertIn("seed_professionals.py first", enrich_cms.guard_problem(8, None))  # a reset database: the dev seed only
        self.assertIn("seed_professionals.py first", enrich_cms.guard_problem(floor - 1, 500))
        self.assertIn("no NPI", enrich_cms.guard_problem(28_584, 0))

    def run_main(self, unclaimed: int, extra_args=()):
        """Runs enrich_cms.main on a tiny DAC file with the database calls replaced; returns (exit code, connection,
        report path, whether apply_updates ran)."""
        from unittest import mock

        dac = write_csv(self.dir / "DAC_NationalDownloadableFile.csv", DAC_HEADER,
                        [dac_line("1000000004", "WAYNE STATE", "1999", "F", "BETA GROUP")])
        report = self.dir / "cms_join_report.md"
        conn = _FakeConnection()
        applied = []
        stats = {"matched_unclaimed": 1, "enriched": 1, "updated": 1, "cms_as_of_changed": 1,
                 "rows_with_this_release": 1, "changed": dict.fromkeys(enrich_cms.FIELDS, 0)}
        with mock.patch.object(enrich_cms, "connect", return_value=conn), \
                mock.patch.object(enrich_cms, "load_professional_npis", return_value={"1000000004": "unclaimed"}), \
                mock.patch.object(enrich_cms, "count_unclaimed_nppes", return_value=unclaimed), \
                mock.patch.object(enrich_cms, "apply_updates", side_effect=lambda *a, **k: applied.append(1) or stats), \
                mock.patch.object(enrich_cms, "REPORT_PATH", report), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            code = enrich_cms.main(["--dac", str(dac), "--as-of", "2026-10-02",
                                    "--database-url", "postgresql://127.0.0.1:1/x", *extra_args])
        return code, conn, report, bool(applied), err.getvalue()

    def test_a_reset_database_stops_without_writing(self):
        code, conn, report, applied, err = self.run_main(unclaimed=8)
        self.assertEqual(code, 1)
        self.assertFalse(report.exists())
        self.assertFalse(applied)
        self.assertTrue(conn.rolled_back and conn.closed and not conn.committed)
        self.assertIn("--allow-empty", err)

    def test_no_match_stops_without_writing(self):
        from unittest import mock

        with mock.patch.object(enrich_cms, "is_valid_npi", return_value=False):  # nothing in the database matches
            code, conn, report, applied, _ = self.run_main(unclaimed=28_584)
        self.assertEqual(code, 1)
        self.assertFalse(report.exists())
        self.assertFalse(applied or conn.committed)

    def test_allow_empty_runs_anyway_and_a_full_database_passes(self):
        code, conn, report, applied, _ = self.run_main(unclaimed=8, extra_args=["--allow-empty"])
        self.assertEqual(code, 0)
        self.assertTrue(applied and conn.committed and report.exists())
        report.unlink()
        code, conn, report, applied, _ = self.run_main(unclaimed=28_584)
        self.assertEqual(code, 0)
        self.assertTrue(applied and conn.committed and report.exists())


def npi_check_digit_ok(npi: str) -> bool:
    """The NPI check digit (Luhn over the 80840 prefix and the first nine digits)."""
    digits = [int(d) for d in "80840" + npi[:9]]
    total = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 0:
            d *= 2
            d = d - 9 if d > 9 else d
        total += d
    return (10 - total % 10) % 10 == int(npi[9])


@unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL not set: database test skipped")
class DatabaseTest(unittest.TestCase):
    """Import and enrichment against the local stack, in one transaction that is always rolled back."""

    TEST_CODE = "999ZZZZZZX"  # NUCC-shaped, not a NUCC code
    USER_ID = "00000000-0000-4000-8000-0000000a1f15"

    def setUp(self) -> None:
        from seed_common import connect

        self.conn = connect(os.environ["DATABASE_URL"])
        self.cur = self.conn.cursor()
        candidates = [f"19999{n:05d}" for n in range(100)]
        candidates = [n for n in candidates if not npi_check_digit_ok(n)]
        self.cur.execute("select npi from public.professionals where npi = any(%s)", (candidates,))
        taken = {r[0] for r in self.cur.fetchall()}
        self.new_npi, self.claimed_npi = [n for n in candidates if n not in taken][:2]
        self.cur.execute(
            "insert into public.specialties (slug, name_en, name_ar, taxonomy_codes) values"
            " ('l1-test-import', 'Import test', 'اختبار', array[%s]) returning id",
            (self.TEST_CODE,),
        )
        self.specialty_id = self.cur.fetchone()[0]
        self.cur.execute(
            "insert into auth.users (id, email, raw_app_meta_data) values (%s, 'l1-import-test@example.com',"
            " '{\"role\": \"professional\"}'::jsonb)",
            (self.USER_ID,),
        )
        self.cur.execute(
            """
            insert into public.professionals (npi, status, source, user_id, first_name, last_name, name_en, city_en,
                                              claimed_at, bio_en)
            values (%s, 'claimed', 'nppes', %s, 'Claimed', 'Doctor', 'Dr Claimed Doctor', 'Houston', now(),
                    'What the doctor wrote.')
            """,
            (self.claimed_npi, self.USER_ID),
        )

    def tearDown(self) -> None:
        self.conn.rollback()
        self.conn.close()

    def snapshot(self, npi):
        self.cur.execute(
            """
            select to_jsonb(p) - 'updated_at',
                   coalesce((select jsonb_agg(to_jsonb(ps) order by ps.specialty_id)
                               from public.professional_specialties ps where ps.professional_id = p.id), '[]'::jsonb)
              from public.professionals p where p.npi = %s
            """,
            (npi,),
        )
        return self.cur.fetchone()

    def rows(self, first="Test", city="Houston", state="TX"):
        new = sp.RegistryRow(self.new_npi, first, None, "Alpha", sp.display_name(first, "Alpha", "Physician"), "MD",
                             "Physician", self.TEST_CODE, city, sp.us_state_code(state),
                             sp.practice_country(sp.us_state_code(state), state, city))
        claimed = sp.RegistryRow(self.claimed_npi, "Changed", None, "Name", "Dr Changed Name", "DO", "Physician",
                                 self.TEST_CODE, "Dallas", "TX", "US")
        return [new, claimed]

    def registry_columns(self, npi):
        self.cur.execute(
            "select state_code, practice_country, registry_source, registry_as_of, cms_as_of"
            " from public.professionals where npi = %s",
            (npi,),
        )
        return self.cur.fetchone()

    def test_the_database_accepts_exactly_the_scripts_state_codes(self):
        self.cur.execute(
            """
            select coalesce(array_agg(c order by c), '{}')
              from (select chr(a) || chr(b) as c from generate_series(65, 90) a, generate_series(65, 90) b) pairs
             where private.is_us_state_code(c)
            """
        )
        self.assertEqual(set(self.cur.fetchone()[0]), set(sp.US_STATE_CODES))

    def test_import_is_idempotent_and_never_touches_a_claimed_row(self):
        claimed_before = self.snapshot(self.claimed_npi)
        as_of = dt.date(2026, 10, 1)

        first = sp.import_rows(self.conn, self.rows(), as_of)
        self.assertEqual((first["inserted"], first["updated"], first["unchanged"]), (1, 0, 0))
        self.assertEqual(first["skipped"], [("claimed", "nppes", 1)])
        self.assertEqual((first["links_inserted"], first["links_updated"], first["links_deleted"]), (1, 0, 0))
        self.cur.execute(
            "select slug, status::text, source::text, registry_source, registry_as_of, specialty_id, name_en,"
            " practice_country from public.professionals where npi = %s",
            (self.new_npi,),
        )
        slug, status, source, registry_source, registry_as_of, specialty_id, name_en, country = self.cur.fetchone()
        self.assertEqual(slug, f"test-alpha-houston-{self.new_npi[-4:]}")
        self.assertEqual((status, source, registry_source, registry_as_of), ("unclaimed", "nppes", "nppes", as_of))
        self.assertEqual((specialty_id, name_en, country), (self.specialty_id, "Dr Test Alpha", "US"))
        # Both rows of this shortlist are nppes rows; the claimed one was never given a country (the import skips it).
        self.assertEqual((first["final_nppes_rows"], first["final_country_us"], first["final_country_null"]), (2, 1, 1))
        self.assertEqual((first["final_with_specialty"], first["final_with_primary_link"]), (1, 1))

        second = sp.import_rows(self.conn, self.rows(), as_of)
        self.assertEqual((second["inserted"], second["updated"], second["unchanged"]), (0, 0, 1))
        self.assertEqual((second["links_inserted"], second["links_updated"], second["links_deleted"]), (0, 0, 0))

        # A changed registry value updates the unclaimed row but never its slug.
        third = sp.import_rows(self.conn, self.rows(first="Tested", city="Austin"), as_of)
        self.assertEqual((third["inserted"], third["updated"]), (0, 1))
        self.cur.execute("select slug, first_name, city_en from public.professionals where npi = %s", (self.new_npi,))
        self.assertEqual(self.cur.fetchone(), (slug, "Tested", "Austin"))

        self.assertEqual(self.snapshot(self.claimed_npi), claimed_before)

    def test_practice_country_is_compared_like_the_other_registry_fields(self):
        as_of = dt.date(2026, 10, 1)
        sp.import_rows(self.conn, self.rows(), as_of)
        self.assertEqual(self.registry_columns(self.new_npi)[:2], ("TX", "US"))

        # The registry moves the practice abroad: the state clears and the country becomes the one the State names, in
        # one update; a re-run changes nothing.
        moved = sp.import_rows(self.conn, self.rows(state="RIYADH", city="Riyadh"), as_of)
        self.assertEqual((moved["updated"], moved["final_country_us"]), (1, 0))
        self.assertEqual(moved["final_countries"], {"SA": 1, None: 1})  # the claimed row was never given one
        self.assertEqual(self.registry_columns(self.new_npi)[:2], (None, "SA"))
        self.assertEqual(sp.import_rows(self.conn, self.rows(state="RIYADH", city="Riyadh"), as_of)["updated"], 0)

        # To a military base: no country.
        self.assertEqual(sp.import_rows(self.conn, self.rows(state="AP", city="Fpo"), as_of)["updated"], 1)
        self.assertEqual(self.registry_columns(self.new_npi)[:2], (None, None))

        # Back in the US. A practice state always means a US practice: the trigger professionals_sync_practice_country
        # puts 'US' back when anything clears the country while state_code is set, so the import finds nothing to do.
        self.assertEqual(sp.import_rows(self.conn, self.rows(), as_of)["updated"], 1)
        self.cur.execute("update public.professionals set practice_country = null where npi = %s", (self.new_npi,))
        self.assertEqual(self.registry_columns(self.new_npi)[:2], ("TX", "US"))
        self.assertEqual(sp.import_rows(self.conn, self.rows(), as_of)["updated"], 0)

    def test_a_newer_registry_release_refreshes_registry_as_of(self):
        first = sp.import_rows(self.conn, self.rows(), dt.date(2026, 10, 1))
        self.assertEqual((first["inserted"], first["updated"]), (1, 0))
        self.cur.execute("select slug from public.professionals where npi = %s", (self.new_npi,))
        (slug,) = self.cur.fetchone()
        claimed_before = self.snapshot(self.claimed_npi)
        # The same file again changes nothing.
        self.assertEqual(sp.import_rows(self.conn, self.rows(), dt.date(2026, 10, 1))["updated"], 0)
        # The November release has the same facts: only the date moves, so it names the release the row was read from.
        newer = sp.import_rows(self.conn, self.rows(), dt.date(2026, 11, 1))
        self.assertEqual((newer["inserted"], newer["updated"], newer["unchanged"]), (0, 1, 0))
        self.assertEqual(newer["links_inserted"] + newer["links_updated"] + newer["links_deleted"], 0)
        self.assertEqual(self.registry_columns(self.new_npi), ("TX", "US", "nppes", dt.date(2026, 11, 1), None))
        self.cur.execute("select slug from public.professionals where npi = %s", (self.new_npi,))
        self.assertEqual(self.cur.fetchone(), (slug,))
        self.assertEqual(sp.import_rows(self.conn, self.rows(), dt.date(2026, 11, 1))["updated"], 0)
        # A claimed row keeps whatever it holds, the date included.
        self.assertEqual(self.snapshot(self.claimed_npi), claimed_before)

    def test_enrichment_updates_unclaimed_rows_once(self):
        registry_as_of = dt.date(2026, 10, 1)
        sp.import_rows(self.conn, self.rows(), registry_as_of)
        claimed_before = self.snapshot(self.claimed_npi)
        as_of = dt.date(2026, 10, 2)
        updates = [
            enrich_cms.CmsUpdate(self.new_npi, "WAYNE STATE UNIVERSITY SCHOOL OF MEDICINE", 1999, "BETA GROUP",
                                 ["ALPHA GENERAL HOSPITAL"], "f"),
            enrich_cms.CmsUpdate(self.claimed_npi, "HARVARD MEDICAL SCHOOL", 2001, "GAMMA", ["X HOSPITAL"], "m"),
        ]
        first = enrich_cms.apply_updates(self.conn, updates, as_of)
        self.assertEqual((first["matched_unclaimed"], first["enriched"], first["updated"]), (1, 1, 1))
        self.assertEqual(first["cms_as_of_changed"], 1)
        self.cur.execute(
            "select medical_school, graduation_year, group_practice, hospital_affiliations, gender::text"
            " from public.professionals where npi = %s",
            (self.new_npi,),
        )
        self.assertEqual(self.cur.fetchone(), ("WAYNE STATE UNIVERSITY SCHOOL OF MEDICINE", 1999, "BETA GROUP",
                                               ["ALPHA GENERAL HOSPITAL"], "f"))
        # cms_as_of carries the CMS release; the NPPES provenance stays exactly as the import wrote it.
        self.assertEqual(self.registry_columns(self.new_npi), ("TX", "US", "nppes", registry_as_of, as_of))
        second = enrich_cms.apply_updates(self.conn, updates, as_of)
        self.assertEqual((second["updated"], second["cms_as_of_changed"]), (0, 0))

        # Unknown values never clear known ones, and gender only fills a gap.
        unknown = [enrich_cms.CmsUpdate(self.new_npi, None, None, None, None, "m")]
        self.assertEqual(enrich_cms.apply_updates(self.conn, unknown, as_of)["updated"], 0)
        # The seed and the enrichment never undo each other on a re-run.
        self.assertEqual(sp.import_rows(self.conn, self.rows(), registry_as_of)["updated"], 0)
        self.assertEqual(self.registry_columns(self.new_npi), ("TX", "US", "nppes", registry_as_of, as_of))
        self.assertEqual(self.snapshot(self.claimed_npi), claimed_before)

    def test_a_newer_release_with_the_same_facts_moves_only_cms_as_of(self):
        registry_as_of = dt.date(2026, 10, 1)
        sp.import_rows(self.conn, self.rows(), registry_as_of)
        update = [enrich_cms.CmsUpdate(self.new_npi, None, 2001, "BETA GROUP", None, "m")]
        enrich_cms.apply_updates(self.conn, update, dt.date(2026, 10, 2))
        newer = enrich_cms.apply_updates(self.conn, update, dt.date(2026, 11, 2))
        self.assertEqual((newer["updated"], newer["cms_as_of_changed"]), (1, 1))
        self.assertEqual(newer["changed"], dict.fromkeys(enrich_cms.FIELDS, 0))
        self.assertEqual(self.registry_columns(self.new_npi),
                         ("TX", "US", "nppes", registry_as_of, dt.date(2026, 11, 2)))
        # The claimed row got no CMS fact (only unclaimed rows are written), so its cms_as_of stays null.
        self.assertIsNone(self.registry_columns(self.claimed_npi)[4])


if __name__ == "__main__":
    unittest.main()
