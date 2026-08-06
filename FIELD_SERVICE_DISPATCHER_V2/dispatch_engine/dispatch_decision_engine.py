import logging
from typing import Any

logger = logging.getLogger(__name__)


EXPERIENCE_SCORE_MAP = {
    "junior technician": 0.6,
    "technician": 0.75,
    "senior technician": 0.9,
    "field engineer": 1.0,
}

SEVERITY_PRIORITY_MAP = {
    "low": 0.25,
    "medium": 0.5,
    "high": 0.75,
    "critical": 1.0,
}


def _safe_workload_score(current_jobs: float, max_jobs: float) -> float:
    """Return workload score in [0, 1] where lower utilization is better."""
    if max_jobs <= 0:
        return 0.0

    ratio = max(0.0, min(1.0, current_jobs / max_jobs))
    return 1.0 - ratio


def calculate_dispatch_score(
    distance_km: float,
    duration_min: float,
    current_jobs: float,
    max_jobs: float,
    experience_level: str,
    severity: str,
) -> float:
    """
    Compute weighted dispatch score.

    Default weights:
    0.40 * distance_score + 0.30 * workload_score + 0.20 * experience_score + 0.10 * severity_priority

    Critical override:
    0.50 * distance_score + 0.20 * workload_score + 0.20 * experience_score + 0.10 * severity_priority
    """

    # Distance score (lower distance = higher score)
    distance_score = 1.0 / (1.0 + max(0.0, float(distance_km)))

    # Workload score
    workload_score = _safe_workload_score(float(current_jobs), float(max_jobs))

    # Experience score
    experience_key = (experience_level or "").strip().lower()
    experience_score = EXPERIENCE_SCORE_MAP.get(experience_key, 0.75)

    # Severity priority score
    severity_key = (severity or "medium").strip().lower()
    severity_priority = SEVERITY_PRIORITY_MAP.get(severity_key, 0.5)

    if severity_key == "critical":
        w_distance, w_workload, w_experience, w_severity = 0.50, 0.20, 0.20, 0.10
    else:
        w_distance, w_workload, w_experience, w_severity = 0.40, 0.30, 0.20, 0.10

    final_score = (
        (w_distance * distance_score)
        + (w_workload * workload_score)
        + (w_experience * experience_score)
        + (w_severity * severity_priority)
    )

    return round(final_score, 6)


def choose_best_technician(
    distance_results: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
    severity: str,
) -> dict[str, Any] | None:
    """Select technician with the highest dispatch score without persisting data."""
    if not distance_results or not technicians:
        logger.warning("Dispatch decision skipped: empty distance_results or technicians")
        return None

    best = None
    best_score = -1

    tech_map = {
        int(t["id"]): t
        for t in technicians
        if t.get("id") is not None
    }

    evaluated_count = 0

    for item in distance_results:
        tech_id_raw = item.get("technician_id")
        if tech_id_raw is None:
            continue

        tech_id = int(tech_id_raw)
        tech = tech_map.get(tech_id)

        if not tech:
            continue

        distance_km = float(item.get("distance_km", 0.0) or 0.0)
        duration_min = float(item.get("duration_min", 0.0) or 0.0)

        score = calculate_dispatch_score(
            distance_km=distance_km,
            duration_min=duration_min,
            current_jobs=float(tech.get("current_jobs", 0) or 0),
            max_jobs=float(tech.get("max_jobs_per_day", 0) or 0),
            experience_level=str(tech.get("experience_level", "technician") or "technician"),
            severity=severity,
        )
        evaluated_count += 1

        if score > best_score:
            best_score = score
            best = {
                "technician_id": tech_id,
                "dispatch_score": round(score, 4),
                "distance_km": round(distance_km, 2),
                "duration_min": round(duration_min, 2),
            }

    logger.info("Dispatch decision evaluated technicians: %d", evaluated_count)
    if best is not None:
        logger.info(
            "Selected technician=%s score=%.4f",
            best["technician_id"],
            best["dispatch_score"],
        )
    else:
        logger.warning("No technician selected after evaluating distance results")

    return best