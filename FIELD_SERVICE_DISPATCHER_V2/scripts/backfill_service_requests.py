"""
backfill_service_requests.py
=============================
One-time backfill script that patches ALL existing Firestore service_request
documents to ensure they have the canonical flat schema required after the
PostgreSQL → Firestore migration.

What it does:
  1. Fetches every document in the `service_requests` collection.
  2. For each doc that has `assigned_technician` (an int) but missing
     `assigned_technician_name`, looks up the technician and patches in:
       - assigned_technician_name
       - assigned_technician_phone_number
       - assigned_technician_zone
       - assigned_technician_latitude / longitude
  3. Ensures `location_text` is set (falls back to "lat, lon" string).
  4. Ensures `customer_id` mirrors `customer_user_id`.
  5. Adds default empty strings for all required fields that are None/missing.
  6. Sets `updated_at` timestamp.

Run once from project root:
    python scripts/backfill_service_requests.py

Safe to re-run — uses merge=True and only writes missing fields.
"""

import sys
import os

# Ensure project root is on the path so we can import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from database.firestore_client import _get_db, _doc_to_dict, get_technician_by_id, resolve_technician_phone

REQUIRED_STRING_FIELDS = [
    "customer_name",
    "customer_email",
    "contact_number",
    "fault_type",
    "severity",
    "status",
    "location_text",
    "description",
    "assigned_technician_name",
    "assigned_technician_phone_number",
    "assigned_technician_zone",
    "review_notes",
    "review_decision",
    "image_url",
    "ai_review_status",
    "final_severity",
]


def backfill():
    db = _get_db()
    coll = db.collection("service_requests")
    all_docs = list(coll.stream())
    print(f"[Backfill] Found {len(all_docs)} service_request documents")

    # Cache technicians to avoid repeated fetches
    tech_cache: dict = {}

    patched = 0
    skipped = 0

    for doc in all_docs:
        raw = doc.to_dict() or {}
        updates: dict = {}

        # 1. Ensure customer_id mirrors customer_user_id
        if raw.get("customer_id") is None and raw.get("customer_user_id") is not None:
            updates["customer_id"] = raw["customer_user_id"]
        elif raw.get("customer_user_id") is None and raw.get("customer_id") is not None:
            updates["customer_user_id"] = raw["customer_id"]

        # 2. Resolve technician denormalization
        tid = raw.get("assigned_technician")
        if tid is not None:
            tech_key = str(tid)
            if tech_key not in tech_cache:
                try:
                    tech_cache[tech_key] = get_technician_by_id(tid) or {}
                except Exception as e:
                    print(f"  [WARN] Could not fetch tech {tid}: {e}")
                    tech_cache[tech_key] = {}

            tech = tech_cache[tech_key]

            # Backfill name if missing
            if not raw.get("assigned_technician_name"):
                updates["assigned_technician_name"] = tech.get("name") or ""

            # Always backfill phone if empty (tech records may have lacked phone_number)
            if not raw.get("assigned_technician_phone_number"):
                updates["assigned_technician_phone_number"] = resolve_technician_phone(tech)

            # Backfill zone if missing
            if not raw.get("assigned_technician_zone"):
                updates["assigned_technician_zone"] = (
                    tech.get("location_zone") or tech.get("service_zone") or ""
                )
            if raw.get("assigned_technician_latitude") is None:
                if tech.get("current_latitude") is not None:
                    updates["assigned_technician_latitude"] = tech["current_latitude"]
                elif tech.get("latitude") is not None:
                    updates["assigned_technician_latitude"] = tech["latitude"]
            if raw.get("assigned_technician_longitude") is None:
                if tech.get("current_longitude") is not None:
                    updates["assigned_technician_longitude"] = tech["current_longitude"]
                elif tech.get("longitude") is not None:
                    updates["assigned_technician_longitude"] = tech["longitude"]

        # 3. Ensure assigned_at is set for assigned requests
        if tid is not None and not raw.get("assigned_at"):
            # Use created_at as best-effort fallback for the assignment timestamp
            updates["assigned_at"] = raw.get("created_at") or datetime.now(timezone.utc)

        # 5. Ensure location_text falls back to coordinate string
        if not raw.get("location_text"):
            lat = raw.get("latitude")
            lon = raw.get("longitude")
            if lat is not None and lon is not None:
                try:
                    updates["location_text"] = f"{round(float(lat), 6)}, {round(float(lon), 6)}"
                except Exception:
                    updates["location_text"] = ""

        # 6. Ensure image_url is set from evidence path
        if not raw.get("image_url") and raw.get("evidence_image_path"):
            updates["image_url"] = raw["evidence_image_path"]

        # 7. Default all required string fields if missing/None
        for field in REQUIRED_STRING_FIELDS:
            if raw.get(field) is None and field not in updates:
                updates[field] = ""

        # 8. Default status
        if not raw.get("status"):
            updates["status"] = "pending"

        # 9. Compute ai_review_status if missing
        if not raw.get("ai_review_status"):
            review_decision = raw.get("review_decision") or ""
            status_val = (raw.get("status") or "").lower()
            if review_decision == "rejected":
                updates["ai_review_status"] = "rejected_by_admin"
            elif review_decision in ("approved", "modify_approve"):
                updates["ai_review_status"] = "approved_by_admin"
            elif status_val == "pending_review":
                updates["ai_review_status"] = "pending_human_review"
            elif status_val in ("cancelled", "completed"):
                updates["ai_review_status"] = "closed"
            elif raw.get("requires_human_review"):
                updates["ai_review_status"] = "review_required"
            else:
                updates["ai_review_status"] = "auto_approved"

        # 10. Set updated_at
        updates["updated_at"] = datetime.now(timezone.utc)

        if updates:
            try:
                doc.reference.update(updates)
                patched += 1
                print(f"  [OK] Patched doc {doc.id}: {list(updates.keys())}")
            except Exception as e:
                print(f"  [ERROR] Failed to patch doc {doc.id}: {e}")
        else:
            skipped += 1

    print(f"\n[Backfill] Done. Patched={patched}, Skipped (already complete)={skipped}")


if __name__ == "__main__":
    backfill()
