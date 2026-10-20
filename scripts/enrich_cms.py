"""Enriches unclaimed registry listings with CMS facts, joined on NPI (task 1.5, lane L1; ADR-5).

Source: the CMS Provider Data Catalog, Doctors and Clinicians. The National Downloadable File
(DAC_NationalDownloadableFile.csv, about 1 GB, one line per clinician, enrolment, group and address, so several lines per
NPI) gives the medical school, graduation year, gender and group practice. Optionally, Facility_Affiliation.csv lists each
clinician's facility affiliations by CMS Certification Number (CCN), and Hospital_General_Information.csv turns a
hospital's CCN into its name. All public data; it is loaded into the local database only.

Per NPI (the DAC lines deduplicated): the first line's medical school and graduation year ("OTHER" or blank school is
unknown; a year outside 1900 to the release year is unknown), the first M or F gender, and as group practice the most
frequent non-empty Facility Name (ties go to the one seen first). Hospital affiliations: the distinct names of the
Hospital-type affiliations, sorted; without the hospitals file the CCNs cannot be named and hospital_affiliations is left
as it is.

Only unclaimed rows are updated (what a doctor enters wins), only where a value differs, and an unknown value never
clears a known one. Gender is filled only where the row has none. Rows that received CMS facts get cms_as_of = --as-of
(the CMS release that enriched them). registry_source and registry_as_of describe the NPPES row (seed_professionals.py)
and are never written here, so a registry re-import and this enrichment never overwrite each other's provenance. A
second run with the same files changes 0 rows. One transaction; --dry-run rolls it back.

Run it after seed_professionals.py. A run out of order would rewrite the committed report with zeros, so the script stops
with exit code 1, rolls back and leaves output/cms_join_report.md as it is when the database holds fewer than
MIN_UNCLAIMED_NPPES (1,000) unclaimed nppes rows (a reset database holds only the dev seed's handful) or when no NPI of the
database is in the DAC file. --allow-empty runs anyway (a deliberate run against a small database).

Usage:
  python scripts/enrich_cms.py --dac PATH [--facility PATH --hospitals PATH] --as-of 2026-10-02 [--dry-run] [--allow-empty]

Report: stdout and output/cms_join_report.md (real runs that pass the guard only).
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import datetime as dt
import pathlib
import sys
import time
from typing import Iterable, Sequence

# Importable under `python -I` too (isolated mode leaves the script's folder off sys.path).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from seed_common import OUTPUT_DIR, add_database_argument, clean, connect, markdown_table, utc_now, write_report  # noqa: E402
from seed_professionals import describe_database, is_valid_npi, previous_run_log  # noqa: E402

REPORT_PATH = OUTPUT_DIR / "cms_join_report.md"

DAC_COLUMNS = ("NPI", "gndr", "Med_sch", "Grd_yr", "Facility Name")
FACILITY_COLUMNS = ("NPI", "facility_type", "Facility Affiliations Certification Number")
HOSPITAL_COLUMNS = ("Facility ID", "Facility Name")

UNKNOWN_SCHOOLS = frozenset({"OTHER"})
# Far below the shortlist import (65,985 rows, about 20,000 of them CMS-matchable) and far above the dev seed's 8 unclaimed
# rows: a database under this has not had the registry import, so a run would only overwrite the report with zeros.
MIN_UNCLAIMED_NPPES = 1000
EARLIEST_GRADUATION = 1900
# Column limits from the professionals table (supabase/migrations/20261020000300_l1_directory.sql).
TEXT_MAX = 200
GENDERS = {"M": "m", "F": "f"}


# ---------------------------------------------------------------- value rules (unit-tested)


def medical_school(value: object) -> str | None:
    """The school as CMS prints it, or None when CMS does not know it ("OTHER", blank) or it is too long to store."""
    text = clean(value)
    if text is None or text.upper() in UNKNOWN_SCHOOLS or len(text) > TEXT_MAX:
        return None
    return text


def graduation_year(value: object, latest: int) -> int | None:
    text = clean(value)
    if text is None or not text.isdigit():
        return None
    year = int(text)
    return year if EARLIEST_GRADUATION <= year <= latest else None


def gender_code(value: object) -> str | None:
    text = clean(value)
    return GENDERS.get(text.upper()) if text else None


@dataclasses.dataclass
class DacFacts:
    """What the DAC lines of one NPI say, folded line by line."""

    medical_school: str | None
    graduation_year: int | None
    gender: str | None
    # Facility Name -> line count, in first-seen order (dicts keep insertion order).
    facilities: dict[str, int]
    lines: int = 1
    school_disagrees: bool = False

    @property
    def group_practice(self) -> str | None:
        best, best_count = None, 0
        for name, count in self.facilities.items():
            if count > best_count:  # strictly greater: a tie keeps the name seen first
                best, best_count = name, count
        return best


@dataclasses.dataclass
class DacRead:
    facts: dict[str, DacFacts]
    rows: int
    distinct_npis: int
    matched_rows: int
    malformed_rows: int
    unknown_school_npis: int


def _header_index(header: Sequence[str], wanted: Sequence[str], path: pathlib.Path) -> dict[str, int]:
    names = [h.strip() for h in header]
    missing = [c for c in wanted if c not in names]
    if missing:
        raise SystemExit(f"{path.name} lacks column(s): {', '.join(missing)}")
    return {c: names.index(c) for c in wanted}


def _open_csv(path: pathlib.Path):
    # The CMS files are UTF-8; utf-8-sig also accepts a byte-order mark.
    return path.open("r", encoding="utf-8-sig", newline="")


def read_dac(path: pathlib.Path, wanted: set[str], latest_year: int) -> DacRead:
    """Streams the DAC file and folds the lines of the wanted NPIs. Never holds the file in memory."""
    facts: dict[str, DacFacts] = {}
    distinct: set[int] = set()
    rows = matched = malformed = 0
    with _open_csv(path) as handle:
        reader = csv.reader(handle)
        index = _header_index(next(reader), DAC_COLUMNS, path)
        width = max(index.values()) + 1
        i_npi, i_gender, i_school, i_year, i_facility = (index[c] for c in DAC_COLUMNS)
        for line in reader:
            rows += 1
            if len(line) < width:
                malformed += 1
                continue
            npi = line[i_npi].strip()
            if npi.isdigit():
                distinct.add(int(npi))
            if npi not in wanted:
                continue
            matched += 1
            facility = clean(line[i_facility])
            if facility is not None and len(facility) > TEXT_MAX:
                facility = None
            found = facts.get(npi)
            if found is None:
                facts[npi] = DacFacts(
                    medical_school=medical_school(line[i_school]),
                    graduation_year=graduation_year(line[i_year], latest_year),
                    gender=gender_code(line[i_gender]),
                    facilities={facility: 1} if facility else {},
                )
                continue
            found.lines += 1
            if found.gender is None:
                found.gender = gender_code(line[i_gender])
            if facility:
                found.facilities[facility] = found.facilities.get(facility, 0) + 1
            if medical_school(line[i_school]) != found.medical_school:
                found.school_disagrees = True
    return DacRead(
        facts=facts,
        rows=rows,
        distinct_npis=len(distinct),
        matched_rows=matched,
        malformed_rows=malformed,
        unknown_school_npis=sum(1 for f in facts.values() if f.medical_school is None),
    )


def read_hospital_names(path: pathlib.Path) -> dict[str, str]:
    """CCN -> hospital name, from Hospital_General_Information.csv."""
    names: dict[str, str] = {}
    with _open_csv(path) as handle:
        reader = csv.reader(handle)
        index = _header_index(next(reader), HOSPITAL_COLUMNS, path)
        for line in reader:
            if len(line) <= max(index.values()):
                continue
            ccn, name = clean(line[index["Facility ID"]]), clean(line[index["Facility Name"]])
            if ccn and name and len(name) <= TEXT_MAX:
                names.setdefault(ccn, name)
    return names


@dataclasses.dataclass
class FacilityRead:
    # NPI -> hospital CCNs in first-seen order.
    hospital_ccns: dict[str, list[str]]
    rows: int
    hospital_rows: int


def read_facility_affiliations(path: pathlib.Path, wanted: set[str]) -> FacilityRead:
    """Streams Facility_Affiliation.csv and keeps the Hospital-type CCNs of the wanted NPIs."""
    ccns: dict[str, list[str]] = {}
    rows = hospital_rows = 0
    with _open_csv(path) as handle:
        reader = csv.reader(handle)
        index = _header_index(next(reader), FACILITY_COLUMNS, path)
        width = max(index.values()) + 1
        for line in reader:
            rows += 1
            if len(line) < width:
                continue
            npi = line[index["NPI"]].strip()
            if npi not in wanted or clean(line[index["facility_type"]]) != "Hospital":
                continue
            ccn = clean(line[index["Facility Affiliations Certification Number"]])
            if ccn is None:
                continue
            hospital_rows += 1
            listed = ccns.setdefault(npi, [])
            if ccn not in listed:
                listed.append(ccn)
    return FacilityRead(ccns, rows, hospital_rows)


def hospital_affiliations(ccns: Iterable[str], names: dict[str, str]) -> tuple[list[str], int]:
    """The distinct hospital names, sorted, and how many CCNs had no name in the hospitals file."""
    found: set[str] = set()
    unnamed = 0
    for ccn in ccns:
        name = names.get(ccn)
        if name is None:
            unnamed += 1
        else:
            found.add(name)
    return sorted(found), unnamed


@dataclasses.dataclass(frozen=True)
class CmsUpdate:
    npi: str
    medical_school: str | None
    graduation_year: int | None
    group_practice: str | None
    # None: leave the row's list as it is (no hospitals file, or no named hospital for this NPI).
    hospital_affiliations: list[str] | None
    gender: str | None


def build_updates(dac: dict[str, DacFacts], hospitals: dict[str, list[str]] | None) -> list[CmsUpdate]:
    """One update per NPI that has at least one CMS fact. `hospitals` is None when the hospitals mode is off."""
    updates = []
    for npi in sorted(set(dac) | set(hospitals or {})):
        facts = dac.get(npi)
        named = (hospitals or {}).get(npi) or None
        update = CmsUpdate(
            npi=npi,
            medical_school=facts.medical_school if facts else None,
            graduation_year=facts.graduation_year if facts else None,
            group_practice=facts.group_practice if facts else None,
            hospital_affiliations=named,
            gender=facts.gender if facts else None,
        )
        if any(v is not None for v in dataclasses.astuple(update)[1:]):
            updates.append(update)
    return updates


# ---------------------------------------------------------------- database


def load_professional_npis(conn) -> dict[str, str]:
    """NPI -> status of every professional in the database."""
    with conn.cursor() as cur:
        cur.execute("select npi, status::text from public.professionals")
        return dict(cur.fetchall())


def count_unclaimed_nppes(conn) -> int:
    """Unclaimed registry rows (the rows this script may enrich)."""
    with conn.cursor() as cur:
        cur.execute("select count(*) from public.professionals where status = 'unclaimed' and source = 'nppes'")
        return cur.fetchone()[0]


def guard_problem(unclaimed_nppes: int, matched_npis: int | None) -> str | None:
    """Why this run must stop before it writes anything, or None. `matched_npis` is None before the DAC file is read."""
    if unclaimed_nppes < MIN_UNCLAIMED_NPPES:
        return (
            f"the database holds {unclaimed_nppes:,} unclaimed nppes rows (fewer than {MIN_UNCLAIMED_NPPES:,}): run"
            " seed_professionals.py first"
        )
    if matched_npis == 0:
        return "no NPI of the database is in the DAC file (wrong file, or the registry import is missing)"
    return None


FIELDS = ("medical_school", "graduation_year", "group_practice", "hospital_affiliations", "gender")


def apply_updates(conn, updates: Sequence[CmsUpdate], as_of: dt.date, batch_size: int = 5000) -> dict:
    """Writes the CMS facts into unclaimed rows where they differ. Does not commit."""
    from psycopg2.extras import execute_values

    with conn.cursor() as cur:
        cur.execute("drop table if exists pg_temp.cms_stage")
        cur.execute(
            """
            create temp table cms_stage (
              npi text primary key,
              medical_school text,
              graduation_year smallint,
              group_practice text,
              hospital_affiliations text[],
              gender public.gender
            ) on commit drop
            """
        )
        execute_values(
            cur,
            "insert into cms_stage (npi, medical_school, graduation_year, group_practice, hospital_affiliations, gender)"
            " values %s",
            [
                (u.npi, u.medical_school, u.graduation_year, u.group_practice, u.hospital_affiliations, u.gender)
                for u in updates
            ],
            template="(%s, %s, %s::smallint, %s, %s::text[], %s::public.gender)",
            page_size=batch_size,
        )
        # `want` is what each matched unclaimed row should hold: a known CMS value wins over the stored one, an unknown
        # value keeps it; gender only fills a gap. Rows that received any CMS fact carry this release's date in
        # cms_as_of. registry_source and registry_as_of (the NPPES row's provenance) are not read or written.
        cur.execute(
            """
            with have as (
              select p.id,
                     p.medical_school, p.graduation_year, p.group_practice, p.hospital_affiliations, p.gender,
                     p.cms_as_of,
                     coalesce(s.medical_school, p.medical_school) as w_medical_school,
                     coalesce(s.graduation_year, p.graduation_year) as w_graduation_year,
                     coalesce(s.group_practice, p.group_practice) as w_group_practice,
                     case when coalesce(cardinality(s.hospital_affiliations), 0) > 0
                          then s.hospital_affiliations else p.hospital_affiliations end as w_hospital_affiliations,
                     coalesce(p.gender, s.gender) as w_gender,
                     (s.medical_school is not null or s.graduation_year is not null or s.group_practice is not null
                      or coalesce(cardinality(s.hospital_affiliations), 0) > 0 or s.gender is not null) as enriched
                from public.professionals p
                join cms_stage s on s.npi = p.npi
               where p.status = 'unclaimed'
            ),
            want as (
              select have.*,
                     case when enriched then %(as_of)s::date else cms_as_of end as w_cms_as_of
                from have
            ),
            changed as (
              update public.professionals p
                 set medical_school = w.w_medical_school,
                     graduation_year = w.w_graduation_year,
                     group_practice = w.w_group_practice,
                     hospital_affiliations = w.w_hospital_affiliations,
                     gender = w.w_gender,
                     cms_as_of = w.w_cms_as_of
                from want w
               where p.id = w.id
                 and (w.medical_school, w.graduation_year, w.group_practice, w.hospital_affiliations, w.gender,
                      w.cms_as_of)
                     is distinct from
                     (w.w_medical_school, w.w_graduation_year, w.w_group_practice, w.w_hospital_affiliations,
                      w.w_gender, w.w_cms_as_of)
              returning p.id
            )
            select
              (select count(*) from want),
              (select count(*) from want where enriched),
              count(c.id),
              count(c.id) filter (where w.w_medical_school is distinct from w.medical_school),
              count(c.id) filter (where w.w_graduation_year is distinct from w.graduation_year),
              count(c.id) filter (where w.w_group_practice is distinct from w.group_practice),
              count(c.id) filter (where w.w_hospital_affiliations is distinct from w.hospital_affiliations),
              count(c.id) filter (where w.w_gender is distinct from w.gender),
              count(c.id) filter (where w.w_cms_as_of is distinct from w.cms_as_of)
              from changed c join want w on w.id = c.id
            """,
            {"as_of": as_of},
        )
        (matched_unclaimed, enriched, updated, *field_changes, cms_as_of_changed) = cur.fetchone()
        # After the update (same transaction): how many rows carry this release's date in all.
        cur.execute("select count(*) from public.professionals where cms_as_of = %(as_of)s", {"as_of": as_of})
        (with_this_release,) = cur.fetchone()
        cur.execute("drop table cms_stage")
    return {
        "matched_unclaimed": matched_unclaimed,
        "enriched": enriched,
        "updated": updated,
        "changed": dict(zip(FIELDS, field_changes)),
        "cms_as_of_changed": cms_as_of_changed,
        "rows_with_this_release": with_this_release,
    }


# ---------------------------------------------------------------- report


def _size(path: pathlib.Path | None) -> str:
    return f"{path.stat().st_size:,} bytes" if path else "not given"


def _pct(part: int, whole: int) -> str:
    return f"{100 * part / whole:.1f}%" if whole else "n/a"


def report_lines(args, ctx: dict, stats: dict, started: dt.datetime, seconds: float, run_log: list[str]) -> list[str]:
    professionals = ctx["professionals"]
    matched = ctx["matched_npis"]
    lines = [
        "# CMS join report (task 1.5)",
        "",
        f"Generated by `scripts/enrich_cms.py` at {started.strftime('%Y-%m-%d %H:%M UTC')}"
        f" ({'dry run, rolled back' if args.dry_run else 'committed'}, {seconds:.1f} s). Public CMS Provider Data"
        " Catalog files, loaded into the local database only.",
        "",
        "## Inputs",
        "",
        *markdown_table(
            ["File", "Size", "Data rows", "Used for"],
            [
                (f"`{args.dac.name}`", _size(args.dac), f"{ctx['dac'].rows:,}",
                 "medical school, graduation year, gender, group practice"),
                (f"`{args.facility.name}`" if args.facility else "Facility_Affiliation.csv", _size(args.facility),
                 f"{ctx['facility'].rows:,}" if ctx["facility"] else "-", "hospital affiliations (CCNs)"),
                (f"`{args.hospitals.name}`" if args.hospitals else "Hospital_General_Information.csv",
                 _size(args.hospitals), f"{len(ctx['hospital_names']):,} hospitals" if ctx["hospital_names"] is not None
                 else "-", "CCN to hospital name"),
            ],
        ),
        "",
        f"- CMS release (`--as-of`, stored as `cms_as_of` on enriched rows): {args.as_of.isoformat()}",
        f"- Database: `{describe_database(args.database_url)}`",
        "",
        "## Join on NPI",
        "",
        f"- Professionals in the database: {professionals:,} ({ctx['unclaimed']:,} unclaimed)",
        f"- DAC rows read: {ctx['dac'].rows:,}; distinct DAC NPIs: {ctx['dac'].distinct_npis:,};"
        f" malformed rows skipped: {ctx['dac'].malformed_rows:,}",
        f"- DAC rows of professionals in the database: {ctx['dac'].matched_rows:,} (deduplicated on NPI)",
        f"- Matched NPIs (in the DAC file): {matched:,} ({_pct(matched, professionals)} of the database rows);"
        f" matched only through the facility file: {ctx['facility_only_npis']:,}",
        f"- Matched rows with at least one CMS fact that are unclaimed (eligible for update):"
        f" {stats['matched_unclaimed']:,}; matched rows left untouched because not unclaimed:"
        f" {ctx['matched_not_unclaimed']:,}",
        "",
        "## Fields",
        "",
        *markdown_table(
            ["Field", "Matched NPIs with a CMS value", "Rows changed by this run"],
            [
                ("medical_school", f"{ctx['known']['medical_school']:,}", f"{stats['changed']['medical_school']:,}"),
                ("graduation_year", f"{ctx['known']['graduation_year']:,}", f"{stats['changed']['graduation_year']:,}"),
                ("group_practice", f"{ctx['known']['group_practice']:,}", f"{stats['changed']['group_practice']:,}"),
                ("hospital_affiliations",
                 f"{ctx['known']['hospital_affiliations']:,}" if ctx["hospital_names"] is not None else "not run",
                 f"{stats['changed']['hospital_affiliations']:,}"),
                ("gender (only where the row has none)", f"{ctx['known']['gender']:,}", f"{stats['changed']['gender']:,}"),
                (f"cms_as_of = {args.as_of.isoformat()}", f"{stats['enriched']:,} unclaimed rows with any CMS fact",
                 f"{stats['cms_as_of_changed']:,}"),
            ],
        ),
        "",
        f"- Rows carrying `cms_as_of` = {args.as_of.isoformat()} after this run: {stats['rows_with_this_release']:,}.",
        "- `registry_source` and `registry_as_of` describe the NPPES row (`seed_professionals.py`) and are never"
        " written by this script.",
        f"- Medical school unknown (\"OTHER\" or blank on the NPI's first line): {ctx['dac'].unknown_school_npis:,}"
        f" matched NPIs; NPIs whose lines disagree on the school (first line kept): {ctx['school_disagrees']:,}",
        f"- Graduation year unknown (blank, or outside {EARLIEST_GRADUATION} to {args.as_of.year}):"
        f" {ctx['unknown_year']:,} matched NPIs",
        "- An unknown value never clears a stored one; a known value replaces a different stored one.",
        "",
        "## Hospital affiliations",
        "",
    ]
    if ctx["hospital_names"] is None:
        lines += [
            "Not run: " + ("no `--facility` file given. " if ctx["facility"] is None else "")
            + ("no `--hospitals` file given, so CCNs cannot be turned into names. " if args.hospitals is None else "")
            + "`hospital_affiliations` was left as it is on every row.",
            "",
        ]
    else:
        lines += [
            f"- Facility affiliation rows read: {ctx['facility'].rows:,}; Hospital-type rows of professionals in the database:"
            f" {ctx['facility'].hospital_rows:,} ({len(ctx['facility'].hospital_ccns):,} NPIs)",
            f"- Hospitals named in the hospitals file: {len(ctx['hospital_names']):,}; matched NPIs with at least one"
            f" named hospital: {ctx['known']['hospital_affiliations']:,}; distinct NPI-CCN pairs without a name in that"
            f" file: {ctx['unnamed_ccns']:,} (dropped)",
            "- Names are stored as CMS prints them (upper case), distinct and sorted. An NPI with no named hospital"
            " keeps its stored list.",
            "",
        ]
    lines += [
        "## Changes",
        "",
        f"Rows updated: {stats['updated']:,}. Every update is guarded by IS DISTINCT FROM and only unclaimed rows are"
        " written, so a second run with the same files changes 0 rows (see the run log).",
        "",
        "## Run log",
        "",
        "| " + " | ".join(RUN_LOG_COLUMNS) + " |",
        "|" + "|".join(" --- " for _ in RUN_LOG_COLUMNS) + "|",
        *run_log,
    ]
    return lines


RUN_LOG_COLUMNS = ("Run at (UTC)", "CMS as of", "Matched NPIs", "Rows with CMS facts", "Rows updated",
                   "cms_as_of set")


def summary_line(args, ctx: dict, stats: dict, started: dt.datetime) -> str:
    return (
        f"| {started.strftime('%Y-%m-%d %H:%M')} | {args.as_of.isoformat()} | {ctx['matched_npis']:,}"
        f" | {stats['enriched']:,} | {stats['updated']:,} | {stats['cms_as_of_changed']:,} |"
    )


# ---------------------------------------------------------------- command line


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dac", required=True, type=pathlib.Path, help="DAC_NationalDownloadableFile.csv")
    parser.add_argument("--facility", type=pathlib.Path, help="Facility_Affiliation.csv (optional)")
    parser.add_argument("--hospitals", type=pathlib.Path, help="Hospital_General_Information.csv (optional)")
    parser.add_argument("--as-of", required=True, type=dt.date.fromisoformat,
                        help="CMS release date, YYYY-MM-DD (stored as cms_as_of on enriched rows)")
    add_database_argument(parser)
    parser.add_argument("--dry-run", action="store_true", help="Run everything, report, then roll back")
    parser.add_argument("--batch-size", type=int, default=5000, help="Rows per insert into the staging table")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help=f"run even when the database holds fewer than {MIN_UNCLAIMED_NPPES:,} unclaimed nppes rows or no NPI"
        " matches",
    )
    args = parser.parse_args(argv)
    for label, path in (("--dac", args.dac), ("--facility", args.facility), ("--hospitals", args.hospitals)):
        if path is not None and not path.is_file():
            parser.error(f"{label}: no such file: {path}")
    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")
    return args


def stop(conn, problem: str) -> int:
    """Ends a run that failed the guard: nothing committed, the report file left as it is."""
    conn.rollback()
    print(f"Stopped: {problem}. Nothing was written: the database is rolled back and {REPORT_PATH.name} is left as it"
          " is. Pass --allow-empty to run anyway.", file=sys.stderr)
    return 1


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    started = utc_now()
    clock = time.monotonic()
    conn = connect(args.database_url)
    try:
        statuses = load_professional_npis(conn)
        unclaimed_nppes = count_unclaimed_nppes(conn)
        problem = guard_problem(unclaimed_nppes, None)
        if problem and not args.allow_empty:
            return stop(conn, problem)
        wanted = {npi for npi in statuses if is_valid_npi(npi)}
        print(f"{len(statuses):,} professionals in the database ({unclaimed_nppes:,} unclaimed nppes). Reading"
              f" {args.dac.name} ...")
        dac = read_dac(args.dac, wanted, args.as_of.year)
        problem = guard_problem(unclaimed_nppes, len(dac.facts))
        if problem and not args.allow_empty:
            return stop(conn, problem)

        facility = read_facility_affiliations(args.facility, wanted) if args.facility else None
        hospital_names = read_hospital_names(args.hospitals) if (args.hospitals and facility) else None
        named: dict[str, list[str]] | None = None
        unnamed_ccns = 0
        if facility is not None and hospital_names is not None:
            named = {}
            for npi, ccns in facility.hospital_ccns.items():
                names, missing = hospital_affiliations(ccns, hospital_names)
                unnamed_ccns += missing
                if names:
                    named[npi] = names
        updates = build_updates(dac.facts, named)

        all_matched = set(dac.facts) | set(named or {})
        ctx = {
            "professionals": len(statuses),
            "unclaimed": sum(1 for s in statuses.values() if s == "unclaimed"),
            "matched_npis": len(dac.facts),
            "facility_only_npis": len(all_matched - set(dac.facts)),
            "matched_not_unclaimed": sum(1 for n in all_matched if statuses.get(n) != "unclaimed"),
            "dac": dac,
            "facility": facility,
            "hospital_names": hospital_names,
            "unnamed_ccns": unnamed_ccns,
            "school_disagrees": sum(1 for f in dac.facts.values() if f.school_disagrees),
            "unknown_year": sum(1 for f in dac.facts.values() if f.graduation_year is None),
            "known": {
                "medical_school": sum(1 for u in updates if u.medical_school is not None),
                "graduation_year": sum(1 for u in updates if u.graduation_year is not None),
                "group_practice": sum(1 for u in updates if u.group_practice is not None),
                "hospital_affiliations": sum(1 for u in updates if u.hospital_affiliations),
                "gender": sum(1 for u in updates if u.gender is not None),
            },
        }
        stats = apply_updates(conn, updates, args.as_of, args.batch_size)
        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()

    seconds = time.monotonic() - clock
    run_log = previous_run_log(REPORT_PATH, len(RUN_LOG_COLUMNS))
    if not args.dry_run:
        run_log = (run_log + [summary_line(args, ctx, stats, started)])[-20:]
    lines = report_lines(args, ctx, stats, started, seconds, run_log)
    print("\n".join(lines))
    if args.dry_run:
        print("\nDry run: nothing committed, report file not written.")
    else:
        print(f"\nReport written to {write_report(REPORT_PATH, lines)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
