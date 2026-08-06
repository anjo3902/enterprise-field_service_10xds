#!/usr/bin/env python3
"""Repair stale reassignment flags for finalized requests."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from typing import Iterable

from database import firestore_client as db_client

FINAL_STATUSES = {"failed", "rejected", "processed", "completed", "skipped"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_status(value: object) -> str:
    return str(value or "").strip().lower()


def _summarize(doc_id: str, data: dict) -> str:
    return (
        f"id={doc_id} status={_normalize_status(data.get('reassignment_status'))} "
        f"requested={data.get('reassignment_requested')} "
        f"pending={data.get('reassignment_pending')} "
        f"requested_at={data.get('reassignment_requested_at')} "
        f"processing_at={data.get('reassignment_processing_at')} "
        f"processed_at={data.get('reassignment_processed_at')}"
    )


def _is_stale(data: dict) -> bool:
    status = _normalize_status(data.get("reassignment_status"))
    if status not in FINAL_STATUSES:
        return False
    return bool(data.get("reassignment_requested") is True or data.get("reassignment_pending") is True)


def _collect_docs_by_ids(db, ids: Iterable[str]) -> list:
    coll = db.collection("service_requests")
    docs = []
    for request_id in ids:
        doc = coll.document(str(request_id)).get()
        if doc.exists:
            docs.append(doc)
        else:
            print(f"WARN: request id not found: {request_id}")
    return docs


def _collect_candidate_docs(db) -> list:
    coll = db.collection("service_requests")
    docs = []
    try:
        docs.extend(list(coll.where("reassignment_requested", "==", True).stream()))
    except Exception as exc:
        print(f"WARN: failed to query reassignment_requested: {exc}")

    try:
        docs.extend(list(coll.where("reassignment_pending", "==", True).stream()))
    except Exception as exc:
        print(f"WARN: failed to query reassignment_pending: {exc}")

    # Deduplicate by document id
    seen = set()
    unique_docs = []
    for doc in docs:
        if doc.id in seen:
            continue
        seen.add(doc.id)
        unique_docs.append(doc)

    return unique_docs


def _repair_doc(doc, *, dry_run: bool, force: bool) -> bool:
    data = doc.to_dict() or {}
    doc_id = doc.id
    stale = _is_stale(data)
    if not stale and not force:
        return False

    print("CANDIDATE:", _summarize(doc_id, data))

    updates = {
        "reassignment_requested": False,
        "reassignment_pending": False,
        "updated_at": _now_utc(),
    }

    if dry_run:
        print("DRY_RUN:", doc_id, updates)
        return True

    db_client.update_service_request(doc_id, updates)
    print("UPDATED:", doc_id)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair stale reassignment flags on service requests.")
    parser.add_argument("--ids", help="Comma-separated request ids to inspect/fix")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without updating Firestore")
    parser.add_argument("--force", action="store_true", help="Force updates even if not flagged as stale")

    args = parser.parse_args()

    db = db_client._get_db()

    if args.ids:
        ids = [value.strip() for value in args.ids.split(",") if value.strip()]
        docs = _collect_docs_by_ids(db, ids)
    else:
        docs = _collect_candidate_docs(db)

    if not docs:
        print("No candidate documents found.")
        return

    updated = 0
    for doc in docs:
        if _repair_doc(doc, dry_run=args.dry_run, force=args.force):
            updated += 1

    print(f"Done. candidates={len(docs)} updated={updated}")


if __name__ == "__main__":
    main()
