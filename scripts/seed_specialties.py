"""Seeds public.specialties with the 104 specialty groups of the content document (task 1.5, lane L1).

The groups come from scripts/specialty_groups.py, the committed snapshot of the content PDF's specialty directory. Every
group is named by its card title in the content document, in English and Arabic (decided 20 Oct 2026), the 24 groups the
prototype already ships included. Those 24 keep their slug (so every URL built on the sample keeps working), search words
and body system from data/sample; the other 80 get a slug from their English title and no body system yet (which body
system a group sits under is Dr Ayman's editorial call; the report lists them for him). The report shows the
prototype's name beside the card title where the two differ (18 of the 24), the difference lane L6 sees against
data/sample/specialties.json.

Taxonomy codes are not written here: scripts/map_taxonomy.py owns specialties.taxonomy_codes.

Idempotent: rows are matched on slug and updated only when a seeded value differs, so a second run changes nothing. A
value the seed does not have (the 80 groups' body system and search words) is never blanked, so an admin's later edit
survives a re-run. `shown` is set on insert only (admin hides groups on screen 40). Rows in the database that are not
among the 104 are reported, never deleted.

    python scripts/seed_specialties.py --dry-run          # connect, compute, roll back, print the report section
    python scripts/seed_specialties.py                    # commit
    python scripts/seed_specialties.py --content-pdf PATH --check-snapshot   # diff the PDF against the snapshot

A committed run writes its section of output/specialties_report.md (map_taxonomy.py writes the other section); a dry run
prints the section instead, so the committed report always describes the last committed run.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import unicodedata
from collections.abc import Iterable, Sequence
from typing import Any

# Importable under `python -I` too (isolated mode leaves the script's folder off sys.path).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from seed_common import OUTPUT_DIR, SAMPLE_DIR, add_database_argument, connect, markdown_table, utc_now  # noqa: E402
from specialty_groups import SPECIALTY_GROUPS  # noqa: E402

EXPECTED_GROUPS = 104
REPORT_PATH = OUTPUT_DIR / "specialties_report.md"
REPORT_TITLE = "# Specialty groups and taxonomy mapping (task 1.5)"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

# Letters Postgres's unaccent folds that Unicode decomposition (NFKD) leaves alone. Checked against private.slugify on
# the local stack; the unit tests pin the cases.
_FOLD_EXTRA = str.maketrans(
    {
        "ß": "ss",
        "ẞ": "SS",
        "æ": "ae",
        "Æ": "AE",
        "œ": "oe",
        "Œ": "OE",
        "ø": "o",
        "Ø": "O",
        "đ": "d",
        "Đ": "D",
        "ð": "d",
        "Ð": "D",
        "ł": "l",
        "Ł": "L",
        "þ": "th",
        "Þ": "TH",
        "ı": "i",
        "ħ": "h",
        "Ħ": "H",
    }
)


def slugify(value: str | None) -> str:
    """The Python twin of private.slugify (migration 1): lower-case ASCII, accents folded, every run of anything else
    one hyphen, hyphens trimmed. Text with no Latin letters or digits (Arabic) gives an empty string, as in Postgres."""
    text = unicodedata.normalize("NFKD", (value or "").translate(_FOLD_EXTRA))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _load_json(name: str) -> Any:
    return json.loads((SAMPLE_DIR / name).read_text(encoding="utf-8"))


def load_sample() -> tuple[dict[str, dict], dict[str, str], dict[str, dict]]:
    """The prototype's 24 groups: their specialties.json rows (prototype names) by slug, body system by slug, search words
    by slug."""
    names = {row["slug"]: row for row in _load_json("specialties.json")}
    body_system: dict[str, str] = {}
    for system in _load_json("body-systems.json"):
        for slug in system["specialties"]:
            if slug in body_system:
                raise ValueError(f"{slug} is listed under two body systems in data/sample/body-systems.json")
            body_system[slug] = system["id"]
    terms = {row["slug"]: row for row in _load_json("specialty-terms.json")["terms"]}
    return names, body_system, terms


def specialty_rows() -> list[dict[str, Any]]:
    """The 104 rows to seed, in card order: names from the card titles, the 24 prototype groups' slug, body system and
    search words from data/sample, plus the content-document fields the report shows. Raises on any snapshot or sample
    inconsistency, so nothing is written from a broken input."""
    names, body_systems, terms = load_sample()
    if len(SPECIALTY_GROUPS) != EXPECTED_GROUPS:
        raise ValueError(f"scripts/specialty_groups.py has {len(SPECIALTY_GROUPS)} groups, expected {EXPECTED_GROUPS}")

    rows: list[dict[str, Any]] = []
    used_samples: set[str] = set()
    for index, group in enumerate(SPECIALTY_GROUPS, start=1):
        if group["position"] != index:
            raise ValueError(f"specialty_groups.py entry {index} has position {group['position']}")
        sample_slug = group.get("sample_slug")
        if sample_slug:
            if sample_slug not in names:
                raise ValueError(f"sample_slug {sample_slug!r} is not in data/sample/specialties.json")
            if sample_slug in used_samples:
                raise ValueError(f"sample_slug {sample_slug!r} is pinned to two cards")
            if sample_slug not in body_systems:
                raise ValueError(f"sample group {sample_slug!r} has no body system in data/sample/body-systems.json")
            used_samples.add(sample_slug)
            sample = names[sample_slug]
            term = terms.get(sample_slug, {})
            row = {
                "slug": sample_slug,
                "body_system": body_systems[sample_slug],
                "synonyms_en": list(term.get("synonymsEn", [])),
                "synonyms_ar": list(term.get("synonymsAr", [])),
                "slug_source": "prototype",
                "prototype_name_en": sample["nameEn"],
                "prototype_name_ar": sample["nameAr"],
            }
        else:
            row = {
                "slug": slugify(group["name_en"]),
                "body_system": None,
                "synonyms_en": [],
                "synonyms_ar": [],
                "slug_source": "card title",
                "prototype_name_en": None,
                "prototype_name_ar": None,
            }
        row.update(
            name_en=group["name_en"],
            name_ar=group["name_ar"],
            position=group["position"],
            page=group["page"],
            section_en=group["section_en"],
            section_ar=group["section_ar"],
        )
        for key in ("name_en", "name_ar"):
            if not 1 <= len(row[key]) <= 120:
                raise ValueError(f"{row['slug']}: {key} must be 1 to 120 characters")
        if not SLUG_PATTERN.match(row["slug"]):
            raise ValueError(f"card {index} ({group['name_en']!r}) gives an invalid slug {row['slug']!r}")
        rows.append(row)

    missing = sorted(set(names) - used_samples)
    if missing:
        raise ValueError(f"sample groups not pinned to a card in specialty_groups.py: {', '.join(missing)}")
    slugs = [row["slug"] for row in rows]
    duplicates = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    if duplicates:
        raise ValueError(f"duplicate slugs: {', '.join(duplicates)}")
    return rows


def group_slugs() -> list[str]:
    """The 104 slugs in card order (map_taxonomy.py and the tests check the mapping against these)."""
    return [row["slug"] for row in specialty_rows()]


# ---------------------------------------------------------------- database


SEEDED_COLUMNS = ("name_en", "name_ar", "body_system", "position", "synonyms_en", "synonyms_ar")


def _target_values(row: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
    """What each seeded column should hold. Where the seed has no value (null body system, no search words), the
    database keeps whatever it has."""
    values = {column: row[column] for column in SEEDED_COLUMNS}
    if existing is not None:
        if values["body_system"] is None:
            values["body_system"] = existing["body_system"]
        for column in ("synonyms_en", "synonyms_ar"):
            if not values[column]:
                values[column] = list(existing[column])
    return values


def upsert(conn, rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Inserts missing groups and updates groups whose seeded values differ. Returns what changed; the caller commits or
    rolls back."""
    result: dict[str, Any] = {"inserted": [], "updated": [], "unchanged": 0, "extra": []}
    with conn.cursor() as cur:
        cur.execute(
            "select slug, name_en, name_ar, body_system, position, synonyms_en, synonyms_ar"
            " from public.specialties order by position, slug for update"
        )
        existing = {record[0]: dict(zip(("slug",) + SEEDED_COLUMNS, record, strict=True)) for record in cur.fetchall()}
        ours = {row["slug"] for row in rows}
        result["extra"] = [existing[slug] for slug in existing if slug not in ours]

        for row in rows:
            current = existing.get(row["slug"])
            values = _target_values(row, current)
            if current is None:
                cur.execute(
                    "insert into public.specialties"
                    " (slug, name_en, name_ar, body_system, position, synonyms_en, synonyms_ar, shown)"
                    " values (%(slug)s, %(name_en)s, %(name_ar)s, %(body_system)s, %(position)s,"
                    " %(synonyms_en)s::text[], %(synonyms_ar)s::text[], true)"
                    " on conflict (slug) do nothing",
                    {"slug": row["slug"], **values},
                )
                if cur.rowcount == 1:
                    result["inserted"].append(row["slug"])
                continue
            changed = [column for column in SEEDED_COLUMNS if _differs(current[column], values[column])]
            cur.execute(
                "update public.specialties set name_en = %(name_en)s, name_ar = %(name_ar)s,"
                " body_system = %(body_system)s, position = %(position)s,"
                " synonyms_en = %(synonyms_en)s::text[], synonyms_ar = %(synonyms_ar)s::text[]"
                " where slug = %(slug)s"
                " and (name_en, name_ar, body_system, position, synonyms_en, synonyms_ar)"
                " is distinct from (%(name_en)s, %(name_ar)s, %(body_system)s, %(position)s::smallint,"
                " %(synonyms_en)s::text[], %(synonyms_ar)s::text[])",
                {"slug": row["slug"], **values},
            )
            if cur.rowcount == 1:
                result["updated"].append((row["slug"], changed))
            else:
                result["unchanged"] += 1
    return result


def _differs(current: Any, wanted: Any) -> bool:
    if isinstance(wanted, list):
        return list(current or []) != wanted
    return current != wanted


# ---------------------------------------------------------------- content PDF check

_ARABIC_SCRIPT = re.compile(r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]")
_SNAPSHOT_FIELDS = ("page", "section_en", "section_ar", "name_en", "name_ar")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def extract_cards(pdf_path: pathlib.Path) -> list[dict[str, Any]]:
    """Re-reads the specialty directory from the content PDF the way the snapshot was made: on each "SPECIALTY DIRECTORY
    n / 26" page, the two lines after the header are the section (English, Arabic); after "THE TRAINING ADVANTAGE" and
    the line that follows it, the text alternates English and Arabic runs, four per card (title, title, body, body)."""
    import pypdf  # imported here so the unit tests and the seed run without it

    reader = pypdf.PdfReader(str(pdf_path))
    cards: list[dict[str, Any]] = []
    for index, page in enumerate(reader.pages):
        lines = [line.strip() for line in (page.extract_text() or "").splitlines() if line.strip()]
        header = next(
            (k for k, line in enumerate(lines) if re.match(r"SPECIALTY DIRECTORY\s+\d+\s*/\s*26", line)), None
        )
        if header is None:
            continue
        if "THE TRAINING ADVANTAGE" not in lines:
            raise ValueError(f"page {index + 1}: no 'THE TRAINING ADVANTAGE' line")
        start = lines.index("THE TRAINING ADVANTAGE") + 2
        runs: list[list[Any]] = []
        for line in lines[start:]:
            kind = "ar" if _ARABIC_SCRIPT.search(line) else "en"
            if runs and runs[-1][0] == kind:
                runs[-1][1].append(line)
            else:
                runs.append([kind, [line]])
        if len(runs) % 4:
            raise ValueError(f"page {index + 1}: {len(runs)} text runs, expected four per card")
        for k in range(0, len(runs), 4):
            (kind_en, title_en), (kind_ar, title_ar) = runs[k], runs[k + 1]
            if kind_en != "en" or kind_ar != "ar":
                raise ValueError(
                    f"page {index + 1}: card {k // 4 + 1} does not start with an English then Arabic title"
                )
            cards.append(
                {
                    "position": len(cards) + 1,
                    "page": index + 1,
                    "section_en": _norm(lines[header + 1]),
                    "section_ar": _norm(lines[header + 2]),
                    "name_en": _norm(" ".join(title_en)),
                    "name_ar": _norm(" ".join(title_ar)),
                }
            )
    return cards


def snapshot_differences(
    cards: Sequence[dict[str, Any]], snapshot: Sequence[dict[str, Any]] = SPECIALTY_GROUPS
) -> list[str]:
    differences: list[str] = []
    if len(cards) != len(snapshot):
        differences.append(f"the PDF has {len(cards)} cards, the snapshot {len(snapshot)}")
    # Lengths may differ (reported above); compare the cards both sides have.
    for card, group in zip(cards, snapshot, strict=False):
        for field in _SNAPSHOT_FIELDS:
            if card[field] != group[field]:
                differences.append(f"card {group['position']} {field}: snapshot {group[field]!r}, PDF {card[field]!r}")
    return differences


def check_snapshot(pdf_path: pathlib.Path) -> int:
    if not pdf_path.is_file():
        print(f"No such file: {pdf_path}", file=sys.stderr)
        return 2
    try:
        cards = extract_cards(pdf_path)
    except ImportError:
        print("pypdf is not installed: python -m pip install -r scripts/requirements-seed.txt", file=sys.stderr)
        return 2
    except ValueError as error:
        print(f"Could not read the specialty directory: {error}", file=sys.stderr)
        return 1
    differences = snapshot_differences(cards)
    if differences:
        print(f"scripts/specialty_groups.py differs from the PDF in {len(differences)} place(s):")
        for line in differences:
            print(f"  {line}")
        return 1
    pages = f"pages {cards[0]['page']} to {cards[-1]['page']}"
    print(f"scripts/specialty_groups.py matches the PDF: {len(cards)} cards, {pages}.")
    return 0


# ---------------------------------------------------------------- report

SECTION_ORDER = ("seed_specialties", "map_taxonomy")
_SECTION = re.compile(r"<!-- section:(?P<key>[a-z_]+) -->\n(?P<body>.*?)<!-- /section:(?P=key) -->\n?", re.S)


def write_report_section(key: str, lines: Iterable[str], path: pathlib.Path = REPORT_PATH) -> pathlib.Path:
    """Rewrites one script's section of the shared report and keeps the others, so the scripts can run in any order."""
    sections: dict[str, str] = {}
    if path.is_file():
        sections = {m.group("key"): m.group("body") for m in _SECTION.finditer(path.read_text(encoding="utf-8"))}
    sections[key] = "\n".join(lines).rstrip() + "\n"
    order = [k for k in SECTION_ORDER if k in sections] + sorted(k for k in sections if k not in SECTION_ORDER)
    parts = [REPORT_TITLE, ""]
    for k in order:
        parts.append(f"<!-- section:{k} -->\n{sections[k]}<!-- /section:{k} -->")
        parts.append("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8", newline="\n")
    return path


def prototype_name(row: dict[str, Any]) -> str:
    """The prototype's name of a group where it differs from the card title ("English / Arabic"), else ""."""
    en, ar = row.get("prototype_name_en"), row.get("prototype_name_ar")
    if en is None or (en, ar) == (row["name_en"], row["name_ar"]):
        return ""
    return f"{en} / {ar}"


def report_lines(rows: Sequence[dict[str, Any]], result: dict[str, Any], dry_run: bool) -> list[str]:
    no_system = [row for row in rows if row["body_system"] is None]
    lines = [
        "## Specialty groups (seed_specialties.py)",
        "",
        f"Last run: {utc_now():%Y-%m-%d %H:%M} UTC, {'dry run (rolled back)' if dry_run else 'committed'}.",
        "",
    ]
    lines += markdown_table(
        ("Inserted", "Updated", "Unchanged", "In the database but not among the 104"),
        [(len(result["inserted"]), len(result["updated"]), result["unchanged"], len(result["extra"]))],
    )
    if result["updated"]:
        lines += ["", "Updated: " + "; ".join(f"{slug} ({', '.join(cols)})" for slug, cols in result["updated"]) + "."]
    if result["extra"]:
        lines += ["", "Rows in the database that are not among the 104 (left as they are):", ""]
        lines += markdown_table(
            ("Slug", "Name (en)", "Position"),
            [(row["slug"], row["name_en"], row["position"]) for row in result["extra"]],
        )
    lines += [
        "",
        "Source: `scripts/specialty_groups.py` (the content PDF's specialty directory, pages 21 to 46). Every group is "
        "named by its card title, in English and Arabic (decided 20 Oct 2026), the 24 groups the prototype ships "
        "included; those 24 keep their slug (the prototype's URLs), search words and body system from `data/sample`, and "
        "the last column shows the name `data/sample/specialties.json` gives them where it differs. The other 80 take a "
        "slug from the English title. Taxonomy codes: see the mapping section.",
        "",
        "### The 104 groups",
        "",
    ]
    lines += markdown_table(
        ("#", "Slug", "Name (en)", "Name (ar)", "Section", "Body system", "Slug from", "Prototype name (data/sample)"),
        [
            (
                row["position"],
                f"`{row['slug']}`",
                row["name_en"],
                row["name_ar"],
                row["section_en"],
                row["body_system"] or "(none yet)",
                row["slug_source"],
                prototype_name(row),
            )
            for row in rows
        ],
    )
    lines += [
        "",
        f"### Groups waiting for a body system ({len(no_system)})",
        "",
        "For Dr Ayman: the directory (screen 4) groups specialties under the body systems of "
        "`data/sample/body-systems.json`. These groups have none yet: each needs one of those body systems (or a new "
        "one). Listed by their section in the content document.",
        "",
    ]
    by_section: dict[str, list[dict[str, Any]]] = {}
    for row in no_system:
        by_section.setdefault(row["section_en"], []).append(row)
    for section, members in by_section.items():
        listed = ", ".join(f"{row['position']} {row['name_en']} (`{row['slug']}`)" for row in members)
        lines.append(f"- {section}: {listed}")
    return lines


# ---------------------------------------------------------------- main


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    add_database_argument(parser)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="connect and compute, then roll back; print the report section instead of writing it",
    )
    parser.add_argument("--content-pdf", type=pathlib.Path, help="the content PDF (with --check-snapshot)")
    parser.add_argument(
        "--check-snapshot",
        action="store_true",
        help="re-extract the 104 cards from --content-pdf and diff them against scripts/specialty_groups.py; "
        "exits 1 on any difference; does not touch the database",
    )
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if args.check_snapshot or args.content_pdf:
        if not (args.check_snapshot and args.content_pdf):
            parser.error("--content-pdf and --check-snapshot go together")
        return check_snapshot(args.content_pdf)

    rows = specialty_rows()
    conn = connect(args.database_url)
    try:
        result = upsert(conn, rows)
        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    lines = report_lines(rows, result, args.dry_run)
    path = None if args.dry_run else write_report_section("seed_specialties", lines)
    print(
        f"{len(rows)} groups{' (dry run, rolled back)' if args.dry_run else ''}: inserted {len(result['inserted'])}, "
        f"updated {len(result['updated'])}, unchanged {result['unchanged']}."
    )
    for slug, columns in result["updated"]:
        print(f"  updated {slug}: {', '.join(columns)}")
    if result["extra"]:
        print(
            f"{len(result['extra'])} row(s) in the database are not among the 104 (not deleted): "
            + ", ".join(row["slug"] for row in result["extra"])
        )
    print(
        f"{sum(1 for row in rows if row['body_system'] is None)} groups have no body system yet (listed in the report)."
    )
    if path is None:
        print("\n".join(["", *lines, ""]))
        print(f"Dry run: rolled back; {REPORT_PATH.relative_to(REPORT_PATH.parents[1]).as_posix()} not written.")
    else:
        print(f"Report: {path.relative_to(path.parents[1])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
