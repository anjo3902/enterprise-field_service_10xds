"""Dispatch optimizer that selects the single best technician candidate."""

from __future__ import annotations

import logging
from typing import Any

from ortools.linear_solver import pywraplp


LOGGER = logging.getLogger(__name__)


MAX_DISTANCE_BY_SEVERITY_KM = {
    "low": 80.0,
    "medium": 60.0,
    "high": 35.0,
    "critical": 20.0,
}

_PRIORITY_RANK = {
    "critical": 0,
    "urgent": 0,
    "high": 1,
    "medium": 2,
    "normal": 2,
    "low": 3,
}


def _get_solver() -> pywraplp.Solver:
    """Create a MIP solver instance with safe fallback options."""
    for backend in ("CBC_MIXED_INTEGER_PROGRAMMING", "SCIP"):
        solver = pywraplp.Solver.CreateSolver(backend)
        if solver is not None:
            return solver
    raise RuntimeError("No OR-Tools linear solver backend available (CBC/SCIP)")


def _severity_weights(severity: str) -> dict[str, float]:
    """
    Return scoring weights by severity.

    Non-critical profile:
    score = distance + duration + workload + priority + zone + balance

    Critical profile:
    score = higher duration weight, lower workload penalty
    """
    normalized = (severity or "medium").strip().lower()

    if normalized == "critical":
        # Critical jobs prioritize response time and tolerate higher workload.
        return {
            "distance_weight": 0.45,
            "duration_weight": 0.70,
            "workload_weight": 1.3,
            "priority_weight": 0.4,
            "zone_match_weight": 1.0,
            "balance_weight": 1.0,
        }

    # low/medium/high/default share the standard dispatch profile.
    return {
        "distance_weight": 0.55,
        "duration_weight": 0.45,
        "workload_weight": 2.0,
        "priority_weight": 0.3,
        "zone_match_weight": 1.2,
        "balance_weight": 1.5,
    }


def _normalize_zone(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _zone_match(job_zone: str | None, tech_meta: dict[str, Any]) -> bool | None:
    if not job_zone:
        return None
    tech_zone = _normalize_zone(
        tech_meta.get("location_zone")
        or tech_meta.get("service_zone")
        or tech_meta.get("zone")
    )
    if not tech_zone:
        return None
    return _normalize_zone(job_zone) == tech_zone


def _priority_rank(priority: str | None, severity: str | None) -> int:
    key = (priority or "").strip().lower()
    if not key:
        key = (severity or "").strip().lower()
    return _PRIORITY_RANK.get(key, _PRIORITY_RANK["medium"])


def _safe_workload_penalty(tech_meta: dict[str, Any]) -> float:
    current_jobs = float(tech_meta.get("current_jobs", 0) or 0)
    max_jobs = float(tech_meta.get("max_jobs_per_day", 0) or 0)
    if max_jobs <= 0:
        return 1.0
    return max(0.0, current_jobs / max_jobs)


def _average_workload_ratio(technicians: list[dict[str, Any]]) -> float:
    ratios = [_safe_workload_penalty(t) for t in technicians if t]
    if not ratios:
        return 0.0
    return sum(ratios) / len(ratios)


def _build_candidate_records(
    distance_data: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
    severity: str,
    job_zone: str | None = None,
    priority: str | None = None,
    max_distance_km: float | None = None,
) -> list[dict[str, Any]]:
    """Join distance rows with technician metadata and compute optimization scores."""
    tech_by_id = {int(t["id"]): t for t in technicians if t.get("id") is not None}
    weights = _severity_weights(severity)
    avg_workload_ratio = _average_workload_ratio(technicians)
    severity_key = (severity or "medium").strip().lower()
    if max_distance_km is None:
        max_distance_km = MAX_DISTANCE_BY_SEVERITY_KM.get(severity_key, 60.0)
    priority_rank = _priority_rank(priority, severity)

    candidates: list[dict[str, Any]] = []
    for row in distance_data:
        tech_id_raw = row.get("technician_id")
        if tech_id_raw is None:
            continue

        tech_id = int(tech_id_raw)
        tech_meta = tech_by_id.get(tech_id)
        if tech_meta is None:
            continue

        distance_km = float(row.get("distance_km", 0.0) or 0.0)
        duration_min = float(row.get("duration_min", 0.0) or 0.0)

        # Prevent impractical long-distance assignments for urgent jobs.
        if distance_km > max_distance_km:
            continue

        workload_ratio = _safe_workload_penalty(tech_meta)
        zone_match = _zone_match(job_zone, tech_meta)

        distance_component = distance_km * weights["distance_weight"]
        duration_component = duration_min * weights["duration_weight"]
        workload_component = workload_ratio * weights["workload_weight"]
        priority_component = priority_rank * weights["priority_weight"]
        zone_component = 0.0 if zone_match else (weights["zone_match_weight"] if zone_match is not None else 0.0)
        balance_component = max(0.0, workload_ratio - avg_workload_ratio) * weights["balance_weight"]

        final_score = (
            distance_component
            + duration_component
            + workload_component
            + priority_component
            + zone_component
            + balance_component
        )

        candidates.append(
            {
                "technician_id": tech_id,
                "distance_km": round(distance_km, 2),
                "duration_min": round(duration_min, 2),
                "optimization_score": round(final_score, 4),
                "zone_match": zone_match,
                "workload_ratio": round(workload_ratio, 4),
                "priority_rank": priority_rank,
                "score_components": {
                    "distance": round(distance_component, 4),
                    "duration": round(duration_component, 4),
                    "workload": round(workload_component, 4),
                    "priority": round(priority_component, 4),
                    "zone": round(zone_component, 4),
                    "balance": round(balance_component, 4),
                },
            }
        )

    return candidates


def select_best_technician(
    distance_data: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
    severity: str,
    job_zone: str | None = None,
    priority: str | None = None,
    max_distance_km: float | None = None,
) -> dict[str, Any] | None:
    """
    Select the best single technician candidate using OR-Tools optimization.

    This module intentionally returns only one optimized candidate and does not
    perform final assignment orchestration.
    """
    LOGGER.info("Dispatch optimization started")

    candidates = _build_candidate_records(
        distance_data,
        technicians,
        severity,
        job_zone=job_zone,
        priority=priority,
        max_distance_km=max_distance_km,
    )
    LOGGER.info("Dispatch candidate count: %d", len(candidates))

    if not candidates:
        LOGGER.warning("No valid candidates available for optimization")
        return None

    solver = _get_solver()

    decision_vars = {
        c["technician_id"]: solver.BoolVar(f"x_{c['technician_id']}")
        for c in candidates
    }

    # Minimize weighted optimization score.
    solver.Minimize(
        solver.Sum(
            c["optimization_score"] * decision_vars[c["technician_id"]]
            for c in candidates
        )
    )

    # Select exactly one best candidate.
    solver.Add(
        solver.Sum(decision_vars[c["technician_id"]] for c in candidates) == 1
    )

    status = solver.Solve()
    if status != pywraplp.Solver.OPTIMAL:
        LOGGER.warning("Optimizer did not return an optimal solution")
        return None

    for candidate in candidates:
        tech_id = candidate["technician_id"]
        if decision_vars[tech_id].solution_value() > 0.5:
            LOGGER.info("Selected technician id=%s score=%.4f", tech_id, candidate["optimization_score"])
            return candidate

    LOGGER.warning("Optimizer solved, but no selected technician variable found")
    return None


def build_candidate_records(
    distance_data: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
    severity: str,
    job_zone: str | None = None,
    priority: str | None = None,
    max_distance_km: float | None = None,
) -> list[dict[str, Any]]:
    """Expose candidate scoring for batch assignment workflows."""
    return _build_candidate_records(
        distance_data,
        technicians,
        severity,
        job_zone=job_zone,
        priority=priority,
        max_distance_km=max_distance_km,
    )


def build_candidate_diagnostics(
    distance_data: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
    severity: str,
    job_zone: str | None = None,
    priority: str | None = None,
    max_distance_km: float | None = None,
) -> dict[str, Any]:
    """Return candidate diagnostics with rejection reasons for debugging."""
    tech_by_id = {int(t["id"]): t for t in technicians if t.get("id") is not None}
    weights = _severity_weights(severity)
    avg_workload_ratio = _average_workload_ratio(technicians)
    severity_key = (severity or "medium").strip().lower()
    if max_distance_km is None:
        max_distance_km = MAX_DISTANCE_BY_SEVERITY_KM.get(severity_key, 60.0)
    priority_rank = _priority_rank(priority, severity)

    candidates: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for row in distance_data:
        tech_id_raw = row.get("technician_id")
        if tech_id_raw is None:
            rejected.append({"reason": "missing_technician_id", "row": row})
            continue

        tech_id = int(tech_id_raw)
        tech_meta = tech_by_id.get(tech_id)
        if tech_meta is None:
            rejected.append({"reason": "technician_not_in_pool", "technician_id": tech_id})
            continue

        distance_km = float(row.get("distance_km", 0.0) or 0.0)
        duration_min = float(row.get("duration_min", 0.0) or 0.0)
        workload_ratio = _safe_workload_penalty(tech_meta)
        zone_match = _zone_match(job_zone, tech_meta)

        distance_component = distance_km * weights["distance_weight"]
        duration_component = duration_min * weights["duration_weight"]
        workload_component = workload_ratio * weights["workload_weight"]
        priority_component = priority_rank * weights["priority_weight"]
        zone_component = 0.0 if zone_match else (weights["zone_match_weight"] if zone_match is not None else 0.0)
        balance_component = max(0.0, workload_ratio - avg_workload_ratio) * weights["balance_weight"]
        final_score = (
            distance_component
            + duration_component
            + workload_component
            + priority_component
            + zone_component
            + balance_component
        )

        record = {
            "technician_id": tech_id,
            "technician_name": tech_meta.get("name"),
            "availability_state": tech_meta.get("availability_state"),
            "experience_level": tech_meta.get("experience_level"),
            "current_jobs": tech_meta.get("current_jobs"),
            "max_jobs_per_day": tech_meta.get("max_jobs_per_day"),
            "distance_km": round(distance_km, 2),
            "duration_min": round(duration_min, 2),
            "optimization_score": round(final_score, 4),
            "zone_match": zone_match,
            "workload_ratio": round(workload_ratio, 4),
            "priority_rank": priority_rank,
            "score_components": {
                "distance": round(distance_component, 4),
                "duration": round(duration_component, 4),
                "workload": round(workload_component, 4),
                "priority": round(priority_component, 4),
                "zone": round(zone_component, 4),
                "balance": round(balance_component, 4),
            },
        }

        if distance_km > max_distance_km:
            record["rejection_reason"] = "distance_exceeds_threshold"
            rejected.append(record)
            continue

        candidates.append(record)

    return {
        "max_distance_km": max_distance_km,
        "candidates": candidates,
        "rejected": rejected,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    # Example usage only.
    example_distance_data = [
        {"technician_id": 1, "distance_km": 12.4, "duration_min": 28.0},
        {"technician_id": 2, "distance_km": 9.3, "duration_min": 24.0},
    ]
    example_technicians = [
        {"id": 1, "current_jobs": 2, "max_jobs_per_day": 6},
        {"id": 2, "current_jobs": 5, "max_jobs_per_day": 6},
    ]

    best = select_best_technician(example_distance_data, example_technicians, "critical")
    print(best)