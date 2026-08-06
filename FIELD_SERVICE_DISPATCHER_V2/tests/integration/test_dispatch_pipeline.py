from pathlib import Path
import json
import sys

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import SAMPLE_REQUEST_JSON
from database.postgres_client import engine
from dispatch_engine.dispatch_service import assign_technician


def _load_sample_request() -> dict:
    with open(SAMPLE_REQUEST_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)


def test_dispatch_pipeline_end_to_end():
    req = _load_sample_request()
    result = assign_technician(
        fault_type=req.get('fault_type', 'burst_pipe'),
        severity=req.get('severity', 'high'),
        job_lat=req.get('latitude', 9.9312),
        job_lon=req.get('longitude', 76.2673),
        customer_name=req.get('customer_name', 'Integration Test User'),
        contact_number=req.get('contact', '9999999999'),
        location_text=req.get('location', 'Kochi, Kerala'),
        description=req.get('description', 'Dispatch integration test'),
        diagnosis_confidence=0.92,
    )

    assert 'error' not in result, f'Dispatch pipeline failed: {result}'
    assert result.get('request_id') is not None, f'Missing request_id: {result}'
    assert result.get('assigned_technician') is not None, f'Missing assigned_technician: {result}'
    assert result.get('distance_km') is not None, f'Missing distance_km: {result}'
    assert result.get('duration_min') is not None, f'Missing duration_min: {result}'

    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT assigned_technician, distance_km, travel_time_min, status
                FROM service_requests
                WHERE id = :request_id
                """
            ),
            {'request_id': result['request_id']},
        ).mappings().first()

    assert row is not None, f"service_requests row not found for id={result['request_id']}"
    assert row['assigned_technician'] == result['assigned_technician']
    assert row['distance_km'] is not None
    assert row['travel_time_min'] is not None
    assert row['status'] == 'assigned'
