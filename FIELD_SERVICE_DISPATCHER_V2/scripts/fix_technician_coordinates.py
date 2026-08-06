#!/usr/bin/env python
"""
Fix technician coordinates that do not match their Kerala location_zone.

Usage:
    python scripts/fix_technician_coordinates.py
"""

import logging
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import db_client
from dispatch_engine.geo_validation import (
    get_coordinates_from_zone,
    is_valid_kerala_coordinate,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
LOGGER = logging.getLogger(__name__)


def _coerce_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def fix_technician_coordinates():
    technicians = db_client.get_technicians() or []
    scanned = 0
    fixed = 0
    skipped = 0
    failed = 0

    for tech in technicians:
        scanned += 1
        tech_id = tech.get("id")
        zone = tech.get("location_zone") or tech.get("service_zone") or tech.get("zone")

        base_lat = _coerce_float(tech.get("latitude"))
        base_lng = _coerce_float(tech.get("longitude"))
        current_lat = _coerce_float(tech.get("current_latitude"))
        current_lng = _coerce_float(tech.get("current_longitude"))

        base_valid = is_valid_kerala_coordinate(base_lat, base_lng)
        current_valid = is_valid_kerala_coordinate(current_lat, current_lng)

        if base_valid and current_valid:
            skipped += 1
            continue

        corrected = get_coordinates_from_zone(zone)
        if not corrected:
            failed += 1
            LOGGER.warning(
                "SKIP: Technician %s has invalid coords and no zone mapping (zone=%s)",
                tech_id,
                zone,
            )
            continue

        new_lat, new_lng = corrected
        updates = {}
        if not base_valid:
            updates["latitude"] = new_lat
            updates["longitude"] = new_lng
        if not current_valid:
            updates["current_latitude"] = new_lat
            updates["current_longitude"] = new_lng

        if not updates:
            skipped += 1
            continue

        try:
            db_client.update_technician(tech_id, updates)
            fixed += 1
            LOGGER.info(
                "FIXED: Technician %s moved from %s,%s to %s (%s,%s)",
                tech_id,
                base_lat,
                base_lng,
                zone,
                new_lat,
                new_lng,
            )
        except Exception as exc:
            failed += 1
            LOGGER.exception("FAILED: Technician %s update failed: %s", tech_id, exc)

    return {
        "scanned": scanned,
        "fixed": fixed,
        "skipped": skipped,
        "failed": failed,
    }


if __name__ == "__main__":
    result = fix_technician_coordinates()
    LOGGER.info("SUMMARY: %s", result)
