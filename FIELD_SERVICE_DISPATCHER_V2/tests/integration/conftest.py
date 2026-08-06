from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.config import API_BASE_URL


def _health_ok(timeout_sec: float = 1.5) -> bool:
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=timeout_sec)
        return response.status_code == 200
    except requests.RequestException:
        return False


@pytest.fixture(scope="session", autouse=True)
def ensure_backend_server():
    """Ensure backend API is running for integration tests."""
    if _health_ok():
        # Reuse externally running server.
        yield
        return

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "api_server:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    started = False
    for _ in range(40):
        if _health_ok(timeout_sec=2.0):
            started = True
            break
        time.sleep(0.5)

    if not started:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        pytest.fail("Failed to start backend server at /health", pytrace=False)

    try:
        yield
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
