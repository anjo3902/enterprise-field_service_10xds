from __future__ import annotations

import os
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import API_BASE_URL, REQUEST_TIMEOUT

ADMIN_EMAIL = os.getenv('E2E_ADMIN_EMAIL', 'e2e.admin@test.com')
ADMIN_PASSWORD = os.getenv('E2E_ADMIN_PASSWORD', 'E2eTest9999')
TEST_RUN_FILE = PROJECT_ROOT / 'tests' / 'test_run_id.txt'


def _format_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    return f'status={response.status_code}, payload={payload}'


def _login_admin() -> str:
    response = requests.post(
        f'{API_BASE_URL}/auth/login',
        json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload.get('token') or payload.get('access_token')
    if not token:
        raise RuntimeError(f'Admin login token missing: {payload}')
    return token


def _resolve_test_run_id() -> str | None:
    env_id = (os.getenv('TEST_RUN_ID') or '').strip()
    if env_id:
        return env_id

    if TEST_RUN_FILE.exists():
        stored = TEST_RUN_FILE.read_text(encoding='utf-8').strip()
        return stored or None

    return None


def cleanup() -> None:
    test_run_id = _resolve_test_run_id()
    if not test_run_id:
        print('No TEST_RUN_ID found. Set TEST_RUN_ID or run tests to create tests/test_run_id.txt.')
        return

    token = _login_admin()
    headers = {'Authorization': f'Bearer {token}'}

    list_res = requests.get(
        f'{API_BASE_URL}/admin/test-data',
        params={'test_run_id': test_run_id},
        headers=headers,
        timeout=REQUEST_TIMEOUT,
    )

    if list_res.status_code != 200:
        raise RuntimeError(f'Failed to list test data: {_format_error(list_res)}')

    payload = list_res.json() or {}
    records = payload.get('records') or []

    if not records:
        print(f'No test records found for test_run_id={test_run_id}')
        return

    deleted = 0
    for record in records:
        request_id = record.get('id')
        if not request_id:
            continue
        delete_res = requests.delete(
            f'{API_BASE_URL}/admin/service-requests/{request_id}',
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        if delete_res.status_code == 200:
            deleted += 1
        else:
            print(f'Failed to delete {request_id}: {_format_error(delete_res)}')

    print(f'Cleanup complete: deleted {deleted}/{len(records)} test records (test_run_id={test_run_id})')

    try:
        TEST_RUN_FILE.unlink(missing_ok=True)
    except Exception:
        pass


if __name__ == '__main__':
    cleanup()
