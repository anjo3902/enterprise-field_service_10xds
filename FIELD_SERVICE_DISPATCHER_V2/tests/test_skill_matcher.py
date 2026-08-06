from pathlib import Path
import sys

# Allow running this file directly: python tests/test_skill_matcher.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.skill_matcher import get_eligible_technicians

fault = "burst_pipe"
severity = "critical"

techs = get_eligible_technicians(fault, severity)

print("Eligible technicians:", len(techs))

for t in techs[:5]:
    print(t)