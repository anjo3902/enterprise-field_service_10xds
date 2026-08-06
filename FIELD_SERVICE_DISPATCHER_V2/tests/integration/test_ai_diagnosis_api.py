from pathlib import Path
import json
import sys

import pytest
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import API_BASE_URL, REQUEST_TIMEOUT, SAMPLE_REQUEST_JSON, TEST_IMAGE_PATH


def _format_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    return f'status={response.status_code}, payload={payload}'


def _load_sample_request() -> dict:
    with open(SAMPLE_REQUEST_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)


def test_ai_diagnosis_api_report_issue():
    assert TEST_IMAGE_PATH.exists(), f'Sample image not found: {TEST_IMAGE_PATH}'

    req = _load_sample_request()
    data = {
        'description': req['description'],
        'location': req['location'],
        'contact': req['contact'],
    }

    with open(TEST_IMAGE_PATH, 'rb') as image_file:
        files = {'image': (TEST_IMAGE_PATH.name, image_file, 'image/jpeg')}
        try:
            response = requests.post(
                f'{API_BASE_URL}/diagnose',
                data=data,
                files=files,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            pytest.fail(f'POST {API_BASE_URL}/diagnose failed: {exc}', pytrace=False)

    assert response.status_code == 200, _format_error(response)
    payload = response.json()

    assert payload.get('fault_type'), f"Missing 'fault_type' in payload: {payload}"
    assert payload.get('final_severity'), f"Missing 'final_severity' in payload: {payload}"
    assert payload.get('confidence') is not None, f"Missing 'confidence' in payload: {payload}"
