"""Shared helpers for the task 1.5 seed and mapping scripts (lane L1).

Every script here is run once by hand, is idempotent, and talks to Postgres directly as the database owner (it bypasses RLS,
which is why none of this ever runs inside the app). The connection string comes from DATABASE_URL or --database-url;
there is no built-in default, so a script can never write to a database nobody named.

Run reports go to output/: every report in output/ holds counts only and is committed (never a registry row; a
row-level extract belongs outside the repo).

Every connection has explicit timeouts (CLAUDE.md: every outbound call has one): 10 s to connect, TCP keepalives that
notice a dead server in about a minute, a 10 s lock wait, and a statement timeout of 15 minutes (generous for the
registry import; SEED_STATEMENT_TIMEOUT overrides it, e.g. 30min, 900s or 0 for none).
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import pathlib
import re
import sys
from typing import Iterable, Sequence

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "output"
SAMPLE_DIR = REPO_ROOT / "data" / "sample"

# Statement timeout of every seed connection, as Postgres reads it (e.g. 15min, 900s, 900000 = milliseconds).
STATEMENT_TIMEOUT_ENV = "SEED_STATEMENT_TIMEOUT"
DEFAULT_STATEMENT_TIMEOUT = "15min"
_TIMEOUT_PATTERN = re.compile(r"^[0-9]+ ?(us|ms|s|min|h|d)?$")


def add_database_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Postgres connection string (default: $DATABASE_URL). Local stack: see .env.example.",
    )


def statement_timeout() -> str:
    """The statement timeout for seed connections: $SEED_STATEMENT_TIMEOUT, else 15 minutes."""
    value = os.environ.get(STATEMENT_TIMEOUT_ENV, "").strip() or DEFAULT_STATEMENT_TIMEOUT
    if not _TIMEOUT_PATTERN.match(value):
        sys.exit(f"{STATEMENT_TIMEOUT_ENV}={value!r} is not a Postgres duration (e.g. 15min, 900s, 0 for none).")
    return value


def connect(database_url: str | None):
    """Opens a psycopg2 connection with autocommit off; callers commit once at the end of a run."""
    if not database_url:
        sys.exit("No database: set DATABASE_URL or pass --database-url (the local stack's URL is in .env.example).")
    timeout = statement_timeout()
    import psycopg2  # imported here so --help and the unit tests run without the driver installed

    # The keyword arguments are merged into the connection string, whichever form it has (URL or key=value).
    conn = psycopg2.connect(
        database_url, connect_timeout=10, keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=3
    )
    conn.autocommit = False
    with conn.cursor() as cur:
        # Long imports are fine; a stuck lock or a statement that never returns is not.
        cur.execute("set lock_timeout = '10s'")
        cur.execute("select set_config('statement_timeout', %s, false)", (timeout,))
    return conn


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def write_report(path: pathlib.Path, lines: Iterable[str]) -> pathlib.Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = "\n".join(lines).rstrip() + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
    return path


def markdown_table(header: Sequence[str], rows: Iterable[Sequence[object]]) -> list[str]:
    def cell(value: object) -> str:
        return str(value).replace("|", "\\|").replace("\n", " ")

    out = ["| " + " | ".join(header) + " |", "|" + "|".join(" --- " for _ in header) + "|"]
    out.extend("| " + " | ".join(cell(v) for v in row) + " |" for row in rows)
    return out


def clean(value: object) -> str | None:
    """Trimmed text, or None for blanks (registry files use empty cells and stray spaces)."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None
