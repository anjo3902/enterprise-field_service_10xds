from pathlib import Path
import sys

# Allow running this file directly: python tests/test_dispatch_optimizer.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
	sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.skill_matcher import get_eligible_technicians
from dispatch_engine.distance_engine import calculate_distance_matrix
from dispatch_engine.dispatch_optimizer import select_best_technician


fault = "burst_pipe"
severity = "critical"

# Step 1: find technicians
techs = get_eligible_technicians(fault, severity)

# Step 2: calculate distance
job_lat = 9.9312
job_lon = 76.2673

distance_data = calculate_distance_matrix(techs, job_lat, job_lon)

# Step 3: optimization
best_tech = select_best_technician(distance_data, techs, severity)

print("Best Technician:")
print(best_tech)