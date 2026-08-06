"""Route optimization for multi-job technician dispatch."""

from __future__ import annotations

import logging
import math
from typing import Any

from ortools.constraint_solver import pywrapcp
from ortools.constraint_solver import routing_enums_pb2


LOGGER = logging.getLogger(__name__)
AVERAGE_TRAVEL_SPEED_KMPH = 30.0
MAX_JOBS_PER_TECHNICIAN = 50


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute geodesic distance between two coordinates in kilometers."""
    radius_km = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def compute_distance_matrix(
    technician_location: tuple[float, float],
    jobs: list[dict[str, Any]],
) -> list[list[int]]:
    """
    Build VRP cost matrix in meters.

    Node 0 is depot (technician start), nodes 1..N are job points.
    """
    coordinates = [
        (float(technician_location[0]), float(technician_location[1]))
    ] + [
        (float(job["latitude"]), float(job["longitude"]))
        for job in jobs
    ]

    matrix = []
    for i, (lat1, lon1) in enumerate(coordinates):
        row = []
        for j, (lat2, lon2) in enumerate(coordinates):
            if i == j:
                row.append(0)
            else:
                km = _haversine_km(lat1, lon1, lat2, lon2)
                row.append(int(round(km * 1000)))
        matrix.append(row)

    return matrix


def solve_vrp(distance_matrix: list[list[int]]) -> list[int]:
    """Solve single-vehicle VRP/TSP and return node visitation order."""
    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix),
        1,
        0,
    )
    routing = pywrapcp.RoutingModel(manager)

    def transit_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(transit_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_params)
    if not solution:
        raise RuntimeError("Route optimization failed: no VRP solution found")

    route_nodes: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route_nodes.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))

    # End node (depot) is intentionally not appended to keep result focused on job order.
    return route_nodes


def _estimate_speed_kmh(distance_km: float) -> float:
    return 25.0 if distance_km <= 25.0 else 50.0


def _compute_route_totals(
    route_nodes: list[int],
    distance_matrix_m: list[list[int]],
    duration_matrix_min: list[list[float]] | None = None,
) -> tuple[float, float]:
    """Calculate route distance (km) and estimated travel time (minutes)."""
    if len(route_nodes) <= 1:
        return 0.0, 0.0

    total_meters = 0
    total_minutes = 0.0
    for i in range(len(route_nodes) - 1):
        from_idx = route_nodes[i]
        to_idx = route_nodes[i + 1]
        total_meters += distance_matrix_m[from_idx][to_idx]
        if duration_matrix_min is not None:
            total_minutes += duration_matrix_min[from_idx][to_idx]

    total_km = total_meters / 1000.0
    if duration_matrix_min is None:
        speed_kmh = _estimate_speed_kmh(total_km)
        total_minutes = (total_km / speed_kmh) * 60.0
    return round(total_km, 2), round(total_minutes, 2)


def _normalize_legacy_locations(locations: list[tuple[float, float]]) -> tuple[tuple[float, float], list[dict[str, Any]]]:
    """Backward-compatible adapter for legacy optimize_route([(lat,lon), ...]) calls."""
    if not locations:
        raise ValueError("locations list cannot be empty")

    technician_location = (float(locations[0][0]), float(locations[0][1]))
    jobs = [
        {
            "id": idx,
            "latitude": float(point[0]),
            "longitude": float(point[1]),
        }
        for idx, point in enumerate(locations[1:], start=1)
    ]
    return technician_location, jobs


def optimize_route(
    technician_location: tuple[float, float] | list[tuple[float, float]],
    jobs: list[dict[str, Any]] | None = None,
    distance_matrix_m: list[list[int]] | None = None,
    duration_matrix_min: list[list[float]] | None = None,
) -> dict[str, Any]:
    """
    Optimize route for one technician across multiple assigned jobs.

    Preferred usage:
        optimize_route((tech_lat, tech_lon), jobs)

    Where jobs is:
        [{"id": int, "latitude": float, "longitude": float}, ...]

    Returns:
        {
            "route_order": [job_id_1, job_id_2, ...],
            "total_distance_km": float,
            "total_travel_time_min": float
        }
    """
    try:
        if jobs is None:
            # Backward compatibility path for older call style.
            technician_location, jobs = _normalize_legacy_locations(technician_location)

        if len(jobs) > MAX_JOBS_PER_TECHNICIAN:
            raise ValueError(f"A maximum of {MAX_JOBS_PER_TECHNICIAN} jobs is supported per technician")

        LOGGER.info("Route optimization started for %d jobs", len(jobs))

        if not jobs:
            result = {
                "route_order": [],
                "total_distance_km": 0.0,
                "total_travel_time_min": 0.0,
            }
            LOGGER.info("Route optimization result: %s", result)
            return result

        if distance_matrix_m is None:
            matrix = compute_distance_matrix(technician_location, jobs)
        else:
            matrix = distance_matrix_m
        route_nodes = solve_vrp(matrix)

        # route_nodes contains depot (0) followed by optimized job nodes.
        route_order = [jobs[node - 1]["id"] for node in route_nodes if node != 0]
        total_distance_km, total_travel_time_min = _compute_route_totals(
            route_nodes,
            matrix,
            duration_matrix_min,
        )

        result = {
            "route_order": route_order,
            "total_distance_km": total_distance_km,
            "total_travel_time_min": total_travel_time_min,
        }
        LOGGER.info("Route optimization result: %s", result)
        return result

    except Exception:
        LOGGER.exception("Route optimization failed")
        raise


# ---------------------------------------------------------------------------
# Travel score for reroute evaluation (used by reroute_service only)
# ---------------------------------------------------------------------------

def calculate_travel_score(request: dict[str, Any], technician: dict[str, Any]) -> float:
    """Return a composite score combining distance and workload.

    Lower is better.  The score is ``haversine_km + active_jobs * 0.5``.
    This gives a slight penalty to technicians who already have many jobs,
    making it more likely that a less-loaded technician is preferred for
    re-routing.
    """
    job_lat = float(request.get("latitude", 0))
    job_lon = float(request.get("longitude", 0))
    tech_lat = float(technician.get("current_latitude") or technician.get("latitude", 0))
    tech_lon = float(technician.get("current_longitude") or technician.get("longitude", 0))

    distance = _haversine_km(tech_lat, tech_lon, job_lat, job_lon)
    active_jobs = int(technician.get("current_jobs") or 0)
    workload_factor = active_jobs * 0.5

    return round(distance + workload_factor, 2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    technician_location = (9.9312, 76.2673)
    jobs = [
        {"id": 10, "latitude": 9.95, "longitude": 76.28},
        {"id": 11, "latitude": 9.90, "longitude": 76.24},
        {"id": 12, "latitude": 9.97, "longitude": 76.26},
    ]

    route = optimize_route(technician_location, jobs)
    print(route)