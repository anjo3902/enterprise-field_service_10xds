from pathlib import Path
import sys

# Allow running this file directly: python tests/test_dispatch_decision_engine.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.dispatch_decision_engine import choose_best_technician

distance_results = [
    {"technician_id": 1, "distance_km": 1.2, "duration_min": 5},
    {"technician_id": 2, "distance_km": 2.0, "duration_min": 8},
    {"technician_id": 3, "distance_km": 0.5, "duration_min": 2}
]

technicians = [
    {"id": 1, "current_jobs": 2, "max_jobs_per_day": 6},
    {"id": 2, "current_jobs": 0, "max_jobs_per_day": 6},
    {"id": 3, "current_jobs": 5, "max_jobs_per_day": 6}
]

result = choose_best_technician(
    distance_results,
    technicians,
    "critical"
)

print(result)