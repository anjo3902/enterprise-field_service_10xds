"""
cleanup_cancelled_requests.py
------------------------------
One-time backfill: clears stale technician fields on any existing
Firestore service_request documents whose status is 'cancelled' or
whose review_decision is 'rejected'.

Run once after deploying the fix to api_server.py:
    python scripts/cleanup_cancelled_requests.py
"""

import sys
import os

# Allow imports from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from firestore.firestore_client import db  # noqa: E402 – project Firestore client

CLEAR_FIELDS = {
    "assigned_technician": None,
    "assigned_technician_name": "",
    "assigned_technician_phone": "",
    "assigned_technician_zone": "",
}


def run():
    collection = db.collection("service_requests")
    docs = collection.stream()

    updated = 0
    skipped = 0

    for doc in docs:
        data = doc.to_dict() or {}
        status = str(data.get("status", "")).lower()
        review_decision = str(data.get("review_decision", "")).lower()

        if status in ("cancelled", "rejected") or review_decision == "rejected":
            # Only write if any technician field still has a non-empty value
            needs_update = (
                data.get("assigned_technician") is not None and data.get("assigned_technician") != ""
                or data.get("assigned_technician_name", "") != ""
                or data.get("assigned_technician_phone", "") != ""
                or data.get("assigned_technician_zone", "") != ""
            )

            if needs_update:
                doc.reference.update(CLEAR_FIELDS)
                print(f"  CLEARED  [{doc.id}]  status={status!r}  review={review_decision!r}")
                updated += 1
            else:
                skipped += 1
        else:
            skipped += 1

    print(f"\nDone. Updated: {updated}  |  Already clean / active: {skipped}")


if __name__ == "__main__":
    run()
