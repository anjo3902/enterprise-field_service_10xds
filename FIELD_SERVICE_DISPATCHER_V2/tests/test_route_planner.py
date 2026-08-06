from pathlib import Path
import sys

# Allow running this file directly: python tests/test_route_planner.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
	sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.route_planner import plan_technician_route

result = plan_technician_route(413)

print(result)