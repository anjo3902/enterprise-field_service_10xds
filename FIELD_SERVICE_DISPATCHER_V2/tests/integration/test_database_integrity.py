from pathlib import Path
import sys

import psycopg2
from dispatch_engine.dispatch_service import assign_technician

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import db_connect_kwargs


def test_service_requests_dispatch_integrity():
    dispatch_result = assign_technician(
        fault_type='burst_pipe',
        severity='high',
        job_lat=9.9312,
        job_lon=76.2673,
        customer_name='DB Integrity Test',
        contact_number='9000000000',
        location_text='Kochi, Kerala',
        description='Database integration validation',
        diagnosis_confidence=0.9,
    )

    assert 'error' not in dispatch_result, f'Dispatch pipeline failed: {dispatch_result}'
    request_id = dispatch_result['request_id']

    conn = psycopg2.connect(**db_connect_kwargs())
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, assigned_technician, status, assigned_at
                FROM service_requests
                WHERE id = %s
                """
                ,
                (request_id,),
            )
            row = cur.fetchone()

            assert row is not None, f'service_requests row not found for id={request_id}'

            request_id, assigned_technician, status, assigned_at = row
            assert request_id is not None, 'service_requests.id should exist'
            assert status is not None, 'service_requests.status should be populated'
            assert status == 'assigned', f"Expected status 'assigned', got '{status}'"
            assert assigned_technician is not None, 'assigned_technician should be set'
            assert assigned_at is not None, 'assigned_at should be set after technician assignment'
    finally:
        conn.close()
