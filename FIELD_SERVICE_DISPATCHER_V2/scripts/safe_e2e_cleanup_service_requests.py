"""
safe_e2e_cleanup_service_requests.py
------------------------------------
Preview-first, safety-first cleanup for Firestore service_requests E2E records.

Workflow:
1) Preview candidates and conflicts (NO deletion)
2) Explicit operator confirmation
3) Controlled deletion in batches (max 200)
4) Re-verify and print manual-review leftovers

Usage:
  python scripts/safe_e2e_cleanup_service_requests.py --preview
  python scripts/safe_e2e_cleanup_service_requests.py --delete --confirm --window-days 10

Safety principles:
- Never deletes without --delete --confirm
- Deletes only records with clear review_notes test markers
- Deletes only recent records (default 10 days)
- Deletes only clearly non-operational statuses and no real technician flow
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.firestore_client import _get_db  # noqa: E402


COLLECTION = "service_requests"
DELETE_BATCH_SIZE = 200

REVIEW_NOTES_MARKERS = ("e2e", "test", "validation")
SOURCE_MARKERS = ("test", "playwright")
MANUAL_SCAN_MARKERS = ("e2e", "test")

SAFE_DELETE_STATUSES = {
    "cancelled",
    "rejected",
    "test",
    "test_only",
}


@dataclass
class Record:
    doc_id: str
    fault_type: str
    review_notes: str
    created_at: str
    status: str
    created_by: str
    source: str
    test_run_id: str
    assigned_technician: str
    assigned_technician_name: str


def _to_text(value) -> str:
    return "" if value is None else str(value)


def _contains_any(text: str, tokens: tuple[str, ...]) -> bool:
    lower = _to_text(text).lower()
    return any(token in lower for token in tokens)


def _parse_created_at(value):
    if value is None:
        return None

    if hasattr(value, "astimezone"):
        dt = value
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    raw = str(value).strip()
    if not raw:
        return None

    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _to_record(doc) -> Record:
    d = doc.to_dict() or {}
    return Record(
        doc_id=str(doc.id),
        fault_type=_to_text(d.get("fault_type")),
        review_notes=_to_text(d.get("review_notes")),
        created_at=_to_text(d.get("created_at")),
        status=_to_text(d.get("status")).strip().lower(),
        created_by=_to_text(d.get("created_by")),
        source=_to_text(d.get("source")),
        test_run_id=_to_text(d.get("test_run_id")),
        assigned_technician=_to_text(d.get("assigned_technician")).strip(),
        assigned_technician_name=_to_text(d.get("assigned_technician_name")).strip(),
    )


def _is_recent(record: Record, cutoff_utc: datetime) -> bool:
    created_dt = _parse_created_at(record.created_at)
    return bool(created_dt and created_dt >= cutoff_utc)


def _has_test_marker(record: Record) -> bool:
    return (
        _contains_any(record.review_notes, REVIEW_NOTES_MARKERS)
        or _contains_any(record.created_by, SOURCE_MARKERS)
        or _contains_any(record.source, SOURCE_MARKERS)
        or bool(record.test_run_id)
    )


def _has_real_technician_flow(record: Record) -> bool:
    has_assignment = bool(record.assigned_technician or record.assigned_technician_name)
    operational_status = record.status in {"assigned", "in_progress", "completed"}
    return has_assignment or operational_status


def classify_records(records: list[Record], window_days: int):
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)

    marker_recent = [r for r in records if _has_test_marker(r) and _is_recent(r, cutoff)]
    fault_counts = Counter(r.fault_type.lower() for r in marker_recent if r.fault_type)

    test_candidates: list[Record] = []
    possible_real_conflicts: list[Record] = []
    final_delete: list[Record] = []

    for r in records:
        has_marker = _has_test_marker(r)
        if not has_marker:
            continue

        is_recent = _is_recent(r, cutoff)
        repeated_fault = bool(r.fault_type and fault_counts.get(r.fault_type.lower(), 0) >= 3)
        no_real_flow = not _has_real_technician_flow(r)
        test_like_behavior = no_real_flow or repeated_fault

        if is_recent and test_like_behavior:
            test_candidates.append(r)
        else:
            possible_real_conflicts.append(r)

        # Step 3 strict final delete filter:
        # - clear review_notes marker
        # - recent
        # - no real technician flow
        # - safe non-operational status
        review_notes_clear = _contains_any(r.review_notes, REVIEW_NOTES_MARKERS)
        if review_notes_clear and is_recent and no_real_flow and (r.status in SAFE_DELETE_STATUSES):
            final_delete.append(r)

    return {
        "cutoff": cutoff,
        "test_candidates": test_candidates,
        "possible_real_conflicts": possible_real_conflicts,
        "final_delete": final_delete,
    }


def print_records(title: str, rows: list[Record]):
    print(f"\n{title}: {len(rows)}")
    if not rows:
        print("  (none)")
        return

    for r in rows:
        print(
            f"  id={r.doc_id} | fault_type={r.fault_type or '-'} | "
            f"review_notes={r.review_notes or '-'} | created_at={r.created_at or '-'} | "
            f"status={r.status or '-'}"
        )


def preview(db, window_days: int):
    docs = list(db.collection(COLLECTION).stream())
    records = [_to_record(doc) for doc in docs]
    result = classify_records(records, window_days=window_days)

    print("=== PREVIEW (NO DELETION) ===")
    print(f"Collection: {COLLECTION}")
    print(f"Window days: {window_days}")
    print(f"Recent cutoff (UTC): {result['cutoff'].isoformat()}")
    print(f"Total scanned: {len(records)}")

    print_records("TEST CANDIDATES", result["test_candidates"])
    print_records("REAL DATA (possible conflict)", result["possible_real_conflicts"])
    print_records("FINAL SAFE DELETE CANDIDATES", result["final_delete"])

    return records, result


def delete_records(db, to_delete: list[Record]):
    deleted = 0
    batch = db.batch()
    in_batch = 0
    batch_number = 1

    for rec in to_delete:
        ref = db.collection(COLLECTION).document(rec.doc_id)
        batch.delete(ref)
        in_batch += 1
        deleted += 1

        reason = (
            "review_notes contains clear test marker; "
            "recent within cleanup window; "
            "non-operational status; no real technician flow"
        )
        print(f"DELETE id={rec.doc_id} | reason={reason}")

        if in_batch >= DELETE_BATCH_SIZE:
            batch.commit()
            print(f"BATCH COMMITTED: {batch_number} | size={in_batch}")
            batch = db.batch()
            in_batch = 0
            batch_number += 1

    if in_batch > 0:
        batch.commit()
        print(f"BATCH COMMITTED: {batch_number} | size={in_batch}")

    return deleted


def verify_remaining(db, window_days: int):
    docs = list(db.collection(COLLECTION).stream())
    records = [_to_record(doc) for doc in docs]
    result = classify_records(records, window_days=window_days)

    remaining_final = result["final_delete"]
    print(f"\nVERIFY FINAL SAFE FILTER REMAINING: {len(remaining_final)}")
    if remaining_final:
        for rec in remaining_final:
            print(f"  REMAINING id={rec.doc_id}")

    return records, result


def double_safety_scan(records: list[Record]):
    flagged = [
        r for r in records
        if _contains_any(r.review_notes, MANUAL_SCAN_MARKERS)
        or _contains_any(r.created_by, MANUAL_SCAN_MARKERS)
        or _contains_any(r.source, MANUAL_SCAN_MARKERS)
    ]

    print(f"\nDOUBLE SAFETY SCAN (contains 'E2E' or 'test'): {len(flagged)}")
    if flagged:
        for r in flagged:
            print(
                f"  MANUAL REVIEW REQUIRED id={r.doc_id} | "
                f"fault_type={r.fault_type or '-'} | status={r.status or '-'} | created_at={r.created_at or '-'}"
            )
    else:
        print("  (none)")

    return flagged


def build_parser():
    p = argparse.ArgumentParser(description="Safe E2E cleanup for Firestore service_requests")
    p.add_argument("--preview", action="store_true", help="Preview only (default behavior)")
    p.add_argument("--delete", action="store_true", help="Execute deletion of final safe candidates")
    p.add_argument("--confirm", action="store_true", help="Required with --delete")
    p.add_argument("--window-days", type=int, default=10, help="Recent window in days (default: 10)")
    return p


def main():
    args = build_parser().parse_args()

    db = _get_db()
    records, preview_result = preview(db, window_days=args.window_days)

    total_found = len(preview_result["test_candidates"])
    final_safe = preview_result["final_delete"]

    if not args.delete:
        print("\nSTOPPED BEFORE DELETION (preview mode).")
        print("To delete ONLY final safe candidates, run with: --delete --confirm")
        return

    if not args.confirm:
        print("\nABORTED: --delete requires --confirm")
        return

    print("\n=== DELETION STARTED ===")
    deleted = delete_records(db, final_safe)

    post_records, post_result = verify_remaining(db, window_days=args.window_days)
    remaining = len(post_result["final_delete"])
    manual_review = double_safety_scan(post_records)

    print("\n=== FINAL OUTPUT ===")
    print(f"TOTAL FOUND: {total_found}")
    print(f"TOTAL DELETED: {deleted}")
    print(f"REMAINING: {remaining}")

    if remaining == 0 and len(manual_review) == 0:
        print("STATUS: CLEANUP SUCCESSFUL")
    elif remaining == 0:
        print("STATUS: PARTIAL CLEANUP (manual review needed)")
    else:
        print("STATUS: PARTIAL CLEANUP (manual review needed)")


if __name__ == "__main__":
    main()
