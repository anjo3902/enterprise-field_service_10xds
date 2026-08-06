"""
dispatch_engine/reroute_service.py — Safe dynamic re-routing evaluator.

Non-intrusive layer that evaluates whether a critical/urgent request can
benefit from technician reassignment.  It reuses the existing dispatch
pipeline (skill_matcher, distance_engine, dispatch_optimizer) without
modifying their behaviour.

Safety rules:
  - NEVER override a technician who is handling an in_progress critical job.
  - NEVER remove an assignment without a confirmed replacement.
  - NEVER reroute the same request more than once.
  - ALWAYS require a >20 % distance improvement before acting.
  - ALWAYS mark reroute_checked = True after evaluation.
"""

from __future__ import annotations

import logging
import math
import os
from datetime import datetime

from database import db_client
from dispatch_engine.distance_engine import calculate_distance_matrix
from dispatch_engine.dispatch_optimizer import build_candidate_diagnostics, select_best_technician
from dispatch_engine.skill_matcher import get_eligible_technicians_with_fallback

LOGGER = logging.getLogger(__name__)

# Average speed assumption for travel-time estimates (km/h).
_AVG_SPEED_KMPH = 30.0

# Must beat current distance by at least this ratio to justify rerouting.
_IMPROVEMENT_THRESHOLD = 0.20  # 20 %


# ---------------------------------------------------------------------------
# Haversine (local copy — avoids circular import from dispatch_service)
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _tech_has_active_critical_job(tech_id: int, exclude_request_id: str | None = None) -> bool:
    """Return True if technician has an in_progress critical job right now."""
    jobs = db_client.get_jobs_for_technician(tech_id) or []
    for j in jobs:
        if str(j.get("id")) == str(exclude_request_id):
            continue
        if (
            str(j.get("status", "")).lower() == "in_progress"
            and str(j.get("severity", "")).lower() == "critical"
        ):
            return True
    return False


def _current_tech_distance(request: dict, tech: dict) -> float | None:
    """Haversine distance between current technician and the job."""
    job_lat = request.get("latitude")
    job_lon = request.get("longitude")
    tech_lat = tech.get("current_latitude") or tech.get("latitude")
    tech_lon = tech.get("current_longitude") or tech.get("longitude")
    try:
        return _haversine_km(float(tech_lat), float(tech_lon), float(job_lat), float(job_lon))
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Core evaluation
# ---------------------------------------------------------------------------

def evaluate_reroute(request: dict, *, force_reassignment: bool = False) -> dict:
    """Evaluate whether *request* would benefit from technician reassignment.

    Returns a summary dict with the decision taken::

        {
            "request_id": str,
            "action": "rerouted" | "skipped" | "assigned",
            "reason": str,
            ...
        }
    """
    request_id = str(request.get("id", ""))
    severity = str(request.get("severity", "")).lower()
    job_lat = request.get("latitude")
    job_lon = request.get("longitude")
    fault_type = request.get("fault_type", "")
    current_tech_id = request.get("assigned_technician")

    print(f"[REROUTE] Triggered for request {request_id}")

    # Always mark as checked so we don't re-process endlessly.
    def _mark_checked(extra: dict | None = None):
        updates = {"reroute_checked": True, "updated_at": datetime.utcnow()}
        if extra:
            updates.update(extra)
        try:
            db_client.update_service_request(request_id, updates)
        except Exception as exc:
            LOGGER.warning("Failed to mark reroute_checked for %s: %s", request_id, exc)

    # ── Guard: coordinates required ───────────────────────────────────────
    if job_lat is None or job_lon is None:
        print(f"[REROUTE] Skipped (no coordinates) for request {request_id}")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "missing coordinates"}

    # ── Find best candidate via existing pipeline ─────────────────────────
    technicians, tier = get_eligible_technicians_with_fallback(fault_type, severity)
    if not technicians:
        print(f"[REROUTE] Skipped (no eligible technicians) for request {request_id}")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "no eligible technicians"}

    max_distance_km_override = None
    if force_reassignment:
        try:
            max_distance_km_override = float(os.getenv("REASSIGNMENT_MAX_DISTANCE_KM", "250"))
        except (TypeError, ValueError):
            max_distance_km_override = 250.0

    # If this is a manual reassignment, exclude the current technician
    if force_reassignment and current_tech_id is not None:
        technicians = [t for t in technicians if str(t.get("id")) != str(current_tech_id)]
        if not technicians:
            print(f"[REROUTE] Skipped (no alternate technicians) for request {request_id}")
            _mark_checked()
            return {"request_id": request_id, "action": "skipped", "reason": "no alternate technician"}

    distance_data = calculate_distance_matrix(technicians, float(job_lat), float(job_lon))
    if not distance_data:
        # Haversine fallback
        distance_data = [
            {
                "technician_id": int(t["id"]),
                "distance_km": round(_haversine_km(
                    float(t.get("current_latitude") or t.get("latitude", 0)),
                    float(t.get("current_longitude") or t.get("longitude", 0)),
                    float(job_lat), float(job_lon),
                ), 2),
                "duration_min": round(_haversine_km(
                    float(t.get("current_latitude") or t.get("latitude", 0)),
                    float(t.get("current_longitude") or t.get("longitude", 0)),
                    float(job_lat), float(job_lon),
                ) / 30.0 * 60.0, 2),
            }
            for t in technicians if t.get("id") is not None
        ]

    if str(os.getenv("REROUTE_DEBUG", "")).strip().lower() in {"1", "true", "yes"}:
        diagnostics = build_candidate_diagnostics(
            distance_data,
            technicians,
            severity,
            job_zone=request.get("location_zone"),
            priority=request.get("review_priority") or severity,
            max_distance_km=max_distance_km_override,
        )
        print(f"[REROUTE_DEBUG] max_distance_km={diagnostics.get('max_distance_km')}")
        for candidate in diagnostics.get("candidates", []):
            print(
                "[REROUTE_DEBUG] candidate",
                candidate.get("technician_id"),
                candidate.get("technician_name"),
                "distance_km=", candidate.get("distance_km"),
                "duration_min=", candidate.get("duration_min"),
                "score=", candidate.get("optimization_score"),
                "workload=", candidate.get("workload_ratio"),
                "zone_match=", candidate.get("zone_match"),
                "priority_rank=", candidate.get("priority_rank"),
                "availability=", candidate.get("availability_state"),
                "experience=", candidate.get("experience_level"),
            )
        for rejected in diagnostics.get("rejected", []):
            print(
                "[REROUTE_DEBUG] rejected",
                rejected.get("technician_id"),
                rejected.get("technician_name"),
                "reason=", rejected.get("rejection_reason") or rejected.get("reason"),
                "distance_km=", rejected.get("distance_km"),
            )

    best = select_best_technician(
        distance_data,
        technicians,
        severity,
        job_zone=request.get("location_zone"),
        priority=request.get("review_priority") or severity,
        max_distance_km=max_distance_km_override,
    )
    if not best:
        print(f"[REROUTE] Skipped (optimizer returned no candidate) for request {request_id}")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "no candidate selected"}

    new_tech_id = best["technician_id"]
    new_distance = best["distance_km"]

    # ── Case A: no current technician — assign directly ───────────────────
    if not current_tech_id:
        new_tech = db_client.get_technician_by_id(new_tech_id) or {}
        _mark_checked({
            "assigned_technician": new_tech_id,
            "assigned_technician_name": new_tech.get("name", ""),
            "assigned_technician_phone": new_tech.get("phone_number") or new_tech.get("phone", ""),
            "assigned_technician_zone": new_tech.get("zone") or new_tech.get("location_zone", ""),
            "distance_km": new_distance,
            "travel_time_min": best.get("duration_min"),
            "status": "assigned",
            "rerouted": False,
        })
        print(f"[REROUTE] Assigned Tech {new_tech_id} to unassigned request {request_id}")
        return {"request_id": request_id, "action": "assigned", "new_technician": new_tech_id}

    # ── Case B: compare with current assignment ───────────────────────────
    current_tech_id = int(current_tech_id)
    if new_tech_id == current_tech_id:
        print(f"[REROUTE] Skipped (best is already assigned) for request {request_id}")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "same technician"}

    # Safety: never pull a tech off an active critical job
    if _tech_has_active_critical_job(new_tech_id, exclude_request_id=request_id):
        print(f"[REROUTE] Skipped (new tech {new_tech_id} has active critical job)")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "new tech busy with critical"}

    # Compute current distance
    current_tech = db_client.get_technician_by_id(current_tech_id) or {}
    current_distance = _current_tech_distance(request, current_tech)
    if current_distance is None:
        print(f"[REROUTE] Skipped (cannot compute current distance) for request {request_id}")
        _mark_checked()
        return {"request_id": request_id, "action": "skipped", "reason": "current distance unknown"}

    improvement_ratio = (current_distance - new_distance) / current_distance if current_distance > 0 else 0.0

    if not force_reassignment and improvement_ratio <= _IMPROVEMENT_THRESHOLD:
        print(
            f"[REROUTE] Skipped (no improvement) for request {request_id}: "
            f"current={current_distance:.1f}km, new={new_distance:.1f}km, "
            f"improvement={improvement_ratio:.1%}"
        )
        _mark_checked()
        return {
            "request_id": request_id, "action": "skipped",
            "reason": f"improvement {improvement_ratio:.1%} below threshold {_IMPROVEMENT_THRESHOLD:.0%}",
        }

    # ── All checks passed — reroute ──────────────────────────────────────
    new_tech = db_client.get_technician_by_id(new_tech_id) or {}
    _mark_checked({
        "rerouted": True,
        "previous_technician": current_tech_id,
        "assigned_technician": new_tech_id,
        "assigned_technician_name": new_tech.get("name", ""),
        "assigned_technician_phone": new_tech.get("phone_number") or new_tech.get("phone", ""),
        "assigned_technician_zone": new_tech.get("zone") or new_tech.get("location_zone", ""),
        "distance_km": new_distance,
        "travel_time_min": best.get("duration_min"),
    })

    # Sync job counters for both technicians
    try:
        db_client.sync_technician_job_counters_firestore(current_tech_id)
        db_client.sync_technician_job_counters_firestore(new_tech_id)
    except Exception:
        LOGGER.exception("Counter sync after reroute failed")

    print(
        f"[REROUTE] Old Tech: {current_tech_id} → New Tech: {new_tech_id} "
        f"for request {request_id} "
        f"(distance {current_distance:.1f}km → {new_distance:.1f}km, "
        f"improvement {improvement_ratio:.1%})"
    )
    return {
        "request_id": request_id,
        "action": "rerouted",
        "old_technician": current_tech_id,
        "new_technician": new_tech_id,
        "old_distance_km": round(current_distance, 2),
        "new_distance_km": round(new_distance, 2),
        "improvement": round(improvement_ratio, 4),
    }


# ---------------------------------------------------------------------------
# DVRP route application (called by priority_monitor after a global solve)
# ---------------------------------------------------------------------------

def apply_dvrp_routes(dvrp_result: dict) -> int:
    """Persist DVRP-optimized routes to Firestore.

    For each technician whose route was updated:
      - Each request is assigned (or reassigned) to that technician.
      - A ``route_sequence`` array and ``optimized: True`` flag are written
        to every affected request document.
      - ``reroute_checked`` is set to ``True``.

    Returns the number of request documents updated.
    """
    from dispatch_engine.route_state_manager import record_reroute, can_reroute_request

    routes = dvrp_result.get("routes") or {}
    updated = 0

    for tech_id, route_info in routes.items():
        tech_id = int(tech_id)
        sequence: list[dict] = route_info.get("sequence") or []
        if not sequence:
            continue

        tech = db_client.get_technician_by_id(tech_id) or {}
        route_ids = [str(r.get("id", "")) for r in sequence]

        for position, req in enumerate(sequence):
            request_id = str(req.get("id", ""))
            if not request_id:
                continue

            previous_tech = req.get("assigned_technician")
            is_reroute = previous_tech is not None and int(previous_tech) != tech_id

            # Safety: skip if this request was already at its reroute limit
            if is_reroute and not can_reroute_request(request_id):
                continue

            updates: dict = {
                "reroute_checked": True,
                "optimized": True,
                "route_sequence": route_ids,
                "route_position": position,
                "updated_at": datetime.utcnow(),
            }

            if is_reroute or req.get("assigned_technician") is None:
                updates.update({
                    "assigned_technician": tech_id,
                    "assigned_technician_name": tech.get("name", ""),
                    "assigned_technician_phone": (
                        tech.get("phone_number") or tech.get("phone", "")
                    ),
                    "assigned_technician_zone": (
                        tech.get("zone") or tech.get("location_zone", "")
                    ),
                    "status": "assigned",
                })
                if is_reroute:
                    updates["rerouted"] = True
                    updates["previous_technician"] = int(previous_tech)
                    record_reroute(request_id)

                # Estimate distance from technician to this job
                try:
                    dist = _haversine_km(
                        float(tech.get("current_latitude") or tech.get("latitude", 0)),
                        float(tech.get("current_longitude") or tech.get("longitude", 0)),
                        float(req.get("latitude", 0)),
                        float(req.get("longitude", 0)),
                    )
                    updates["distance_km"] = round(dist, 2)
                    updates["travel_time_min"] = round(dist / _AVG_SPEED_KMPH * 60.0, 2)
                except (TypeError, ValueError):
                    pass

            try:
                db_client.update_service_request(request_id, updates)
                updated += 1
            except Exception:
                LOGGER.exception("[DVRP] Failed to update request %s", request_id)

        # Sync job counters for the technician after route changes.
        try:
            db_client.sync_technician_job_counters_firestore(tech_id)
        except Exception:
            LOGGER.exception("[DVRP] Counter sync failed for tech %s", tech_id)

    print(f"[DVRP] Routes updated — {updated} request(s) persisted to Firestore")
    return updated