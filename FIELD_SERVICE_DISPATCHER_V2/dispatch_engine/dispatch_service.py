"""
dispatch_service.py — Technician assignment orchestration.

Dispatch pipeline (in order):
  1. Sync live job counters from DB truth
  2. Multi-tier eligible technician search (exact → relaxed → domain-any)
  3. Haversine pre-filter: drop technicians beyond MAX_DISTANCE_KM[severity]
     before hitting the Google Maps Distance Matrix API
  4. Google Maps distance + duration (batched, up to 25 origins per request)
  5. OR-Tools MIP optimizer: weighted score (distance + duration + workload)
  6. Daily job limit guard
  7. Insert service request into DB
  8. Route-aware re-sequencing: call insert_job_into_route() to keep locked
     job first and re-optimize the flexible segment with the new job
  9. Sync counters for the selected technician

Route-locking contract (never broken):
  - An in_progress job is always locked and always leads the route.
  - Only the flexible (non-locked) segment is re-optimized on every assignment.
"""

from __future__ import annotations

import logging
import math
import os
import threading
import time
from datetime import datetime

from database import db_client
from dispatch_engine.skill_matcher import get_eligible_technicians, get_eligible_technicians_with_fallback
from dispatch_engine.distance_engine import calculate_distance_matrix, get_distance
from dispatch_engine.dispatch_optimizer import build_candidate_records, select_best_technician
from dispatch_engine.service_zones import SERVICE_ZONES
from ortools.linear_solver import pywraplp

try:
    from database.postgres_client import engine as postgres_engine
    from sqlalchemy import text as sql_text
except Exception:
    postgres_engine = None
    sql_text = None

LOGGER = logging.getLogger(__name__)


def _notify_telegram_assignment(request_id: int | str, job_data: dict, technician: dict | None) -> None:
    try:
        from backend.bot.services.telegram_service import schedule_assignment_notification
    except Exception as exc:
        LOGGER.debug("Telegram integration unavailable: %s", exc)
        return

    if not technician:
        return

    payload = dict(job_data)
    payload["id"] = str(request_id)
    try:
        schedule_assignment_notification(payload, technician)
    except Exception:
        LOGGER.exception("Failed to schedule Telegram notification for job=%s", request_id)


# ---------------------------------------------------------------------------
# Haversine pre-filter constants
# ---------------------------------------------------------------------------

# Severity → max km a technician may be from the job.
# Values are intentionally wider than dispatch_optimizer caps so the MIP
# optimizer still has a meaningful candidate pool, while saving Google API
# quota by dropping obviously-too-far technicians first.
_PRE_FILTER_MAX_KM: dict[str, float] = {
    "low": 120.0,
    "medium": 100.0,
    "high": 60.0,
    "critical": 40.0,
}
_DEFAULT_PRE_FILTER_KM = 100.0
_ZONE_FALLBACK_MAX_KM = float(os.getenv("ZONE_FALLBACK_MAX_KM", "50"))
_CLUSTER_RADIUS_KM = float(os.getenv("CLUSTER_RADIUS_KM", "20"))
_CLUSTER_CHECK_MAX_CANDIDATES = int(os.getenv("CLUSTER_CHECK_MAX_CANDIDATES", "30"))

DISPATCH_QUEUE_ENABLED = str(os.getenv("DISPATCH_QUEUE_ENABLED", "false")).strip().lower() == "true"
DISPATCH_QUEUE_INTERVAL_SEC = max(1, int(os.getenv("DISPATCH_QUEUE_INTERVAL_SEC", "10")))
DISPATCH_QUEUE_BATCH_SIZE = max(1, int(os.getenv("DISPATCH_QUEUE_BATCH_SIZE", "20")))
DISPATCH_QUEUE_MAX_ATTEMPTS = max(1, int(os.getenv("DISPATCH_QUEUE_MAX_ATTEMPTS", "3")))
DISPATCH_QUEUE_BYPASS_SEVERITIES = {
    s.strip().lower()
    for s in str(os.getenv("DISPATCH_QUEUE_BYPASS_SEVERITIES", "critical")).split(",")
    if s.strip()
}
DISPATCH_AUDIT_LOG_ENABLED = str(os.getenv("DISPATCH_AUDIT_LOG_ENABLED", "true")).strip().lower() == "true"

_ROUTE_SPLIT_COOLDOWN_SEC = max(30, int(os.getenv("ROUTE_SPLIT_COOLDOWN_SEC", "300")))
_MAX_ROUTE_DISTANCE_KM = float(os.getenv("MAX_ROUTE_DISTANCE_KM", "80"))

_ROUTE_SPLIT_LOCK = threading.Lock()
_LAST_ROUTE_SPLIT_TS: dict[int, float] = {}

_QUEUE_WORKER_LOCK = threading.Lock()
_QUEUE_WORKER_RUNNING = False

_SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Geodesic distance between two points in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_duration_min(distance_km: float) -> float:
    speed_kmh = 25.0 if distance_km <= 25.0 else 50.0
    return round((distance_km / speed_kmh) * 60.0, 2)


def _resolve_technician_coords(tech: dict) -> tuple[float | None, float | None]:
    lat = tech.get("current_latitude") or tech.get("latitude")
    lon = tech.get("current_longitude") or tech.get("longitude")
    try:
        return float(lat), float(lon)
    except (TypeError, ValueError):
        return None, None


def _pre_filter_by_distance(
    technicians: list[dict],
    job_lat: float,
    job_lon: float,
    severity: str,
) -> list[dict]:
    """
    Drop technicians beyond the Haversine pre-filter threshold.

    Uses the technician's live coordinates (current_latitude favoured over
    base latitude) to avoid API quota waste on unreachable candidates.
    Returns at least the closest 5 candidates so the optimizer always has
    a meaningful pool even in sparse coverage areas.
    """
    max_km = _PRE_FILTER_MAX_KM.get((severity or "medium").strip().lower(), _DEFAULT_PRE_FILTER_KM)
    filtered = []
    over_limit = []

    for tech in technicians:
        lat = tech.get("latitude")
        lon = tech.get("longitude")
        if lat is None or lon is None:
            continue
        try:
            dist = _haversine_km(float(lat), float(lon), job_lat, job_lon)
        except (TypeError, ValueError):
            continue
        tech = {**tech, "_haversine_km": round(dist, 2)}
        if dist <= max_km:
            filtered.append(tech)
        else:
            over_limit.append(tech)

    if filtered:
        LOGGER.info(
            "Haversine pre-filter: %d within %.0f km, %d dropped",
            len(filtered), max_km, len(over_limit),
        )
        return filtered

    # Fallback: no one is within the radius → return nearest 5 globally
    # so the MIP optimizer has at least one candidate.
    over_limit.sort(key=lambda t: t.get("_haversine_km", 9999))
    nearest = over_limit[:5]
    LOGGER.warning(
        "Haversine pre-filter: no technician within %.0f km — using %d nearest globally",
        max_km, len(nearest),
    )
    return nearest


# ---------------------------------------------------------------------------
# Zone helpers
# ---------------------------------------------------------------------------

def _nearest_service_zone(lat: float, lon: float) -> str:
    best_zone = None
    best_score = None
    for zone, (zone_lat, zone_lon) in SERVICE_ZONES.items():
        score = (float(lat) - float(zone_lat)) ** 2 + (float(lon) - float(zone_lon)) ** 2
        if best_score is None or score < best_score:
            best_score = score
            best_zone = zone
    return best_zone  # type: ignore[return-value]


def _normalize_zone(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _apply_zone_constraint(
    technicians: list[dict],
    job_zone: str | None,
    job_lat: float,
    job_lon: float,
) -> tuple[list[dict], str, bool]:
    if not job_zone:
        return technicians, "zone_unknown", False

    normalized_zone = _normalize_zone(job_zone)
    same_zone = [
        t for t in technicians
        if _normalize_zone(t.get("location_zone") or t.get("service_zone") or t.get("zone")) == normalized_zone
    ]
    if same_zone:
        return same_zone, "zone_match", False

    nearby = []
    for t in technicians:
        lat = t.get("latitude")
        lon = t.get("longitude")
        if lat is None or lon is None:
            continue
        try:
            dist = _haversine_km(float(lat), float(lon), job_lat, job_lon)
        except (TypeError, ValueError):
            continue
        if dist <= _ZONE_FALLBACK_MAX_KM:
            nearby.append(t)
    if nearby:
        return nearby, "distance_fallback", False

    return technicians, "cross_zone", True


def _record_dispatch_audit(
    technician_id: int | str,
    job_id: int | str,
    distance_km: float | None,
    zone_match: bool | None,
    score: float | None,
    extra: dict | None = None,
) -> None:
    if not DISPATCH_AUDIT_LOG_ENABLED:
        return
    payload = {
        "technician_id": int(technician_id),
        "job_id": str(job_id),
        "distance": float(distance_km) if distance_km is not None else None,
        "zone_match": zone_match,
        "score": float(score) if score is not None else None,
        "timestamp": datetime.utcnow(),
    }
    if extra:
        payload.update(extra)
    try:
        if hasattr(db_client, "create_dispatch_audit_log"):
            db_client.create_dispatch_audit_log(payload)
        else:
            db_client.save_dispatch_result(payload)
    except Exception:
        LOGGER.exception("Failed to persist dispatch audit log for job=%s", job_id)


def _mirror_assignment_to_postgres(request_id: int | str, updates: dict) -> None:
    if postgres_engine is None or sql_text is None:
        return

    payload = {
        "assigned_technician": updates.get("assigned_technician"),
        "distance_km": updates.get("distance_km"),
        "travel_time_min": updates.get("travel_time_min"),
        "status": updates.get("status"),
        "assigned_at": updates.get("assigned_at") or datetime.utcnow(),
    }

    try:
        with postgres_engine.begin() as conn:
            result = conn.execute(
                sql_text(
                    """
                    UPDATE service_requests
                    SET assigned_technician = :assigned_technician,
                        distance_km = :distance_km,
                        travel_time_min = :travel_time_min,
                        status = :status,
                        assigned_at = :assigned_at
                    WHERE id = :request_id
                    """
                ),
                {**payload, "request_id": request_id},
            )
            if result.rowcount == 0:
                conn.execute(
                    sql_text(
                        """
                        INSERT INTO service_requests (
                            id, assigned_technician, distance_km, travel_time_min, status,
                            assigned_at
                        ) VALUES (
                            :request_id, :assigned_technician, :distance_km, :travel_time_min, :status,
                            :assigned_at
                        )
                        """
                    ),
                    {**payload, "request_id": request_id},
                )
    except Exception:
        LOGGER.exception("Failed to mirror assignment to PostgreSQL for request=%s", request_id)


def _cluster_filter_by_active_jobs(
    technicians: list[dict],
    job_lat: float,
    job_lon: float,
) -> list[dict]:
    filtered: list[dict] = []
    for tech in technicians[:_CLUSTER_CHECK_MAX_CANDIDATES]:
        tech_id = tech.get("id")
        if tech_id is None:
            filtered.append(tech)
            continue
        jobs = db_client.get_jobs_for_technician(tech_id) or []
        active = [
            j for j in jobs
            if str(j.get("status") or "").lower() in {"assigned", "in_progress"}
            and j.get("latitude") is not None
            and j.get("longitude") is not None
        ]
        if not active:
            filtered.append(tech)
            continue

        lat_sum = 0.0
        lon_sum = 0.0
        count = 0
        for job in active:
            try:
                lat_sum += float(job.get("latitude"))
                lon_sum += float(job.get("longitude"))
                count += 1
            except (TypeError, ValueError):
                continue
        if count == 0:
            filtered.append(tech)
            continue

        center_lat = lat_sum / count
        center_lon = lon_sum / count
        dist = _haversine_km(center_lat, center_lon, job_lat, job_lon)
        if dist <= _CLUSTER_RADIUS_KM:
            filtered.append(tech)

    return filtered


# ---------------------------------------------------------------------------
# Job counter sync
# ---------------------------------------------------------------------------

def sync_technician_job_counters(technician_id: int | None = None) -> None:
    """
    Keep technicians.current_jobs/workload aligned with active assigned jobs.
    Source of truth: service_requests with status in ('assigned', 'in_progress').
    """
    # Delegate to Firestore-backed sync implementation (single source of truth)
    try:
        db_client.sync_technician_job_counters_firestore(technician_id)
    except Exception:
        # Best-effort fallback: log and continue
        LOGGER.exception("Failed to sync technician job counters via Firestore")


def _should_queue_dispatch(severity: str | None) -> bool:
    if not DISPATCH_QUEUE_ENABLED:
        return False
    sev = (severity or "medium").strip().lower()
    return sev not in DISPATCH_QUEUE_BYPASS_SEVERITIES


def _queue_dispatch_request(doc_data: dict) -> dict:
    doc_data = {**doc_data}
    doc_data.update({
        "assigned_technician": None,
        "distance_km": None,
        "travel_time_min": None,
        "status": "queued",
        "queued_at": datetime.utcnow(),
        "queue_status": "pending",
    })

    request_id = db_client.create_service_request(doc_data)
    queue_payload = {
        "request_id": request_id,
        "status": "pending",
        "attempts": 0,
        "severity": doc_data.get("severity"),
        "fault_type": doc_data.get("fault_type"),
        "location_zone": doc_data.get("location_zone"),
        "queued_at": datetime.utcnow(),
    }
    queue_id = None
    if hasattr(db_client, "create_dispatch_queue_item"):
        try:
            queue_id = db_client.create_dispatch_queue_item(queue_payload)
        except Exception:
            LOGGER.exception("Failed to enqueue dispatch request %s", request_id)

    return {
        "request_id": request_id,
        "status": "queued",
        "queue_id": queue_id,
        "queued": True,
    }


def _remaining_capacity(tech: dict) -> int:
    max_jobs = int(tech.get("max_jobs_per_day") or 0)
    if max_jobs <= 0:
        max_jobs = 8
    current_jobs = int(tech.get("current_jobs") or 0)
    return max(max_jobs - current_jobs, 0)


def _build_distance_data_for_job(job: dict, technicians: list[dict]) -> list[dict]:
    job_lat = job.get("latitude")
    job_lon = job.get("longitude")
    if job_lat is None or job_lon is None:
        return []

    distance_data = []
    for tech in technicians:
        tech_id = tech.get("id")
        if tech_id is None:
            continue
        lat, lon = _resolve_technician_coords(tech)
        if lat is None or lon is None:
            continue
        dist = _haversine_km(float(lat), float(lon), float(job_lat), float(job_lon))
        distance_data.append({
            "technician_id": int(tech_id),
            "distance_km": round(dist, 2),
            "duration_min": _estimate_duration_min(dist),
        })
    return distance_data


def _fallback_best_technician(
    distance_data: list[dict],
    technicians: list[dict],
) -> dict | None:
    if not distance_data:
        return None

    tech_by_id = {int(t["id"]): t for t in technicians if t.get("id") is not None}
    candidates = [row for row in distance_data if int(row.get("technician_id") or 0) in tech_by_id]
    if not candidates:
        return None

    def _score(row: dict) -> tuple[float, float, float, int]:
        tech = tech_by_id[int(row["technician_id"])]
        workload_ratio = 0.0
        try:
            max_jobs = float(tech.get("max_jobs_per_day") or 0) or 8.0
            workload_ratio = float(tech.get("current_jobs") or 0) / max_jobs
        except Exception:
            workload_ratio = 0.0
        return (
            float(row.get("distance_km") or 0.0),
            float(row.get("duration_min") or 0.0),
            workload_ratio,
            int(row["technician_id"]),
        )

    best = sorted(candidates, key=_score)[0]
    return {
        "technician_id": int(best["technician_id"]),
        "distance_km": float(best.get("distance_km") or 0.0),
        "duration_min": float(best.get("duration_min") or 0.0),
        "optimization_score": float(best.get("distance_km") or 0.0) + float(best.get("duration_min") or 0.0),
        "zone_match": None,
        "score_components": {
            "distance": float(best.get("distance_km") or 0.0),
            "duration": float(best.get("duration_min") or 0.0),
            "workload": 0.0,
            "priority": 0.0,
            "zone": 0.0,
            "balance": 0.0,
        },
    }


def _batch_assign_jobs(jobs: list[dict]) -> tuple[dict[str, dict], list[dict]]:
    """
    Return assignments and unassigned jobs.
    Assignments shape: {job_id: {"technician_id": int, ...score fields...}}
    """
    if not jobs:
        return {}, []

    eligible_by_job: dict[str, list[dict]] = {}
    tech_union: dict[int, dict] = {}
    for job in jobs:
        fault_type = job.get("fault_type")
        severity = job.get("severity") or "medium"
        techs, _tier = get_eligible_technicians_with_fallback(fault_type, severity)
        job_id = str(job.get("id"))
        eligible_by_job[job_id] = techs
        for tech in techs:
            tech_id = tech.get("id")
            if tech_id is None:
                continue
            tech_union[int(tech_id)] = tech

    assignments: dict[str, dict] = {}
    unassigned: list[dict] = []
    candidate_map: dict[str, list[dict]] = {}
    remaining_capacity = {tid: _remaining_capacity(tech) for tid, tech in tech_union.items()}

    for job in jobs:
        job_id = str(job.get("id"))
        techs = eligible_by_job.get(job_id) or []
        techs = [t for t in techs if remaining_capacity.get(int(t.get("id")), 0) > 0]

        distance_data = _build_distance_data_for_job(job, techs)
        candidates = build_candidate_records(
            distance_data,
            techs,
            str(job.get("severity") or "medium"),
            job_zone=job.get("location_zone"),
            priority=job.get("review_priority"),
        )

        if not candidates:
            unassigned.append(job)
            continue

        candidate_map[job_id] = candidates

    if not candidate_map:
        return {}, unassigned

    solver = pywraplp.Solver.CreateSolver("CBC_MIXED_INTEGER_PROGRAMMING")
    if solver is None:
        LOGGER.warning("Batch assignment solver unavailable, using greedy dispatch")
        for job_id, candidates in candidate_map.items():
            best = sorted(candidates, key=lambda c: c.get("optimization_score", 0.0))[0]
            assignments[job_id] = best
        return assignments, unassigned

    decision_vars: dict[tuple[str, int], pywraplp.Variable] = {}
    for job_id, candidates in candidate_map.items():
        for cand in candidates:
            tech_id = int(cand["technician_id"])
            decision_vars[(job_id, tech_id)] = solver.BoolVar(f"x_{job_id}_{tech_id}")

    solver.Minimize(
        solver.Sum(
            cand["optimization_score"] * decision_vars[(job_id, int(cand["technician_id"]))]
            for job_id, candidates in candidate_map.items()
            for cand in candidates
        )
    )

    for job_id, candidates in candidate_map.items():
        solver.Add(
            solver.Sum(decision_vars[(job_id, int(cand["technician_id"]))] for cand in candidates) == 1
        )

    for tech_id, capacity in remaining_capacity.items():
        if capacity <= 0:
            continue
        solver.Add(
            solver.Sum(
                decision_vars[(job_id, tech_id)]
                for job_id, candidates in candidate_map.items()
                for cand in candidates
                if int(cand["technician_id"]) == tech_id
            ) <= capacity
        )

    status = solver.Solve()
    if status != pywraplp.Solver.OPTIMAL:
        LOGGER.warning("Batch solver returned non-optimal solution; falling back to greedy")
        for job_id, candidates in candidate_map.items():
            best = sorted(candidates, key=lambda c: c.get("optimization_score", 0.0))[0]
            assignments[job_id] = best
        return assignments, unassigned

    for job_id, candidates in candidate_map.items():
        for cand in candidates:
            tech_id = int(cand["technician_id"])
            if decision_vars[(job_id, tech_id)].solution_value() > 0.5:
                assignments[job_id] = cand
                break

    return assignments, unassigned


def process_dispatch_queue_once() -> int:
    if not DISPATCH_QUEUE_ENABLED or not hasattr(db_client, "get_pending_dispatch_queue"):
        return 0

    try:
        queue_items = db_client.get_pending_dispatch_queue(DISPATCH_QUEUE_BATCH_SIZE)
    except Exception:
        LOGGER.exception("Failed to fetch pending dispatch queue")
        return 0

    if not queue_items:
        return 0

    requests: list[dict] = []
    queue_by_request: dict[str, dict] = {}
    for item in queue_items:
        queue_id = item.get("id")
        request_id = item.get("request_id")
        if not request_id:
            continue
        queue_by_request[str(request_id)] = item
        if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
            try:
                attempts = int(item.get("attempts") or 0) + 1
                if attempts > DISPATCH_QUEUE_MAX_ATTEMPTS:
                    db_client.update_dispatch_queue_item(queue_id, {
                        "status": "failed",
                        "error": "max_attempts_exceeded",
                        "attempts": attempts,
                        "updated_at": datetime.utcnow(),
                    })
                    continue
                db_client.update_dispatch_queue_item(queue_id, {
                    "status": "processing",
                    "attempts": attempts,
                    "processing_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                })
            except Exception:
                LOGGER.exception("Failed to mark queue item %s as processing", queue_id)

        try:
            req = db_client.get_request_by_id(request_id)
        except Exception:
            req = None
        if not req:
            if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
                db_client.update_dispatch_queue_item(queue_id, {
                    "status": "failed",
                    "error": "request_not_found",
                    "updated_at": datetime.utcnow(),
                })
            continue
        if req.get("latitude") is None or req.get("longitude") is None:
            if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
                db_client.update_dispatch_queue_item(queue_id, {
                    "status": "failed",
                    "error": "missing_coordinates",
                    "updated_at": datetime.utcnow(),
                })
            continue
        requests.append(req)

    assignments, unassigned = _batch_assign_jobs(requests)
    processed = 0

    for req in requests:
        req_id = str(req.get("id"))
        queue_item = queue_by_request.get(req_id, {})
        queue_id = queue_item.get("id")
        assignment = assignments.get(req_id)

        if not assignment:
            if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
                db_client.update_dispatch_queue_item(queue_id, {
                    "status": "failed",
                    "error": "no_assignment",
                    "updated_at": datetime.utcnow(),
                })
            continue

        tech_id = int(assignment["technician_id"])
        tech_record = db_client.get_technician_by_id(tech_id) or {}
        distance_km = assignment.get("distance_km")
        duration_min = assignment.get("duration_min")
        tech_coords = _resolve_technician_coords(tech_record)
        job_lat = req.get("latitude")
        job_lon = req.get("longitude")
        try:
            if (
                tech_coords[0] is not None
                and tech_coords[1] is not None
                and job_lat is not None
                and job_lon is not None
            ):
                distance_km, duration_min = get_distance(
                    tech_coords,
                    (float(job_lat), float(job_lon)),
                )
        except Exception:
            distance_km = assignment.get("distance_km")
            duration_min = assignment.get("duration_min")

        updates = {
            "assigned_technician": tech_id,
            "assigned_technician_name": tech_record.get("name") or "",
            "assigned_technician_phone_number": db_client.resolve_technician_phone(tech_record),
            "assigned_technician_zone": tech_record.get("zone") or tech_record.get("location_zone") or tech_record.get("service_zone") or "",
            "assigned_technician_latitude": tech_record.get("current_latitude") or tech_record.get("latitude"),
            "assigned_technician_longitude": tech_record.get("current_longitude") or tech_record.get("longitude"),
            "distance_km": distance_km,
            "travel_time_min": duration_min,
            "assigned_at": datetime.utcnow(),
            "status": "assigned",
        }

        try:
            if hasattr(db_client, "assign_service_request_atomic"):
                db_client.assign_service_request_atomic(req_id, updates, technician_id=tech_id)
            else:
                db_client.update_service_request(req_id, updates)
        except Exception:
            LOGGER.exception("Failed to assign queued request %s", req_id)
            if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
                db_client.update_dispatch_queue_item(queue_id, {
                    "status": "failed",
                    "error": "assignment_update_failed",
                    "updated_at": datetime.utcnow(),
                })
            continue

        if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
            db_client.update_dispatch_queue_item(queue_id, {
                "status": "assigned",
                "assigned_technician": tech_id,
                "assigned_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })

        _record_dispatch_audit(
            tech_id,
            req_id,
            distance_km,
            assignment.get("zone_match"),
            assignment.get("optimization_score"),
            extra={
                "dispatch_mode": "queue",
                "dispatch_score_components": assignment.get("score_components"),
            },
        )

        queue_job_payload = {**req, **updates, "id": str(req_id)}
        _notify_telegram_assignment(req_id, queue_job_payload, tech_record)

        processed += 1

    for req in unassigned:
        req_id = str(req.get("id"))
        queue_item = queue_by_request.get(req_id, {})
        queue_id = queue_item.get("id")
        if queue_id and hasattr(db_client, "update_dispatch_queue_item"):
            db_client.update_dispatch_queue_item(queue_id, {
                "status": "failed",
                "error": "no_candidates",
                "updated_at": datetime.utcnow(),
            })

    return processed


def start_dispatch_queue_worker() -> None:
    if not DISPATCH_QUEUE_ENABLED:
        return
    global _QUEUE_WORKER_RUNNING
    with _QUEUE_WORKER_LOCK:
        if _QUEUE_WORKER_RUNNING:
            return
        _QUEUE_WORKER_RUNNING = True

    def _worker_loop() -> None:
        LOGGER.info("Dispatch queue worker started (interval=%ss)", DISPATCH_QUEUE_INTERVAL_SEC)
        while True:
            try:
                process_dispatch_queue_once()
            except Exception:
                LOGGER.exception("Dispatch queue processing failed")
            time.sleep(DISPATCH_QUEUE_INTERVAL_SEC)

    threading.Thread(target=_worker_loop, daemon=True).start()


def _should_split_route(technician_id: int, total_distance_km: float) -> bool:
    if total_distance_km <= _MAX_ROUTE_DISTANCE_KM:
        return False
    now = time.time()
    with _ROUTE_SPLIT_LOCK:
        last_ts = _LAST_ROUTE_SPLIT_TS.get(technician_id, 0.0)
        if now - last_ts < _ROUTE_SPLIT_COOLDOWN_SEC:
            return False
        _LAST_ROUTE_SPLIT_TS[technician_id] = now
    return True


def _select_group_technician(group: list[dict], exclude_ids: set[int]) -> tuple[dict | None, dict | None]:
    candidate_ids: set[int] | None = None
    tech_lookup: dict[int, dict] = {}

    for job in group:
        techs, _tier = get_eligible_technicians_with_fallback(job.get("fault_type"), job.get("severity"))
        ids = set()
        for tech in techs:
            tech_id = tech.get("id")
            if tech_id is None:
                continue
            tech_id = int(tech_id)
            if tech_id in exclude_ids:
                continue
            ids.add(tech_id)
            tech_lookup[tech_id] = tech
        if candidate_ids is None:
            candidate_ids = ids
        else:
            candidate_ids &= ids

    if not candidate_ids:
        return None, None

    candidates = [tech_lookup[tid] for tid in candidate_ids if tid in tech_lookup]
    if not candidates:
        return None, None

    group_lat = sum(float(j.get("latitude", 0)) for j in group) / len(group)
    group_lon = sum(float(j.get("longitude", 0)) for j in group) / len(group)
    distance_data = _build_distance_data_for_job({"latitude": group_lat, "longitude": group_lon}, candidates)
    group_severity = min(
        (_SEVERITY_RANK.get(str(j.get("severity") or "medium").lower(), 2) for j in group),
        default=2,
    )
    severity_lookup = {v: k for k, v in _SEVERITY_RANK.items()}
    group_severity_label = severity_lookup.get(group_severity, "medium")

    best = select_best_technician(
        distance_data,
        candidates,
        group_severity_label,
        job_zone=group[0].get("location_zone"),
        priority=group[0].get("review_priority"),
    )
    if not best:
        return None, None

    return tech_lookup.get(int(best["technician_id"])), best


def _reassign_group_jobs(
    group: list[dict],
    new_tech: dict,
    score_snapshot: dict | None,
    previous_technician_id: int,
) -> int:
    reassigned = 0
    tech_id = int(new_tech.get("id"))
    tech_coords = _resolve_technician_coords(new_tech)

    for job in group:
        if str(job.get("status") or "").lower() == "in_progress":
            continue
        job_id = str(job.get("id"))
        if not job_id:
            continue
        job_coords = (float(job.get("latitude", 0)), float(job.get("longitude", 0)))

        distance_km = None
        duration_min = None
        if tech_coords[0] is not None and tech_coords[1] is not None:
            try:
                distance_km, duration_min = get_distance(tech_coords, job_coords)
            except Exception:
                distance_km = _haversine_km(tech_coords[0], tech_coords[1], job_coords[0], job_coords[1])
                duration_min = _estimate_duration_min(distance_km)

        updates = {
            "assigned_technician": tech_id,
            "assigned_technician_name": new_tech.get("name") or "",
            "assigned_technician_phone_number": db_client.resolve_technician_phone(new_tech),
            "assigned_technician_zone": new_tech.get("zone") or new_tech.get("location_zone") or new_tech.get("service_zone") or "",
            "assigned_technician_latitude": new_tech.get("current_latitude") or new_tech.get("latitude"),
            "assigned_technician_longitude": new_tech.get("current_longitude") or new_tech.get("longitude"),
            "distance_km": distance_km,
            "travel_time_min": duration_min,
            "assigned_at": datetime.utcnow(),
            "status": "assigned",
            "rerouted": True,
            "previous_technician": previous_technician_id,
            "route_split": True,
            "route_split_at": datetime.utcnow(),
        }

        try:
            if hasattr(db_client, "assign_service_request_atomic"):
                db_client.assign_service_request_atomic(job_id, updates, technician_id=tech_id, previous_technician_id=previous_technician_id)
            else:
                db_client.update_service_request(job_id, updates)
        except Exception:
            LOGGER.exception("Failed to reassign job %s during route split", job_id)
            continue

        _record_dispatch_audit(
            tech_id,
            job_id,
            distance_km,
            score_snapshot.get("zone_match") if score_snapshot else None,
            score_snapshot.get("optimization_score") if score_snapshot else None,
            extra={
                "dispatch_mode": "route_split",
                "dispatch_score_components": score_snapshot.get("score_components") if score_snapshot else None,
            },
        )

        reassigned += 1

    # If any reassignment happened, notify affected technicians about their updated routes.
    try:
        if reassigned:
            try:
                from backend.bot.services.telegram_service import schedule_reroute_notification_for_technician
            except Exception:
                schedule_reroute_notification_for_technician = None

            if schedule_reroute_notification_for_technician:
                try:
                    schedule_reroute_notification_for_technician(
                        tech_id,
                        reason="Your route changed due to a route split and new assignments.",
                    )
                except Exception:
                    LOGGER.debug("Failed to schedule reroute notif for new tech %s", tech_id)

                try:
                    if previous_technician_id:
                        schedule_reroute_notification_for_technician(
                            previous_technician_id,
                            reason="Your route changed after some jobs were reassigned.",
                        )
                except Exception:
                    LOGGER.debug(
                        "Failed to schedule reroute notif for previous tech %s",
                        previous_technician_id,
                    )
    except Exception:
        LOGGER.debug("Reroute notification scheduling encountered an error")

    return reassigned


def _enforce_route_distance_limit(technician_id: int) -> None:
    try:
        from dispatch_engine.route_planner import plan_technician_route
        route_snapshot = plan_technician_route(technician_id)
    except Exception:
        LOGGER.exception("Route snapshot failed for tech=%s", technician_id)
        return

    if not route_snapshot.get("route_constraint_violated"):
        return

    total_distance = float(route_snapshot.get("estimated_total_distance_km") or 0.0)
    if not _should_split_route(technician_id, total_distance):
        return

    jobs = db_client.get_jobs_for_technician(technician_id) or []
    locked_jobs = []
    flexible_jobs = []
    for row in jobs:
        status = str(row.get("status") or "").lower()
        if status not in {"assigned", "in_progress"}:
            continue
        if row.get("latitude") is None or row.get("longitude") is None:
            continue
        job = {
            "id": row.get("id"),
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
            "status": status,
            "is_locked": bool(row.get("is_locked")) or status == "in_progress",
            "fault_type": row.get("fault_type"),
            "severity": row.get("severity") or "medium",
            "location_zone": row.get("location_zone"),
            "review_priority": row.get("review_priority"),
        }
        if job["is_locked"]:
            locked_jobs.append(job)
        else:
            flexible_jobs.append(job)

    if not flexible_jobs:
        return

    locked_job = locked_jobs[0] if locked_jobs else None
    start_lat = locked_job.get("latitude") if locked_job else None
    start_lon = locked_job.get("longitude") if locked_job else None
    if start_lat is None or start_lon is None:
        tech_record = db_client.get_technician_by_id(technician_id) or {}
        start_lat, start_lon = _resolve_technician_coords(tech_record)

    if start_lat is None or start_lon is None:
        return

    flexible_jobs.sort(key=lambda j: _haversine_km(float(start_lat), float(start_lon), float(j["latitude"]), float(j["longitude"])), reverse=True)
    groups: list[list[dict]] = []
    for job in flexible_jobs:
        if not groups:
            groups.append([job])
            continue
        candidate = groups[-1]
        estimated_distance_km = sum(
            _haversine_km(
                float(start_lat),
                float(start_lon),
                float(j["latitude"]),
                float(j["longitude"]),
            )
            for j in candidate + [job]
        )
        if estimated_distance_km <= _MAX_ROUTE_DISTANCE_KM:
            candidate.append(job)
        else:
            groups.append([job])

    if len(groups) <= 1:
        return

    exclude_ids = {int(technician_id)}
    for group in groups[1:]:
        new_tech, score_snapshot = _select_group_technician(group, exclude_ids)
        if not new_tech:
            LOGGER.warning("Route split: no eligible technician for group with %d jobs", len(group))
            continue
        exclude_ids.add(int(new_tech.get("id")))
        _reassign_group_jobs(group, new_tech, score_snapshot, int(technician_id))

    try:
        db_client.sync_technician_job_counters_firestore(technician_id)
    except Exception:
        LOGGER.exception("Failed to sync counters after route split for tech=%s", technician_id)


# ---------------------------------------------------------------------------
# Main dispatch entry point
# ---------------------------------------------------------------------------

def assign_technician(
    fault_type: str,
    severity: str,
    job_lat: float,
    job_lon: float,
    customer_user_id: int | None = None,
    customer_name: str | None = None,
    customer_email: str | None = None,
    contact_number: str | None = None,
    location_text: str | None = None,
    location_zone: str | None = None,
    description: str | None = None,
    diagnosis_confidence: float | None = None,
) -> dict:
    """
    Assign the best available technician to a new service request.

    Returns on success:
        {
            "request_id": int,
            "assigned_technician": int,
            "distance_km": float,
            "duration_min": float,
            "dispatch_tier": str,   # 'exact' | 'relaxed_*' | 'domain_any'
        }

    Returns on failure:
        {"error": str}
    """
    resolved_zone = location_zone or _nearest_service_zone(job_lat, job_lon)

    base_doc = {
        "customer_user_id": customer_user_id,
        "customer_id": customer_user_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "contact_number": contact_number,
        "location_text": location_text,
        "location_zone": resolved_zone,
        "description": description,
        "fault_type": fault_type,
        "severity": severity,
        "diagnosis_confidence": diagnosis_confidence,
        "latitude": job_lat,
        "longitude": job_lon,
    }

    if _should_queue_dispatch(severity):
        return _queue_dispatch_request(base_doc)

    # Step 1 — sync live job counts
    sync_technician_job_counters()

    # Step 2 — multi-tier technician search
    technicians, dispatch_tier = get_eligible_technicians_with_fallback(fault_type, severity)
    LOGGER.info(
        "Dispatch technician pool: %d candidates (tier=%s)",
        len(technicians), dispatch_tier,
    )

    if not technicians:
        return {"error": "No technicians available"}

    # Step 3 — Hard zone constraint with controlled fallbacks
    technicians, zone_tier, low_priority = _apply_zone_constraint(
        technicians,
        resolved_zone,
        job_lat,
        job_lon,
    )
    LOGGER.info(
        "Dispatch zone filter: zone=%s tier=%s candidates=%d",
        resolved_zone,
        zone_tier,
        len(technicians),
    )

    # Step 4 — Cluster filter (keep technicians near their active job cluster)
    clustered = _cluster_filter_by_active_jobs(technicians, job_lat, job_lon)
    if clustered:
        technicians = clustered
    else:
        LOGGER.info("Cluster filter yielded no candidates; using zone-filtered pool")

    # Step 5 — Haversine pre-filter (skip API quota for clearly-out-of-range techs)
    technicians = _pre_filter_by_distance(technicians, job_lat, job_lon, severity)
    if not technicians:
        return {"error": "No technicians available"}

    # Step 6 — Google Maps distance + duration matrix
    distance_data = calculate_distance_matrix(technicians, job_lat, job_lon)

    if not distance_data:
        # Google Maps unavailable — fall back to Haversine-only scoring.
        LOGGER.warning("Distance Matrix API unavailable — using Haversine fallback scoring")
        distance_data = [
            {
                "technician_id": int(t["id"]),
                "distance_km": round(t.get("_haversine_km", 0.0), 2),
                "duration_min": round(t.get("_haversine_km", 0.0) / 30.0 * 60.0, 2),
            }
            for t in technicians
            if t.get("id") is not None
        ]

    # Step 7 — OR-Tools MIP optimizer: weighted score selection
    best_tech = select_best_technician(
        distance_data,
        technicians,
        severity,
        job_zone=resolved_zone,
        priority=severity,
    )

    if not best_tech:
        LOGGER.warning("Strict optimizer returned no candidate; falling back to nearest technician")
        best_tech = _fallback_best_technician(distance_data, technicians)

    if not best_tech:
        return {"error": "No technician selected"}

    tech_id = best_tech["technician_id"]

    # Step 8 — daily job limit guard
    LOGGER.debug("dispatch_service: using db_client=%r for tech_id=%s", db_client, tech_id)
    tech = db_client.get_technician_by_id(tech_id) or {}
    max_jobs_per_day = int(tech.get("max_jobs_per_day") or 0)

    # Count today's jobs for this technician by scanning Firestore records
    jobs = db_client.get_jobs_for_technician(tech_id) or []
    today = datetime.utcnow().date()
    jobs_today = 0
    for j in jobs:
        created = j.get("created_at")
        try:
            # created may be ISO string
            if isinstance(created, str):
                created_dt = datetime.fromisoformat(created)
            else:
                created_dt = created
            if created_dt and hasattr(created_dt, "date") and created_dt.date() == today and j.get("status") in {"assigned", "in_progress", "completed"}:
                jobs_today += 1
        except Exception:
            # ignore parse errors
            pass

    if max_jobs_per_day > 0 and int(jobs_today) >= max_jobs_per_day:
        return {"error": "Technician daily job limit reached"}

    tech_record = db_client.get_technician_by_id(tech_id) or {}

    # Step 9 — persist service request in Firestore (fully denormalized)
    # Embed technician name/phone/zone so list APIs never need secondary lookups
    doc_data = {
        **base_doc,
        "assigned_technician": tech_id,
        # Denormalized technician fields (eliminates JOIN requirement)
        "assigned_technician_name": tech_record.get("name") or "",
        "assigned_technician_phone_number": db_client.resolve_technician_phone(tech_record),
        "assigned_technician_zone": tech_record.get("zone") or tech_record.get("location_zone") or tech_record.get("service_zone") or "",
        "assigned_technician_latitude": tech_record.get("current_latitude") or tech_record.get("latitude"),
        "assigned_technician_longitude": tech_record.get("current_longitude") or tech_record.get("longitude"),
        "distance_km": best_tech.get("distance_km"),
        "travel_time_min": best_tech.get("duration_min"),
        "assignment_priority": "low" if low_priority else "normal",
        "dispatch_zone_tier": zone_tier,
        "cross_zone_assignment": bool(low_priority),
        "dispatch_score": best_tech.get("optimization_score"),
        "dispatch_score_components": best_tech.get("score_components"),
        "assigned_at": datetime.utcnow(),
        "status": "assigned",
    }

    print("SCHEMA_FIX_DEBUG: NEW REQUEST DATA:", doc_data)
    if hasattr(db_client, "create_service_request_with_assignment"):
        request_id = db_client.create_service_request_with_assignment(doc_data, technician_id=tech_id)
    else:
        request_id = db_client.create_service_request(doc_data)

    _mirror_assignment_to_postgres(request_id, doc_data)
    try:
        stored = db_client.get_job_by_id(request_id)
        print("SCHEMA_FIX_DEBUG: STORED DOC:", stored)
    except Exception as _e:
        print("SCHEMA_FIX_DEBUG: Failed to fetch stored doc:", str(_e))

    _record_dispatch_audit(
        tech_id,
        request_id,
        best_tech.get("distance_km"),
        best_tech.get("zone_match"),
        best_tech.get("optimization_score"),
        extra={
            "dispatch_mode": "direct",
            "dispatch_score_components": best_tech.get("score_components"),
        },
    )

    _notify_telegram_assignment(request_id, doc_data, tech_record)

    # Step 10 — sync counters, then re-optimize the technician's route
    # NOTE: db_client is already imported at module level — do NOT re-import it
    # inside this function or Python will treat it as local and raise UnboundLocalError
    # on every earlier use (lines 224, 228, 248, 280).
    try:
        from database import USE_FIRESTORE
        if USE_FIRESTORE:
            try:
                LOGGER.debug("Syncing Firestore job counters for tech=%s", tech_id)
                db_client.sync_technician_job_counters_firestore(tech_id)
            except Exception:
                LOGGER.exception("Failed to sync Firestore technician counters for tech=%s", tech_id)
        else:
            sync_technician_job_counters(tech_id)
    except Exception:
        sync_technician_job_counters(tech_id)

    # Route-aware insertion: re-sequence the flexible segment with the new job.
    # The locked job (if any) always stays first — route_planner guarantees this.
    try:
        from dispatch_engine.route_planner import insert_job_into_route
        # Compute pre/post snapshots to detect re-sequencing and notify technician
        try:
            from dispatch_engine.route_planner import plan_technician_route
            route_before = plan_technician_route(tech_id)
        except Exception:
            route_before = None

        route_after = None
        try:
            route_after = insert_job_into_route(tech_id, request_id)
            LOGGER.info("Route re-sequenced for tech=%s after new job=%s", tech_id, request_id)
        except Exception:
            LOGGER.exception("Route re-sequencing failed for tech=%s job=%s — non-fatal", tech_id, request_id)

        # Notify technician only if route order changed
        try:
            from backend.bot.services.telegram_service import schedule_reroute_notification_for_technician
            before_order = (route_before or {}).get("route_order") or []
            after_order = (route_after or {}).get("route_order") or []
            if before_order != after_order:
                schedule_reroute_notification_for_technician(tech_id, reason="A new assignment changed your optimized route.")
        except Exception:
            LOGGER.debug("Telegram reroute notification unavailable or failed")
    except Exception:
        # Non-fatal: assignment is already persisted; route will be recalculated
        # on the next /technician/route call.
        LOGGER.exception(
            "Route re-sequencing failed for tech=%s job=%s — non-fatal", tech_id, request_id
        )

    _enforce_route_distance_limit(tech_id)

    LOGGER.info(
        "Assigned: request=%s tech=%s tier=%s zone_tier=%s dist=%.1f km",
        request_id, tech_id, dispatch_tier, zone_tier, best_tech["distance_km"],
    )
    if low_priority:
        LOGGER.warning(
            "ALERT: cross_zone_assignment tech=%s zone=%s dist=%.1f km",
            tech_id,
            resolved_zone,
            best_tech.get("distance_km") or 0.0,
        )
    if float(best_tech.get("distance_km") or 0.0) > 100.0:
        LOGGER.warning(
            "ALERT: long_route_assignment tech=%s dist=%.1f km",
            tech_id,
            float(best_tech.get("distance_km") or 0.0),
        )

    return {
        "request_id": request_id,
        "assigned_technician": tech_id,
        "distance_km": best_tech["distance_km"],
        "duration_min": best_tech["duration_min"],
        "dispatch_tier": dispatch_tier,
        "dispatch_zone_tier": zone_tier,
        "assignment_priority": "low" if low_priority else "normal",
    }