from pathlib import Path
import sys

# Allow running this file directly: python tests/test_dispatch_service.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.dispatch_service import assign_technician


result = assign_technician(
    fault_type="burst_pipe",
    severity="critical",
    job_lat=9.9312,
    job_lon=76.2673
)

print(result)