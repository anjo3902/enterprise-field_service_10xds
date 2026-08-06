"""Tool wrappers for dispatch optimization using OR-Tools MIP solver."""
import sys
import math
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.distance_engine import calculate_distance_matrix
from dispatch_engine.dispatch_optimizer import select_best_technician


def compute_distance_matrix(technicians: list, job_lat: float, job_lon: float) -> dict:
    """Calculate real road distances from all candidate technicians to the job site.

    Uses the Google Maps Distance Matrix API for actual road distances and travel durations.
    Falls back to Haversine geodesic distances if the API is unavailable.

    Args:
        technicians: List of technician dicts (each must have id, latitude, longitude).
        job_lat: Job site latitude.
        job_lon: Job site longitude.

    Returns:
        dict with key "distance_data": list of dicts with technician_id, distance_km, duration_min.
    """
    data = calculate_distance_matrix(technicians, job_lat, job_lon)

    if not data:
        # Haversine fallback
        r = 6371.0
        data = []
        for t in technicians:
            if t.get("id") is None:
                continue
            lat = t.get("latitude")
            lon = t.get("longitude")
            if lat is None or lon is None:
                continue
            p1, p2 = math.radians(float(lat)), math.radians(job_lat)
            dp = math.radians(job_lat - float(lat))
            dl = math.radians(job_lon - float(lon))
            a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
            km = r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            data.append({
                "technician_id": int(t["id"]),
                "distance_km": round(km, 2),
                "duration_min": round(km / 30.0 * 60.0, 2),
            })

    return {"distance_data": data}


def optimize_dispatch(distance_data: list, technicians: list, severity: str) -> dict:
    """Select the optimal technician using OR-Tools MIP solver.

    Minimizes weighted cost: distance * weight_d + duration * weight_t + workload_penalty.
    Critical severity uses different weights (0.3/0.7 vs 0.5/0.4).

    Args:
        distance_data: List from compute_distance_matrix (technician_id, distance_km, duration_min).
        technicians: Full technician dicts with current_jobs, max_jobs_per_day.
        severity: Severity level for weight selection.

    Returns:
        dict with "best_technician" (dict with technician_id, distance_km, duration_min, score)
        or "error" key if no candidate selected.
    """
    best = select_best_technician(distance_data, technicians, severity)
    if not best:
        return {"error": "No technician selected by optimizer"}
    return {"best_technician": best}
