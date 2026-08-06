from pathlib import Path
import sys

# Allow running this file directly: python tests/test_route_optimizer.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.route_optimizer import optimize_route

locations = [

    # technician start
    (9.9312, 76.2673),

    # jobs
    (9.95, 76.28),
    (9.90, 76.24),
    (9.97, 76.26)

]

route = optimize_route(locations)

print("Optimized Route:", route)