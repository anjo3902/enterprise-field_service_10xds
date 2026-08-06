#!/usr/bin/env python
"""
Backfill script: populate assigned_technician_zone in existing service_requests.

This ensures the Admin dashboard "Technician Source" column displays correctly
for all historical requests, not just new ones created after the denormalization fix.

Usage:
    python scripts/backfill_technician_zone.py
"""

import os
import sys
import logging

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.firestore_client import _get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(levelname)s — %(message)s",
)
LOGGER = logging.getLogger(__name__)


def run_backfill():
    """Backfill assigned_technician_zone for all service_requests missing it."""
    LOGGER.info("Starting backfill of assigned_technician_zone...")

    try:
        db = _get_db()

        # --- STEP 1: Print sample data for debugging ---
        print("\nSample service_requests:")
        for doc in db.collection("service_requests").limit(5).stream():
            print("  ", doc.id, doc.to_dict())
        print("\nSample technicians:")
        for doc in db.collection("technicians").limit(5).stream():
            print("  ", doc.id, doc.to_dict())

        # --- STEP 2: Robust backfill with query-based lookup ---
        LOGGER.info("Scanning service requests...")
        updated_count = 0
        scanned_count = 0
        skipped_count = 0
        failed_lookups = 0

        for doc in db.collection("service_requests").stream():
            scanned_count += 1
            try:
                data = doc.to_dict() or {}
                tech_id = data.get("assigned_technician")
                if not tech_id:
                    skipped_count += 1
                    continue
                if data.get("assigned_technician_zone"):
                    skipped_count += 1
                    continue

                tech = None
                # Try id field
                tech_docs = db.collection("technicians").where("id", "==", tech_id).limit(1).stream()
                for t in tech_docs:
                    tech = t.to_dict()
                # Fallback: try technician_id field
                if not tech:
                    tech_docs = db.collection("technicians").where("technician_id", "==", tech_id).limit(1).stream()
                    for t in tech_docs:
                        tech = t.to_dict()
                if not tech:
                    print(f"Technician not found for {tech_id} (request {doc.id})")
                    failed_lookups += 1
                    continue

                zone = tech.get("zone") or tech.get("location_zone") or tech.get("service_zone") or ""
                doc.reference.update({"assigned_technician_zone": zone})
                updated_count += 1
                if (updated_count % 50) == 0:
                    print(f"  ...updated {updated_count} documents")
            except Exception as e:
                failed_lookups += 1
                print(f"Error processing request {getattr(doc, 'id', '?')}: {e}")

        print(f"\nBackfill complete! Scanned: {scanned_count}, Updated: {updated_count}, Skipped: {skipped_count}, Failed lookups: {failed_lookups}")
        return {"scanned": scanned_count, "updated": updated_count, "skipped": skipped_count, "failed_lookups": failed_lookups}

    except Exception as e:
        print(f"Backfill failed: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    result = run_backfill()
    print("\n" + "=" * 60)
    print("BACKFILL RESULT:", result)
    print("=" * 60)
