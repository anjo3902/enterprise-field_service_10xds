"""
cleanup_all_e2e_test_data.py
----------------------------
Safely removes ALL Firestore service_requests documents marked as test data.

Safety guarantees:
- Deletes ONLY documents where is_test_data == True
- Never deletes unflagged records
- Uses Firestore batched writes (max 500 per batch)
- Verifies zero test data remains after deletion
- Idempotent and safe to run multiple times

Usage:
    python scripts/cleanup_all_e2e_test_data.py
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

# Allow running from project root or scripts/
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.firestore_client import _get_db  # noqa: E402

BATCH_LIMIT = 500
COLLECTION = "service_requests"


def fetch_test_docs():
    db = _get_db()
    coll = db.collection(COLLECTION)
    docs = list(coll.where("is_test_data", "==", True).stream())
    return docs


def log_grouped_by_test_run_id(docs):
    grouped = defaultdict(int)
    for doc in docs:
        data = doc.to_dict() or {}
        test_run_id = data.get("test_run_id") or "<missing_test_run_id>"
        grouped[str(test_run_id)] += 1

    if not grouped:
        print("No test records found for grouping.")
        return

    print("\nGrouped by test_run_id:")
    for run_id, count in sorted(grouped.items()):
        print(f"TEST RUN ID: {run_id} -> {count} records")


def delete_in_batches(docs):
    db = _get_db()
    deleted = 0
    skipped = 0

    batch = db.batch()
    ops_in_batch = 0

    for doc in docs:
        data = doc.to_dict() or {}

        # Critical safety rule: delete ONLY when explicit flag is true.
        if data.get("is_test_data") is True:
            batch.delete(doc.reference)
            ops_in_batch += 1
            deleted += 1

            if ops_in_batch >= BATCH_LIMIT:
                batch.commit()
                batch = db.batch()
                ops_in_batch = 0
        else:
            skipped += 1

    if ops_in_batch > 0:
        batch.commit()

    return deleted, skipped


def verify_cleanup():
    remaining_docs = fetch_test_docs()
    remaining_ids = [doc.id for doc in remaining_docs]
    return remaining_ids


def extra_safety_scan_for_test_run_id_without_flag():
    db = _get_db()
    coll = db.collection(COLLECTION)

    warnings = []
    for doc in coll.stream():
        data = doc.to_dict() or {}
        if "test_run_id" in data and data.get("is_test_data") is not True:
            warnings.append(doc.id)

    if warnings:
        print("\nWARNING: Documents with test_run_id but is_test_data != true (NOT deleted):")
        for doc_id in warnings:
            print(f" - {doc_id}")
    else:
        print("\nExtra safety scan: no mixed-flag leftovers found.")


def main():
    print("Starting safe E2E test data cleanup...")

    test_docs = fetch_test_docs()
    total_found = len(test_docs)

    print(f"TOTAL TEST RECORDS FOUND: {total_found}")
    log_grouped_by_test_run_id(test_docs)

    deleted, skipped = delete_in_batches(test_docs)
    print(f"TOTAL DELETED: {deleted}")
    if skipped:
        print(f"SKIPPED (safety rule): {skipped}")

    remaining_ids = verify_cleanup()
    remaining = len(remaining_ids)

    print(f"REMAINING: {remaining}")

    extra_safety_scan_for_test_run_id_without_flag()

    if remaining > 0:
        print("\nCLEANUP FAILED")
        print("Remaining test data IDs:")
        for doc_id in remaining_ids:
            print(f" - {doc_id}")
        raise SystemExit(1)

    print("\nCLEANUP SUCCESSFUL")


if __name__ == "__main__":
    main()
