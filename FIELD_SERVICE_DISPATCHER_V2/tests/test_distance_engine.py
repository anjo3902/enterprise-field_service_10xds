from pathlib import Path
import sys

# Allow running this file directly: python tests/test_distance_engine.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
	sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.skill_matcher import get_eligible_technicians
from dispatch_engine.distance_engine import calculate_distance_matrix


fault = "burst_pipe"
severity = "critical"

# Step 1: find eligible technicians
techs = get_eligible_technicians(fault, severity)

# Example service request location (Kochi)
job_lat = 9.9312
job_lon = 76.2673

distances = calculate_distance_matrix(techs, job_lat, job_lon)

print(distances[:5])