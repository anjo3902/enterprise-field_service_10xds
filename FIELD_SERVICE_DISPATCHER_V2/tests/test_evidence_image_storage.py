import asyncio
from pathlib import Path

from fastapi.responses import FileResponse, RedirectResponse

import api_server
from backend.utils import storage_helper


def test_upload_bytes_to_gcs_returns_gs_uri(monkeypatch):
    observed = {}

    class FakeBlob:
        cache_control = ""

        def __init__(self, object_name: str):
            self.object_name = object_name

        def upload_from_string(self, content: bytes, content_type: str):
            observed["content"] = content
            observed["content_type"] = content_type
            observed["object_name"] = self.object_name
            observed["cache_control"] = self.cache_control

    class FakeBucket:
        def blob(self, object_name: str):
            return FakeBlob(object_name)

    class FakeClient:
        def bucket(self, bucket_name: str):
            observed["bucket_name"] = bucket_name
            return FakeBucket()

    monkeypatch.setattr(storage_helper.storage, "Client", lambda: FakeClient())

    result = storage_helper.upload_bytes_to_gcs(
        content=b"sample-bytes",
        object_name="service_requests/evidence.jpg",
        content_type="image/jpeg",
        bucket_name="anjo-storage",
    )

    assert result.gs_uri == "gs://anjo-storage/service_requests/evidence.jpg"
    assert result.object_name == "service_requests/evidence.jpg"
    assert observed["bucket_name"] == "anjo-storage"
    assert observed["content"] == b"sample-bytes"
    assert observed["content_type"] == "image/jpeg"


def test_customer_image_endpoint_redirects_for_gcs(monkeypatch):
    monkeypatch.setattr(
        api_server.db_client,
        "get_request_by_id",
        lambda _request_id: {
            "customer_id": 7,
            "customer_email": "customer@example.com",
            "image_url": "gs://anjo-storage/service_requests/abc.jpg",
            "evidence_image_name": "abc.jpg",
        },
    )
    monkeypatch.setattr(
        api_server,
        "generate_signed_url_from_gs_uri",
        lambda *_args, **_kwargs: "https://signed.example/customer.jpg",
    )

    response = asyncio.run(
        api_server.customer_my_request_image(
            "1",
            current_user={"id": 7, "email": "customer@example.com", "role": "customer"},
        )
    )

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 307
    assert response.headers["location"] == "https://signed.example/customer.jpg"


def test_admin_image_endpoint_redirects_for_gcs(monkeypatch):
    monkeypatch.setattr(
        api_server.db_client,
        "get_request_by_id",
        lambda _request_id: {
            "image_url": "gs://anjo-storage/service_requests/admin.jpg",
            "evidence_image_name": "admin.jpg",
        },
    )
    monkeypatch.setattr(
        api_server,
        "generate_signed_url_from_gs_uri",
        lambda *_args, **_kwargs: "https://signed.example/admin.jpg",
    )

    response = asyncio.run(
        api_server.admin_service_request_image(
            "99",
            current_user={"id": 1, "email": "admin@example.com", "role": "admin"},
        )
    )

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 307
    assert response.headers["location"] == "https://signed.example/admin.jpg"


def test_technician_image_endpoint_redirects_for_gcs(monkeypatch):
    monkeypatch.setattr(
        api_server.db_client,
        "get_request_by_id",
        lambda _request_id: {
            "assigned_technician": 413,
            "image_url": "gs://anjo-storage/service_requests/tech.jpg",
            "evidence_image_name": "tech.jpg",
        },
    )
    monkeypatch.setattr(
        api_server,
        "generate_signed_url_from_gs_uri",
        lambda *_args, **_kwargs: "https://signed.example/tech.jpg",
    )

    response = asyncio.run(
        api_server.technician_job_image(
            "50",
            current_user={"id": 2, "email": "tech@example.com", "role": "technician", "technician_id": 413},
        )
    )

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 307
    assert response.headers["location"] == "https://signed.example/tech.jpg"


def test_customer_image_endpoint_serves_local_fallback(monkeypatch):
    uploads_dir = Path(api_server.__file__).resolve().parent / "uploads" / "service_requests"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    local_file = uploads_dir / "pytest_local_fallback.jpg"
    local_file.write_bytes(b"local-bytes")

    try:
        monkeypatch.setattr(
            api_server.db_client,
            "get_request_by_id",
            lambda _request_id: {
                "customer_id": 8,
                "customer_email": "legacy@example.com",
                "evidence_image_path": "uploads/service_requests/pytest_local_fallback.jpg",
                "evidence_image_name": "legacy.jpg",
            },
        )

        response = asyncio.run(
            api_server.customer_my_request_image(
                "2",
                current_user={"id": 8, "email": "legacy@example.com", "role": "customer"},
            )
        )

        assert isinstance(response, FileResponse)
        assert Path(response.path).resolve() == local_file.resolve()
    finally:
        local_file.unlink(missing_ok=True)
