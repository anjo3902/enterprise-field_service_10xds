from __future__ import annotations

import os
import time
from pathlib import Path

import pytest
import requests

from tests.config import API_BASE_URL, REQUEST_TIMEOUT

ADMIN_EMAIL = os.getenv('E2E_ADMIN_EMAIL', 'e2e.admin@test.com')
ADMIN_PASSWORD = os.getenv('E2E_ADMIN_PASSWORD', 'E2eTest9999')
TECH_EMAIL = os.getenv('E2E_TECH_EMAIL', 'e2e.tech@test.com')
TECH_PASSWORD = os.getenv('E2E_TECH_PASSWORD', 'E2eTest9999')

TEST_RUN_FILE = Path(__file__).resolve().parent / 'test_run_id.txt'


def _format_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    return f'status={response.status_code}, payload={payload}'


def _auth_headers(token: str) -> dict:
    return {'Authorization': f'Bearer {token}'}


def _login(email: str, password: str) -> str:
    response = requests.post(
        f'{API_BASE_URL}/auth/login',
        json={'email': email, 'password': password},
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 200, _format_error(response)
    payload = response.json()
    token = payload.get('token') or payload.get('access_token')
    assert token, f'Login token missing in payload: {payload}'
    return token


def _get_or_create_test_run_id() -> str:
    env_id = (os.getenv('TEST_RUN_ID') or '').strip()
    if env_id:
        return env_id

    if TEST_RUN_FILE.exists():
        existing = TEST_RUN_FILE.read_text(encoding='utf-8').strip()
        if existing:
            return existing

    run_id = str(int(time.time() * 1000))
    TEST_RUN_FILE.write_text(run_id, encoding='utf-8')
    return run_id


def _ensure_technician_linked(admin_token: str, tech_token: str) -> int:
    tech_headers = _auth_headers(tech_token)
    probe = requests.get(
        f'{API_BASE_URL}/technician/jobs',
        headers=tech_headers,
        timeout=REQUEST_TIMEOUT,
    )
    if probe.status_code == 200:
        payload = probe.json() or {}
        technician_id = payload.get('technician_id')
        if technician_id:
            return int(technician_id)

    admin_headers = _auth_headers(admin_token)
    techs_res = requests.get(
        f'{API_BASE_URL}/admin/technicians',
        headers=admin_headers,
        timeout=REQUEST_TIMEOUT,
    )
    assert techs_res.status_code == 200, _format_error(techs_res)
    techs = techs_res.json() or []

    sorted_techs = sorted(techs, key=lambda t: -(int(t.get('current_jobs') or 0)))

    for tech in sorted_techs:
        code = (tech.get('technician_code') or '').strip()
        if not code:
            continue
        link_res = requests.post(
            f'{API_BASE_URL}/technician/link-profile',
            json={'technician_code': code},
            headers=tech_headers,
            timeout=REQUEST_TIMEOUT,
        )
        if link_res.status_code == 200:
            payload = link_res.json() or {}
            return int(payload.get('technician_id') or tech.get('id'))
        if link_res.status_code == 409:
            continue

    pytest.fail('Unable to link technician account for tests', pytrace=False)


def _seed_assigned_job(admin_token: str, technician_id: int, test_run_id: str) -> dict:
    admin_headers = _auth_headers(admin_token)
    response = requests.post(
        f'{API_BASE_URL}/admin/test/seed',
        json={
            'pending_count': 1,
            'technician_id': technician_id,
            'test_run_id': test_run_id,
        },
        headers=admin_headers,
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 200, _format_error(response)
    payload = response.json() or {}
    assigned_id = payload.get('assigned_job_id')
    assert assigned_id, f'Assigned job not returned: {payload}'
    return {'id': assigned_id}


def _start_job(tech_token: str, job_id: str | int) -> None:
    tech_headers = _auth_headers(tech_token)
    response = requests.post(
        f'{API_BASE_URL}/api/jobs/{job_id}/start',
        headers=tech_headers,
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 200, _format_error(response)


def _complete_job(tech_token: str, job_id: str | int) -> None:
    tech_headers = _auth_headers(tech_token)
    response = requests.put(
        f'{API_BASE_URL}/technician/jobs/{job_id}/complete',
        headers=tech_headers,
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 200, _format_error(response)


def _get_route(tech_token: str) -> dict:
    tech_headers = _auth_headers(tech_token)
    response = requests.get(
        f'{API_BASE_URL}/technician/my-route',
        headers=tech_headers,
        timeout=REQUEST_TIMEOUT,
    )
    assert response.status_code == 200, _format_error(response)
    return response.json() or {}


def test_route_updates_after_completion():
    admin_token = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    tech_token = _login(TECH_EMAIL, TECH_PASSWORD)
    technician_id = _ensure_technician_linked(admin_token, tech_token)
    test_run_id = _get_or_create_test_run_id()

    job1 = _seed_assigned_job(admin_token, technician_id, test_run_id)
    _seed_assigned_job(admin_token, technician_id, test_run_id)

    _start_job(tech_token, job1['id'])

    route_before = _get_route(tech_token)
    order_before = route_before.get('route_order') or []
    assert any(str(jid) == str(job1['id']) for jid in order_before), (
        f"Expected job {job1['id']} in route order before completion: {order_before}"
    )

    _complete_job(tech_token, job1['id'])

    order_after = order_before
    for _ in range(6):
        route_after = _get_route(tech_token)
        order_after = route_after.get('route_order') or []
        if all(str(jid) != str(job1['id']) for jid in order_after):
            break
        time.sleep(1)

    assert all(str(jid) != str(job1['id']) for jid in order_after)
    assert len(order_after) < len(order_before)
