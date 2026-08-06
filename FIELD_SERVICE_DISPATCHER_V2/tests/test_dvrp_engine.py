"""
tests/test_dvrp_engine.py — Validate the DVRP global optimizer and integration.

Tests:
  1. DVRP solver with synthetic multi-request/multi-tech data (pure compute)
  2. calculate_travel_score still works
  3. Route state manager cooldown & reroute limits
  4. Full integration: priority monitor single cycle (live Firestore)

Usage:
    python tests/test_dvrp_engine.py
"""

from pathlib import Path
import sys
import time

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ──────────────────────────────────────────────────────────────────────────────
# Test 1: DVRP solver — pure compute, no DB
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 1: DVRP optimize_routes (synthetic data)")
print("=" * 60)

from dispatch_engine.dvrp_optimizer import optimize_routes

test_requests = [
    {"id": "R1", "latitude": 10.0, "longitude": 76.3, "severity": "critical"},
    {"id": "R2", "latitude": 10.05, "longitude": 76.28, "severity": "high"},
    {"id": "R3", "latitude": 9.95, "longitude": 76.35, "severity": "medium"},
    {"id": "R4", "latitude": 10.1, "longitude": 76.25, "severity": "low"},
    {"id": "R5", "latitude": 9.9, "longitude": 76.32, "severity": "critical"},
]

test_technicians = [
    {
        "id": 101, "latitude": 10.02, "longitude": 76.27,
        "max_jobs_per_day": 6, "current_jobs": 1,
    },
    {
        "id": 102, "latitude": 9.92, "longitude": 76.33,
        "max_jobs_per_day": 5, "current_jobs": 0,
    },
]

result = optimize_routes(test_requests, test_technicians)
assert result is not None, "DVRP solver returned None — expected a solution"
assert "routes" in result, "Missing 'routes' key"
assert "unserved" in result, "Missing 'unserved' key"

total_served = sum(len(r["sequence"]) for r in result["routes"].values())
print(f"  Served: {total_served}/{len(test_requests)}")
print(f"  Unserved: {result['unserved']}")
for tech_id, info in result["routes"].items():
    ids = [r["id"] for r in info["sequence"]]
    print(f"  Tech {tech_id}: {ids} ({info['total_distance_km']} km)")
assert total_served + len(result["unserved"]) == len(test_requests)
print("  PASS\n")

# ──────────────────────────────────────────────────────────────────────────────
# Test 2: DVRP handles empty/degenerate input gracefully
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 2: DVRP edge cases")
print("=" * 60)

assert optimize_routes([], test_technicians) is None, "Expected None for empty requests"
assert optimize_routes(test_requests, []) is None, "Expected None for empty technicians"
print("  Edge cases handled correctly")
print("  PASS\n")

# ──────────────────────────────────────────────────────────────────────────────
# Test 3: route_state_manager cooldown & reroute limits
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 3: Route state manager — cooldown & limits")
print("=" * 60)

from dispatch_engine.route_state_manager import (
    should_optimize,
    record_optimization,
    can_reroute_request,
    record_reroute,
    get_cached_routes,
    COOLDOWN_SECONDS,
)

# After recording an optimization the cooldown should block the next call.
record_optimization({"routes": {}, "unserved": []})
assert not should_optimize(has_critical=True, pending_count=10), \
    "Expected cooldown to block optimization"
print(f"  Cooldown active ({COOLDOWN_SECONDS}s) — blocked as expected")

# Reroute limit: first reroute should succeed, second should be blocked.
assert can_reroute_request("TEST_REQ_XYZ"), "First reroute should be allowed"
record_reroute("TEST_REQ_XYZ")
assert not can_reroute_request("TEST_REQ_XYZ"), "Second reroute should be blocked"
print("  Reroute limit enforced (max=1)")

# Cached routes
assert get_cached_routes() is not None, "Cache should have last result"
print("  Cache stores last optimization result")
print("  PASS\n")

# ──────────────────────────────────────────────────────────────────────────────
# Test 4: calculate_travel_score still works (from route_optimizer)
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 4: calculate_travel_score (backward compat)")
print("=" * 60)

from dispatch_engine.route_optimizer import calculate_travel_score

score = calculate_travel_score(
    {"latitude": 9.9312, "longitude": 76.2673},
    {"latitude": 10.0, "longitude": 76.3, "current_jobs": 3},
)
assert isinstance(score, float) and score > 0
print(f"  Score: {score}")
print("  PASS\n")

# ──────────────────────────────────────────────────────────────────────────────
# Test 5: Priority monitor single cycle (live Firestore)
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 5: check_for_critical_requests (single scan)")
print("=" * 60)

from dispatch_engine.priority_monitor import check_for_critical_requests

evaluated = check_for_critical_requests()
print(f"  Evaluated {evaluated} request(s) this cycle")
assert isinstance(evaluated, int)
print("  PASS\n")

# ──────────────────────────────────────────────────────────────────────────────
# Test 6: All dispatch engine imports remain clean
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("TEST 6: Import integrity (no circular imports)")
print("=" * 60)

from dispatch_engine.dispatch_service import assign_technician
from dispatch_engine.dispatch_optimizer import select_best_technician
from dispatch_engine.reroute_service import evaluate_reroute, apply_dvrp_routes
from dispatch_engine.dvrp_optimizer import optimize_routes as _
from dispatch_engine.route_state_manager import should_optimize as _s
from dispatch_engine.route_optimizer import optimize_route
print("  All modules imported without errors")
print("  PASS\n")

print("=" * 60)
print("All DVRP engine tests passed.")
print("=" * 60)
