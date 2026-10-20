"""Builds supabase/seed.sql, the small synthetic dev seed (task 1.5, lane L1), from data/sample/*.json.

The 47 screens read data/sample through the accessors in lib/sample.ts. Lane L6 switches them to Postgres and compares
screenshots, so dev data must equal prototype data: this script replays the accessors' derivations (listing status, fee
lines, refund amounts, share expiry, set page numbering ...) and writes rows that hold what the accessors return.

Rules it keeps:
  * Deterministic: the same input gives a byte-identical seed.sql (no generation timestamp, stable ordering, fixed ids).
  * No business number is written here: fees, slot length, share days, refund cut-off, records price and AI currency are
    parsed from config/business.ts (and BYTES_PER_GB from lib/records.ts) at build time.
  * The sample clock is applied in SQL, at seed time: helpers in pg_temp shift every authored instant the way
    lib/card-data.ts does (sampleInstant, sampleInstantExact, and the wall-clock shift for availability exceptions), so a
    `supabase db reset` on any day reproduces what the prototype shows that day.
  * Synthetic only: every person is invented and every address is on the reserved example.com domain.
  * The 104 specialty rows are seed_specialties.specialty_rows() itself (imported, as is its slugify): every group named by
    its card title (decided 20 Oct 2026, so the 24 prototype groups' names differ from data/sample/specialties.json; the
    report lists them), with the taxonomy codes scripts/map_taxonomy.py writes from scripts/taxonomy_map.py (sorted), so
    running either script after a reset changes nothing.
  * The rows pass the schema's checks as they are: a 'done' booking carries the doctor's mark (done_at), no two live
    bookings of one professional overlap (checked here; an overlap in the sample stops the build and is named, never
    moved), every storage_path is inside the migrations' allowlist (storage_object_name), and a share's or an introduction
    request's patient first names and gender come from the profile through the database trigger.
  * Introduction requests (introductions.json rows with status request) are public.introduction_requests rows (open).

Usage:
  python scripts/build_dev_seed.py            writes supabase/seed.sql
  python scripts/build_dev_seed.py --report   also writes output/dev_seed_report.md (rows per table, skipped items)
  python scripts/build_dev_seed.py --check    exits 1 when supabase/seed.sql is not what the sample data builds

Python standard library only (seed_specialties, seed_common, specialty_groups and taxonomy_map import nothing else).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import pathlib
import re
import sys
import unicodedata
from typing import Any, Callable, Iterable

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from seed_common import OUTPUT_DIR, REPO_ROOT, SAMPLE_DIR, markdown_table, write_report  # noqa: E402
from seed_specialties import slugify  # noqa: E402,F401  (the slug rule, re-exported for the tests)
from seed_specialties import specialty_rows as seed_specialty_rows  # noqa: E402
from taxonomy_map import TAXONOMY_MAP  # noqa: E402

SEED_PATH = REPO_ROOT / "supabase" / "seed.sql"
REPORT_PATH = OUTPUT_DIR / "dev_seed_report.md"

# GoTrue's single-tenant instance id: every user row a local or self-hosted stack creates carries it.
GOTRUE_INSTANCE_ID = "00000000-0000-0000-0000-000000000000"

MIME_BY_KIND = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "jpg": "image/jpeg",
    "png": "image/png",
}

LISTING_TO_DB_STATUS = {"inReview": "pending_review"}

# The keys and values of private.professionals_snapshot_registry (migration 0300), in its order, read from the row `p`.
REGISTRY_AS_FILED_KEYS = (
    ("firstName", "p.first_name"), ("middleName", "p.middle_name"), ("lastName", "p.last_name"), ("nameEn", "p.name_en"),
    ("cityEn", "p.city_en"), ("cityAr", "p.city_ar"), ("stateCode", "p.state_code"), ("taxonomyCode", "p.taxonomy_code"),
    ("specialtyId", "p.specialty_id"), ("registryCredential", "p.registry_credential"), ("medicalSchool", "p.medical_school"),
    ("graduationYear", "p.graduation_year"), ("groupPractice", "p.group_practice"),
    ("hospitalAffiliations", "to_jsonb(p.hospital_affiliations)"), ("gender", "p.gender"),
    ("registrySource", "p.registry_source"), ("registryAsOf", "p.registry_as_of"), ("cmsAsOf", "p.cms_as_of"),
)

# Patients whose gender a seeded row needs from the profile (an introduction request's snapshot is copied from it by
# introduction_requests_copy_patient) where the sample gives none. Hamad (rs_007, int_003): int_003's concern speaks of
# him ("He sings in the school choir").
PATIENT_GENDER_FILL = {"Hamad": "m"}

# Files with more pages than this are seeded with one generate_series insert (rs_007's 50-page parts) to keep seed.sql small.
LONG_FILE_PAGES = 12

# Where a sample shape and the schema differ, what the seeded rows hold instead: the list lane L6 adapts the accessors to.
SAMPLE_VS_SCHEMA = [
    "Listing status: doctors.json `state` plus listingFor become professionals.status; `inReview` is `pending_review`. The card "
    "state is derived back (claimed, pending_review, rejected read as pending; suspended and removed are hidden publicly).",
    "Names: nameEn/nameAr are kept as name_en/name_ar (with the title); first_name/last_name are nameEn without \"Dr\".",
    "Place: cityEn \"Chicago, Illinois\" is city_en \"Chicago\" plus state_code \"IL\"; the state name comes from us-states.json. "
    "cityAr keeps only the city (the sample's \"نيويورك\" has no state, so a rebuilt \"city، state\" differs for New York). "
    "practice_country is 'US' for every sample doctor (every cityEn names a US state).",
    "Registry provenance: registry_source and registry_as_of are profiles.json registrySource/registryAsOf as authored (the "
    "sample says 'cms' where an imported row says 'nppes'); cms_as_of is registryAsOf where registrySource is 'cms', else null.",
    "Registry as filed: professional_private.registry_as_filed is set for every doctor whose listing is not unclaimed (the "
    "trigger's camelCase keys, built from the seeded row), with credential-reviews.json registryAsFiled overriding what it names "
    "(a filed cityEn \"City, State\" gives cityEn, stateCode and, from cityAr, the Arabic city; doc_010 was filed in Detroit). "
    "The review's registry block (registryAsFiledFor plus the doctor row) reads this instead; unclaimed rows have none.",
    "Languages: [{code, dialect}] is languages text[] plus one arabic_dialect; hospitalAffiliation is hospital_affiliations[1].",
    "Fee: feeUsdCents is fee_cents with fee_currency (default USD); empty bioEn/bioAr are null.",
    "Tags: doctors.json tags are expertise_tags rows, locale en, position = card order; specialtyEn/Ar come from specialties.",
    "Board: board_name is builder.json boardName, else profiles.json board; board_status is builder.json boardStatus, else "
    "'certified' when boardCertified (verified rows have no builder row); licence_state is the state code.",
    "Review instants: review_submitted_at and review_decided_at hold builder.json's instants for every doctor with a builder "
    "row (doc_002 too); listingFor shows submittedAt only for inReview/rejected rows and decidedAt only for rejected rows, so "
    "the accessor gates them by status. claimed_at is listings.json claimedAtUtc, else the used invite's usedAtUtc.",
    "Credentials: a verified doctor's files are accepted (reviewed_at = builder decidedAtUtc); the file a rejection names is "
    "rejected with the reasons; the rest are pending; storage_path is {professional uuid}/{object name}, the object name being "
    "'{file id}-{name}' made to fit the migrations' allowlist by storage_object_name (letters, digits, '_' and '-', one "
    "extension; see \"Checks\"); no object is uploaded.",
    "Time zone: professionals.time_zone is set for every row (doctorTimeZone: the schedule's zone, else STATE_TIME_ZONES).",
    "Bookable: accepting_new_patients is true for doc_002 (availability.json) and for verified doctors with profile slots; "
    "can_take_bookings follows the Stripe account (doc_008's payouts are off, so it is false).",
    "Open times: doc_002's come from availability_rules and availability_exceptions (its hand-authored profile slots are not "
    "stored); the other verified doctors' profile slots are availability_exceptions of kind extra, slotLengthMinutesDefault long, "
    "shifted by whole UTC days like upcomingSlots (not on the wall clock), so nextAvailable is the first one ahead.",
    "Bookings: ids are uuids; patientFirstName is patient_id plus patient_first_name_en/ar; the three lines are doctor_fee_cents, "
    "platform_fee_cents, card_processing_cents with currency, and total_cents is generated; durationMinutes is ends_at - starts_at. "
    "Stored status stays as authored (upcoming); \"done once the slot has ended\" stays in code, as in toPatientBooking. A row "
    "stored 'done' (bk_002, bk_006, bk_007) carries done_at, the doctor's mark the schema requires: doneAtUtc where the sample "
    "has one, else the visit's ends_at.",
    "Bookings booked_at: bookedAtUtc where the row has one, else the receipt's paid_at (bk_001..bk_003), else the seed time (bk_211).",
    "Join links: only video visits carry join_url (bk_006's and int_005's phone links are dropped, as toPatientBooking drops them).",
    "Introductions: confirmed rows are bookings with status upcoming, done rows status done with done_at; int_002 is bk_004 "
    "(booked_at is bk_004's bookedAtUtc, not int_002's receivedAtUtc); concernEn/concernAr collapse into one `concern`, seeded "
    "with the Arabic text (what a Gulf patient types) and concern_locale 'ar' (null where no concern is stored); "
    "sharedSummaryId is record_shares.booking_id. The request (int_003) is an introduction_requests row (next item).",
    "Requests: an introductions.json row with status request (int_003) is a public.introduction_requests row with status "
    "open (screen 32's unpaid request); startsAtUtc is requested_start and receivedAtUtc is received_at (both shifted like "
    "sampleInstant); visitType, bookedBy, ageGroup, prepared and patientTimeZone are columns; the concern is the Arabic "
    "text with concern_locale 'ar', as on the bookings; patient_first_name_en/ar and patient_gender are the profile's, "
    "copied by the trigger introduction_requests_copy_patient (the seed sends none); doctorTimeZone is the professional's "
    "time_zone; joinUrl and sharedSummaryId are null on a request; specialty_id, transcript and consent_id are null (the "
    "request did not come from the intake chat); booking_id, answered_at and withdrawn_at are null while it is open.",
    "Receipts: subject is 'booking' on every receipt and refund (record_set_id null); paymentMethod is wallet, card_brand, "
    "card_last4; refunds are rows with the amount refundFor gives, reason "
    "patientEarly/doctor, initiated_by automatic, idempotency_key refund-<booking uuid> (adminRefundKey of the uuid, not of bk_NNN).",
    "Payout account: payouts.json/payments.json account facts are professional_private.stripe_*; next and recent payouts are "
    "Stripe API reads with no table.",
    "Memberships: one row per professional (doc_002 is mem_active); membership-billing.json facts are columns on the same row "
    "(started_at, comp_until, stripe ids, last_invoice_*).",
    "Invites: token is token_hash (sha256 hex of the token); status is public.current_status(invites); usedAt is used_at plus "
    "used_by (the doctor's account); a missing language is 'en'.",
    "Removals: infoRequest and decision are flat columns; askedBy/decidedBy are admin uuids; instants use the exact shift.",
    "Records: sample file ids (f1..) are uuids per set; storage_path is {patient uuid}/{set uuid}/{object name} (the "
    "credentials rule); page status is one record_pages row per page, numbered across the set; "
    "failure {fileId, filePage} is failure_file_id plus failure_file_page; the quote (quoteFor) is quote_cents with quote_currency; "
    "a cancelled set has cancelled_at = finished_at.",
    "rs_007 f4 page 17 is unreadable without a reason in ai-jobs.json (the accessor gives no reason): seeded with "
    "unreadable_reason null. rs_007 has no summary, so no record_items row points at that page.",
    "Summaries: record_summaries.data is the SummaryData body (documents ... unreadable) without id and generatedAt; generated_at, "
    "reviewed_by_professional_id and reviewed_at are columns; the patient block comes from profiles.",
    "Items: every summary entry is one canonical record_items row plus one duplicate (canonical_item_id) per extra source; "
    "{doc, page} sources map to source_page_id by documents in order, pages counted across the set; flags stay in data only; "
    "an unreadable entry is an item of type unreadable with label and details.reason the reason (an entry without a reason "
    "would be labelled 'unreadable' with details.reason null; the sample has none).",
    "Shares: expires_at is stored (shared_at + shareDefaultDays); patient_first_name_en/ar and patient_gender are the "
    "profile's, copied by the trigger record_shares_copy_patient (the seed sends none); status is derived: reviewed when the summary's reviewer is the "
    "share's professional, viewed when viewed_at is set, else new.",
    "AI jobs: steps is a jsonb array of {step, startedAt, finishedAt, usage?, files?} with shifted ISO instants and fileId as the "
    "record_files uuid; totals are summed into input_tokens, output_tokens, cost_micros; status and step mirror the set.",
    "Audit: actor ids are account uuids (adm_002 has the reserved uuid ad000000-0000-4000-8000-000000000002 and no account); "
    "a system actor sys_<name> is actor_id null, actor_kind system, actor_system <name> (sys_stripe is stripe, sys_pipeline "
    "pipeline, sys_scheduler scheduler, sys_registry registry); target ids are the "
    "seeded uuids as text where the target is seeded; target_professional_id is set only where the sample has target.doctorId; "
    "verification checks keep {kind, source, result, checkedAt, by} with by/reviewer as uuids; aud_NNN ids are not stored.",
    "Accounts: patients pat_001..pat_003 are Noura, Yousef, Faisal (the patients of rs_001..rs_003); pat_004..pat_008 are Reem, "
    "Hamad, Maryam, Latifa, Abdullah; patient emails are <firstname>@example.com; the admin is ops@example.com. A patient's "
    "profile takes the Arabic first name and time zone of their introductions.json row (int_003 gives Hamad Asia/Kuwait); "
    "Hamad's gender is 'm' (the sample has no gender for him; int_003's concern says \"He sings in the school choir\"), so "
    "the request's snapshot has one.",
    "Specialties: on a database where another seed already inserted the 104 groups, those rows win (on conflict do nothing), so "
    "their ids and taxonomy codes are that seed's; every reference here goes through the slug.",
    "Specialty names: every group is named by its card title in the content document (decided 20 Oct 2026), so the 24 "
    "prototype groups' name_en/name_ar differ from specialties.json nameEn/nameAr (and from doctors.json specialtyEn/"
    "specialtyAr) where the prototype used a short name; the slugs, body systems and search words are the prototype's. "
    "The groups that differ are listed under \"Specialty names vs the sample\".",
    "Taxonomy codes: specialties.taxonomy_codes is scripts/taxonomy_map.py TAXONOMY_MAP (the reviewed mapping, each group's "
    "codes sorted as map_taxonomy.py stores them), not specialty-terms.json taxonomyCodes (the drafted sample, which "
    "/admin/specialties shows today). The groups where the two differ are listed under \"Taxonomy codes vs the sample\".",
]

# Record item types per SummaryData list, in the order the summary JSON lists them.
SUMMARY_ITEM_LISTS = (
    ("conditions", "condition"),
    ("medications", "medication"),
    ("allergies", "allergy"),
    ("procedures", "procedure"),
    ("results", "result"),
)


class SeedError(Exception):
    """The sample data or a parsed source file is not what this script expects."""


# --------------------------------------------------------------------------------------------------------------------
# Reading the TypeScript sources the numbers live in
# --------------------------------------------------------------------------------------------------------------------


def _ts_scalar(raw: str) -> Any:
    value = re.sub(r"\s+as\s+[^,]+$", "", raw.strip().rstrip(",").strip()).strip()
    if re.fullmatch(r"-?[\d_]+(\.\d+)?", value):
        number = value.replace("_", "")
        return float(number) if "." in number else int(number)
    if re.fullmatch(r'"[^"]*"', value):
        return value[1:-1]
    if value in ("true", "false"):
        return value == "true"
    if value == "null":
        return None
    return _UNPARSED


_UNPARSED = object()


def parse_ts_const_objects(text: str) -> dict[str, dict[str, Any]]:
    """`export const name = { key: value, ... } as const;` blocks, single-line scalar values only (nested objects skipped)."""
    blocks: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r"export const (\w+) = \{\n(.*?)\n\}\s*as const;", text, re.S):
        values: dict[str, Any] = {}
        depth = 0
        for line in match.group(2).splitlines():
            code = re.sub(r"\s//.*$", "", line).strip()
            if depth == 0:
                pair = re.match(r"^([A-Za-z_]\w*):\s*(.+)$", code)
                if pair:
                    parsed = _ts_scalar(pair.group(2))
                    if parsed is not _UNPARSED:
                        values[pair.group(1)] = parsed
            depth += code.count("{") + code.count("[") - code.count("}") - code.count("]")
        blocks[match.group(1)] = values
    return blocks


def parse_ts_inline_object(text: str, name: str) -> dict[str, str]:
    """`export const name = { a: "x", b: "y" } as const;` on one line, string values."""
    match = re.search(r"export const " + re.escape(name) + r" = \{(.*?)\} as const;", text)
    if not match:
        raise SeedError(f"lib/sample.ts: {name} not found")
    return dict(re.findall(r'(\w+):\s*"([^"]*)"', match.group(1)))


class Sources:
    """Everything this script reads, loaded once."""

    def __init__(self, repo_root: pathlib.Path = REPO_ROOT) -> None:
        self.repo_root = repo_root
        sample_dir = SAMPLE_DIR if repo_root == REPO_ROOT else repo_root / "data" / "sample"
        self.sample: dict[str, Any] = {}
        for path in sorted(sample_dir.glob("*.json")):
            self.sample[path.stem] = json.loads(path.read_text(encoding="utf-8"))

        business_ts = (repo_root / "config" / "business.ts").read_text(encoding="utf-8")
        blocks = parse_ts_const_objects(business_ts)
        self.business = blocks.get("business", {})
        self.ai_limits = blocks.get("aiLimits", {})
        for block, keys in (
            (self.business, (
                "currencyPresentment", "firstVisitPlatformFeePct", "cardProcessingPct", "cardProcessingFixedCents",
                "slotLengthMinutesDefault", "fullRefundCutoffHours", "recordsBlockGb", "recordsBlockPriceCents",
                "shareDefaultDays",
            )),
            (self.ai_limits, ("costCurrency", "attemptsPerCall")),
        ):
            missing = [k for k in keys if k not in block]
            if missing:
                raise SeedError(f"config/business.ts: missing {', '.join(missing)}")

        records_ts = (repo_root / "lib" / "records.ts").read_text(encoding="utf-8")
        match = re.search(r"export const BYTES_PER_GB = ([\d_]+);", records_ts)
        if not match:
            raise SeedError("lib/records.ts: BYTES_PER_GB not found")
        self.bytes_per_gb = int(match.group(1).replace("_", ""))

        card_ts = (repo_root / "lib" / "card-data.ts").read_text(encoding="utf-8")
        match = re.search(r"SAMPLE_ANCHOR_UTC = Date\.UTC\((\d+),\s*(\d+),\s*(\d+)\)", card_ts)
        if not match:
            raise SeedError("lib/card-data.ts: SAMPLE_ANCHOR_UTC not found")
        year, month0, day = (int(g) for g in match.groups())
        self.anchor = dt.date(year, month0 + 1, day)  # Date.UTC months count from 0

        sample_ts = (repo_root / "lib" / "sample.ts").read_text(encoding="utf-8")
        self.sample_patient = parse_ts_inline_object(sample_ts, "samplePatient")
        self.sample_admin = parse_ts_inline_object(sample_ts, "sampleAdmin")
        self.sample_professional = parse_ts_inline_object(sample_ts, "sampleProfessional")
        match = re.search(r"const STATE_TIME_ZONES[^=]*= \{(.*?)\};", sample_ts, re.S)
        if not match:
            raise SeedError("lib/sample.ts: STATE_TIME_ZONES not found")
        self.state_time_zones = {k.strip('"'): v for k, v in re.findall(r'("[^"]+"|\w+):\s*"([^"]+)"', match.group(1))}
        match = re.search(r'STATE_TIME_ZONES\[state\] \?\? "([^"]+)"', sample_ts)
        if not match:
            raise SeedError("lib/sample.ts: doctorTimeZone fallback not found")
        self.state_time_zone_fallback = match.group(1)
        match = re.search(r'const ADMIN_LISTED_PROFESSIONAL_ROW = "([^"]+)";', sample_ts)
        if not match:
            raise SeedError("lib/sample.ts: ADMIN_LISTED_PROFESSIONAL_ROW not found")
        self.admin_listed_membership = match.group(1)
        match = re.search(r"adminRefundKey = \(paymentId: string\) => `([^`$]*)\$\{paymentId\}`", sample_ts)
        if not match:
            raise SeedError("lib/sample.ts: adminRefundKey not found")
        self.refund_key_prefix = match.group(1)


# --------------------------------------------------------------------------------------------------------------------
# The derivations lib/*.ts makes, in Python (unit-tested for parity in scripts/test_build_dev_seed.py)
# --------------------------------------------------------------------------------------------------------------------


def js_round(value: float) -> int:
    """Math.round: halves go up (towards +infinity), unlike Python's round."""
    return math.floor(value + 0.5)


def fee_lines(doctor_fee_cents: int, business: dict[str, Any]) -> dict[str, int]:
    """lib/fees.ts feeLines, the same floating-point steps in the same order."""
    platform = js_round((doctor_fee_cents * business["firstVisitPlatformFeePct"]) / 100)
    subtotal = doctor_fee_cents + platform
    basis_points = js_round(business["cardProcessingPct"] * 100)
    card = math.ceil((subtotal * basis_points) / 10000) + business["cardProcessingFixedCents"]
    return {
        "doctorFeeCents": doctor_fee_cents,
        "platformFeeCents": platform,
        "cardProcessingCents": card,
        "totalCents": subtotal + card,
    }


def parse_instant(iso: str) -> dt.datetime:
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))


def refund_for(total_cents: int, starts_at: dt.datetime, cancelled_at: dt.datetime, by: str, business: dict[str, Any]) -> dict[str, Any]:
    """lib/refunds.ts refundFor: the patient cancelling before the cut-off, the doctor or the platform refund everything."""
    if by != "patient":
        return {"reason": by, "amountCents": total_cents}
    deadline = starts_at - dt.timedelta(hours=business["fullRefundCutoffHours"])
    if cancelled_at < deadline:
        return {"reason": "patientEarly", "amountCents": total_cents}
    return {"reason": "patientLate", "amountCents": 0}


def quote_for(accepted_bytes: int, business: dict[str, Any], bytes_per_gb: int) -> int:
    """lib/records.ts quoteFor(...).totalCents: one block per started recordsBlockGb."""
    block_bytes = business["recordsBlockGb"] * bytes_per_gb
    blocks = math.ceil(accepted_bytes / block_bytes) if accepted_bytes > 0 else 0
    return blocks * business["recordsBlockPriceCents"]


def sample_shift_days(today_utc: dt.date, anchor: dt.date) -> int:
    """lib/card-data.ts sampleInstant shifts by (today UTC midnight - anchor), in whole days."""
    return (today_utc - anchor).days


def sample_instant(iso: str, today_utc: dt.date, anchor: dt.date) -> dt.datetime:
    return parse_instant(iso) + dt.timedelta(days=sample_shift_days(today_utc, anchor))


def sample_instant_exact(iso: str, authored_now_iso: str, now: dt.datetime) -> dt.datetime:
    """lib/card-data.ts sampleInstantExact, with now truncated to the minute as seed.sql does."""
    now_minute = now.replace(second=0, microsecond=0)
    return parse_instant(iso) + (now_minute - parse_instant(authored_now_iso))


# --------------------------------------------------------------------------------------------------------------------
# Ids: readable, deterministic UUIDs
# --------------------------------------------------------------------------------------------------------------------

# Prefix (first group) per entity. Group four is `8` plus a three-digit owner number (the set of a file, page or item; the
# doctor of a tag, credential or availability row); the last group is the sample number in decimal digits.
ID_PREFIXES: dict[str, tuple[str, str]] = {
    "specialty": ("5bec0000", "specialties: card position 1..104 of scripts/specialty_groups.py"),
    "professional": ("d0c00000", "professionals: doc_NNN"),
    "professional_account": ("d0cacc00", "auth.users / profiles of a professional: doc_NNN"),
    "patient_account": ("ca5e0000", "auth.users / profiles of a patient: pat_NNN"),
    "admin_account": ("ad000000", "auth.users / profiles of an admin: adm_NNN"),
    "expertise_tag": ("7a900000", "expertise_tags: owner doc, tag position + 1"),
    "credential": ("c4ed0000", "credentials: owner doc, file f_DDD_N -> N"),
    "availability_rule": ("a1e00000", "availability_rules: owner doc, r_NNN"),
    "availability_exception": ("a1e10000", "availability_exceptions: owner doc, x_NNN, or 5107000000NN for profile slot NN"),
    "booking": ("b0000000", "bookings: bk_NNN"),
    "intro_booking": ("b1000000", "bookings made from an introductions.json row: int_NNN"),
    "introduction_request": ("4e900000", "introduction_requests (\"req\"): an introductions.json request, int_NNN"),
    "receipt": ("ec000000", "receipts: the booking's bk_NNN"),
    "refund": ("4ef00000", "refunds: re_sample_NNN"),
    "membership": ("3e300000", "memberships: mem_aNN -> a NN, mem_active -> a00"),
    "invite": ("1a000000", "invites: inv_NNN"),
    "removal": ("4e300000", "removal_requests: rm_NNN"),
    "record_set": ("5e700000", "record_sets: rs_NNN"),
    "record_file": ("f11e0000", "record_files: owner set, file fN -> N"),
    "record_page": ("9a9e0000", "record_pages: owner set, page number across the set"),
    "record_item": ("17e30000", "record_items: owner set, item sequence within the set"),
    "record_summary": ("5a300000", "record_summaries: sum_NNN"),
    "record_share": ("5ba4e000", "record_shares: sh_NNN"),
    "ai_job": ("a10b0000", "ai_jobs: job_NNN"),
}


def uid(kind: str, number: int | str, owner: int = 0) -> str:
    prefix = ID_PREFIXES[kind][0]
    last = number if isinstance(number, str) else str(number)
    if not re.fullmatch(r"[0-9a-f]{1,12}", last):
        raise SeedError(f"id number {number!r} is not 1 to 12 hex digits")
    if not 0 <= owner <= 999:
        raise SeedError(f"id owner {owner} is not 0..999")
    return f"{prefix}-0000-4000-8{owner:03d}-{last.rjust(12, '0')}"


def sample_number(sample_id: str) -> int:
    match = re.search(r"(\d+)$", sample_id)
    if not match:
        raise SeedError(f"sample id {sample_id!r} has no number")
    return int(match.group(1))


# --------------------------------------------------------------------------------------------------------------------
# SQL literals
# --------------------------------------------------------------------------------------------------------------------


def q(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def lit(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    return q(str(value))


def text_array(values: Iterable[str]) -> str:
    items = list(values)
    return "array[" + ", ".join(q(v) for v in items) + "]::text[]" if items else "'{}'::text[]"


def enum_array(values: Iterable[str], type_name: str) -> str:
    items = list(values)
    return ("array[" + ", ".join(q(v) for v in items) + f"]::public.{type_name}[]") if items else f"'{{}}'::public.{type_name}[]"


def jsonb(value: Any) -> str:
    return q(json.dumps(value, ensure_ascii=False, separators=(", ", ": "))) + "::jsonb"


def si(iso: str | None) -> str:
    """An authored instant, shifted like sampleInstant at seed time."""
    return "null" if iso is None else f"pg_temp.si({q(iso)})"


def si_iso(iso: str) -> str:
    """The shifted instant as an ISO text, for instants inside jsonb."""
    return f"pg_temp.si_iso({q(iso)})"


def si_exact(iso: str | None, authored_now: str) -> str:
    return "null" if iso is None else f"pg_temp.si_exact({q(iso)}, {q(authored_now)})"


def si_wall(iso: str, time_zone: str) -> str:
    return f"pg_temp.si_wall({q(iso)}, {q(time_zone)})"


def sd(ymd: str | None) -> str:
    """A calendar date shifted in whole days, as sampleInstant shifts `${ymd}T00:00:00Z`."""
    return "null" if ymd is None else f"pg_temp.sd({q(ymd)})"


def fixed_date(ymd: str | None) -> str:
    return "null" if ymd is None else f"date {q(ymd)}"


def instant(iso: str) -> str:
    """An instant that is not shifted (weekly rules are stored as their first occurrence)."""
    return f"timestamptz {q(iso)}"


def system_actor_name(actor_id: str) -> str:
    """audit_log.actor_system of an audit.json system actor: sys_stripe is stripe (lower snake case, the column's check)."""
    name = actor_id.removeprefix("sys_")
    if name == actor_id or not re.fullmatch(r"[a-z][a-z0-9]*(_[a-z0-9]+)*", name) or len(name) > 40:
        raise SeedError(f"audit.json system actor {actor_id!r} is not sys_<lower snake case name>")
    return name


def concern_sql(intro: dict[str, Any]) -> tuple[str, str]:
    """bookings.concern and concern_locale: the Arabic text where the sample has one (what a Gulf patient types), else the
    English, and the language of the text actually stored; both null when the row has no concern."""
    for key, locale in (("concernAr", "ar"), ("concernEn", "en")):
        if intro.get(key):
            return q(intro[key]), q(locale)
    return "null", "null"


# The object name the migrations allow after the folder (record_files_path_in_set_folder, credentials_path_in_own_folder):
# letters, digits, '_' and '-', then at most one extension of 1 to 10 letters or digits.
STORAGE_OBJECT_NAME = re.compile(r"[A-Za-z0-9_-]+(\.[A-Za-z0-9]{1,10})?")

# The booking statuses bookings_no_overlap and bookings_one_per_slot_idx hold to one visit at a time.
LIVE_BOOKING_STATUSES = ("upcoming", "done")


def storage_object_name(file_id: str, name: str) -> str:
    """The stored object name of a sample file, '<file id>-<name>', made to fit the allowlist deterministically: the
    extension is the text after the last '.' when it is 1 to 10 letters or digits (else there is none and the dot is part
    of the stem); in the stem, accents are folded (NFKD, combining marks dropped), every run of other characters outside
    [A-Za-z0-9_-] (spaces, dots, '%', '/', Arabic letters ...) becomes one '_', and '_' is trimmed at both ends. A name that
    already fits is unchanged, so 'f1-ent-clinic-letter.pdf' stays as it is."""
    stem, dot, ext = name.rpartition(".")
    if not dot or not re.fullmatch(r"[A-Za-z0-9]{1,10}", ext):
        stem, ext = name, ""
    folded = "".join(ch for ch in unicodedata.normalize("NFKD", f"{file_id}-{stem}") if not unicodedata.combining(ch))
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", folded).strip("_")
    result = safe + (f".{ext}" if ext else "")
    if not safe or not STORAGE_OBJECT_NAME.fullmatch(result):
        raise SeedError(f"file {file_id!r} ({name!r}) gives no object name inside the storage allowlist")
    return result


def overlapping_visits(visits: Iterable[tuple[str, str, dt.datetime, dt.datetime]]) -> list[tuple[str, str, str]]:
    """Pairs of live visits (professional, visit id, start, end) of one professional whose [start, end) ranges overlap,
    as the bookings_no_overlap exclusion constraint sees them: (professional, earlier visit, later visit)."""
    by_professional: dict[str, list[tuple[dt.datetime, dt.datetime, str]]] = {}
    for professional, visit, start, end in visits:
        by_professional.setdefault(professional, []).append((start, end, visit))
    pairs = []
    for professional, items in sorted(by_professional.items()):
        items.sort()
        for i, (_, end, visit) in enumerate(items):
            for other_start, _, other in items[i + 1:]:
                if other_start >= end:
                    break
                pairs.append((professional, visit, other))
    return pairs


def city_part(place: str) -> str:
    """The city of a sample place: "Chicago, Illinois" is Chicago, "شيكاغو، إلينوي" is شيكاغو (Arabic comma)."""
    return re.split("[,،]", place, maxsplit=1)[0].strip()


def specialty_ref(slug: str) -> str:
    return f"(select s.id from public.specialties s where s.slug = {q(slug)})"


def plus_minutes(expr: str, minutes: int) -> str:
    return f"{expr} + interval '{int(minutes)} minutes'"


def plus_days(expr: str, days: int) -> str:
    return f"{expr} + {int(days)} * interval '24 hours'"


def insert(table: str, columns: list[str], rows: list[list[str]], suffix: str = "") -> str:
    lines = [f"insert into {table} ({', '.join(columns)}) values"]
    lines.append(",\n".join("  (" + ", ".join(row) + ")" for row in rows))
    return "\n".join(lines) + (("\n" + suffix) if suffix else "") + ";"


# --------------------------------------------------------------------------------------------------------------------
# The builder
# --------------------------------------------------------------------------------------------------------------------


class SeedBuilder:
    def __init__(self, src: Sources) -> None:
        self.src = src
        self.s = src.sample
        self.biz = src.business
        self.sections: list[tuple[str, list[str]]] = []
        self.counts: list[tuple[str, int, str]] = []
        self.skipped: list[tuple[str, str]] = []
        self.idmap: list[tuple[str, str, str]] = []
        self.doctors = {d["id"]: d for d in self.s["doctors"]}
        self.profiles = {p["id"]: p for p in self.s["profiles"]}
        self.listings = {r["id"]: r for r in self.s["listings"]}
        self.builder_rows = {r["id"]: r for r in self.s["builder"]}
        self.us_state_by_name = {st["nameEn"]: st for st in self.s["us-states"]}
        self.schedules = {sch["doctorId"]: sch for sch in self.s["availability"]["schedules"]}
        self.removals = self.s["removals"]
        self.records_sets = self.s["records"]["sets"]
        self.extra_sets = self.s["ai-jobs"]["extraSets"]
        self.account_ids: dict[str, str] = {}  # sample actor id (doc_002, pat_001, adm_001) -> auth user uuid
        self.patient_by_first_name: dict[str, dict[str, Any]] = {}
        self.professional_status: dict[str, str] = {}
        self.booking_ids: dict[str, str] = {}
        self.file_ids: dict[tuple[str, str], str] = {}  # (set id, file id) -> uuid
        self.page_ids: dict[tuple[str, int], str] = {}  # (set id, set page number) -> uuid
        self.taxonomy_differences: list[tuple[str, str, str]] = []  # (slug, only in specialty-terms.json, only seeded)
        self.name_differences: list[tuple[str, str, str]] = []  # (slug, specialties.json name, seeded card title)
        self.booking_parties: dict[str, tuple[str, str]] = {}  # sample booking id (bk_, int_) -> (doctor id, patient uuid)
        self.checks: list[str] = []  # what the round-3 constraints were checked against, for the report
        self.renamed_files: list[tuple[str, str, str]] = []  # (table, sample file, stored object name) when sanitised

    # ---- helpers -----------------------------------------------------------------------------------------------

    def section(self, title: str, statements: list[str]) -> None:
        self.sections.append((title, statements))

    def count(self, table: str, rows: int, source: str) -> None:
        self.counts.append((table, rows, source))

    def skip(self, item: str, reason: str) -> None:
        self.skipped.append((item, reason))

    def map_id(self, sample_id: str, uuid: str, table: str) -> str:
        self.idmap.append((sample_id, uuid, table))
        return uuid

    def object_name(self, table: str, sample_ref: str, file_id: str, name: str) -> str:
        """storage_object_name, noting every name it had to change for the report."""
        stored = storage_object_name(file_id, name)
        if stored != f"{file_id}-{name}":
            self.renamed_files.append((table, sample_ref, stored))
        return stored

    def professional_id(self, doc_id: str) -> str:
        return uid("professional", sample_number(doc_id))

    def doctor_time_zone(self, doctor: dict[str, Any]) -> str:
        """lib/sample.ts doctorTimeZone: the schedule's zone, else the zone of the practice's state."""
        schedule = self.schedules.get(doctor["id"])
        if schedule:
            return schedule["timeZone"]
        state = doctor["cityEn"].split(",")[-1].strip()
        return self.src.state_time_zones.get(state, self.src.state_time_zone_fallback)

    def listing_status(self, doctor: dict[str, Any]) -> str:
        """lib/sample.ts listingFor: removal, suspension, card state, then the review decision and the submission."""
        row = self.listings.get(doctor["id"])
        builder = self.builder_rows.get(doctor["id"])
        removal = next((r for r in self.removals["requests"] if r["doctorId"] == doctor["id"] and r["status"] == "confirmed"), None)
        submitted = (builder or {}).get("submittedAtUtc") or (row or {}).get("submittedAtUtc")
        rejected = bool(builder and builder.get("rejection") and builder.get("decidedAtUtc") and submitted
                        and builder["decidedAtUtc"] > submitted)
        if removal:
            status = "removed"
        elif row and row.get("suspension"):
            status = "suspended"
        elif doctor["state"] in ("verified", "unclaimed"):
            status = doctor["state"]
        elif rejected:
            status = "rejected"
        elif submitted:
            status = "inReview"
        else:
            status = "claimed"
        return LISTING_TO_DB_STATUS.get(status, status)

    @staticmethod
    def split_name(name: str, title: str) -> list[str]:
        bare = name[len(title):] if name.startswith(title) else name
        return bare.strip().split(" ", 1)

    def state_of(self, city_en: str) -> dict[str, Any]:
        name = city_en.split(",")[-1].strip()
        state = self.us_state_by_name.get(name)
        if not state:
            raise SeedError(f"no US state named {name!r} in us-states.json")
        return state

    # ---- sections ----------------------------------------------------------------------------------------------

    def build(self) -> None:
        self.build_specialties()
        self.build_accounts()
        self.build_professionals()
        self.build_professional_children()
        self.build_availability()
        self.build_memberships()
        self.build_bookings()
        self.build_introduction_requests()
        self.build_outreach()
        self.build_records()
        self.build_ai_jobs()
        self.build_audit_log()
        self.build_previews_skipped()

    def specialty_rows(self) -> list[dict[str, Any]]:
        """The 104 groups in card order, exactly as seed_specialties.specialty_rows() gives them (every group named by
        its card title; the 24 prototype groups keep the sample's slug, body system and search words; the other 80 take
        a slug from the English title and none of the rest), plus taxonomy_codes: each group's TAXONOMY_MAP codes, sorted
        (map_taxonomy.py desired_codes). seed_specialties reads the repo's data/sample, the same files Sources reads."""
        try:
            groups = seed_specialty_rows()
        except ValueError as error:
            raise SeedError(f"seed_specialties.specialty_rows: {error}") from None
        keys = ("slug", "name_en", "name_ar", "body_system", "position", "synonyms_ar", "synonyms_en")
        rows: list[dict[str, Any]] = [{**{k: group[k] for k in keys}, "taxonomy_codes": []} for group in groups]

        by_slug = {row["slug"]: row for row in rows}
        for code, slug in TAXONOMY_MAP.items():
            if slug not in by_slug:
                raise SeedError(f"taxonomy_map.py maps {code} to {slug!r}, which is not one of the 104 groups")
            if not re.fullmatch(r"[0-9]{3}[0-9A-Z]{6}X", code):
                raise SeedError(f"taxonomy_map.py: {code!r} is not a NUCC code")
            by_slug[slug]["taxonomy_codes"].append(code)
        for row in rows:
            row["taxonomy_codes"].sort()
        return rows

    def taxonomy_vs_sample(self, rows: list[dict[str, Any]]) -> list[tuple[str, str, str]]:
        """Groups whose seeded codes differ from specialty-terms.json taxonomyCodes: (slug, only in the sample, only seeded)."""
        terms = {t["slug"]: t for t in self.s["specialty-terms"]["terms"]}
        out = []
        for row in rows:
            drafted = set(terms.get(row["slug"], {}).get("taxonomyCodes", []))
            seeded = set(row["taxonomy_codes"])
            if row["slug"] in terms and drafted != seeded:
                out.append((row["slug"], ", ".join(sorted(drafted - seeded)) or "-", ", ".join(sorted(seeded - drafted)) or "-"))
        return out

    def names_vs_sample(self, rows: list[dict[str, Any]]) -> list[tuple[str, str, str]]:
        """Prototype groups whose seeded name (the card title) differs from specialties.json: (slug, sample, seeded)."""
        sample = {s["slug"]: s for s in self.s["specialties"]}
        out = []
        for row in rows:
            entry = sample.get(row["slug"])
            if entry and (entry["nameEn"], entry["nameAr"]) != (row["name_en"], row["name_ar"]):
                out.append((row["slug"], f"{entry['nameEn']} / {entry['nameAr']}", f"{row['name_en']} / {row['name_ar']}"))
        return out

    def build_specialties(self) -> None:
        rows = self.specialty_rows()
        sql_rows = []
        for row in rows:
            sid = self.map_id(row["slug"], uid("specialty", row["position"]), "specialties")
            # A code another group already holds (a map_taxonomy.py run on a shared database that has groups outside the
            # 104) is left out, so the one-group-per-code trigger never fires; on a fresh database every code is kept, in
            # the sorted order map_taxonomy.py compares against.
            codes_sql = (
                "array(select u.c from unnest(" + text_array(row["taxonomy_codes"]) + ") with ordinality as u(c, n) "
                "where not exists (select 1 from public.specialties s where u.c = any (s.taxonomy_codes)) order by u.n)"
            ) if row["taxonomy_codes"] else "'{}'::text[]"
            sql_rows.append([q(sid), q(row["slug"]), q(row["name_en"]), q(row["name_ar"]), q(row["body_system"]),
                             str(row["position"]), "true", codes_sql, text_array(row["synonyms_ar"]),
                             text_array(row["synonyms_en"])])
        self.section("Specialties: the 104 groups, named by their card titles (24 keep the prototype slug; codes from "
                     "scripts/taxonomy_map.py)",
                     [insert(
                         "public.specialties",
                         ["id", "slug", "name_en", "name_ar", "body_system", "position", "shown", "taxonomy_codes",
                          "synonyms_ar", "synonyms_en"],
                         sql_rows,
                         "on conflict (slug) do nothing",
                     )])
        codes = sum(len(row["taxonomy_codes"]) for row in rows)
        with_codes = sum(1 for row in rows if row["taxonomy_codes"])
        self.count("specialties", len(rows),
                   f"scripts/specialty_groups.py (names), specialties.json (the 24 slugs), body-systems.json, "
                   f"specialty-terms.json synonyms; {codes} taxonomy codes on {with_codes} groups from scripts/taxonomy_map.py")
        self.taxonomy_differences = self.taxonomy_vs_sample(rows)
        self.name_differences = self.names_vs_sample(rows)
        self.skip("specialties.json nameEn/nameAr",
                  f"every group is named by its card title (decided 20 Oct 2026); {len(self.name_differences)} of the 24 "
                  "differ, listed under \"Specialty names vs the sample\"")
        self.skip("specialty-terms.json taxonomyCodes",
                  f"superseded by scripts/taxonomy_map.py (the reviewed mapping); {len(self.taxonomy_differences)} groups "
                  "differ, listed under \"Taxonomy codes vs the sample\"")
        self.skip("specialties.json doctorCount", "a count of listings, derived from professionals; no column")
        self.skip("body-systems.json nameEn/nameAr and the order of slugs inside a system",
                  "copy lives in messages; specialties.body_system keeps the key and position is the card position")
        self.skip("specialty-terms.json draftSystem", "preview of /admin/specialties?state=empty; not a body system")

    # ---- accounts ----------------------------------------------------------------------------------------------

    def patients(self) -> list[dict[str, Any]]:
        """The synthetic patients the sample data names, pat_001..pat_003 first (the patients of rs_001..rs_003)."""
        settings = self.s["patient-settings"]
        sp = self.src.sample_patient
        summary_patient = {s["patient"]["firstNameEn"]: s["patient"] for s in self.s["summaries"]["summaries"]}
        # Profile details (Arabic first name, time zone) come from the patient's first introductions.json row, a request
        # included; the order below (and so the pat_NNN numbers) follows the paid rows only.
        intro_patient = {}
        for row in self.s["introductions"]:
            intro_patient.setdefault(row["patientFirstNameEn"], row)
        ai_ar = {}
        set_patient = {st["id"]: st["patientFirstNameEn"] for st in self.records_sets + self.extra_sets}
        for job in self.s["ai-jobs"]["jobs"]:
            ai_ar.setdefault(set_patient[job["recordSetId"]], job["patientFirstNameAr"])

        order: list[str] = []
        for n in (1, 2, 3):
            order.append(set_patient[f"rs_{n:03d}"])
        for row in self.s["introductions"]:
            if row["status"] != "request" and row["patientFirstNameEn"] not in order:
                order.append(row["patientFirstNameEn"])
        for st in self.extra_sets:
            if st["patientFirstNameEn"] not in order:
                order.append(st["patientFirstNameEn"])
        if order[0] != sp["firstNameEn"]:
            raise SeedError("rs_001 is not the signed-in sample patient's set")
        for name in PATIENT_GENDER_FILL:
            given = (summary_patient.get(name) or {}).get("gender")
            if name not in order or (given and given != PATIENT_GENDER_FILL[name]):
                raise SeedError(f"PATIENT_GENDER_FILL {name}: not a seeded patient, or the sample now gives another gender")

        result = []
        for index, first_en in enumerate(order, start=1):
            pat_id = f"pat_{index:03d}"
            intro = intro_patient.get(first_en)
            summary = summary_patient.get(first_en)
            first_ar = (intro or {}).get("patientFirstNameAr") or (summary or {}).get("firstNameAr") or ai_ar.get(first_en)
            person: dict[str, Any] = {
                "patId": pat_id,
                "firstNameEn": first_en,
                "firstNameAr": first_ar,
                "email": f"{first_en.lower()}@example.com",
                "nameEn": first_en,
                "nameAr": first_ar,
                "gender": (summary or {}).get("gender") or PATIENT_GENDER_FILL.get(first_en),
                "timeZone": (intro or {}).get("patientTimeZone"),
                "country": None,
                "phone": None,
                "hijri": None,
                "emails": None,
            }
            if first_en == sp["firstNameEn"]:
                person.update({
                    "firstNameAr": sp["firstNameAr"], "email": settings["email"], "nameEn": settings["nameEn"],
                    "nameAr": settings["nameAr"], "gender": sp["gender"], "timeZone": settings["timeZone"],
                    "country": sp["country"], "phone": settings["phone"], "hijri": settings["hijri"],
                    "emails": settings["emails"],
                })
            result.append(person)
        return result

    def account_rows(self) -> list[dict[str, Any]]:
        accounts: list[dict[str, Any]] = []
        for person in self.patients():
            uid_ = uid("patient_account", sample_number(person["patId"]))
            accounts.append({"id": uid_, "sampleId": person["patId"], "role": "patient", "email": person["email"], "person": person})
            self.patient_by_first_name[person["firstNameEn"]] = {**person, "uuid": uid_}
        admin = self.src.sample_admin
        admin_email = admin["email"].split("@")[0] + "@example.com"
        admin_actor = next(a for a in self.s["audit"]["actors"] if a["id"] == admin["id"])
        accounts.append({"id": uid("admin_account", sample_number(admin["id"])), "sampleId": admin["id"], "role": "admin",
                         "email": admin_email, "person": {
                             "nameEn": admin["nameEn"], "nameAr": admin["nameAr"], "firstNameEn": admin_actor["firstNameEn"],
                             "firstNameAr": admin_actor["firstNameAr"], "timeZone": admin["timeZone"]}})
        invite_email = {}
        for inv in self.s["invites"]:
            invite_email.setdefault(inv["doctorId"], inv["email"])
        for doctor in self.s["doctors"]:
            status = self.listing_status(doctor)
            self.professional_status[doctor["id"]] = status
            if status in ("unclaimed", "removed"):
                continue
            first_en, last_en = self.split_name(doctor["nameEn"], "Dr ")
            first_ar, _ = self.split_name(doctor["nameAr"], "د. ")
            email = invite_email.get(doctor["id"]) or f"{first_en.lower()}.{last_en.lower().replace(' ', '')}@example.com"
            accounts.append({"id": uid("professional_account", sample_number(doctor["id"])), "sampleId": doctor["id"],
                             "role": "professional", "email": email, "person": {
                                 "nameEn": f"{first_en} {last_en}", "nameAr": doctor["nameAr"].removeprefix("د. ").strip(),
                                 "firstNameEn": first_en, "firstNameAr": first_ar, "gender": doctor["gender"],
                                 "timeZone": self.doctor_time_zone(doctor)}})
        emails = [a["email"] for a in accounts]
        if len(set(emails)) != len(emails):
            raise SeedError("two seeded accounts share an email address")
        for a in accounts:
            if not a["email"].endswith("@example.com"):
                raise SeedError(f"{a['email']} is not on example.com")
        return accounts

    def build_accounts(self) -> None:
        accounts = self.account_rows()
        statements = []
        statements.append(auth_users_sql([(a["id"], a["email"], a["role"]) for a in accounts]))
        statements.append(auth_identities_sql([(a["id"], a["email"]) for a in accounts]))
        for a in accounts:
            self.account_ids[a["sampleId"]] = a["id"]
            table = {"patient": "auth.users (patient)", "admin": "auth.users (admin)", "professional": "auth.users (professional)"}[a["role"]]
            self.map_id(a["sampleId"], a["id"], table)
            p = a["person"]
            sets = [f"name_en = {q(p['nameEn'])}", f"name_ar = {q(p['nameAr'])}", f"first_name_en = {q(p['firstNameEn'])}",
                    f"first_name_ar = {q(p['firstNameAr'])}"]
            if p.get("gender"):
                sets.append(f"gender = {q(p['gender'])}")
            if p.get("phone"):
                sets.append(f"phone = {q(p['phone'])}")
            if p.get("country"):
                sets.append(f"country = {q(p['country'])}")
            if p.get("timeZone"):
                sets.append(f"time_zone = {q(p['timeZone'])}")
            if p.get("hijri") is not None:
                sets.append(f"hijri = {lit(p['hijri'])}")
            if p.get("emails"):
                sets.append(f"email_summary_ready = {lit(p['emails']['summaryReady'])}")
                sets.append(f"email_share_opened = {lit(p['emails']['shareOpened'])}")
                sets.append(f"email_news = {lit(p['emails']['news'])}")
            statements.append(f"update public.profiles set {', '.join(sets)} where id = {q(a['id'])};")
        self.section("Accounts: auth.users and auth.identities (email OTP only, no password); the trigger makes the profiles",
                     statements)
        roles = [a["role"] for a in accounts]
        self.count("auth.users + auth.identities", len(accounts),
                   f"{roles.count('patient')} patients, {roles.count('admin')} admin, {roles.count('professional')} professionals")
        self.count("profiles (via trigger, then updated)", len(accounts),
                   "patient-settings.json, introductions.json, summaries.json, ai-jobs.json, lib/sample.ts sampleAdmin, doctors.json")
        self.skip("patient-settings.json deletionRequestedAtUtc", "preview of /patient/settings?state=deletionRequested; deletion_requested_at stays null")
        self.skip("patient-settings.json hasUploads", "derived: Noura has record sets")
        self.skip("audit.json actor adm_002 (Khalid)",
                  "a second admin the brief does not ask for: no account; audit rows use the reserved id "
                  + uid("admin_account", 2))
        self.skip("lib/sample.ts sampleAdmin email ops@3affya.example", "seeded as ops@example.com (reserved domain)")

    # ---- professionals -----------------------------------------------------------------------------------------

    def build_professionals(self) -> None:
        invites_used = {}
        for inv in self.s["invites"]:
            if inv.get("usedAtUtc") and inv["doctorId"] not in invites_used:
                invites_used[inv["doctorId"]] = inv["usedAtUtc"]
        rows = []
        columns = [
            "id", "user_id", "npi", "status", "source", "first_name", "last_name", "name_en", "name_ar", "gender", "specialty_id",
            "city_en", "city_ar", "state_code", "practice_country", "photo_url", "bio_en", "bio_ar", "training", "languages",
            "arabic_dialect", "visit_types", "age_scope", "years_in_practice", "medical_school", "graduation_year",
            "group_practice", "hospital_affiliations", "board_certified", "board_status", "board_name", "licence_state",
            "fee_cents", "time_zone", "slot_minutes", "lead_time_hours", "accepting_new_patients", "registry_source",
            "registry_as_of", "cms_as_of", "claimed_at", "review_submitted_at", "review_decided_at", "verified_on", "removed_at",
        ]
        for d in self.s["doctors"]:
            status = self.professional_status[d["id"]]
            profile = self.profiles.get(d["id"], {})
            listing = self.listings.get(d["id"], {})
            builder = self.builder_rows.get(d["id"])
            schedule = self.schedules.get(d["id"])
            pid = self.map_id(d["id"], self.professional_id(d["id"]), "professionals")
            first, last = self.split_name(d["nameEn"], "Dr ")
            state = self.state_of(d["cityEn"])
            dialect = next((lang.get("dialect") for lang in d["languages"] if lang["code"] == "ar"), None)
            board_name = (builder or {}).get("boardName") or profile.get("board")
            board_status = (builder or {}).get("boardStatus") or ("certified" if d["boardCertified"] else None)
            licence_state = (builder or {}).get("licenceState")
            if not licence_state and profile.get("licenceStateEn"):
                licence_state = self.us_state_by_name[profile["licenceStateEn"]]["code"]
            claimed_at = listing.get("claimedAtUtc") or invites_used.get(d["id"])
            submitted = (builder or {}).get("submittedAtUtc") or listing.get("submittedAtUtc")
            removal = next((r for r in self.removals["requests"] if r["doctorId"] == d["id"] and r["status"] == "confirmed"), None)
            bookable = status == "verified" and (bool(schedule and schedule["acceptingNewPatients"]) or bool(profile.get("slotsUtc")))
            # The CMS release that enriched the row; registry_source and registry_as_of stay as the sample authors them.
            # practice_country: state_of only accepts a us-states.json state, so every sample doctor practises in the US.
            cms_as_of = profile.get("registryAsOf") if profile.get("registrySource") == "cms" else None
            rows.append([
                q(pid), q(self.account_ids.get(d["id"])), q(d["npi"]), q(status), "'nppes'", q(first), q(last), q(d["nameEn"]),
                q(d["nameAr"]), q(d["gender"]), specialty_ref(d["specialty"]), q(city_part(d["cityEn"])),
                q(city_part(d["cityAr"])), q(state["code"]), "'US'", q(d["photoUrl"]), q(d["bioEn"] or None),
                q(d["bioAr"] or None), text_array(d["training"]), text_array(lang["code"] for lang in d["languages"]),
                q(dialect), enum_array(d["visitTypes"], "visit_type"), q(d["ages"]), lit(d["yearsInPractice"]),
                q(d["medicalSchool"]), lit(d["graduationYear"]), q(profile.get("groupPractice")),
                text_array([d["hospitalAffiliation"]] if d.get("hospitalAffiliation") else []), lit(d["boardCertified"]),
                q(board_status), q(board_name), q(licence_state), lit(d["feeUsdCents"]), q(self.doctor_time_zone(d)),
                lit(schedule["slotMinutes"] if schedule else None), lit(schedule["leadTimeHours"] if schedule else None),
                lit(bookable), q(profile.get("registrySource")), fixed_date(profile.get("registryAsOf")), fixed_date(cms_as_of),
                si(claimed_at),
                si(submitted), si((builder or {}).get("decidedAtUtc")), fixed_date(d["verifiedOn"]),
                si_exact(removal["decision"]["decidedAtUtc"], self.removals["authoredNowUtc"]) if removal else "null",
            ])
        self.section("Professionals: the sample doctors (slug and professional_private row come from triggers)",
                     [insert("public.professionals", columns, rows)])
        self.count("professionals", len(rows), "doctors.json, profiles.json, listings.json, builder.json, invites.json, removals.json, availability.json")
        self.skip("doctors.json specialtyEn/specialtyAr", "read from the specialties row (professionals.specialty_id)")
        self.skip("doctors.json nextAvailableUtc", "derived from availability (rules and exceptions); no column")
        self.skip("doctors.json state", "replaced by professionals.status (listingFor's derivation)")

    def build_professional_children(self) -> None:
        payouts_enabled = next(r for r in self.s["payouts"] if r["sample"] == "enabled")
        accounts = {}
        for row in self.s["payments"]["accounts"]:
            if row.get("payoutsSample"):
                linked = next(r for r in self.s["payouts"] if r["sample"] == row["payoutsSample"])
                accounts[row["doctorId"]] = linked
            else:
                accounts[row["doctorId"]] = row
        if accounts.get(self.src.sample_professional["id"]) is not payouts_enabled:
            raise SeedError("payments.json no longer points doc_002 at the enabled payouts.json row")

        statements = []
        private_count = 0
        for d in self.s["doctors"]:
            sets = []
            builder = self.builder_rows.get(d["id"]) or {}
            listing = self.listings.get(d["id"]) or {}
            account = accounts.get(d["id"])
            if builder.get("videoLink"):
                sets.append(f"video_link = {q(builder['videoLink'])}")
            if builder.get("licenceNumber"):
                sets.append(f"licence_number = {q(builder['licenceNumber'])}")
            if listing.get("licenceExpiresOn"):
                sets.append(f"licence_expires_on = {sd(listing['licenceExpiresOn'])}")
            if account:
                sets += [
                    f"stripe_account_id = {q(account['stripeAccountId'])}",
                    f"stripe_details_submitted = {lit(account['detailsSubmitted'])}",
                    f"stripe_charges_enabled = {lit(account['chargesEnabled'])}",
                    f"stripe_payouts_enabled = {lit(account['payoutsEnabled'])}",
                    f"stripe_currently_due = {text_array(account['currentlyDue'])}",
                    f"stripe_past_due = {text_array(account['pastDue'])}",
                    f"stripe_bank_last4 = {q(account['bankLast4'])}",
                ]
            suspension = listing.get("suspension")
            if suspension:
                by = self.account_ids.get(suspension["byAdminId"])
                if not by:
                    raise SeedError(f"suspension by {suspension['byAdminId']}, who has no account")
                sets += [f"suspended_at = {si(suspension['atUtc'])}", f"suspended_by = {q(by)}",
                         f"suspension_reason_en = {q(suspension['reasonEn'])}", f"suspension_reason_ar = {q(suspension['reasonAr'])}"]
            if sets:
                private_count += 1
                statements.append(f"update public.professional_private set {', '.join(sets)} "
                                  f"where professional_id = {q(self.professional_id(d['id']))};")
        filed_sql, filed_count = self.registry_as_filed_sql()
        statements.append(filed_sql)
        self.section("professional_private: builder licence and video link, licence expiry, Stripe account, suspension; "
                     "the registry facts as filed", statements)
        self.count("professional_private (created by trigger; rows updated)", private_count,
                   "builder.json, listings.json, payouts.json (enabled row for doc_002), payments.json accounts")
        self.count("professional_private.registry_as_filed", filed_count,
                   "every listing that is not unclaimed: the seeded row's registry facts, credential-reviews.json "
                   "registryAsFiled overriding the fields it names")
        self.skip("payouts.json rows notStarted, inProgress, restricted", "previews of /professional/payouts?state=; doc_002 holds the enabled account payments.json points at")
        self.skip("payouts.json and payments.json nextPayout, recentPayouts", "read from Stripe's API (payout lists are not stored)")
        self.skip("builder.json empty videoLink (doc_009..doc_012)", "not entered yet; video_link stays null")

        # Primary specialty links.
        rows = [[q(self.professional_id(d["id"])), specialty_ref(d["specialty"]), "true"] for d in self.s["doctors"]]
        statements = [insert("public.professional_specialties", ["professional_id", "specialty_id", "is_primary"], rows)]
        self.count("professional_specialties", len(rows), "doctors.json specialty (primary)")

        # Expertise tags, English, in card order.
        tag_rows = []
        for d in self.s["doctors"]:
            for position, title in enumerate(d["tags"]):
                tid = uid("expertise_tag", position + 1, sample_number(d["id"]))
                tag_rows.append([q(tid), q(self.professional_id(d["id"])), "'en'", q(title), str(position)])
        if tag_rows:
            statements.append(insert("public.expertise_tags", ["id", "professional_id", "locale", "title", "position"], tag_rows))
        self.count("expertise_tags", len(tag_rows), "doctors.json tags (locale en)")

        # Credential files (names only; no object is uploaded to Storage).
        cred_rows = []
        for b in self.s["builder"]:
            pid = self.professional_id(b["id"])
            rejection = b.get("rejection")
            file_ids = {f["id"] for f in b["files"]}
            if rejection and rejection["fileId"] not in file_ids:
                self.skip(f"builder.json {b['id']} rejection of {rejection['fileId']}",
                          "the rejected file is not among the doctor's files (replaced); no credential row to carry it")
            for f in b["files"]:
                ext = f["name"].rsplit(".", 1)[-1].lower()
                mime = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext)
                if not mime:
                    raise SeedError(f"credential {f['name']} is not a PDF or image")
                is_rejected = bool(rejection and rejection["fileId"] == f["id"])
                accepted = self.professional_status[b["id"]] in ("verified", "suspended")
                review = "rejected" if is_rejected else ("accepted" if accepted else "pending")
                decided = b.get("decidedAtUtc") if review != "pending" else None
                cid = self.map_id(f["id"], uid("credential", int(f["id"].rsplit("_", 1)[1]), sample_number(b["id"])), "credentials")
                object_name = self.object_name("credentials", f["id"], f["id"], f["name"])
                cred_rows.append([
                    q(cid), q(pid), q(f["kind"]), q(f["name"]), q(f"{pid}/{object_name}"), q(mime), str(f["sizeBytes"]),
                    q(review), si(decided), q(rejection["reasonEn"] if is_rejected else None),
                    q(rejection["reasonAr"] if is_rejected else None), si(f["uploadedAtUtc"]),
                ])
        statements.append(insert("public.credentials", [
            "id", "professional_id", "kind", "file_name", "storage_path", "mime_type", "size_bytes", "review_status",
            "reviewed_at", "rejection_reason_en", "rejection_reason_ar", "uploaded_at"], cred_rows))
        self.count("credentials", len(cred_rows), "builder.json files (rejection on the rejected file)")
        self.skip("credential-reviews.json decidedPreviews", "previews of /admin/review?state=approved|rejected")
        self.section("Specialty links, expertise tags and credential files", statements)

    def registry_as_filed_sql(self) -> tuple[str, int]:
        """professional_private.registry_as_filed for every listing that left unclaimed. The trigger
        professionals_snapshot_registry writes it when a row's status leaves 'unclaimed'; the seed inserts rows in their
        final status, so the trigger never fires and the snapshot is written here, with the trigger's keys and the seeded
        row's values, and credential-reviews.json registryAsFiled overriding the fields it names."""
        filed = {}
        for r in self.s["credential-reviews"]["registryAsFiled"]:
            if r["doctorId"] not in self.doctors:
                raise SeedError(f"credential-reviews.json registryAsFiled names {r['doctorId']}, who is not in doctors.json")
            if self.professional_status[r["doctorId"]] == "unclaimed":
                raise SeedError(f"credential-reviews.json registryAsFiled names {r['doctorId']}, whose listing is unclaimed")
            unknown = set(r) - {"doctorId", "cityEn", "cityAr", "specialtyEn", "specialtyAr"}
            if unknown:
                raise SeedError(f"credential-reviews.json registryAsFiled {r['doctorId']}: no snapshot key for {sorted(unknown)}")
            filed[r["doctorId"]] = r
        rows = []
        for d in self.s["doctors"]:
            if self.professional_status[d["id"]] == "unclaimed":
                continue
            f = filed.get(d["id"], {})
            overrides: list[tuple[str, str]] = []
            if "cityEn" in f:
                overrides += [("cityEn", q(city_part(f["cityEn"]))), ("stateCode", q(self.state_of(f["cityEn"])["code"]))]
            if "cityAr" in f:
                overrides.append(("cityAr", q(city_part(f["cityAr"]))))
            if "specialtyEn" in f or "specialtyAr" in f:
                matches = [sp["slug"] for sp in self.s["specialties"]
                           if f.get("specialtyEn", sp["nameEn"]) == sp["nameEn"] and f.get("specialtyAr", sp["nameAr"]) == sp["nameAr"]]
                if len(matches) != 1:
                    raise SeedError(f"credential-reviews.json registryAsFiled {d['id']}: the filed specialty is not one specialties.json row")
                overrides.append(("specialtyId", specialty_ref(matches[0])))
            override_sql = ("jsonb_build_object(" + ", ".join(f"{q(k)}, {v}" for k, v in overrides) + ")") if overrides else "'{}'::jsonb"
            rows.append(f"    ({q(self.professional_id(d['id']))}::uuid, {override_sql})")
        snapshot = ",\n".join(f"           {q(key)}, {expr}" for key, expr in REGISTRY_AS_FILED_KEYS)
        sql_text = "\n".join([
            "update public.professional_private pp",
            "   set registry_as_filed = jsonb_build_object(",
            snapshot + ") || x.filed",
            "  from public.professionals p",
            "  join (values",
            ",\n".join(rows),
            "  ) as x(professional_id, filed) on x.professional_id = p.id",
            " where pp.professional_id = p.id;",
        ])
        return sql_text, len(rows)

    def build_availability(self) -> None:
        statements = []
        rule_rows, exc_rows = [], []
        slot_minutes = self.biz["slotLengthMinutesDefault"]
        for sch in self.s["availability"]["schedules"]:
            owner = sample_number(sch["doctorId"])
            pid = self.professional_id(sch["doctorId"])
            for r in sch["rules"]:
                rid = self.map_id(r["id"], uid("availability_rule", sample_number(r["id"]), owner), "availability_rules")
                rule_rows.append([q(rid), q(pid), q(sch["timeZone"]), instant(r["startsAtUtc"]), instant(r["endsAtUtc"])])
            for x in sch["exceptions"]:
                xid = self.map_id(x["id"], uid("availability_exception", sample_number(x["id"]), owner), "availability_exceptions")
                exc_rows.append([q(xid), q(pid), q(x["kind"]), si_wall(x["startsAtUtc"], sch["timeZone"]),
                                 si_wall(x["endsAtUtc"], sch["timeZone"])])
        slot_doctors = []
        for d in self.s["doctors"]:
            slots = self.profiles.get(d["id"], {}).get("slotsUtc") or []
            if d["id"] in self.schedules:
                if slots:
                    self.skip(f"profiles.json slotsUtc of {d['id']}",
                              "hand-authored; this doctor's open times come from availability_rules and availability_exceptions")
                continue
            if not slots:
                continue
            if self.professional_status[d["id"]] != "verified":
                raise SeedError(f"{d['id']} has profile slots but is not verified")
            slot_doctors.append(d["id"])
            for n, slot in enumerate(sorted(slots), start=1):
                xid = uid("availability_exception", f"5107{n:08d}", sample_number(d["id"]))
                exc_rows.append([q(xid), q(self.professional_id(d["id"])), "'extra'", si(slot), plus_minutes(si(slot), slot_minutes)])
        statements.append(insert("public.availability_rules", ["id", "professional_id", "time_zone", "starts_at", "ends_at"], rule_rows))
        statements.append(insert("public.availability_exceptions", ["id", "professional_id", "kind", "starts_at", "ends_at"], exc_rows))
        self.section("Availability: doc_002's weekly rules (not shifted) and exceptions (shifted on its wall clock); one extra "
                     "exception per hand-authored profile slot of the other verified doctors (shifted like upcomingSlots)",
                     statements)
        self.count("availability_rules", len(rule_rows), "availability.json rules")
        self.count("availability_exceptions", len(exc_rows),
                   f"availability.json exceptions; profiles.json slotsUtc of {', '.join(slot_doctors)} as kind extra, "
                   f"{slot_minutes} minutes each (business.slotLengthMinutesDefault)")
        self.skip("availability.json addedException x_003", "preview of /professional/availability?state=exceptionAdded")

    def build_memberships(self) -> None:
        billing = {b["membershipId"]: b for b in self.s["membership-billing"]}
        rows = []
        for m in self.s["memberships"]:
            if m["doctorId"] == self.src.sample_professional["id"] and m["id"] != self.src.admin_listed_membership:
                self.skip(f"memberships.json {m['id']}", "preview state of /professional/membership (one membership per professional; doc_002 keeps mem_active)")
                continue
            number = "a00" if m["id"] == self.src.admin_listed_membership else m["id"].split("_", 1)[1]
            mid = self.map_id(m["id"], uid("membership", number), "memberships")
            b = billing.get(m["id"], {})
            invoice = b.get("lastInvoice") or {}
            rows.append([
                q(mid), q(self.professional_id(m["doctorId"])), q(m["status"]), q(m["interval"]), si(m["currentPeriodEndUtc"]),
                si(m["paymentFailedAtUtc"]), si(m["cancelledAtUtc"]), si(b.get("startedAtUtc")), si(b.get("compUntilUtc")),
                q(b.get("stripeCustomerId")), q(b.get("stripeSubscriptionId")), q(invoice.get("id")), q(invoice.get("number")),
                q(invoice.get("status")), si(invoice.get("atUtc")),
            ])
        self.section("Memberships (Stripe Billing facts from membership-billing.json)", [insert("public.memberships", [
            "id", "professional_id", "status", "interval", "current_period_end", "payment_failed_at", "cancelled_at", "started_at",
            "comp_until", "stripe_customer_id", "stripe_subscription_id", "last_invoice_id", "last_invoice_number",
            "last_invoice_status", "last_invoice_at"], rows)])
        self.count("memberships", len(rows), "memberships.json (mem_active, mem_a01..mem_a06), membership-billing.json")
        self.skip("memberships.json timeZone", "the doctor's zone lives on professionals.time_zone")

    # ---- bookings, receipts, refunds ---------------------------------------------------------------------------

    def build_bookings(self) -> None:
        visits = {v["bookingId"]: v for v in self.s["booking-visits"]}
        charges = {c["bookingId"]: c for c in self.s["payments"]["charges"]}
        receipts = {r["bookingId"]: r for r in self.s["receipts"]}
        intro_for_booking = {}
        bookings_by_slot = {(b["doctorId"], b["startsAtUtc"]): b["id"] for b in self.s["bookings"]}
        for intro in self.s["introductions"]:
            if intro["status"] == "request":
                continue
            booking = bookings_by_slot.get((intro["doctorId"], intro["startsAtUtc"]))
            if booking:
                intro_for_booking[booking] = intro
        default_minutes = self.biz["slotLengthMinutesDefault"]
        currency = self.biz["currencyPresentment"]
        live: list[tuple[str, str, dt.datetime, dt.datetime]] = []  # (doctor, booking, start, end) of upcoming/done visits
        done_rows: list[tuple[str, str, str]] = []  # (booking, status, where a done_at comes from)

        columns = [
            "id", "professional_id", "patient_id", "payment_intent_id", "status", "visit_type", "starts_at", "ends_at",
            "patient_time_zone", "professional_time_zone", "patient_first_name_en", "patient_first_name_ar", "booked_by",
            "age_group", "concern", "concern_locale", "patient_country", "prepared", "join_url", "currency", "doctor_fee_cents",
            "platform_fee_cents", "card_processing_cents", "booked_at", "cancelled_at", "cancelled_by", "done_at",
            "stripe_transfer_id",
        ]
        rows = []
        for b in self.s["bookings"]:
            patient = self.patient_by_first_name.get(b["patientFirstName"])
            if not patient:
                raise SeedError(f"{b['id']}: no seeded patient named {b['patientFirstName']}")
            visit = visits.get(b["id"], {})
            intro = intro_for_booking.get(b["id"], {})
            charge = charges.get(b["id"])
            receipt = receipts.get(b["id"])
            bid = self.map_id(b["id"], uid("booking", sample_number(b["id"])), "bookings")
            self.booking_ids[b["id"]] = bid
            minutes = visit.get("durationMinutes") or default_minutes  # toPatientBooking: the default stands in
            join_url = b.get("joinUrl") or visit.get("joinUrl")
            cancelled_at = b.get("cancelledAtUtc") or visit.get("cancelledAtUtc") or ((receipt or {}).get("cancellation") or {}).get("atUtc")
            cancelled_by = b.get("cancelledBy") or ((receipt or {}).get("cancellation") or {}).get("by")
            booked_at = b.get("bookedAtUtc") or (receipt or {}).get("paidAtUtc")
            if intro:
                self.skip(f"introductions.json {intro['id']} receivedAtUtc",
                          f"{intro['id']} is {b['id']}: the booking's bookedAtUtc is kept as booked_at")
            ends_at = plus_minutes(si(b["startsAtUtc"]), minutes)
            # The doctor's mark: doneAtUtc where the sample has one, else the end of the visit for a 'done' row.
            done_mark = b.get("doneAtUtc") or intro.get("doneAtUtc")
            done_at = si(done_mark) if done_mark else (ends_at if b["status"] == "done" else "null")
            done_rows.append((b["id"], b["status"], "doneAtUtc" if done_mark else "ends_at"))
            self.booking_parties[b["id"]] = (b["doctorId"], patient["uuid"])
            if b["status"] in LIVE_BOOKING_STATUSES:
                start = parse_instant(b["startsAtUtc"])
                live.append((b["doctorId"], b["id"], start, start + dt.timedelta(minutes=minutes)))
            rows.append([
                q(bid), q(self.professional_id(b["doctorId"])), q(patient["uuid"]),
                q(charge["paymentIntentId"] if charge else f"pi_sample_{b['id']}"), q(b["status"]), q(b["visitType"]),
                si(b["startsAtUtc"]), ends_at, q(b["patientTimeZone"]), q(b["doctorTimeZone"]),
                q(patient["firstNameEn"]), q(patient["firstNameAr"]), q(intro.get("bookedBy", "self")), q(intro.get("ageGroup")),
                *concern_sql(intro), q(patient["country"]), text_array(intro.get("prepared", [])),
                q(join_url if b["visitType"] == "video" else None), q((receipt or {}).get("currency", currency)),
                str(b["feeUsdCents"]), str(b["platformFeeUsdCents"]), str(b["cardProcessingUsdCents"]),
                si(booked_at) if booked_at else "now()", si(cancelled_at), q(cancelled_by),
                done_at, q(charge["transferId"] if charge else None),
            ])
            if not booked_at:
                self.skip(f"bookings.json {b['id']} bookedAtUtc", "absent and no receipt: booked_at is the seed time")

        # Introductions that are paid bookings with no bookings.json row (other patients of doc_002).
        intro_rows = []
        for intro in self.s["introductions"]:
            if intro["status"] == "request":
                continue  # an introduction_requests row (build_introduction_requests)
            if any(i is intro for i in intro_for_booking.values()):
                continue
            patient = self.patient_by_first_name[intro["patientFirstNameEn"]]
            doctor = self.doctors[intro["doctorId"]]
            schedule = self.schedules.get(intro["doctorId"])
            minutes = schedule["slotMinutes"] if schedule else default_minutes  # visitMinutesFor
            lines = fee_lines(doctor["feeUsdCents"], self.biz)
            bid = self.map_id(intro["id"], uid("intro_booking", sample_number(intro["id"])), "bookings")
            self.booking_ids[intro["id"]] = bid
            status = "done" if intro["status"] == "done" else "upcoming"
            ends_at = plus_minutes(si(intro["startsAtUtc"]), minutes)
            done_mark = intro.get("doneAtUtc")
            done_at = si(done_mark) if done_mark else (ends_at if status == "done" else "null")
            done_rows.append((intro["id"], status, "doneAtUtc" if done_mark else "ends_at"))
            self.booking_parties[intro["id"]] = (intro["doctorId"], patient["uuid"])
            start = parse_instant(intro["startsAtUtc"])
            live.append((intro["doctorId"], intro["id"], start, start + dt.timedelta(minutes=minutes)))
            intro_rows.append([
                q(bid), q(self.professional_id(intro["doctorId"])), q(patient["uuid"]), q(f"pi_sample_{intro['id']}"), q(status),
                q(intro["visitType"]), si(intro["startsAtUtc"]), ends_at,
                q(intro["patientTimeZone"]), q(intro["doctorTimeZone"]), q(intro["patientFirstNameEn"]),
                q(intro["patientFirstNameAr"]), q(intro["bookedBy"]), q(intro["ageGroup"]), *concern_sql(intro), "null",
                text_array(intro["prepared"]), q(intro["joinUrl"] if intro["visitType"] == "video" else None), q(currency),
                str(lines["doctorFeeCents"]), str(lines["platformFeeCents"]), str(lines["cardProcessingCents"]),
                si(intro["receivedAtUtc"]), "null", "null", done_at, "null",
            ])
            if intro["visitType"] == "phone" and intro.get("joinUrl"):
                self.skip(f"introductions.json {intro['id']} joinUrl", "a phone visit has no meeting link (join_url null)")
        # bookings_no_overlap: every authored instant moves by the same whole days, so authored ranges overlap exactly when
        # the seeded ones do. An overlap is a sample error to fix in data/sample, never a time to move here.
        overlaps = overlapping_visits(live)
        if overlaps:
            raise SeedError("live bookings of one professional overlap (bookings_no_overlap would refuse the seed): "
                            + "; ".join(f"{doc}: {a} and {b}" for doc, a, b in overlaps))
        self.checks.append(f"Live bookings (upcoming or done): {len(live)} over {len({v[0] for v in live})} professionals; "
                           "no two of one professional overlap (bookings_no_overlap).")
        done = [(booking, source) for booking, status, source in done_rows if status == "done"]
        self.checks.append("Done bookings carry done_at, the doctor's mark (bookings_done_have_time): " + ", ".join(
            f"{booking} ({'introductions.json doneAtUtc' if source == 'doneAtUtc' else 'the end of the visit'})"
            for booking, source in done) + ".")
        statements = [insert("public.bookings", columns, rows + intro_rows)]
        self.count("bookings", len(rows) + len(intro_rows),
                   f"bookings.json ({len(rows)}), introductions.json confirmed/done rows of doc_002 without a bookings.json row "
                   f"({len(intro_rows)}, fee lines from feeLines at the doctor's fee)")
        for b in self.s["bookings"]:
            if b["visitType"] == "phone" and b.get("joinUrl"):
                self.skip(f"bookings.json {b['id']} joinUrl", "a phone visit has no meeting link (toPatientBooking drops it)")

        # Receipts and refunds.
        receipt_rows, refund_rows = [], []
        booking_rows = {b["id"]: b for b in self.s["bookings"]}
        for r in self.s["receipts"]:
            b = booking_rows[r["bookingId"]]
            patient = self.patient_by_first_name[b["patientFirstName"]]
            total = b["feeUsdCents"] + b["platformFeeUsdCents"] + b["cardProcessingUsdCents"]
            charge = charges[r["bookingId"]]
            rid = self.map_id(f"receipt of {r['bookingId']}", uid("receipt", sample_number(r["bookingId"])), "receipts")
            pm = r["paymentMethod"]
            receipt_rows.append([
                q(rid), "'booking'", q(self.booking_ids[r["bookingId"]]), q(patient["uuid"]), q(r["receiptNumber"]),
                q(r["currency"]),
                str(total), si(r["paidAtUtc"]), q(pm["brand"]), q(pm["last4"]), q(pm["wallet"]), q(charge["paymentIntentId"]),
            ])
            if r.get("cancellation"):
                due = refund_for(total, parse_instant(b["startsAtUtc"]), parse_instant(r["cancellation"]["atUtc"]),
                                 r["cancellation"]["by"], self.biz)
                if r.get("refund") and due["amountCents"] > 0:
                    ref = r["refund"]
                    fid = self.map_id(ref["id"], uid("refund", sample_number(ref["id"])), "refunds")
                    refund_rows.append([
                        q(fid), "'booking'", q(self.booking_ids[r["bookingId"]]), q(rid), q(patient["uuid"]), q(ref["id"]), q(ref["status"]),
                        str(due["amountCents"]), q(r["currency"]), q(due["reason"]), "'automatic'",
                        q(self.src.refund_key_prefix + self.booking_ids[r["bookingId"]]), si(ref["createdAtUtc"]),
                        si(ref["createdAtUtc"]) if ref["status"] == "succeeded" else "null",
                    ])
                elif r.get("refund"):
                    self.skip(f"receipts.json {r['bookingId']} refund", "the refund rule gives nothing, so the receipt shows none")
        statements.append(insert("public.receipts", [
            "id", "subject", "booking_id", "patient_id", "receipt_number", "currency", "amount_cents", "paid_at", "card_brand", "card_last4",
            "wallet", "stripe_payment_intent_id"], receipt_rows))
        statements.append(insert("public.refunds", [
            "id", "subject", "booking_id", "receipt_id", "patient_id", "stripe_refund_id", "status", "amount_cents", "currency", "reason",
            "initiated_by", "idempotency_key", "requested_at", "succeeded_at"], refund_rows))
        self.section("Bookings, receipts and refunds (lines as charged; refund amounts by lib/refunds.ts)", statements)
        self.count("receipts", len(receipt_rows), "receipts.json, payments.json charges")
        self.count("refunds", len(refund_rows), "receipts.json refunds, amounts by refundFor (business.fullRefundCutoffHours)")
        self.skip("payments.json pendingRefund (bk_009)", "preview of /admin/payments?state=webhook-pending")
        self.skip("lib/sample.ts sampleBookingAnswers", "held/failed checkout previews; no slot_holds row is seeded")
        self.skip("receipts for the introductions-only bookings (int_001, int_004, int_005)", "receipts.json has none (other patients' payments)")
        self.skip("receipts stripe_charge_id", "not in the sample")
        self.skip("receipts and refunds of subject 'records' (record_set_id)",
                  "the sample has no records-processing payment; every seeded receipt and refund is subject 'booking'")
        self.skip("bookings patient_phone", "not in the sample")

    # ---- introduction requests --------------------------------------------------------------------------------

    def build_introduction_requests(self) -> None:
        """introductions.json rows with status request: open public.introduction_requests rows (screen 32). The patient's
        first names and gender are left to introduction_requests_copy_patient, which copies them from the profile the
        accounts section has written."""
        columns = [
            "id", "patient_id", "professional_id", "status", "requested_start", "visit_type", "booked_by", "age_group",
            "concern", "concern_locale", "prepared", "patient_time_zone", "received_at",
        ]
        rows = []
        for intro in self.s["introductions"]:
            if intro["status"] != "request":
                continue
            patient = self.patient_by_first_name.get(intro["patientFirstNameEn"])
            if not patient:
                raise SeedError(f"{intro['id']}: no seeded patient named {intro['patientFirstNameEn']}")
            if not (patient.get("firstNameEn") and patient.get("firstNameAr") and patient.get("gender")):
                raise SeedError(f"{intro['id']}: the patient's profile lacks a first name or gender for the request snapshot")
            if patient["firstNameAr"] != intro["patientFirstNameAr"]:
                raise SeedError(f"{intro['id']}: the profile's Arabic first name is not the request's")
            # introduction_requests_insert_own: a request goes to a verified professional only.
            if self.professional_status.get(intro["doctorId"]) != "verified":
                raise SeedError(f"{intro['id']}: {intro['doctorId']} is not a verified listing")
            rid = self.map_id(intro["id"], uid("introduction_request", sample_number(intro["id"])), "introduction_requests")
            rows.append([
                q(rid), q(patient["uuid"]), q(self.professional_id(intro["doctorId"])), "'open'", si(intro["startsAtUtc"]),
                q(intro["visitType"]), q(intro["bookedBy"]), q(intro["ageGroup"]), *concern_sql(intro),
                text_array(intro["prepared"]), q(intro["patientTimeZone"]), si(intro["receivedAtUtc"]),
            ])
            for key in ("joinUrl", "sharedSummaryId", "doneAtUtc"):
                if intro.get(key):
                    raise SeedError(f"{intro['id']}: a request with {key} (a request has no visit yet)")
        self.section("Introduction requests: screen 32's unpaid requests (patient names and gender copied from the profile "
                     "by the trigger)", [insert("public.introduction_requests", columns, rows)])
        self.count("introduction_requests", len(rows),
                   "introductions.json rows with status request (status open; instants shifted like sampleInstant)")
        self.checks.append(f"Introduction requests: {len(rows)}; each goes to a verified professional, and each patient's "
                           "profile holds both first names and the gender introduction_requests_copy_patient copies.")

    # ---- outreach and removals ---------------------------------------------------------------------------------

    def build_outreach(self) -> None:
        rows = []
        for inv in self.s["invites"]:
            if inv.get("preview"):
                self.skip(f"invites.json {inv['id']} (preview {inv['preview']})", "only in /admin/outreach?state=just-sent, dated now")
                continue
            iid = self.map_id(inv["id"], uid("invite", sample_number(inv["id"])), "invites")
            used_by = self.account_ids.get(inv["doctorId"]) if inv.get("usedAtUtc") else None
            if inv.get("usedAtUtc") and not used_by:
                raise SeedError(f"{inv['id']} was used but {inv['doctorId']} has no account")
            rows.append([
                q(iid), q(self.professional_id(inv["doctorId"])), q(inv["email"]), q(inv.get("language", "en")),
                q(hashlib.sha256(inv["token"].encode("utf-8")).hexdigest()), si(inv["sentAtUtc"]), si(inv["expiresAtUtc"]),
                si(inv.get("openedAtUtc")), si(inv.get("usedAtUtc")), q(used_by), si(inv.get("bouncedAtUtc")),
                q(inv.get("bounce")), si(inv.get("revokedAtUtc")),
            ])
        statements = [insert("public.invites", [
            "id", "professional_id", "email", "language", "token_hash", "sent_at", "expires_at", "opened_at", "used_at", "used_by",
            "bounced_at", "bounce", "revoked_at"], rows)]
        self.count("invites", len(rows), "invites.json (token_hash = sha256 hex of the demo token)")
        self.skip("invites created_by, revoked_by", "not in the sample")

        authored = self.removals["authoredNowUtc"]
        rem_rows = []
        for r in self.removals["requests"]:
            rid = self.map_id(r["id"], uid("removal", sample_number(r["id"])), "removal_requests")
            info, decision = r.get("infoRequest"), r.get("decision")
            rem_rows.append([
                q(rid), q(self.professional_id(r["doctorId"])), q(r["requesterName"]), q(r["requesterEmail"]), q(r["npi"]),
                q(r["reason"]), q(r["details"]), q(r["locale"]), q(r["status"]), si_exact(r["receivedAtUtc"], authored),
                si_exact(r["emailConfirmedAtUtc"], authored), si_exact(info["askedAtUtc"], authored) if info else "null",
                q(self.account_ids[info["askedBy"]]) if info else "null", q(info["question"]) if info else "null",
                si_exact(decision["decidedAtUtc"], authored) if decision else "null",
                q(self.account_ids[decision["decidedBy"]]) if decision else "null",
                q(decision["reason"]) if decision else "null",
            ])
        statements.append(insert("public.removal_requests", [
            "id", "professional_id", "requester_name", "requester_email", "npi", "reason", "details", "locale", "status",
            "received_at", "email_confirmed_at", "info_requested_at", "info_requested_by", "info_question", "decided_at",
            "decided_by", "decision_reason"], rem_rows))
        self.count("removal_requests", len(rem_rows), "removals.json (sampleInstantExact: authoredNowUtc maps to now)")
        self.section("Claim invites and removal requests", statements)

    # ---- records -----------------------------------------------------------------------------------------------

    def all_sets(self) -> list[dict[str, Any]]:
        expanded = []
        for st in self.extra_sets:
            files = []
            for f in st["files"]:
                pages = [{"status": f["otherPages"].get(str(k + 1), "read")} for k in range(f["pageCount"])]
                files.append({k: v for k, v in f.items() if k not in ("pageCount", "otherPages")} | {"pages": pages})
            expanded.append({**st, "files": files})
        return self.records_sets + expanded

    def build_records(self) -> None:
        set_rows, file_rows, page_rows, page_series, failure_updates = [], [], [], [], []
        unreadable_without_reason: list[str] = []
        for st in self.all_sets():
            n = sample_number(st["id"])
            patient = self.patient_by_first_name[st["patientFirstNameEn"]]
            set_uuid = self.map_id(st["id"], uid("record_set", n), "record_sets")
            accepted = sum(f["sizeBytes"] for f in st["files"])
            pages_total = sum(len(f["pages"]) for f in st["files"])
            failure = st.get("failure")
            cancelled_at = st["finishedAtUtc"] if st["status"] == "cancelled" else None
            set_rows.append([
                q(set_uuid), q(patient["uuid"]), q(st["status"]), q(st["step"]), str(accepted), str(pages_total),
                str(quote_for(accepted, self.biz, self.src.bytes_per_gb)), q(self.biz["currencyPresentment"]),
                q(failure["reason"]) if failure else "null", lit(failure["filePage"]) if failure else "null",
                si(st["createdAtUtc"]), si(st["paidAtUtc"]), si(st["finishedAtUtc"]), si(cancelled_at),
            ])
            set_page = 0
            for position, f in enumerate(st["files"]):
                fid = uid("record_file", sample_number(f["id"]), n)
                self.file_ids[(st["id"], f["id"])] = fid
                self.map_id(f"{st['id']}/{f['id']}", fid, "record_files")
                object_name = self.object_name("record_files", f"{st['id']}/{f['id']}", f["id"], f["name"])
                file_rows.append([
                    q(fid), q(set_uuid), q(patient["uuid"]), str(position), q(f["name"]), q(f["kind"]), q(MIME_BY_KIND[f["kind"]]),
                    str(f["sizeBytes"]), q(f"{patient['uuid']}/{set_uuid}/{object_name}"), "'accepted'",
                    str(len(f["pages"])), si(st["createdAtUtc"]),
                ])
                file_rows_for_pages = []
                first_set_page = set_page + 1
                for page_number, page in enumerate(f["pages"], start=1):
                    set_page += 1
                    pid = uid("record_page", set_page, n)
                    self.page_ids[(st["id"], set_page)] = pid
                    reason = page.get("reason")
                    if reason and page["status"] != "unreadable":
                        raise SeedError(f"{st['id']} {f['id']} page {page_number}: a reason on a page that is {page['status']}")
                    if page["status"] == "unreadable" and not reason:
                        unreadable_without_reason.append(f"{st['id']} {f['id']} page {page_number}")
                    attempts = self.src.ai_limits["attemptsPerCall"] if page["status"] == "failed" else 0
                    file_rows_for_pages.append((page_number, page["status"], reason, attempts))
                if len(file_rows_for_pages) > LONG_FILE_PAGES:
                    page_series.append(page_series_sql(n, set_uuid, fid, patient["uuid"], first_set_page, file_rows_for_pages))
                else:
                    for page_number, status, reason, attempts in file_rows_for_pages:
                        page_rows.append([q(uid("record_page", first_set_page + page_number - 1, n)), q(set_uuid), q(fid),
                                          q(patient["uuid"]), str(page_number), str(first_set_page + page_number - 1),
                                          q(status), q(reason), str(attempts)])
            if failure:
                failure_updates.append(f"update public.record_sets set failure_file_id = "
                                       f"{q(self.file_ids[(st['id'], failure['fileId'])])} where id = {q(set_uuid)};")
        statements = [
            insert("public.record_sets", [
                "id", "patient_id", "status", "step", "accepted_bytes", "page_count", "quote_cents", "quote_currency",
                "failure_reason", "failure_file_page", "created_at", "paid_at", "finished_at", "cancelled_at"], set_rows),
            insert("public.record_files", [
                "id", "set_id", "patient_id", "position", "name", "kind", "mime_type", "size_bytes", "storage_path", "status",
                "page_count", "uploaded_at"], file_rows),
            insert("public.record_pages", [
                "id", "set_id", "file_id", "patient_id", "page_number", "set_page_number", "status", "unreadable_reason",
                "attempts"], page_rows),
            *page_series,
            *failure_updates,
        ]
        self.section("Record sets, files and pages (records.json and ai-jobs.json extraSets; pages numbered across the set)",
                     statements)
        self.count("record_sets", len(set_rows), "records.json sets, ai-jobs.json extraSets (quote by quoteFor)")
        self.count("record_files", len(file_rows), "records.json, ai-jobs.json extraSets (no object is uploaded)")
        series_pages = sum(sum(1 for _ in f["pages"]) for st in self.all_sets() for f in st["files"]) - len(page_rows)
        self.count("record_pages", len(page_rows) + series_pages,
                   "records.json pages, ai-jobs.json pageCount + otherPages"
                   + (f"; unreadable with no reason (unreadable_reason null): {', '.join(unreadable_without_reason)}"
                      if unreadable_without_reason else ""))
        self.skip("records.json draft (df_1..df_7, checking)", "the upload flow's previews (screen 24); rs_006 is the paid set of the same files")
        self.skip("record sets payment_intent_id", "not in the sample")
        self.skip("record pages extracted_at", "not in the sample")
        self.skip("consents (recordsProcessing per paid set)", "no consent rows in the sample")

        # Summaries, typed items, shares.
        statements = []
        summary_rows, canonical_rows, duplicate_rows = [], [], []
        set_by_id = {st["id"]: st for st in self.records_sets}
        summary_ids = {}
        for s in self.s["summaries"]["summaries"]:
            st = set_by_id[s["recordSetId"]]
            n = sample_number(st["id"])
            patient = self.patient_by_first_name[s["patient"]["firstNameEn"]]
            sum_uuid = self.map_id(s["id"], uid("record_summary", sample_number(s["id"])), "record_summaries")
            summary_ids[s["id"]] = (sum_uuid, patient["uuid"])
            data = {k: v for k, v in s.items() if k not in ("id", "recordSetId", "patient", "generatedAtUtc", "reviewedBy")}
            reviewed = s.get("reviewedBy")
            summary_rows.append([
                q(sum_uuid), q(uid("record_set", n)), q(patient["uuid"]), jsonb(data), si(s["generatedAtUtc"]),
                q(self.professional_id(reviewed["professionalId"])) if reviewed else "null",
                si(reviewed["reviewedAtUtc"]) if reviewed else "null",
            ])
            # Documents in order, pages counted across the set: the set page number of {doc, page}.
            page_ref = self.summary_page_resolver(s, st)

            seq = 0
            for list_name, item_type in SUMMARY_ITEM_LISTS:
                for entry in s[list_name]:
                    fields = item_fields(item_type, entry)
                    seq += 1
                    canonical = uid("record_item", seq, n)
                    canonical_rows.append(item_row(canonical, n, patient["uuid"], page_ref(entry["sources"][0]), item_type, fields, None))
                    for extra in entry["sources"][1:]:
                        seq += 1
                        duplicate_rows.append(item_row(uid("record_item", seq, n), n, patient["uuid"], page_ref(extra), item_type,
                                                       fields, canonical))
            for entry in s["unreadable"]:
                seq += 1
                canonical_rows.append(item_row(uid("record_item", seq, n), n, patient["uuid"], page_ref(entry), "unreadable",
                                               unreadable_item_fields(entry), None))
        statements.append(insert("public.record_summaries", [
            "id", "set_id", "patient_id", "data", "generated_at", "reviewed_by_professional_id", "reviewed_at"], summary_rows))
        item_columns = ["id", "set_id", "patient_id", "source_page_id", "type", "label", "value_numeric", "value_decimals", "unit",
                        "ref_low", "ref_high", "item_date", "canonical_item_id", "details"]
        statements.append(insert("public.record_items", item_columns, canonical_rows))
        if duplicate_rows:
            statements.append(insert("public.record_items", item_columns, duplicate_rows))
        self.count("record_summaries", len(summary_rows), "summaries.json summaries (data = SummaryData body without id and generatedAt)")
        self.count("record_items", len(canonical_rows) + len(duplicate_rows),
                   f"summaries.json entries: {len(canonical_rows)} canonical (incl. unreadable), {len(duplicate_rows)} duplicates")
        self.skip("summaries.json flags", "kept in record_summaries.data; record_item_type has no flag type")
        self.skip("summaries.json patient {firstNameEn, firstNameAr, gender}", "read from the patient's profiles row")

        share_rows = []
        intro_share_booking = {}
        for intro in self.s["introductions"]:
            if intro.get("sharedSummaryId"):
                intro_share_booking[intro["sharedSummaryId"]] = intro["id"]
        int_to_bk = {}
        for b in self.s["bookings"]:
            for intro in self.s["introductions"]:
                if intro["doctorId"] == b["doctorId"] and intro["startsAtUtc"] == b["startsAtUtc"]:
                    int_to_bk[intro["id"]] = b["id"]
        days = self.biz["shareDefaultDays"]
        people = {person["uuid"]: person for person in self.patient_by_first_name.values()}
        for sh in self.s["summaries"]["shares"]:
            sum_uuid, patient_uuid = summary_ids[sh["summaryId"]]
            shid = self.map_id(sh["id"], uid("record_share", sample_number(sh["id"])), "record_shares")
            # record_shares_copy_patient fills the snapshot from the profile, which the accounts section has written.
            person = people[patient_uuid]
            if not (person.get("firstNameEn") and person.get("firstNameAr") and person.get("gender")):
                raise SeedError(f"{sh['id']}: the patient's profile lacks a first name or gender for the share snapshot")
            intro_id = intro_share_booking.get(sh["id"])
            booking_sample = int_to_bk.get(intro_id, intro_id) if intro_id else None
            booking = self.booking_ids.get(booking_sample) if booking_sample else None
            if booking and self.booking_parties[booking_sample] != (sh["professionalId"], patient_uuid):
                raise SeedError(f"{sh['id']}: {booking_sample} is not a booking of the share's patient with "
                                f"{sh['professionalId']} (record_shares_insert_own refuses that link)")
            share_rows.append([
                q(shid), q(sum_uuid), q(patient_uuid), q(self.professional_id(sh["professionalId"])), q(booking),
                si(sh["sharedAtUtc"]), plus_days(si(sh["sharedAtUtc"]), days), si(sh["viewedAtUtc"]),
            ])
        statements.append(insert("public.record_shares", [
            "id", "summary_id", "patient_id", "professional_id", "booking_id", "shared_at", "expires_at", "viewed_at"], share_rows))
        self.count("record_shares", len(share_rows), f"summaries.json shares (expires_at = shared_at + business.shareDefaultDays = "
                   f"{days} days; patient first names and gender copied from profiles by record_shares_copy_patient)")
        self.checks.append(f"Shares: {len(share_rows)}; each patient's profile holds both first names and the gender the "
                           "trigger copies, and each booking link is the patient's booking with the share's professional.")
        self.section("Summaries, typed items (canonical plus one duplicate per extra source) and shares", statements)

    def summary_page_resolver(self, summary: dict[str, Any], record_set: dict[str, Any]) -> Callable[[dict[str, Any]], str]:
        """Maps a summary source {doc, page} to its record_pages id: documents in order, pages counted across the set."""
        first_page, doc_pages, offset = {}, {}, 0
        for doc in summary["documents"]:
            first_page[doc["id"]], doc_pages[doc["id"]] = offset, doc["pages"]
            offset += doc["pages"]
        if offset != sum(len(f["pages"]) for f in record_set["files"]):
            raise SeedError(f"{summary['id']}: documents cover {offset} pages, {record_set['id']} has a different count")

        def resolve(source: dict[str, Any]) -> str:
            if not 1 <= source["page"] <= doc_pages[source["doc"]]:
                raise SeedError(f"{summary['id']}: page {source['page']} is outside {source['doc']}")
            return self.page_ids[(record_set["id"], first_page[source["doc"]] + source["page"])]

        return resolve

    def build_ai_jobs(self) -> None:
        sets = {st["id"]: st for st in self.all_sets()}
        rows = []
        for job in self.s["ai-jobs"]["jobs"]:
            st = sets[job["recordSetId"]]
            n = sample_number(st["id"])
            jid = self.map_id(job["id"], uid("ai_job", sample_number(job["id"])), "ai_jobs")
            steps_sql, input_tokens, output_tokens, cost = [], 0, 0, 0
            for step in job["steps"]:
                parts = [f"'step', {q(step['step'])}", f"'startedAt', {si_iso(step['startedAtUtc'])}",
                         f"'finishedAt', {si_iso(step['finishedAtUtc']) if step['finishedAtUtc'] else 'null'}"]
                usage = step.get("usage")
                if usage:
                    parts.append(f"'usage', {jsonb(usage)}")
                    input_tokens += usage["inputTokens"]
                    output_tokens += usage["outputTokens"]
                    cost += usage["costMicros"]
                if step.get("files"):
                    files = [{**f, "fileId": self.file_ids[(st["id"], f["fileId"])]} for f in step["files"]]
                    parts.append(f"'files', {jsonb(files)}")
                    for f in step["files"]:
                        input_tokens += f["inputTokens"]
                        output_tokens += f["outputTokens"]
                        cost += f["costMicros"]
                steps_sql.append("jsonb_build_object(" + ", ".join(parts) + ")")
            failure = st.get("failure")
            failure_page = None
            if failure:
                offset = 0
                for f in st["files"]:
                    if f["id"] == failure["fileId"]:
                        failure_page = self.page_ids[(st["id"], offset + failure["filePage"])]
                        break
                    offset += len(f["pages"])
            started = job["steps"][0]["startedAtUtc"] if job["steps"] else None
            rows.append([
                q(jid), q(uid("record_set", n)), "'records'", str(job["attempt"]), q(st["status"]), q(st["step"]),
                q(f"records:{uid('record_set', n)}:{job['attempt']}"),
                "jsonb_build_array(\n    " + ",\n    ".join(steps_sql) + ")" if steps_sql else "'[]'::jsonb",
                str(input_tokens), str(output_tokens), str(cost), q(self.src.ai_limits["costCurrency"]),
                q(failure["reason"]) if failure else "null", q(failure_page), si(st["createdAtUtc"]), si(started),
                si(st["finishedAtUtc"]), si(st["finishedAtUtc"] if st["status"] == "cancelled" else None),
            ])
        self.section("AI jobs (steps as jsonb with shifted instants; token and cost totals summed from the steps)", [insert(
            "public.ai_jobs", [
                "id", "set_id", "kind", "attempt", "status", "step", "idempotency_key", "steps", "input_tokens", "output_tokens",
                "cost_micros", "cost_currency", "failure_reason", "failure_page_id", "created_at", "started_at", "finished_at",
                "cancelled_at"], rows)])
        self.count("ai_jobs", len(rows), "ai-jobs.json jobs (status and step from the set, as sampleAiJobs reads them)")
        self.skip("ai-jobs.json alertPreview", "preview of /admin/ai-jobs?state=alert")
        self.skip("ai-jobs.json patientFirstNameAr", "read from the patient's profiles row")

    # ---- audit log ---------------------------------------------------------------------------------------------

    def build_audit_log(self) -> None:
        actors = {a["id"]: a for a in self.s["audit"]["actors"]}
        reserved = {"adm_002": uid("admin_account", 2)}
        entity_maps: dict[str, Callable[[str], str | None]] = {
            "professional": lambda i: q(self.professional_id(i)) if i in self.doctors else None,
            "invite": lambda i: q(uid("invite", sample_number(i))) if any(v["id"] == i for v in self.s["invites"]) else None,
            "recordSet": lambda i: q(uid("record_set", sample_number(i))) if i.startswith("rs_") else None,
            "booking": lambda i: q(self.booking_ids[i]) if i in self.booking_ids else None,
            "share": lambda i: q(uid("record_share", sample_number(i))) if i.startswith("sh_") else None,
            "membership": lambda i: q(uid("membership", "a00" if i == self.src.admin_listed_membership else i.split("_", 1)[1])),
            "specialty": lambda i: f"(select s.id::text from public.specialties s where s.slug = {q(i)})",
            "adminAccount": lambda i: q(self.account_ids.get(i) or reserved[i]),
        }

        def actor_uuid(actor_id: str) -> str | None:
            return self.account_ids.get(actor_id) or reserved.get(actor_id)

        rows = []
        kept_as_text = set()
        for e in self.s["audit"]["entries"]:
            actor = actors[e["actorId"]]
            actor_id = None if actor["kind"] == "system" else actor_uuid(e["actorId"])
            if actor["kind"] != "system" and not actor_id:
                raise SeedError(f"{e['id']}: actor {e['actorId']} has no account")
            actor_system = system_actor_name(e["actorId"]) if actor["kind"] == "system" else None
            target = e["target"]
            mapper = entity_maps.get(target["type"])
            target_sql = mapper(target["id"]) if mapper else None
            if target_sql is None:
                kept_as_text.add(f"{target['type']} {target['id']}")
                target_sql = q(target["id"])
            verification = e.get("verification")
            if verification:
                checks = ", ".join(
                    "jsonb_build_object('kind', {k}, 'source', {s}, 'result', {r}, 'checkedAt', {c}, 'by', {b})".format(
                        k=q(c["kind"]), s=q(c["source"]), r=q(c["result"]), c=si_iso(c["checkedAtUtc"]),
                        b=q(actor_uuid(c["by"]) or c["by"]))
                    for c in verification["checks"])
                reviewer = q(actor_uuid(verification["reviewer"])) if verification["reviewer"] else "null"
                verification_sql = f"jsonb_build_object('reviewer', {reviewer}, 'checks', jsonb_build_array({checks}))"
            else:
                verification_sql = "null"
            rows.append([
                si(e["atUtc"]), q(actor_id), q(actor["kind"]), q(actor_system), q(e["action"]), q(target["type"]), target_sql,
                q(self.professional_id(target["doctorId"])) if target.get("doctorId") else "null", jsonb(e["changes"]),
                jsonb(e["details"]), verification_sql, jsonb(e["note"]) if e.get("note") else "null", q(e["requestId"]),
                q(e.get("stripeEventId")),
            ])
        self.section("Audit log, oldest first (insert-only; inserted as postgres with explicit created_at)", [insert(
            "public.audit_log", [
                "created_at", "actor_id", "actor_kind", "actor_system", "action", "target_type", "target_id",
                "target_professional_id", "changes", "details", "verification", "note", "request_id", "stripe_event_id"], rows)])
        systems = sorted(f"{a} -> {system_actor_name(a)}" for a in actors if actors[a]["kind"] == "system")
        self.count("audit_log", len(rows), "audit.json entries (actor and target ids mapped to the seeded uuids; system actors "
                   "as actor_system: " + ", ".join(systems) + ")")
        self.skip("audit.json entry ids aud_NNN", "audit_log.id is an identity column; rows go in oldest first")
        self.skip("audit.json targets kept as text", "not seeded entities: " + ", ".join(sorted(kept_as_text)))

    def build_previews_skipped(self) -> None:
        self.skip("slot_holds, banners", "no sample rows")

    # ---- output ------------------------------------------------------------------------------------------------

    def header(self) -> list[str]:
        shift_anchor = self.src.anchor.isoformat()
        lines = [
            "-- 3affya dev seed (task 1.5, lane L1). GENERATED by scripts/build_dev_seed.py from data/sample/*.json: do not edit.",
            "-- Rebuild: python scripts/build_dev_seed.py (add --report for output/dev_seed_report.md).",
            "--",
            "-- `supabase db reset` runs every migration, then this file, as role postgres on an empty database. Synthetic only:",
            "-- every person is invented and every address is on example.com. Accounts sign in by email OTP only (no password).",
            "--",
            "-- Sample clock. The sample files are authored around " + shift_anchor + "; lib/card-data.ts shifts them at read time.",
            "-- The same shift is applied here at seed time, so a reset on any day holds what the prototype shows that day:",
            "--   pg_temp.si(iso)              sampleInstant: iso + (today UTC midnight - anchor), whole days of 24 hours",
            "--   pg_temp.si_exact(iso, now0)  sampleInstantExact: now0 (the file's authoredNowUtc) maps to now, to the minute",
            "--   pg_temp.si_wall(iso, zone)   the same whole days added on the zone's wall clock (availability exceptions)",
            "--   pg_temp.sd(ymd)              a calendar date shifted like sampleInstant (licence expiry)",
            "--   pg_temp.si_iso(iso)          si() as ISO text, for instants inside jsonb",
            "-- Weekly availability rules, verified_on and registry dates are not shifted. Pin the clock for a test with",
            "-- `set seed.today = 'YYYY-MM-DD'` and `set seed.now = '<timestamptz>'` before running this file.",
            "--",
            "-- Ids. Readable, fixed UUIDs: <prefix>-0000-4000-8<owner>-<number>. The prefix names the table, the owner (three",
            "-- digits) is the parent sample number where one is needed, the last group is the sample number in decimal digits.",
            "-- Specialties are looked up by slug, never by id, so this file also applies beside rows another seed inserted.",
        ]
        for kind, (prefix, meaning) in ID_PREFIXES.items():
            lines.append(f"--   {prefix}  {meaning}")
        lines += ["--", "-- Sample id -> uuid:"]
        width = max(len(sample) for sample, _, _ in self.idmap)
        for sample, uuid, table in self.idmap:
            lines.append(f"--   {sample.ljust(width)}  {uuid}  {table}")
        lines.append("")
        return lines

    def helpers(self) -> list[str]:
        anchor = self.src.anchor.isoformat()
        return [
            "set client_encoding = 'UTF8';",
            "",
            "-- Today in UTC (or seed.today), and now (or seed.now): the two clock readings every shift uses.",
            "create function pg_temp.seed_today() returns date language sql stable as $$",
            "  select coalesce(nullif(current_setting('seed.today', true), '')::date, (now() at time zone 'utc')::date)",
            "$$;",
            "create function pg_temp.seed_now() returns timestamptz language sql stable as $$",
            "  select coalesce(nullif(current_setting('seed.now', true), '')::timestamptz, now())",
            "$$;",
            "create function pg_temp.seed_shift_days() returns integer language sql stable as $$",
            f"  select pg_temp.seed_today() - date '{anchor}'",
            "$$;",
            "create function pg_temp.si(iso text) returns timestamptz language sql stable as $$",
            "  select iso::timestamptz + pg_temp.seed_shift_days() * interval '24 hours'",
            "$$;",
            "create function pg_temp.si_iso(iso text) returns text language sql stable as $$",
            "  select to_char(pg_temp.si(iso) at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')",
            "$$;",
            "create function pg_temp.si_exact(iso text, authored_now text) returns timestamptz language sql stable as $$",
            "  select iso::timestamptz + (date_trunc('minute', pg_temp.seed_now()) - authored_now::timestamptz)",
            "$$;",
            "create function pg_temp.si_wall(iso text, zone text) returns timestamptz language sql stable as $$",
            "  select ((iso::timestamptz at time zone zone) + pg_temp.seed_shift_days() * interval '1 day') at time zone zone",
            "$$;",
            "create function pg_temp.sd(ymd text) returns date language sql stable as $$",
            "  select ymd::date + pg_temp.seed_shift_days()",
            "$$;",
            "",
        ]

    def sql(self) -> str:
        out = self.header() + self.helpers()
        for title, statements in self.sections:
            out.append(f"-- ---------------- {title} ----------------")
            out.append("")
            for statement in statements:
                out.append(statement)
                out.append("")
        return "\n".join(out).rstrip() + "\n"

    def report_lines(self) -> list[str]:
        lines = [
            "# Dev seed report (supabase/seed.sql)",
            "",
            "Generated by `python scripts/build_dev_seed.py --report` from `data/sample/*.json`. The seed is synthetic; every",
            "instant is shifted at seed time the way `lib/card-data.ts` shifts it at read time (see the header of `supabase/seed.sql`).",
            "",
            "## Rows per table",
            "",
        ]
        lines += markdown_table(["Table", "Rows", "From"], self.counts)
        lines += ["", "## Sample data not seeded", ""]
        lines += markdown_table(["Item", "Reason"], self.skipped)
        lines += ["", "## Checks", "", "What the builder checked before writing the seed (the round-3 constraints):", ""]
        lines += [f"- {check}" for check in self.checks]
        if self.renamed_files:
            lines += ["", "Files whose stored object name differs from '<file id>-<name>' (storage_object_name):", ""]
            lines += markdown_table(["Table", "Sample file", "Stored object name"], self.renamed_files)
        else:
            lines.append("- Storage paths: every sample file name already fits the allowlist; no name was changed.")
        lines += ["", "## Sample shape vs schema (what lane L6 adapts to)", ""]
        lines += [f"- {item}" for item in SAMPLE_VS_SCHEMA]
        lines += ["", "## Taxonomy codes vs the sample", "",
                  "The prototype groups whose seeded codes (scripts/taxonomy_map.py) differ from the drafted "
                  "`specialty-terms.json` taxonomyCodes that /admin/specialties shows today. The codes in the second column "
                  "are on another group in the reviewed mapping, or unmapped (scripts/taxonomy_map.py says why).", ""]
        lines += markdown_table(["Group", "Only in specialty-terms.json", "Only in the seed"], self.taxonomy_differences)
        lines += ["", "## Specialty names vs the sample", "",
                  "The prototype groups whose seeded name, the card title of the content document (decided 20 Oct 2026), "
                  "differs from `data/sample/specialties.json`; the slug is the prototype's. A deliberate difference: the "
                  "screens read the name from the specialties row once lane L6 wires them.", ""]
        lines += markdown_table(["Group", "specialties.json (en / ar)", "Seeded card title (en / ar)"], self.name_differences)
        lines += ["", "## Ids", "", "Sample id to uuid map: the comment block at the top of `supabase/seed.sql`.", ""]
        lines += markdown_table(["Prefix", "Entity"], [(p, m) for p, m in ID_PREFIXES.values()])
        return lines


def page_series_sql(set_number: int, set_uuid: str, file_uuid: str, patient_uuid: str, first_set_page: int,
                    pages: list[tuple[int, str, str | None, int]]) -> str:
    """A long file's pages as one generate_series insert: every page read except the listed ones. Same ids as row form."""
    others = [p for p in pages if p[1] != "read" or p[2] is not None or p[3] != 0]
    values = ", ".join(f"({page}, {q(status)}, {q(reason)}, {attempts})" for page, status, reason, attempts in others)
    join = (f"left join (values {values}) as x(page, status, reason, attempts) on x.page = n"
            if others else "left join (select null::int as page, null::text as status, null::text as reason, "
                           "null::int as attempts) as x on false")
    prefix = uid("record_page", 0, set_number)[:-12]
    offset = first_set_page - 1
    return "\n".join([
        "insert into public.record_pages (id, set_id, file_id, patient_id, page_number, set_page_number, status, "
        "unreadable_reason, attempts)",
        f"select ({q(prefix)} || lpad((n + {offset})::text, 12, '0'))::uuid, {q(set_uuid)}, {q(file_uuid)}, {q(patient_uuid)}, "
        f"n, n + {offset},",
        "  coalesce(x.status, 'read')::public.page_status, x.reason::public.unreadable_reason, coalesce(x.attempts, 0)",
        f"from generate_series(1, {len(pages)}) as n {join};",
    ])


def auth_users_sql(users: list[tuple[str, str, str]], created: str = "now()") -> str:
    """auth.users rows GoTrue reads like its own: provider email, no password, email confirmed, every token column ''."""
    rows = []
    for user_id, email, role in users:
        app_meta = {"provider": "email", "providers": ["email"], "role": role}
        rows.append([
            q(GOTRUE_INSTANCE_ID), q(user_id), "'authenticated'", "'authenticated'", q(email), "''", created, "''", "''", "''", "''",
            "''", "''", "''", "''", jsonb(app_meta), jsonb({"email_verified": True}), created, created, "false", "false",
        ])
    return insert("auth.users", [
        "instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "confirmation_token",
        "recovery_token", "email_change_token_new", "email_change", "email_change_token_current", "phone_change",
        "phone_change_token", "reauthentication_token", "raw_app_meta_data", "raw_user_meta_data", "created_at", "updated_at",
        "is_sso_user", "is_anonymous"], rows)


def auth_identities_sql(users: list[tuple[str, str]], created: str = "now()") -> str:
    rows = []
    for user_id, email in users:
        data = {"sub": user_id, "email": email, "email_verified": True, "phone_verified": False}
        rows.append([q(user_id), q(user_id), jsonb(data), "'email'", created, created])
    return insert("auth.identities", ["provider_id", "user_id", "identity_data", "provider", "created_at", "updated_at"], rows)


def item_fields(item_type: str, entry: dict[str, Any]) -> dict[str, Any]:
    """record_items columns for one summary entry; type-specific fields go to details."""
    fields: dict[str, Any] = {"label": entry["nameEn"], "details": {"nameAr": entry["nameAr"]}}
    if item_type == "condition":
        fields["item_date"] = entry.get("notedOn")
    elif item_type == "procedure":
        fields["item_date"] = entry.get("doneOn")
    elif item_type == "medication":
        dose = entry.get("dose") or {}
        fields.update(value_numeric=dose.get("amount"), value_decimals=dose.get("decimals"), unit=dose.get("unit"))
        fields["details"]["frequency"] = entry.get("frequency")
    elif item_type == "allergy":
        fields["details"].update(reactionEn=entry.get("reactionEn"), reactionAr=entry.get("reactionAr"))
    elif item_type == "result":
        fields.update(value_numeric=entry.get("value"), value_decimals=entry.get("decimals"), unit=entry.get("unit"),
                      ref_low=entry.get("low"), ref_high=entry.get("high"), item_date=entry.get("takenOn"))
    return fields


def unreadable_item_fields(entry: dict[str, Any]) -> dict[str, Any]:
    """The record_items fields of an unreadable page: the reason as label and in details, or, when the pipeline could not
    tell why, the label 'unreadable' and a null reason (never a guessed one)."""
    reason = entry.get("reason")
    return {"label": reason or "unreadable", "details": {"reason": reason}}


def item_row(item_id: str, set_number: int, patient_uuid: str, page_id: str, item_type: str, fields: dict[str, Any],
             canonical: str | None) -> list[str]:
    return [
        q(item_id), q(uid("record_set", set_number)), q(patient_uuid), q(page_id), q(item_type), q(fields["label"]),
        lit(fields.get("value_numeric")), lit(fields.get("value_decimals")), q(fields.get("unit")), lit(fields.get("ref_low")),
        lit(fields.get("ref_high")), fixed_date(fields.get("item_date")), q(canonical), jsonb(fields["details"]),
    ]


def build(src: Sources | None = None) -> SeedBuilder:
    builder = SeedBuilder(src or Sources())
    builder.build()
    return builder


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--report", action="store_true", help="also write output/dev_seed_report.md")
    parser.add_argument("--check", action="store_true", help="exit 1 if supabase/seed.sql differs from what the sample builds")
    parser.add_argument("--out", type=pathlib.Path, default=SEED_PATH, help="where to write the seed (default supabase/seed.sql)")
    args = parser.parse_args(argv)
    try:
        builder = build()
    except SeedError as error:
        print(f"build_dev_seed: {error}", file=sys.stderr)
        return 2
    text = builder.sql()
    if args.check:
        current = args.out.read_text(encoding="utf-8") if args.out.exists() else ""
        if current != text:
            print(f"{args.out} is stale: run python scripts/build_dev_seed.py", file=sys.stderr)
            return 1
        print(f"{args.out} is current")
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8", newline="\n")
    total = sum(rows for _, rows, _ in builder.counts)
    print(f"wrote {args.out} ({len(text.encode('utf-8'))} bytes, {total} rows over {len(builder.counts)} tables)")
    if args.report:
        print(f"wrote {write_report(REPORT_PATH, builder.report_lines())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
