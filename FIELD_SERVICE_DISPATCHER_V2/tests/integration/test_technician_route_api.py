from pathlib import Path
import sys

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import TEST_TECHNICIAN_ID
from database.postgres_client import engine
from dispatch_engine.route_planner import plan_technician_route


def test_technician_jobs_api():
    with engine.connect() as conn:
        jobs = conn.execute(
            text(
                """
                SELECT id, status
                FROM service_requests
                WHERE assigned_technician = :technician_id
                  AND status IN ('assigned', 'in_progress')
                ORDER BY id DESC
                """
            ),
            {'technician_id': TEST_TECHNICIAN_ID},
        ).mappings().all()

    assert isinstance(jobs, list)
    if jobs:
        assert jobs[0]['status'] in {'assigned', 'in_progress'}


def test_technician_route_api():
    data = plan_technician_route(TEST_TECHNICIAN_ID)
    assert 'route_order' in data, f"Missing 'route_order' in payload: {data}"
    assert 'total_jobs' in data, f"Missing 'total_jobs' in payload: {data}"
    assert 'estimated_total_distance_km' in data, f"Missing 'estimated_total_distance_km' in payload: {data}"
