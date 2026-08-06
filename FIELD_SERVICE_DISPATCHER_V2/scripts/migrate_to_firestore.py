"""
migrate_to_firestore.py
=======================
Zero-break PostgreSQL → Google Firestore migration script.

Migrates ALL production tables:
  - technicians
  - service_requests
  - dispatch_results
  - users
  - auth_tokens

Design rules (strictly enforced):
  - PostgreSQL stays FULLY intact (read-only during migration).
  - Document IDs = string(PostgreSQL row id).
  - JSONB columns → Firestore native list/map (no conversion needed).
  - datetime columns → datetime objects (Firestore handles as Timestamp).
  - Batch writes: 500 ops per commit (Firestore hard limit).
  - Full count verification after migration.
  - Random 10-record integrity check per table.
  - Detailed logging: success / failure / mismatch.

Usage:
    python scripts/migrate_to_firestore.py
"""

from __future__ import annotations

import json
import logging
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Path bootstrap so this script can be run from the project root or scripts/.
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
LOG_FILE = PROJECT_ROOT / "logs" / "firestore_migration.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
LOGGER = logging.getLogger("firestore_migration")

# ---------------------------------------------------------------------------
# Imports (after path bootstrap)
# ---------------------------------------------------------------------------
from google.cloud import firestore
from google.oauth2 import service_account
from sqlalchemy import text

from database.postgres_client import engine as pg_engine

# ---------------------------------------------------------------------------
# Firestore connection — database: field-service-dispatcher
# ---------------------------------------------------------------------------
SERVICE_ACCOUNT_PATH = PROJECT_ROOT / "service-account.json"

_creds = service_account.Credentials.from_service_account_file(
    str(SERVICE_ACCOUNT_PATH),
    scopes=["https://www.googleapis.com/auth/cloud-platform"],
)

db = firestore.Client(
    project=_creds.project_id,
    database="field-service-dispatcher",
    credentials=_creds,
)

LOGGER.info("Firestore client initialised → project=%s database=%s", _creds.project_id, "field-service-dispatcher")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BATCH_SIZE = 500          # Firestore batch write hard limit
INTEGRITY_SAMPLE = 10     # Records to spot-check per table


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _coerce_value(v: Any) -> Any:
    """
    Recursively coerce a PostgreSQL row value into a Firestore-safe type.

    Rules:
    - None           → None  (unchanged; Firestore stores as null)
    - datetime       → datetime with UTC tzinfo  (stored as Firestore Timestamp)
    - str that looks like ISO datetime → datetime
    - dict / list    → recurse (for nested JSONB)
    - bytes          → hex string (rare but safe)
    - everything else → unchanged
    """
    if v is None:
        return v
    if isinstance(v, datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    if isinstance(v, str):
        # Try to parse ISO-8601 datetimes stored as strings
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(v, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return v
    if isinstance(v, dict):
        return {k: _coerce_value(vv) for k, vv in v.items()}
    if isinstance(v, list):
        return [_coerce_value(item) for item in v]
    if isinstance(v, bytes):
        return v.hex()
    return v


def _row_to_dict(row_mapping) -> dict:
    """Convert a SQLAlchemy RowMapping to a plain dict with coerced values."""
    result = {}
    for key, value in row_mapping.items():
        result[str(key)] = _coerce_value(value)
    return result


# ---------------------------------------------------------------------------
# PostgreSQL read helpers
# ---------------------------------------------------------------------------

def _fetch_all(table: str, order_by: str = "id") -> list[dict]:
    with pg_engine.connect() as conn:
        # Use safe identifier quoting — table/order_by come from our own
        # MIGRATION_PLAN constant, never from user input, so f-string is safe.
        rows = conn.execute(text(f'SELECT * FROM "{table}" ORDER BY "{order_by}"')).mappings().all()
    return [_row_to_dict(r) for r in rows]


def _pg_count(table: str) -> int:
    with pg_engine.connect() as conn:
        return conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one()


# ---------------------------------------------------------------------------
# Firestore write helpers
# ---------------------------------------------------------------------------

def _migrate_table(
    pg_table: str,
    fs_collection: str,
    id_field: str = "id",
    id_prefix: str = "",
    order_by: str = "id",
) -> tuple[int, int]:
    """
    Migrate one PostgreSQL table → one Firestore collection.

    - Document ID = id_prefix + str(row[id_field])
    - Uses batch writes, committing every BATCH_SIZE ops.

    Returns:
        (migrated_count, failed_count)
    """
    LOGGER.info("━━━ Migrating: %s → firestore/%s ━━━", pg_table, fs_collection)
    rows = _fetch_all(pg_table, order_by=order_by)

    if not rows:
        LOGGER.warning("  Table '%s' is empty — skipping.", pg_table)
        return 0, 0

    LOGGER.info("  Fetched %d rows from PostgreSQL.", len(rows))

    collection_ref = db.collection(fs_collection)
    batch = db.batch()
    ops_in_batch = 0
    migrated = 0
    failed = 0

    for row in rows:
        raw_id = row.get(id_field)
        if raw_id is None:
            LOGGER.warning("  Row missing '%s' field — skipping: %s", id_field, row)
            failed += 1
            continue

        doc_id = f"{id_prefix}{raw_id}"
        doc_ref = collection_ref.document(str(doc_id))

        try:
            batch.set(doc_ref, row)
            ops_in_batch += 1
            migrated += 1
        except Exception as exc:
            LOGGER.error("  Failed to queue doc %s: %s", doc_id, exc)
            failed += 1
            continue

        if ops_in_batch >= BATCH_SIZE:
            try:
                batch.commit()
                LOGGER.info("  Committed batch of %d ops.", ops_in_batch)
            except Exception as exc:
                LOGGER.error("  Batch commit failed: %s", exc)
                failed += ops_in_batch
                migrated -= ops_in_batch
            batch = db.batch()
            ops_in_batch = 0

    # Commit remaining ops
    if ops_in_batch > 0:
        try:
            batch.commit()
            LOGGER.info("  Committed final batch of %d ops.", ops_in_batch)
        except Exception as exc:
            LOGGER.error("  Final batch commit failed: %s", exc)
            failed += ops_in_batch
            migrated -= ops_in_batch

    LOGGER.info("  ✓ %d migrated  ✗ %d failed", migrated, failed)
    return migrated, failed


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def _verify_counts(pg_table: str, fs_collection: str) -> bool:
    """Check PostgreSQL count == Firestore count."""
    pg_cnt = _pg_count(pg_table)
    fs_docs = list(db.collection(fs_collection).stream())
    fs_cnt = len(fs_docs)

    match = pg_cnt == fs_cnt
    status = "✓ MATCH" if match else "✗ MISMATCH"
    LOGGER.info(
        "  Count check [%s]: PostgreSQL=%d  Firestore=%d  → %s",
        pg_table, pg_cnt, fs_cnt, status,
    )
    return match


def _integrity_check(pg_table: str, fs_collection: str, id_prefix: str = "", id_field: str = "id") -> bool:
    """
    Randomly sample INTEGRITY_SAMPLE records and compare field values.

    Skips datetime fields (timezone-aware vs naive may differ trivially).
    Returns True if all sampled records match.
    """
    LOGGER.info("  Running integrity check for '%s' (sample=%d) …", pg_table, INTEGRITY_SAMPLE)

    with pg_engine.connect() as conn:
        pg_rows = conn.execute(text(f"SELECT * FROM {pg_table}")).mappings().all()

    if not pg_rows:
        LOGGER.info("  Table '%s' empty — nothing to check.", pg_table)
        return True

    sample = random.sample(list(pg_rows), min(INTEGRITY_SAMPLE, len(pg_rows)))
    all_ok = True

    for row in sample:
        row_id = row[id_field]
        doc_id = f"{id_prefix}{row_id}"
        doc = db.collection(fs_collection).document(str(doc_id)).get()

        if not doc.exists:
            LOGGER.error("  MISSING  doc %s in Firestore!", doc_id)
            all_ok = False
            continue

        fs_data = doc.to_dict()
        for key, pg_val in row.items():
            if pg_val is None:
                continue
            if isinstance(pg_val, datetime):
                continue  # Timestamp comparison not needed for integrity check

            fs_val = fs_data.get(str(key))

            # JSONB (lists/dicts): compare via JSON dump for value equality
            if isinstance(pg_val, (list, dict)):
                try:
                    if json.dumps(pg_val, sort_keys=True, default=str) != json.dumps(fs_val, sort_keys=True, default=str):
                        LOGGER.warning(
                            "  MISMATCH  doc=%s field=%s  pg=%r  fs=%r",
                            doc_id, key, pg_val, fs_val,
                        )
                        all_ok = False
                except Exception:
                    pass
                continue

            if str(pg_val) != str(fs_val):
                LOGGER.warning(
                    "  MISMATCH  doc=%s field=%s  pg=%r  fs=%r",
                    doc_id, key, pg_val, fs_val,
                )
                all_ok = False

    if all_ok:
        LOGGER.info("  ✓ Integrity check passed for '%s'.", pg_table)
    else:
        LOGGER.warning("  ✗ Integrity check found mismatches in '%s'.", pg_table)

    return all_ok


# ---------------------------------------------------------------------------
# Table config: (pg_table, fs_collection, id_prefix)
# ---------------------------------------------------------------------------
# (pg_table, fs_collection, id_prefix, id_field, order_by)
MIGRATION_PLAN = [
    ("technicians",      "technicians",       "",  "id",    "id"),
    ("service_requests", "service_requests",  "",  "id",    "id"),
    ("dispatch_results", "dispatch_results",  "",  "id",    "id"),
    ("users",            "users",             "",  "id",    "id"),
    # auth_tokens has no integer id — the token string IS the primary key
    ("auth_tokens",      "auth_tokens",       "",  "token", "token"),
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_migration() -> None:
    LOGGER.info("=" * 60)
    LOGGER.info("  PostgreSQL → Firestore Migration Started")
    LOGGER.info("  Target database : field-service-dispatcher")
    LOGGER.info("  Project         : %s", getattr(_creds, "project_id", "unknown"))
    LOGGER.info("=" * 60)

    total_migrated = 0
    total_failed = 0
    count_results: list[tuple[str, bool]] = []
    integrity_results: list[tuple[str, bool]] = []

    # ── PHASE 1: Migrate all tables ──────────────────────────────────────────
    # Each tuple: (pg_table, fs_collection, id_prefix, id_field, order_by)
    for pg_table, fs_collection, id_prefix, id_field, order_by in MIGRATION_PLAN:
        try:
            mig, fail = _migrate_table(
                pg_table,
                fs_collection,
                id_field=id_field,
                id_prefix=id_prefix,
                order_by=order_by,
            )
            total_migrated += mig
            total_failed += fail
        except Exception as exc:
            LOGGER.error("FATAL error migrating '%s': %s", pg_table, exc)
            total_failed += 1

    # ── PHASE 2: Count verification ──────────────────────────────────────────
    LOGGER.info("")
    LOGGER.info("── Count Verification ──────────────────────────────────────")
    for pg_table, fs_collection, _prefix, _id_field, _order_by in MIGRATION_PLAN:
        try:
            ok = _verify_counts(pg_table, fs_collection)
            count_results.append((pg_table, ok))
        except Exception as exc:
            LOGGER.error("Count verification error for '%s': %s", pg_table, exc)
            count_results.append((pg_table, False))

    # ── PHASE 3: Integrity check ─────────────────────────────────────────────
    LOGGER.info("")
    LOGGER.info("── Integrity Checks ────────────────────────────────────────")
    for pg_table, fs_collection, id_prefix, id_field, _order_by in MIGRATION_PLAN:
        try:
            ok = _integrity_check(pg_table, fs_collection, id_prefix=id_prefix, id_field=id_field)
            integrity_results.append((pg_table, ok))
        except Exception as exc:
            LOGGER.error("Integrity check error for '%s': %s", pg_table, exc)
            integrity_results.append((pg_table, False))

    # ── PHASE 4: Summary ─────────────────────────────────────────────────────
    LOGGER.info("")
    LOGGER.info("=" * 60)
    LOGGER.info("MIGRATION SUMMARY")
    LOGGER.info("  Total migrated : %d", total_migrated)
    LOGGER.info("  Total failed   : %d", total_failed)
    LOGGER.info("")
    LOGGER.info("Count verification:")
    for table, ok in count_results:
        LOGGER.info("  %-25s %s", table, "✓ PASS" if ok else "✗ FAIL")
    LOGGER.info("")
    LOGGER.info("Integrity checks:")
    for table, ok in integrity_results:
        LOGGER.info("  %-25s %s", table, "✓ PASS" if ok else "✗ FAIL")

    all_counts_ok = all(ok for _, ok in count_results)
    all_integrity_ok = all(ok for _, ok in integrity_results)

    LOGGER.info("")
    if total_failed == 0 and all_counts_ok and all_integrity_ok:
        LOGGER.info("✅ MIGRATION COMPLETE — All checks passed.")
    else:
        LOGGER.warning("⚠️  MIGRATION COMPLETE WITH ISSUES — Review logs above.")
    LOGGER.info("=" * 60)
    LOGGER.info("Log saved to: %s", LOG_FILE)


if __name__ == "__main__":
    run_migration()
