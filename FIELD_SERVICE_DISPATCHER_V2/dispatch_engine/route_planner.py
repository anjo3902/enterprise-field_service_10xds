"""Lock-aware route planner for technician multi-job sequencing.

Route-locking rules (industry-standard dispatch):
  1. An in_progress job is always the LOCKED job — it sits first in the route
     and is never re-ordered by the optimizer.
  2. All other active (assigned) jobs are FLEXIBLE — the VRP optimizer arranges
     them from the technician's current live location.
  3. When a new job is dispatched it is inserted optimally into the flexible
     segment only — the locked job is never disturbed.
  4. On job completion the technician's current_latitude/longitude advances to
     the completed job's coordinates and flexible jobs are re-optimized.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import db_client
from dispatch_engine.geo_validation import (
    get_coordinates_from_zone,
    is_valid_kerala_coordinate,
)
from dispatch_engine.route_optimizer import optimize_route
from dispatch_engine.distance_engine import calculate_pairwise_distance_matrix


LOGGER = logging.getLogger(__name__)
MAX_ROUTE_DISTANCE_KM = float(os.getenv("MAX_ROUTE_DISTANCE_KM", "80"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_route_response(technician_id: int, error: str | None = None) -> dict:
    response = {
        "technician_id": technician_id,
        "total_jobs": 0,
        "route_order": [],
        "locked_job_id": None,
        "estimated_total_distance_km": 0.0,
        "technician_location": None,
    }
    if error:
        response["error"] = error
    return response


def _to_job_dict(row) -> dict[str, Any]:
    status = str(row.get("status") or "").strip().lower()
    # Keep lock semantics deterministic: in_progress is always treated as locked.
    is_locked = bool(row.get("is_locked", False)) or status == "in_progress"
    job_id = row.get("id")
    if job_id is None:
        raise ValueError("job id missing")
    return {
        "id": job_id,
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "status": status,
        "is_locked": is_locked,
        "sequence_order": row.get("sequence_order"),
    }


# ---------------------------------------------------------------------------
# Core: lock-aware route planning
# ---------------------------------------------------------------------------

def plan_technician_route(technician_id: int) -> dict:
    """
    Plan and return the optimized route for a technician's active jobs.

    Returns:
        {
            "technician_id": int,
            "total_jobs": int,
            "route_order": [job_id, ...],   # locked job first, then optimized flexible
            "locked_job_id": int | None,
            "estimated_total_distance_km": float,
            "technician_location": {"latitude": float, "longitude": float},
        }
    """
    try:
        # ── 1. Fetch technician location from Firestore ──────────────────
        tech = db_client.get_technician_by_id(technician_id)
        if not tech:
            return _empty_route_response(technician_id, error="Invalid technician")

        # Prefer live GPS; fall back to last-known base location.
        start_lat_raw = tech.get("current_latitude")
        start_lon_raw = tech.get("current_longitude")
        if start_lat_raw is None or start_lon_raw is None:
            start_lat_raw = tech.get("latitude")
            start_lon_raw = tech.get("longitude")

        if start_lat_raw is None or start_lon_raw is None:
            return _empty_route_response(
                technician_id,
                error="Technician coordinates are missing",
            )

        start_lat = float(start_lat_raw)
        start_lon = float(start_lon_raw)
        if not is_valid_kerala_coordinate(start_lat, start_lon):
            zone = tech.get("location_zone") or tech.get("service_zone") or tech.get("zone")
            corrected = get_coordinates_from_zone(zone)
            if corrected:
                start_lat, start_lon = corrected
            else:
                return _empty_route_response(
                    technician_id,
                    error="Technician coordinates are outside Kerala bounds",
                )

        technician_location = (start_lat, start_lon)

        # ── 2. Fetch active jobs from Firestore ───────────────────────────
        jobs = db_client.get_jobs_for_technician(technician_id) or []

        # ── 3. Separate locked vs flexible ────────────────────────────────
        all_valid_jobs = []
        for row in jobs:
            status = str(row.get("status") or "").strip().lower()
            if status not in {"assigned", "in_progress"}:
                continue
            if row.get("latitude") is None or row.get("longitude") is None:
                continue
            try:
                job_dict = _to_job_dict(row)
            except (TypeError, ValueError):
                continue
            if not is_valid_kerala_coordinate(job_dict.get("latitude"), job_dict.get("longitude")):
                LOGGER.warning(
                    "Route planner: using out-of-bounds coordinates for job=%s zone=%s",
                    job_dict.get("id"),
                    row.get("location_zone") or row.get("service_zone") or row.get("zone"),
                )
            all_valid_jobs.append(job_dict)

        locked_jobs  = [j for j in all_valid_jobs if j["is_locked"]]
        flexible_jobs = [j for j in all_valid_jobs if not j["is_locked"]]

        # Keep ordering deterministic when data quality is imperfect.
        locked_jobs.sort(key=lambda j: (
            0 if j["status"] == "in_progress" else 1,
            j["sequence_order"] if j["sequence_order"] is not None else float("inf"),
            j["id"],
        ))
        flexible_jobs.sort(key=lambda j: (
            j["sequence_order"] if j["sequence_order"] is not None else float("inf"),
            j["id"],
        ))

        locked_job_id = locked_jobs[0]["id"] if locked_jobs else None

        LOGGER.info(
            "Route planner: tech=%s locked=%s flexible=%d start=(%.4f,%.4f)",
            technician_id, locked_job_id, len(flexible_jobs), start_lat, start_lon,
        )

        if not all_valid_jobs:
            response = _empty_route_response(technician_id)
            response["technician_location"] = {"latitude": start_lat, "longitude": start_lon}
            return response

        # ── 4. Optimize flexible segment from current location ────────────
        if flexible_jobs:
            # Start of optimization:
            # • If a locked job exists, optimize from its location (technician is *at* it).
            # • Otherwise use current_latitude/longitude.
            if locked_jobs:
                opt_start = (locked_jobs[0]["latitude"], locked_jobs[0]["longitude"])
            else:
                opt_start = technician_location

            matrix_payload = calculate_pairwise_distance_matrix(
                [opt_start] + [(j["latitude"], j["longitude"]) for j in flexible_jobs]
            )
            if matrix_payload:
                route_result = optimize_route(
                    opt_start,
                    flexible_jobs,
                    distance_matrix_m=matrix_payload.get("distance_matrix_m"),
                    duration_matrix_min=matrix_payload.get("duration_matrix_min"),
                )
            else:
                route_result = optimize_route(opt_start, flexible_jobs)

            flex_order_ids = route_result.get("route_order", [])
            total_distance_km = float(route_result.get("total_distance_km", 0.0) or 0.0)
            total_travel_time_min = float(route_result.get("total_travel_time_min", 0.0) or 0.0)
        else:
            flex_order_ids = []
            total_distance_km = 0.0
            total_travel_time_min = 0.0

        # ── 5. Build final route: locked first, then optimized flexible ───
        locked_ids   = [j["id"] for j in locked_jobs]
        final_order  = locked_ids + [jid for jid in flex_order_ids if jid not in locked_ids]

        response = {
            "technician_id": int(technician_id),
            "total_jobs": len(all_valid_jobs),
            "route_order": final_order,
            "locked_job_id": locked_job_id,
            "estimated_total_distance_km": total_distance_km,
            "estimated_total_travel_time_min": total_travel_time_min,
            "technician_location": {
                "latitude": start_lat,
                "longitude": start_lon,
            },
        }

        if total_distance_km > MAX_ROUTE_DISTANCE_KM:
            response["route_constraint_violated"] = True
            LOGGER.warning(
                "ALERT: route_distance_limit_exceeded tech=%s distance_km=%.2f jobs=%d",
                technician_id,
                total_distance_km,
                len(all_valid_jobs),
            )

        LOGGER.info("Route planner result: tech=%s order=%s", technician_id, final_order)
        return response

    except Exception:
        LOGGER.exception("Route planner error: tech=%s", technician_id)
        raise


# ---------------------------------------------------------------------------
# Smart insertion: insert a new job into the flexible segment optimally
# ---------------------------------------------------------------------------

def insert_job_into_route(technician_id: int, new_job_id: int) -> dict:
    """
    Called after a new job is assigned to a technician who already has a route.
    Re-optimizes ONLY the flexible (non-locked) segment, inserting the new job
    at the cheapest position.

    Returns the updated route identical to plan_technician_route().
    """
    # Simply re-run full route planning; the optimizer will include the new job
    # in the flexible segment automatically (it queries the DB freshly).
    return plan_technician_route(technician_id)


if __name__ == "__main__":
    import logging as _logging
    _logging.basicConfig(level=_logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    route = plan_technician_route(413)
    print(route)