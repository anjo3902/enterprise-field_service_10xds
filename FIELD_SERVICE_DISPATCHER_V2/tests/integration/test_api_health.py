from pathlib import Path
import sys

import pytest
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import API_BASE_URL, REQUEST_TIMEOUT


def _format_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    return f'status={response.status_code}, payload={payload}'


def test_api_home_endpoint_running():
    try:
        response = requests.get(f'{API_BASE_URL}/', timeout=REQUEST_TIMEOUT)
    except requests.RequestException as exc:
        pytest.fail(f'GET {API_BASE_URL}/ failed: {exc}', pytrace=False)

    assert response.status_code == 200, _format_error(response)

    payload = response.json()
    assert isinstance(payload, dict), f'Unexpected payload type: {type(payload).__name__}'
    assert payload.get('service'), f"Missing 'service' in payload: {payload}"
