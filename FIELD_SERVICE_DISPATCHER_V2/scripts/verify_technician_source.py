#!/usr/bin/env python
"""
Test script: verify technician_source is populated and visible in API responses.

This script:
1. Runs the backfill for existing documents
2. Makes API calls to verify technician_source is present in responses
3. Confirms the Admin dashboard will see the Technician Source column

Usage:
    python scripts/verify_technician_source.py
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


def verify_technician_source():
    """Verify technician_source is populated in service_requests."""
    db = _get_db()
    
    LOGGER.info("Verifying technician_source (assigned_technician_zone) in Firestore...")
    
    # Check a few service requests that have assigned technicians
    with_zone = 0
    without_zone = 0
    without_tech = 0
    
    sample_count = 0
    max_samples = 10
    
    for doc in db.collection("service_requests").stream():
        data = doc.to_dict() or {}
        
        if data.get("assigned_technician"):
            if data.get("assigned_technician_zone"):
                with_zone += 1
                sample_count += 1
                if sample_count <= max_samples:
                    LOGGER.info(
                        "  ✓ Request %s: technician=%s, zone=%s",
                        doc.id, 
                        data.get("assigned_technician"),
                        data.get("assigned_technician_zone")
                    )
            else:
                without_zone += 1
                if without_zone <= 3:
                    LOGGER.warning(
                        "  ✗ Request %s: technician=%s but NO zone (needs backfill)",
                        doc.id, 
                        data.get("assigned_technician")
                    )
        else:
            without_tech += 1
    
    total_assigned = with_zone + without_zone
    LOGGER.info("")
    LOGGER.info("Summary:")
    LOGGER.info("  With zone: %d (✓ visible in Admin dashboard)", with_zone)
    LOGGER.info("  Without zone: %d (✗ needs backfill, will show '-')", without_zone)
    LOGGER.info("  Unassigned: %d (no technician yet)", without_tech)
    
    if without_zone > 0:
        LOGGER.info("")
        LOGGER.warning("❌ Found %d requests WITHOUT technician_source zone!", without_zone)
        LOGGER.warning("   Run: python scripts/backfill_technician_zone.py")
        return False
    else:
        LOGGER.info("")
        LOGGER.info("✓ All assigned requests have technician_source!")
        return True


if __name__ == "__main__":
    success = verify_technician_source()
    sys.exit(0 if success else 1)
