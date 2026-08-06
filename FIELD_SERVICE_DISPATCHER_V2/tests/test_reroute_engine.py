"""
tests/test_reroute_engine.py — Validate the Dynamic Re-Routing Engine.

Runs evaluate_reroute() and calculate_travel_score() against the live
Firestore + technician data to verify:
  1. evaluate_reroute returns a valid action for a synthetic critical request.
  2. calculate_travel_score returns a positive numeric score.
  3. The priority monitor can scan without crashing (single cycle).

Usage:
    python tests/test_reroute_engine.py
"""

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.reroute_service import evaluate_reroute
from dispatch_engine.route_optimizer import calculate_travel_score
from dispatch_engine.priority_monitor import check_for_critical_requests

# ---------------------------------------------------------------------------
# Test 1: evaluate_reroute with a synthetic unassigned critical request
# ---------------------------------------------------------------------------

print("=" * 60)
print("TEST 1: evaluate_reroute (unassigned critical request)")
print("=" * 60)

synthetic_request = {
    "id": "__test_reroute_eval__",
    "fault_type": "burst_pipe",
    "severity": "critical",
    "latitude": 9.9312,
    "longitude": 76.2673,
    "assigned_technician": None,
    "status": "pending_review",
}

result = evaluate_reroute(synthetic_request)
print(f"  Action : {result.get('action')}")
print(f"  Reason : {result.get('reason', 'N/A')}")
print(f"  Full   : {result}")
assert result.get("action") in ("rerouted", "skipped", "assigned"), \
    f"Unexpected action: {result.get('action')}"
print("  ✓ PASS\n")

# ---------------------------------------------------------------------------
# Test 2: calculate_travel_score returns a sensible number
# ---------------------------------------------------------------------------

print("=" * 60)
print("TEST 2: calculate_travel_score")
print("=" * 60)

dummy_request = {"latitude": 9.9312, "longitude": 76.2673}
dummy_tech = {
    "latitude": 10.0,
    "longitude": 76.3,
    "current_jobs": 3,
}

score = calculate_travel_score(dummy_request, dummy_tech)
print(f"  Score: {score}")
assert isinstance(score, (int, float)) and score > 0, f"Bad score: {score}"
print("  ✓ PASS\n")

# ---------------------------------------------------------------------------
# Test 3: priority monitor single scan (should not crash)
# ---------------------------------------------------------------------------

print("=" * 60)
print("TEST 3: check_for_critical_requests (single scan)")
print("=" * 60)

evaluated = check_for_critical_requests()
print(f"  Evaluated {evaluated} request(s) this cycle")
assert isinstance(evaluated, int)
print("  ✓ PASS\n")

print("All reroute engine tests passed.")
