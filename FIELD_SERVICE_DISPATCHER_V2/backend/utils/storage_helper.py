"""
Utility helpers for storing and serving evidence images via Google Cloud Storage.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import timedelta
from pathlib import PurePosixPath

from google.cloud import storage

# Reuse credential bootstrap side effects from central GCP config.
from config import gcp_config as _gcp_config  # noqa: F401

LOGGER = logging.getLogger(__name__)

_DEFAULT_SIGNED_URL_TTL_SECONDS = 600


@dataclass(frozen=True)
class GCSUploadResult:
    gs_uri: str
    object_name: str


def detect_evidence_path_kind(path: str | None) -> str:
    """Return one of: empty, gcs, http, local."""
    value = str(path or "").strip()
    if not value:
        return "empty"

    lowered = value.lower()
    if lowered.startswith("gs://"):
        return "gcs"
    if lowered.startswith("http://") or lowered.startswith("https://"):
        return "http"
    return "local"


def build_object_name(prefix: str, filename: str) -> str:
    """Build a safe object name under a single path prefix."""
    safe_name = PurePosixPath(filename).name
    safe_prefix = str(prefix or "").strip().strip("/")
    if safe_prefix:
        return f"{safe_prefix}/{safe_name}"
    return safe_name


def _parse_gs_uri(gs_uri: str) -> tuple[str, str]:
    value = str(gs_uri or "").strip()
    if not value.lower().startswith("gs://"):
        raise ValueError("Expected a gs:// URI")

    without_scheme = value[5:]
    parts = without_scheme.split("/", 1)
    if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
        raise ValueError("Invalid gs:// URI format")

    return parts[0].strip(), parts[1].strip()


def _resolve_signed_url_ttl(ttl_seconds: int | None) -> int:
    if ttl_seconds is None:
        raw = os.getenv("GCS_SIGNED_URL_TTL_SECONDS", str(_DEFAULT_SIGNED_URL_TTL_SECONDS))
        try:
            parsed = int(raw)
        except (TypeError, ValueError):
            parsed = _DEFAULT_SIGNED_URL_TTL_SECONDS
    else:
        parsed = int(ttl_seconds)

    return max(60, parsed)


def upload_bytes_to_gcs(
    content: bytes,
    object_name: str,
    content_type: str,
    bucket_name: str | None = None,
) -> GCSUploadResult:
    """Upload bytes to GCS and return gs:// URI + object name."""
    resolved_bucket = str(bucket_name or os.getenv("GCS_BUCKET_NAME", "")).strip()
    if not resolved_bucket:
        raise RuntimeError("GCS_BUCKET_NAME is not configured")

    client = storage.Client()
    bucket = client.bucket(resolved_bucket)
    blob = bucket.blob(object_name)
    blob.cache_control = "private, max-age=0, no-transform"
    blob.upload_from_string(content, content_type=content_type)

    prefix = object_name.split("/", 1)[0] if "/" in object_name else object_name
    LOGGER.info("Evidence image uploaded to GCS: bytes=%s prefix=%s", len(content), prefix)

    return GCSUploadResult(
        gs_uri=f"gs://{resolved_bucket}/{object_name}",
        object_name=object_name,
    )


def generate_signed_url_from_gs_uri(gs_uri: str, ttl_seconds: int | None = None) -> str:
    """Generate a signed download URL for a gs:// URI."""
    bucket_name, object_name = _parse_gs_uri(gs_uri)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    ttl = _resolve_signed_url_ttl(ttl_seconds)

    return blob.generate_signed_url(
        version="v4",
        method="GET",
        expiration=timedelta(seconds=ttl),
    )
