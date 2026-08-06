"""
dispatch_engine/dvrp_optimizer.py — Dynamic Vehicle Routing Problem solver.

Uses OR-Tools' Constraint Programming engine to globally assign *multiple*
service requests to *multiple* technicians and sequence each technician's
route in a single optimisation pass.

This module is invoked ONLY by the reroute layer when:
  - A critical request arrives, OR
  - System load exceeds a configurable threshold.

If the solver fails (timeout, infeasible, etc.) the caller falls back to
the existing greedy single-request dispatch pipeline — so this module can
never break the system.

Key design points
-----------------
* Each technician is a "vehicle" whose depot is their current GPS location.
* Each pending/assigned request is a "node" to visit.
* The cost matrix is Haversine-based (no API calls within the solver).
* A capacity dimension enforces ``max_jobs_per_day`` per technician.
* Critical jobs get a high-priority penalty so the solver serves them first.
* The result is a dict mapping technician IDs to ordered lists of request
  dicts, plus route metrics.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

LOGGER = logging.getLogger(__name__)

# Solver time budget (milliseconds).  Kept low so the background monitor
# thread doesn't block other work for long.
_SOLVER_TIME_LIMIT_MS = 3_000

# Maximum requests the solver will consider in one pass.
_MAX_REQUESTS = 50

# Penalty added to the distance matrix for dropping a node (allowing it to
# remain un-served).  High enough that the solver prefers to serve everything,
# but finite so it doesn't refuse to return a solution.
_DROP_PENALTY = 100_000_000  # 100 000 km in meters

# Multiplier applied to the Haversine distance for critical-severity requests
# so the solver prioritises them by making "not visiting them first" very
# expensive via disjunctions.
_CRITICAL_PRIORITY_PENALTY = 200_000_000


# ---------------------------------------------------------------------------
# Haversine
# ---------------------------------------------------------------------------

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Haversine distance in whole meters (OR-Tools needs integers)."""
    r = 6_371_000.0  # Earth radius in meters
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def optimize_routes(
    requests: list[dict[str, Any]],
    technicians: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Solve a multi-vehicle DVRP for the given requests and technicians.

    Parameters
    ----------
    requests : list[dict]
        Each dict must contain at minimum: ``id``, ``latitude``, ``longitude``.
        Optional: ``severity`` (used for priority).
    technicians : list[dict]
        Each dict must contain: ``id``, ``latitude`` (or ``current_latitude``),
        ``longitude`` (or ``current_longitude``), ``max_jobs_per_day``,
        ``current_jobs``.

    Returns
    -------
    dict or None
        ``None`` when the solver finds no feasible solution.
        Otherwise::

            {
                "routes": {
                    <tech_id>: {
                        "sequence": [req_dict, ...],
                        "total_distance_km": float,
                    },
                    ...
                },
                "unserved": [req_id, ...],
            }
    """
    if not requests or not technicians:
        return None

    # ── Cap to _MAX_REQUESTS to keep solve time bounded ───────────────────
    if len(requests) > _MAX_REQUESTS:
        # Prefer critical/high severity; fall back to newest first (stable sort)
        _severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        requests = sorted(
            requests,
            key=lambda r: _severity_rank.get(str(r.get("severity", "")).lower(), 9),
        )[:_MAX_REQUESTS]

    num_vehicles = len(technicians)
    num_requests = len(requests)
    # Nodes: 0..num_vehicles-1 are depots (one per vehicle),
    #        num_vehicles..num_vehicles+num_requests-1 are request nodes.
    num_nodes = num_vehicles + num_requests

    print(f"[DVRP] Optimization started — {num_requests} requests, {num_vehicles} technicians")

    # ── Coordinates for every node ────────────────────────────────────────
    coords: list[tuple[float, float]] = []
    for t in technicians:
        lat = float(t.get("current_latitude") or t.get("latitude") or 0)
        lon = float(t.get("current_longitude") or t.get("longitude") or 0)
        coords.append((lat, lon))
    for r in requests:
        coords.append((float(r.get("latitude", 0)), float(r.get("longitude", 0))))

    # ── Distance matrix (integer meters) ──────────────────────────────────
    dist_matrix: list[list[int]] = []
    for i in range(num_nodes):
        row: list[int] = []
        for j in range(num_nodes):
            if i == j:
                row.append(0)
            else:
                row.append(_haversine_m(coords[i][0], coords[i][1],
                                        coords[j][0], coords[j][1]))
        dist_matrix.append(row)

    # ── OR-Tools manager — each vehicle starts at its own depot ───────────
    starts = list(range(num_vehicles))  # depot indices
    ends = list(range(num_vehicles))    # vehicles return conceptually to their depot

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    # ── Transit callback ──────────────────────────────────────────────────
    def _transit_cb(from_index: int, to_index: int) -> int:
        return dist_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_idx = routing.RegisterTransitCallback(_transit_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    # ── Capacity dimension (max jobs per technician) ──────────────────────
    def _demand_cb(index: int) -> int:
        node = manager.IndexToNode(index)
        # Depot nodes have zero demand; request nodes have demand=1.
        return 0 if node < num_vehicles else 1

    demand_idx = routing.RegisterUnaryTransitCallback(_demand_cb)
    capacities = []
    for t in technicians:
        max_j = int(t.get("max_jobs_per_day") or 8)
        cur_j = int(t.get("current_jobs") or 0)
        remaining = max(max_j - cur_j, 0)
        capacities.append(remaining)

    routing.AddDimensionWithVehicleCapacity(
        demand_idx,
        0,          # no slack
        capacities,
        True,       # start cumul to zero
        "Capacity",
    )

    # ── Allow dropping nodes (disjunctions) ───────────────────────────────
    for req_idx in range(num_requests):
        node = num_vehicles + req_idx
        index = manager.NodeToIndex(node)
        sev = str(requests[req_idx].get("severity", "")).lower()
        penalty = _CRITICAL_PRIORITY_PENALTY if sev == "critical" else _DROP_PENALTY
        routing.AddDisjunction([index], penalty)

    # ── Search parameters ─────────────────────────────────────────────────
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.FromMilliseconds(_SOLVER_TIME_LIMIT_MS)

    # ── Solve ─────────────────────────────────────────────────────────────
    solution = routing.SolveWithParameters(search_params)

    if not solution:
        print("[DVRP] Solver returned no feasible solution")
        return None

    # ── Extract routes ────────────────────────────────────────────────────
    routes: dict[int, dict[str, Any]] = {}
    all_served: set[int] = set()

    for v in range(num_vehicles):
        tech_id = int(technicians[v]["id"])
        index = routing.Start(v)
        sequence: list[dict[str, Any]] = []
        route_distance_m = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            next_index = solution.Value(routing.NextVar(index))
            route_distance_m += routing.GetArcCostForVehicle(index, next_index, v)

            if node >= num_vehicles:
                req_i = node - num_vehicles
                sequence.append(requests[req_i])
                all_served.add(req_i)

            index = next_index

        routes[tech_id] = {
            "sequence": sequence,
            "total_distance_km": round(route_distance_m / 1000.0, 2),
        }

    unserved = [
        str(requests[i].get("id", ""))
        for i in range(num_requests)
        if i not in all_served
    ]

    print(
        f"[DVRP] Routes updated — "
        f"{sum(len(r['sequence']) for r in routes.values())} served, "
        f"{len(unserved)} unserved"
    )

    return {"routes": routes, "unserved": unserved}
