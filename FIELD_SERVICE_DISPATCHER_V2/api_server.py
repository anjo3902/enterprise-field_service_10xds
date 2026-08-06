"""
FastAPI REST API Server for Field Service Diagnosis System
This wraps the existing DiagnosisEngine for use with the React frontend
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, ValidationError
try:
    from pydantic import field_validator
except ImportError:
    from pydantic import validator as field_validator
from fastapi.middleware.gzip import GZipMiddleware
from datetime import datetime, timedelta
import threading
from dispatch_engine.dispatch_service import sync_technician_job_counters
from dispatch_engine.dispatch_service import assign_technician
from dispatch_engine.distance_engine import calculate_distance_matrix, get_distance
from dispatch_engine.skill_matcher import get_eligible_technicians
from dispatch_engine.dispatch_optimizer import select_best_technician
from database import USE_FIRESTORE, db_client
from ai_engine.hitl_triggers import sanitize_triggers
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import hashlib
import hmac
import json
import math
import mimetypes
import re
import os
import requests
from fastapi.responses import Response
import secrets
from pathlib import Path
from ai_engine.diagnosis_engine import DiagnosisEngine
from backend.services.mobile_gps_service import gps_router, mobile_gps_router, mobile_gps_page_router
from backend.utils.validators import (
    sanitize_text,
    validate_name,
    validate_password,
    validate_phone,
    validate_location,
)
from backend.utils.storage_helper import (
    build_object_name,
    detect_evidence_path_kind,
    generate_signed_url_from_gs_uri,
    upload_bytes_to_gcs,
)
from dispatch_engine.geo_validation import (
    get_coordinates_from_zone,
    is_valid_kerala_coordinate,
)
from dispatch_engine.service_zones import SERVICE_ZONES
from google.cloud import firestore  # noqa: F401 — needed for firestore.Query.DESCENDING
from vertexai.generative_models import Part, GenerationConfig
import asyncio
import time as _time_module
import logging
import requests
from fastapi.responses import Response
LOGGER = logging.getLogger(__name__)

# ----- Global KPI cache (TTL = 30 s) ------------------------------------
# Populated by /admin/kpis and invalidated whenever a review decision is written.
_KPI_CACHE: dict = {
    False: {"data": None, "ts": 0.0},
    True: {"data": None, "ts": 0.0},
}
_KPI_CACHE_TTL: float = 30.0  # seconds
REASSIGNMENT_REQUIRE_ADMIN_APPROVAL: bool = str(os.getenv("REASSIGNMENT_REQUIRE_ADMIN_APPROVAL", "true")).strip().lower() in {"1", "true", "yes"}


def _safe_int_from_env(name: str, default_value: int) -> int:
    raw = os.getenv(name, str(default_value))
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default_value


ALLOWED_EVIDENCE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_EVIDENCE_SUFFIXES: set[str] = {".jpg", ".jpeg", ".png", ".webp"}

GCS_BUCKET_NAME = str(os.getenv("GCS_BUCKET_NAME", "")).strip()
GCS_UPLOAD_PREFIX = str(os.getenv("GCS_UPLOAD_PREFIX", "service_requests")).strip().strip("/") or "service_requests"
GCS_SIGNED_URL_TTL_SECONDS = max(60, _safe_int_from_env("GCS_SIGNED_URL_TTL_SECONDS", 600))
MAX_EVIDENCE_IMAGE_BYTES = max(1024, _safe_int_from_env("MAX_EVIDENCE_IMAGE_BYTES", 2 * 1024 * 1024))
MAX_REPORT_PHOTO_BYTES = max(1024, _safe_int_from_env("MAX_REPORT_PHOTO_BYTES", 5 * 1024 * 1024))
IS_RENDER_RUNTIME = str(os.getenv("RENDER", "")).strip().lower() == "true"
LIVE_TRACKING_USE_GOOGLE_ETA = str(os.getenv("LIVE_TRACKING_USE_GOOGLE_ETA", "false")).strip().lower() == "true"
_API_RATE_LIMIT_PER_SECOND = max(1, _safe_int_from_env("API_RATE_LIMIT_PER_SECOND", 10))
_API_RATE_LIMIT_BUCKET = {
    "tokens": float(_API_RATE_LIMIT_PER_SECOND),
    "last_refill": _time_module.time(),
}
_API_RATE_LIMIT_LOCK = asyncio.Lock()


def _is_pending_hitl(d: dict) -> bool:
    """Single source of truth: a request is pending human review when
    requires_human_review is True OR its operational status is pending_review.
    Both the KPI counter and the /admin/pending-hitl endpoint use this.
    """
    return bool(d.get("requires_human_review")) or str(d.get("status") or "").lower() == "pending_review"


def _is_e2e_record(d: dict) -> bool:
    if d.get("e2e_test_record") or d.get("is_test_data") or d.get("generated_by") == "e2e" or d.get("created_by_test") or d.get("test_run_id"):
        return True
    email = str(d.get("customer_email") or "").lower()
    if any(x in email for x in ["e2e", "playwright", "mock", "dummy", "test"]):
        return True
    notes = str(d.get("review_notes") or "").lower()
    if any(x in notes for x in ["e2e_auth", "playwright", "automation", "synthetic", "dummy", "mock", "test scenario"]):
        return True
    phone = str(d.get("contact_number") or "")
    if phone == "9000000001":
        return True
    desc = str(d.get("description") or "").lower()
    if any(x in desc for x in ["e2e", "playwright", "automation", "synthetic", "dummy", "mock", "test scenario"]):
        return True
    return False


def _is_scoped_e2e_record(d: dict, test_run_id: str) -> bool:
    if not test_run_id:
        return False
    return str(d.get("test_run_id") or "") == test_run_id


def _iso_value(value):
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return value


def _summarize_e2e_service_request(doc_id: str, data: dict) -> dict:
    return {
        "id": str(doc_id),
        "customer_id": data.get("customer_id"),
        "customer_user_id": data.get("customer_user_id"),
        "assigned_technician": data.get("assigned_technician"),
        "status": data.get("status"),
        "test_run_id": data.get("test_run_id"),
        "is_e2e_test": bool(data.get("is_e2e_test")),
        "created_by_test": data.get("created_by_test"),
        "reassignment_requested": bool(data.get("reassignment_requested")),
        "reassignment_status": data.get("reassignment_status"),
        "reassignment_result": data.get("reassignment_result"),
        "reassignment_route_refreshed": bool(data.get("reassignment_route_refreshed")),
        "live_tracking_updated_at": _iso_value(data.get("live_tracking_updated_at")),
        "updated_at": _iso_value(data.get("updated_at")),
        "created_at": _iso_value(data.get("created_at")),
    }


def _summarize_e2e_technician(doc_id: str, data: dict) -> dict:
    return {
        "id": str(doc_id),
        "name": data.get("name"),
        "availability_state": data.get("availability_state"),
        "current_jobs": data.get("current_jobs"),
        "test_run_id": data.get("test_run_id"),
        "is_e2e_test": bool(data.get("is_e2e_test")),
        "created_by_test": data.get("created_by_test"),
        "zone": data.get("zone") or data.get("service_zone") or data.get("location_zone"),
        "current_latitude": data.get("current_latitude"),
        "current_longitude": data.get("current_longitude"),
    }


def _summarize_audit_log(doc_id: str, data: dict) -> dict:
    return {
        "id": str(doc_id),
        "request_id": data.get("request_id"),
        "test_run_id": data.get("test_run_id"),
        "event_type": data.get("event_type"),
        "timestamp": _iso_value(data.get("timestamp")),
        "route_refreshed": data.get("route_refreshed"),
        "reassignment_result": data.get("reassignment_result"),
    }


def _summarize_dispatch_result(doc_id: str, data: dict) -> dict:
    return {
        "id": str(doc_id),
        "service_request_id": data.get("service_request_id"),
        "test_run_id": data.get("test_run_id"),
        "source": data.get("source"),
        "created_by_test": data.get("created_by_test"),
        "status": data.get("status"),
    }


def _compute_global_kpis(exclude_e2e: bool = False, mode: str = 'all') -> dict:
    """Full unbounded Firestore scan — produces authoritative KPI counts.

    If `mode == 'finalized'`, only documents with a finalized operational
    status are considered (to match the finalized-table definition).
    """
    db = db_client._get_db()
    total = approved = rejected = pending_hitl = cancelled = unprocessed = 0
    final_statuses = {"completed", "approved", "rejected", "closed"}

    for doc in db.collection("service_requests").stream():
        d = doc.to_dict() or {}
        if exclude_e2e and _is_e2e_record(d):
            continue
        status = str(d.get("status") or "").lower()
        # If caller requested finalized-mode KPIs, skip non-finalized statuses
        if mode == 'finalized' and status not in final_statuses:
            continue
        total += 1
        review_decision = str(d.get("review_decision") or "").lower()
        ai_review = str(d.get("ai_review_status") or "").lower()

        if (review_decision in ("approved", "modify_approve", "auto_approved") or ai_review == "auto_approved"):
            approved += 1
        elif review_decision == "rejected":
            rejected += 1
        elif _is_pending_hitl(d):
            pending_hitl += 1
        elif status == "cancelled":
            cancelled += 1
        else:
            unprocessed += 1

    result = {
        "total": total,
        "approved": approved,
        "rejected": rejected,
        "pending_hitl": pending_hitl,
        "cancelled": cancelled,
        "unprocessed": unprocessed,
    }
    print(
        f"GLOBAL KPI (mode={mode}): total={total} approved={approved} rejected={rejected} "
        f"pending={pending_hitl} cancelled={cancelled} unprocessed={unprocessed}"
    )
    return result


def _compute_global_kpis_cached(exclude_e2e: bool = False, mode: str = 'all') -> dict:
    """Return cached KPIs if still fresh, otherwise recompute.

    Cache key is derived from the tuple (mode, exclude_e2e) so callers can
    request different KPI views (e.g., finalized vs all).
    """
    now = _time_module.time()
    key = f"{mode}:{'1' if exclude_e2e else '0'}"
    cache = _KPI_CACHE.get(key)
    if cache and cache["data"] is not None and now - cache["ts"] < _KPI_CACHE_TTL:
        return cache["data"]
    data = _compute_global_kpis(exclude_e2e=exclude_e2e, mode=mode)
    _KPI_CACHE[key] = {"data": data, "ts": now}
    return data


def _invalidate_kpi_cache() -> None:
    """Force the next /admin/kpis call to recompute from Firestore."""
    _KPI_CACHE.clear()


async def _enforce_api_rate_limit() -> None:
    now = _time_module.time()
    async with _API_RATE_LIMIT_LOCK:
        elapsed = now - _API_RATE_LIMIT_BUCKET["last_refill"]
        refill = elapsed * _API_RATE_LIMIT_PER_SECOND
        if refill > 0:
            _API_RATE_LIMIT_BUCKET["tokens"] = min(
                float(_API_RATE_LIMIT_PER_SECOND),
                _API_RATE_LIMIT_BUCKET["tokens"] + refill,
            )
            _API_RATE_LIMIT_BUCKET["last_refill"] = now
        if _API_RATE_LIMIT_BUCKET["tokens"] < 1.0:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        _API_RATE_LIMIT_BUCKET["tokens"] -= 1.0


# ----- Live technician tracking (SSE) -----------------------------------

_LIVE_TRACKING_STATE: dict[str, dict] = {}
_LIVE_TRACKING_SUBSCRIBERS: dict[str, set[asyncio.Queue]] = {}
_LIVE_TRACKING_LOCK = asyncio.Lock()
_LIVE_TRACKING_HISTORY_LIMIT = 30


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute distance between two points in kilometers."""
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def _tracking_speed_kmh() -> float:
    """Fixed speed for ETA calculation."""
    return 30.0


def _estimate_speed_kmh(distance_km: float) -> float:
    return 25.0 if distance_km <= 25.0 else 50.0


def _eta_peak_multiplier(now: datetime | None = None) -> float:
    current = now or datetime.utcnow()
    hour = current.hour
    if 7 <= hour < 10:
        return 1.2
    if 17 <= hour < 20:
        return 1.3
    return 1.0


def _compute_eta_minutes(distance_km: float, duration_min: float | None = None, speed_kmh: float | None = None) -> int:
    if duration_min is not None and duration_min > 0:
        return max(1, int(round(duration_min * _eta_peak_multiplier())))
    resolved_speed = speed_kmh if speed_kmh and speed_kmh > 0 else _estimate_speed_kmh(distance_km)
    return max(1, int(round(distance_km / resolved_speed * 60.0 * _eta_peak_multiplier())))


def _format_sse(event: str, data: dict) -> str:
    payload = json.dumps(
    data,
    ensure_ascii=True,
    separators=(",", ":"),
    default=str
)
    return f"event: {event}\ndata: {payload}\n\n"


def _parse_iso_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        cleaned = value.replace("Z", "+00:00") if value.endswith("Z") else value
        parsed = datetime.fromisoformat(cleaned)
        return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
    except Exception:
        return None


async def _publish_live_tracking(job_id: str, data: dict, event: str = "update") -> None:
    async with _LIVE_TRACKING_LOCK:
        queues = list(_LIVE_TRACKING_SUBSCRIBERS.get(str(job_id), set()))

    for queue in queues:
        try:
            queue.put_nowait({"event": event, "data": data})
        except asyncio.QueueFull:
            try:
                queue.get_nowait()
                queue.put_nowait({"event": event, "data": data})
            except Exception:
                continue

    print("[TRACKING] EVENT_EMITTED:", {
        "job_id": str(job_id),
        "status": data.get("status"),
        "timestamp": datetime.utcnow().isoformat(),
    })


async def _register_live_tracking(job_id: str, queue: asyncio.Queue) -> None:
    async with _LIVE_TRACKING_LOCK:
        _LIVE_TRACKING_SUBSCRIBERS.setdefault(str(job_id), set()).add(queue)


async def _unregister_live_tracking(job_id: str, queue: asyncio.Queue) -> None:
    async with _LIVE_TRACKING_LOCK:
        bucket = _LIVE_TRACKING_SUBSCRIBERS.get(str(job_id))
        if not bucket:
            return
        bucket.discard(queue)
        if not bucket:
            _LIVE_TRACKING_SUBSCRIBERS.pop(str(job_id), None)


async def _update_live_tracking_state(job_id: str, payload: dict, history_point: dict | None = None) -> list[dict]:
    async with _LIVE_TRACKING_LOCK:
        state = _LIVE_TRACKING_STATE.setdefault(str(job_id), {"history": []})
        state.update(payload)
        history = state.get("history", [])
        if history_point:
            history.append(history_point)
            if len(history) > _LIVE_TRACKING_HISTORY_LIMIT:
                history[:] = history[-_LIVE_TRACKING_HISTORY_LIMIT :]
        state["history"] = history
        return list(history)


def _normalize_tracking_snapshot(job: dict) -> dict:
    payload = dict(job.get("live_tracking") or {})
    if "job_id" not in payload:
        payload["job_id"] = str(job.get("id") or "")
    if "status" not in payload:
        payload["status"] = job.get("status") or ""
    if not payload.get("assigned_technician_name"):
        payload["assigned_technician_name"] = job.get("assigned_technician_name") or ""
    if not payload.get("assigned_technician_phone_number"):
        payload["assigned_technician_phone_number"] = job.get("assigned_technician_phone_number") or job.get("assigned_technician_phone") or ""
    if not payload.get("assigned_technician_zone"):
        payload["assigned_technician_zone"] = job.get("assigned_technician_zone") or ""
    payload["reassignment_requested"] = bool(job.get("reassignment_requested") or payload.get("reassignment_requested"))
    if job.get("reassignment_status") or payload.get("reassignment_status"):
        payload["reassignment_status"] = job.get("reassignment_status") or payload.get("reassignment_status")
    if job.get("reassignment_result") or payload.get("reassignment_result"):
        payload["reassignment_result"] = job.get("reassignment_result") or payload.get("reassignment_result")
    if payload.get("latitude") is None and job.get("assigned_technician_latitude") is not None:
        payload["latitude"] = job.get("assigned_technician_latitude")
    if payload.get("longitude") is None and job.get("assigned_technician_longitude") is not None:
        payload["longitude"] = job.get("assigned_technician_longitude")
    if not payload.get("updated_at"):
        payload["updated_at"] = job.get("assigned_at") or job.get("updated_at") or ""

    tech_lat = payload.get("latitude")
    tech_lng = payload.get("longitude")
    customer_lat = job.get("latitude")
    customer_lng = job.get("longitude")
    if tech_lat is not None and tech_lng is not None:
        payload["technician_location"] = {"lat": tech_lat, "lng": tech_lng}
    if customer_lat is not None and customer_lng is not None:
        payload["customer_location"] = {"lat": customer_lat, "lng": customer_lng}

    if payload.get("distance_km") is None and tech_lat is not None and tech_lng is not None and customer_lat is not None and customer_lng is not None:
        try:
            distance_km = _haversine_km(float(tech_lat), float(tech_lng), float(customer_lat), float(customer_lng))
            payload["distance_km"] = round(distance_km, 3)
            payload["eta_minutes"] = _compute_eta_minutes(distance_km, _tracking_speed_kmh())
        except Exception:
            pass
    return payload


# Initialize FastAPI app
app = FastAPI()
from dispatch_engine.route_planner import plan_technician_route
import tempfile
app.include_router(gps_router)
app.include_router(mobile_gps_router)
app.include_router(mobile_gps_page_router)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Enable CORS for React frontend AND mobile phones on LAN
# Mobile GPS page runs from the phone browser which has a different origin.
# We must allow all origins so the phone can POST /api/mobile-gps/update.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize the existing diagnosis engine
engine = DiagnosisEngine()

VALID_ROLES = {"customer", "technician", "admin"}
auth_scheme = HTTPBearer(auto_error=False)


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    role: str = "customer"
    technician_id: int | None = None
    technician_code: str | None = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        return validate_name(value)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        return validate_password(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return validate_phone(value)


class ReportIssueValidation(BaseModel):
    name: str
    email: EmailStr
    phone: str
    location: str

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        return validate_name(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return validate_phone(value)

    @field_validator("location")
    @classmethod
    def _validate_location(cls, value: str) -> str:
        return validate_location(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str | None = None


class WorkspaceTokenRequest(BaseModel):
    token: str
    job_id: str


class DispatchRequest(BaseModel):
    fault_type: str
    severity: str
    latitude: float
    longitude: float
    location: str | None = None
    description: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    contact_number: str | None = None


class StatusUpdateRequest(BaseModel):
    request_id: int
    status: str


class ReassignmentRequest(BaseModel):
    reason: str
    notes: str | None = None

    @field_validator("reason")
    @classmethod
    def _validate_reason(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        allowed = {
            "emergency_unavailable",
            "route_overload",
            "vehicle_issue",
            "customer_reschedule",
            "skill_mismatch",
            "safety_issue",
            "time_constraint",
        }
        if normalized not in allowed:
            raise ValueError("Invalid reassignment reason")
        return normalized


class ReassignmentDecisionRequest(BaseModel):
    decision: str
    notes: str | None = None

    @field_validator("decision")
    @classmethod
    def _validate_decision(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in {"approve", "reject"}:
            raise ValueError("Invalid reassignment decision")
        return normalized


def _calculate_sla_impact(request: dict, processing_started_at: datetime, processing_ended_at: datetime) -> dict:
    """Calculate SLA impact metrics for reassignment event."""
    def _coerce_timestamp(value: datetime | str | None) -> datetime | None:
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.replace(tzinfo=None) if getattr(value, "tzinfo", None) else value
            except Exception:
                return None
        if isinstance(value, str):
            return _parse_iso_timestamp(value)
        return None

    def _minutes_between(start: datetime | None, end: datetime | None) -> float | None:
        if not start or not end:
            return None
        return round(max(0, (end - start).total_seconds() / 60), 2)

    try:
        requested_at = _coerce_timestamp(request.get("reassignment_requested_at"))
        approved_at = _coerce_timestamp(request.get("reassignment_processing_at")) or _coerce_timestamp(processing_started_at)
        completed_at = _coerce_timestamp(request.get("reassignment_processed_at")) or _coerce_timestamp(processing_ended_at)

        processing_duration_minutes = _minutes_between(
            _coerce_timestamp(processing_started_at),
            _coerce_timestamp(processing_ended_at),
        )
        approval_delay_minutes = _minutes_between(requested_at, approved_at)
        reassignment_duration_minutes = _minutes_between(requested_at, completed_at)

        return {
            "approval_delay_minutes": approval_delay_minutes,
            "processing_duration_minutes": processing_duration_minutes,
            "reassignment_duration_minutes": reassignment_duration_minutes,
            "time_to_reassignment_minutes": reassignment_duration_minutes,
            "schema_version": "v2",
        }
    except Exception:
        return {
            "approval_delay_minutes": None,
            "processing_duration_minutes": None,
            "reassignment_duration_minutes": None,
            "time_to_reassignment_minutes": None,
            "schema_version": "v2",
        }


def _check_recent_reassignment(request_id: str, cooldown_minutes: int = 5) -> bool:
    """Check if request was already reassigned within cooldown window (prevent duplicates)."""
    try:
        request = db_client.get_request_by_id(str(request_id))
        if not request:
            return False

        current_status = str(request.get("reassignment_status") or "").strip().lower()
        if current_status == "processing":
            return True
        
        # Check reassignment_processing_at - if too recent, skip to avoid duplicate
        last_reassignment = request.get("reassignment_processing_at")
        if last_reassignment:
            try:
                if isinstance(last_reassignment, str):
                    last_ts = datetime.fromisoformat(last_reassignment.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    last_ts = last_reassignment
                
                elapsed_minutes = (datetime.utcnow() - last_ts).total_seconds() / 60
                if elapsed_minutes < cooldown_minutes:
                    LOGGER.warning("Request %s was reassigned %d minutes ago; skipping duplicate", request_id, elapsed_minutes)
                    return False
            except Exception:
                pass
        
        return True
    except Exception:
        LOGGER.exception("Failed to check recent reassignment for request=%s", request_id)
        return True  # Allow reassignment on error to be optimistic


def _is_reassignment_stale(request: dict, max_age_minutes: int = 1440) -> bool:
    """Check if reassignment request is too old to be valid (stale window)."""
    try:
        if not request:
            return True

        requested_at = request.get("reassignment_requested_at")
        if not requested_at:
            requested_at = request.get("reassignment_processing_at") or request.get("updated_at") or request.get("created_at")
        if not requested_at:
            return False

        try:
            if isinstance(requested_at, str):
                requested_ts = datetime.fromisoformat(requested_at.replace("Z", "+00:00")).replace(tzinfo=None)
            else:
                requested_ts = requested_at

            age_minutes = (datetime.utcnow() - requested_ts).total_seconds() / 60
            if age_minutes > max_age_minutes:
                LOGGER.warning(
                    "Reassignment request %s is %d minutes old (max=%d); skipping as stale",
                    request.get("id"),
                    age_minutes,
                    max_age_minutes,
                )
                return True
        except Exception:
            pass

        return False
    except Exception:
        LOGGER.exception("Failed to check reassignment staleness")
        return False


def _validate_technician_availability(technician_id: int | str) -> bool:
    """Validate that technician exists and is active before reassignment."""
    try:
        tech = db_client.get_technician_by_id(int(technician_id))
        if not tech:
            LOGGER.warning("Technician %s not found during reassignment validation", technician_id)
            return False
        
        # Check if technician is active/available
        status = str(tech.get("status") or "").strip().lower()
        if status in {"inactive", "off_duty", "deleted"}:
            LOGGER.warning("Technician %s is %s; cannot reassign", technician_id, status)
            return False
        
        return True
    except Exception:
        LOGGER.exception("Failed to validate technician %s", technician_id)
        return False


def _acquire_reassignment_lock(request_id: str, lock_ttl_seconds: int = 30) -> bool:
    """Try to acquire a distributed lock to prevent concurrent reassignment (optimistic)."""
    try:
        request = db_client.get_request_by_id(str(request_id))
        if not request:
            return False
        
        # Check if lock is already held (reassignment_lock_until timestamp)
        lock_until = request.get("reassignment_lock_until")
        if lock_until:
            try:
                if isinstance(lock_until, str):
                    lock_ts = datetime.fromisoformat(lock_until.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    lock_ts = lock_until
                
                if datetime.utcnow() < lock_ts:
                    LOGGER.warning("Request %s is locked by another reassignment process", request_id)
                    return False
            except Exception:
                pass
        
        # Acquire lock
        lock_expires = datetime.utcnow() + timedelta(seconds=lock_ttl_seconds)
        db_client.update_service_request(
            request_id,
            {
                "reassignment_lock_until": lock_expires,
                "reassignment_lock_holder": f"pid-{os.getpid()}",
            },
        )
        return True
    except Exception:
        LOGGER.exception("Failed to acquire reassignment lock for request=%s", request_id)
        return False


def _release_reassignment_lock(request_id: str) -> None:
    """Release the reassignment lock."""
    try:
        db_client.update_service_request(
            request_id,
            {
                "reassignment_lock_until": None,
                "reassignment_lock_holder": None,
            },
        )
    except Exception:
        LOGGER.debug("Failed to release reassignment lock for request=%s", request_id)


def _save_reassignment_snapshot(request_id: str, request: dict) -> dict:
    """Save a snapshot of request state before reassignment (for rollback)."""
    try:
        snapshot = {
            "request_id": str(request_id),
            "saved_at": datetime.utcnow().isoformat(),
            "assigned_technician": request.get("assigned_technician"),
            "assigned_technician_name": request.get("assigned_technician_name"),
            "status": request.get("status"),
            "reassignment_status": request.get("reassignment_status"),
        }
        return snapshot
    except Exception:
        LOGGER.exception("Failed to save reassignment snapshot for request=%s", request_id)
        return {}


def _validate_after_reassignment(request_id: str, new_tech_id: int | str | None) -> bool:
    """Validate that reassignment completed correctly (post-check)."""
    try:
        request = db_client.get_request_by_id(str(request_id))
        if not request:
            LOGGER.error("Request %s disappeared after reassignment", request_id)
            return False
        
        # Verify reassignment_status is not still "processing" (stuck)
        status = str(request.get("reassignment_status") or "").lower()
        if status == "processing":
            LOGGER.error("Request %s is still in 'processing' status after reassignment completion", request_id)
            return False
        
        # If new technician was assigned, verify they're in the system
        if new_tech_id:
            if not _validate_technician_availability(new_tech_id):
                LOGGER.error("Technician %s is not available after reassignment to request %s", new_tech_id, request_id)
                return False
        
        return True
    except Exception:
        LOGGER.exception("Failed to validate reassignment completion for request=%s", request_id)
        return False


def _run_reassignment_workflow(request_id: str, loop: asyncio.AbstractEventLoop | None = None) -> None:
    """Trigger the existing reroute evaluator after a technician requests reassignment.
    
    Hardened with:
    - Duplicate detection (cooldown check)
    - Stale request validation
    - Concurrent update lock
    - Technician availability checks
    - Post-completion validation
    - Graceful failure handling
    """
    processing_started_at = datetime.utcnow()
    lock_acquired = False
    
    try:
        from dispatch_engine.reroute_service import evaluate_reroute
        from dispatch_engine.route_planner import insert_job_into_route

        request = db_client.get_request_by_id(str(request_id))
        if not request:
            db_client.update_service_request(
                request_id,
                {
                    "reassignment_status": "failed",
                    "reassignment_requested": False,
                    "reassignment_pending": False,
                    "reassignment_processed_at": datetime.utcnow(),
                    "reassignment_result": "failed",
                    "reassignment_error": "request_not_found",
                    "updated_at": datetime.utcnow(),
                },
            )
            # Log failure event
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": "request_not_found",
                    "timestamp": datetime.utcnow(),
                })
            except Exception:
                pass
            return

        if REASSIGNMENT_REQUIRE_ADMIN_APPROVAL:
            current_state = str(request.get("reassignment_status") or "").strip().lower()
            if current_state != "processing":
                LOGGER.info(
                    "Reassignment workflow skipped (approval required) for request=%s state=%s",
                    request_id,
                    current_state or "unknown",
                )
                return

        # ─── HARDENING: Duplicate request prevention ───────────────────────────
        if not _check_recent_reassignment(request_id, cooldown_minutes=5):
            LOGGER.warning("Duplicate reassignment detected for request=%s; aborting", request_id)
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": "duplicate_within_cooldown",
                    "timestamp": datetime.utcnow(),
                })
            except Exception:
                pass
            return

        # ─── HARDENING: Stale request validation ──────────────────────────────
        if _is_reassignment_stale(request, max_age_minutes=1440):
            LOGGER.warning("Stale reassignment request for request=%s; aborting", request_id)
            processing_ended_at = datetime.utcnow()
            try:
                db_client.update_service_request(
                    request_id,
                    {
                        "reassignment_status": "failed",
                        "reassignment_requested": False,
                        "reassignment_pending": False,
                        "reassignment_processed_at": processing_ended_at,
                        "reassignment_result": "failed",
                        "reassignment_error": "stale_request",
                        "updated_at": processing_ended_at,
                    },
                )
            except Exception:
                LOGGER.exception("Failed to persist stale reassignment failure for request=%s", request_id)
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": "stale_request",
                    "timestamp": datetime.utcnow(),
                })
            except Exception:
                pass
            return

        # ─── HARDENING: Concurrent update protection ──────────────────────────
        if not _acquire_reassignment_lock(request_id, lock_ttl_seconds=30):
            LOGGER.warning("Failed to acquire lock for request=%s; another process is reassigning", request_id)
            processing_ended_at = datetime.utcnow()
            try:
                db_client.update_service_request(
                    request_id,
                    {
                        "reassignment_status": "failed",
                        "reassignment_requested": False,
                        "reassignment_pending": False,
                        "reassignment_processed_at": processing_ended_at,
                        "reassignment_result": "failed",
                        "reassignment_error": "locked_by_concurrent_process",
                        "updated_at": processing_ended_at,
                    },
                )
            except Exception:
                LOGGER.exception("Failed to persist lock failure for request=%s", request_id)
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": "locked_by_concurrent_process",
                    "timestamp": datetime.utcnow(),
                })
            except Exception:
                pass
            return
        lock_acquired = True

        # ─── HARDENING: Save snapshot for rollback ────────────────────────────
        snapshot = _save_reassignment_snapshot(request_id, request)

        # Log processing started event
        try:
            db_client.create_dispatch_audit_log({
                "event_type": "reassignment_processing",
                "request_id": str(request_id),
                "previous_technician": request.get("assigned_technician"),
                "timestamp": processing_started_at,
            })
        except Exception:
            LOGGER.exception("Failed to log reassignment processing event for request=%s", request_id)

        db_client.update_service_request(
            request_id,
            {
                "reassignment_status": "processing",
                "reassignment_processing_at": processing_started_at,
                "updated_at": datetime.utcnow(),
            },
        )

        result = evaluate_reroute(request, force_reassignment=True)
        action = str(result.get("action") or "").strip().lower()
        new_technician_id = result.get("new_technician") or result.get("assigned_technician")

        if action == "skipped" or not new_technician_id:
            processing_ended_at = datetime.utcnow()
            reason = str(result.get("reason") or "reassignment_skipped")[:200]
            db_client.update_service_request(
                request_id,
                {
                    "reassignment_status": "failed",
                    "reassignment_requested": False,
                    "reassignment_pending": False,
                    "reassignment_processed_at": processing_ended_at,
                    "reassignment_result": "skipped",
                    "reassignment_error": reason,
                    "updated_at": datetime.utcnow(),
                },
            )
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": reason,
                    "previous_technician": request.get("assigned_technician"),
                    "timestamp": processing_ended_at,
                })
            except Exception:
                LOGGER.exception("Failed to log reassignment skipped event for request=%s", request_id)
            try:
                _invalidate_kpi_cache()
            except Exception:
                pass
            return

        # ─── HARDENING: Validate new technician before route update ──────────
        if new_technician_id and action in {"rerouted", "assigned"}:
            if not _validate_technician_availability(new_technician_id):
                LOGGER.error("New technician %s is not available; aborting reassignment for request=%s", new_technician_id, request_id)
                raise ValueError(f"technician_{new_technician_id}_unavailable")

        if action in {"rerouted", "assigned"} and new_technician_id is not None:
            try:
                insert_job_into_route(int(new_technician_id), str(request_id))
            except Exception:
                LOGGER.exception(
                    "Route re-optimization failed after reassignment for request=%s tech=%s",
                    request_id,
                    new_technician_id,
                )
                raise

        final_status = {
            "rerouted": "processed",
            "assigned": "processed",
            "skipped": "skipped",
        }.get(action, "processed")

        processing_ended_at = datetime.utcnow()
        sla_impact = _calculate_sla_impact(request, processing_started_at, processing_ended_at)

        db_client.update_service_request(
            request_id,
            {
                "reassignment_status": final_status,
                "reassignment_requested": False,
                "reassignment_pending": False,
                "reassignment_processed_at": processing_ended_at,
                "reassignment_result": action or "processed",
                "reassignment_sla_impact": sla_impact,
                "reassignment_route_refreshed": bool(action in {"rerouted", "assigned"} and new_technician_id is not None),
                "updated_at": datetime.utcnow(),
            },
        )

        # Log completion event with new technician details
        try:
            new_tech = None
            new_tech_name = None
            if new_technician_id:
                new_tech = db_client.get_technician_by_id(int(new_technician_id))
                new_tech_name = new_tech.get("name") if new_tech else None
            
            db_client.create_dispatch_audit_log({
                "event_type": "reassignment_completed",
                "request_id": str(request_id),
                "previous_technician": request.get("assigned_technician"),
                "new_technician": new_technician_id,
                "new_technician_name": new_tech_name,
                "reassignment_result": action or "processed",
                "route_refreshed": bool(action in {"rerouted", "assigned"} and new_technician_id is not None),
                "sla_impact": sla_impact,
                "timestamp": processing_ended_at,
            })
        except Exception:
            LOGGER.exception("Failed to log reassignment completion event for request=%s", request_id)

        # ─── HARDENING: Post-completion validation ────────────────────────────
        if not _validate_after_reassignment(request_id, new_technician_id):
            LOGGER.error("Post-completion validation failed for request=%s; state may be inconsistent", request_id)
            try:
                db_client.create_dispatch_audit_log({
                    "event_type": "reassignment_failed",
                    "request_id": str(request_id),
                    "reason": "post_validation_failed",
                    "timestamp": datetime.utcnow(),
                })
            except Exception:
                pass

        # Notify technicians via Telegram: reuse existing bot helpers where available
        try:
            try:
                from backend.bot.services.telegram_service import (
                    schedule_assignment_released_notification,
                    schedule_reassigned_notification_for_technician,
                    schedule_reroute_notification_for_technician,
                )
            except Exception:
                schedule_assignment_released_notification = None
                schedule_reassigned_notification_for_technician = None
                schedule_reroute_notification_for_technician = None

            prev_tid = request.get("assigned_technician")
            new_tid = new_technician_id
            route_refreshed = bool(action in {"rerouted", "assigned"} and new_technician_id is not None)

            # Notify old technician that the assignment was released
            if prev_tid and schedule_assignment_released_notification and str(prev_tid) != str(new_tid):
                try:
                    schedule_assignment_released_notification(prev_tid, request_id)
                except Exception:
                    LOGGER.debug("Failed to schedule assignment released notif for tech %s", prev_tid)

            # Notify new technician about reassignment and schedule route refresh
            if new_tid and schedule_reassigned_notification_for_technician:
                try:
                    schedule_reassigned_notification_for_technician(new_tid, request_id)
                except Exception:
                    LOGGER.debug("Failed to schedule reassigned notif for new tech %s", new_tid)

            # If route was refreshed, trigger reroute notifications (reuse existing reroute flow)
            if route_refreshed and schedule_reroute_notification_for_technician:
                try:
                    schedule_reroute_notification_for_technician(new_tid, reason="Route updated after reassignment.")
                except Exception:
                    LOGGER.debug("Failed to schedule reroute notif for new tech %s", new_tid)
                try:
                    if prev_tid:
                        schedule_reroute_notification_for_technician(prev_tid, reason="Your route changed after a job was reassigned.")
                except Exception:
                    LOGGER.debug("Failed to schedule reroute notif for previous tech %s", prev_tid)
        except Exception:
            LOGGER.exception("Failed to schedule Telegram reassignment notifications for request=%s", request_id)

        if loop and not loop.is_closed():
            try:
                refreshed_request = db_client.get_request_by_id(str(request_id)) or request
                snapshot = _normalize_tracking_snapshot(refreshed_request)
                asyncio.run_coroutine_threadsafe(
                    _publish_live_tracking(str(request_id), snapshot, event="status"),
                    loop,
                )
            except Exception:
                LOGGER.exception("Failed to publish reassignment snapshot for request=%s", request_id)

        try:
            _invalidate_kpi_cache()
        except Exception:
            pass
    except Exception as exc:
        processing_ended_at = datetime.utcnow()
        try:
            db_client.update_service_request(
                request_id,
                {
                    "reassignment_status": "failed",
                    "reassignment_requested": False,
                    "reassignment_pending": False,
                    "reassignment_processed_at": processing_ended_at,
                    "reassignment_error": str(exc)[:200],
                    "updated_at": datetime.utcnow(),
                },
            )
            # Log failure event
            db_client.create_dispatch_audit_log({
                "event_type": "reassignment_failed",
                "request_id": str(request_id),
                "reason": str(exc)[:200],
                "timestamp": processing_ended_at,
            })
        except Exception:
            pass
        LOGGER.exception("Reassignment workflow failed for request=%s", request_id)
    finally:
        # ─── HARDENING: Always release lock ───────────────────────────────────
        if lock_acquired:
            _release_reassignment_lock(request_id)


class LiveLocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy_m: float | None = None
    heading: float | None = None
    speed_mps: float | None = None
    timestamp: str | None = None


class TechnicianLinkRequest(BaseModel):
    technician_code: str


class TechnicianSkillsUpdateRequest(BaseModel):
    skills: list[str]
    certified_skills: list[str]
    certifications: list[str]


class TechnicianScheduleUpdateRequest(BaseModel):
    shift_start: str
    shift_end: str
    working_days: list[str]


class ReviewDecisionRequest(BaseModel):
    decision: str
    notes: str | None = None
    final_severity: str | None = None
    final_fault_type: str | None = None


class ReportGenerateRequest(BaseModel):
    job_id: int


class PrevisitReportRequest(BaseModel):
    job_id: str


def _extract_validation_error_message(exc: Exception) -> str:
    errors = []
    if hasattr(exc, "errors"):
        try:
            errors = exc.errors()
        except Exception:
            errors = []

    if errors:
        first = errors[0]
        field = str(first.get("loc", [""])[-1]).lower()
        message = str(first.get("msg", "Validation failed"))

        if field == "phone":
            return "Invalid phone number format"
        if field == "name":
            return "Invalid name format"
        if field == "password":
            return "Invalid password format"
        if field == "location":
            return "Invalid location text"
        if field == "email":
            return "Invalid email format"

        return message

    return "Validation failed"


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": _extract_validation_error_message(exc)})




@app.get('/location/reverse')
async def reverse_geocode(lat: float, lng: float):
    """Reverse-geocode (lat, lng) → human-readable address.

    Strategy:
    1. Try Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is configured.
    2. Fall back to free Nominatim (OpenStreetMap) API.
    3. If both fail, return a coordinate string.
    """
    # --- Google Maps (primary, if key is set) ---
    google_key = os.getenv('GOOGLE_MAPS_API_KEY', '').strip()
    if google_key:
        try:
            resp = requests.get(
                'https://maps.googleapis.com/maps/api/geocode/json',
                params={'latlng': f'{lat},{lng}', 'key': google_key},
                timeout=10,
            )
            if resp.ok:
                data = resp.json()
                if data.get('status') == 'OK':
                    results = data.get('results', [])
                    if results:
                        return {'formatted': results[0].get('formatted_address', f'{lat}, {lng}')}
        except requests.RequestException:
            pass  # fall through to Nominatim

    # --- Nominatim / OpenStreetMap (free fallback) ---
    try:
        resp = requests.get(
            'https://nominatim.openstreetmap.org/reverse',
            params={'lat': lat, 'lon': lng, 'format': 'json'},
            headers={'User-Agent': 'FieldServiceDispatcher/1.0'},
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            display_name = data.get('display_name') or data.get('name')
            if display_name:
                return {'formatted': display_name}
    except requests.RequestException:
        pass

    # --- Last resort: raw coordinates ---
    return {'formatted': f'{lat:.6f}, {lng:.6f}'}



def _hash_password(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        200000,
    )
    return digest.hex()


def _issue_access_token() -> str:
    return secrets.token_urlsafe(48)


def _normalize_indian_mobile(raw_value: str | None, field_name: str, required: bool = True) -> str | None:
    value = sanitize_text(raw_value)
    if not value:
        if required:
            raise HTTPException(status_code=422, detail={"error": f"{field_name} is required"})
        return None
    try:
        return validate_phone(value)
    except ValueError:
        raise HTTPException(status_code=422, detail={"error": "Invalid phone number format"})


def _parse_coordinates_from_location(location_text: str | None) -> tuple[float, float] | None:
    if not location_text:
        return None

    parts = [p.strip() for p in location_text.split(",")]
    if len(parts) != 2:
        return None

    try:
        lat = float(parts[0])
        lon = float(parts[1])
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    except ValueError:
        return None

    return None


def get_google_maps_key() -> str:
    """Return Google Maps API key from env, or empty string if not configured."""
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def _geocode_location_text(location_text: str) -> tuple[float, float] | None:
    key = get_google_maps_key()
    if key:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        try:
            res = requests.get(url, params={"address": location_text, "key": key}, timeout=20)
            if res.status_code < 400:
                data = res.json()
                if data.get("status") == "OK" and data.get("results"):
                    location = data["results"][0].get("geometry", {}).get("location", {})
                    lat = location.get("lat")
                    lon = location.get("lng")
                    if lat is not None and lon is not None:
                        return float(lat), float(lon)
        except requests.RequestException:
            pass

    # Fallback to Nominatim (OpenStreetMap) if no Google Maps API key or if Google failed
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "FieldServiceApp/1.0"}
    try:
        res = requests.get(url, params={"q": location_text, "format": "json", "limit": 1}, headers=headers, timeout=20)
        if res.status_code < 400:
            data = res.json()
            if data and len(data) > 0:
                lat = data[0].get("lat")
                lon = data[0].get("lon")
                if lat is not None and lon is not None:
                    return float(lat), float(lon)
    except Exception as e:
        print(f"Geocoding fallback failed: {e}")

    return None


def _read_latest_mobile_gps(max_age_minutes: int = 10) -> tuple[float, float] | None:
    """Read latest phone GPS from shared state file for submission fallback."""
    state_path = Path(__file__).parent / ".mobile_gps_state.json"
    if not state_path.exists():
        return None

    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
        lat = float(state.get("latitude"))
        lon = float(state.get("longitude"))
        ts_raw = state.get("timestamp")
        if not ts_raw:
            return None
        ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        now = datetime.now(ts.tzinfo) if ts.tzinfo else datetime.utcnow()
        if now - ts > timedelta(minutes=max_age_minutes):
            return None
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    except Exception:
        return None

    return None


def _is_within_india_bounds(lat: float, lon: float) -> bool:
    # Coarse India bounding box to prevent clearly incorrect cross-country GPS fixes.
    return 6.0 <= lat <= 38.5 and 68.0 <= lon <= 98.5


def _nearest_service_zone(lat: float, lon: float) -> str | None:
    best_zone = None
    best_score = None
    for zone, (zone_lat, zone_lon) in SERVICE_ZONES.items():
        score = (lat - float(zone_lat)) ** 2 + (lon - float(zone_lon)) ** 2
        if best_score is None or score < best_score:
            best_score = score
            best_zone = zone
    return best_zone


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _to_int_or_none(value):
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _enrich_diagnosis_fields(record: dict) -> dict:
    """Normalize diagnosis fields from persisted columns + diagnosis_payload JSON."""
    payload = record.get("diagnosis_payload")

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = None

    if not isinstance(payload, dict):
        payload = {}

    # Severity breakdown
    record["final_severity"] = (
        record.get("final_severity")
        or payload.get("final_severity")
        or record.get("severity")
    )
    record["image_severity"] = record.get("image_severity") or payload.get("image_severity")
    record["description_severity"] = record.get("description_severity") or payload.get("description_severity")

    # Confidence
    confidence = record.get("diagnosis_confidence")
    if confidence is None:
        confidence = payload.get("confidence")
        record["diagnosis_confidence"] = confidence
    record["confidence"] = confidence

    # Safety/impact metrics
    record["safety_score"] = _to_int_or_none(record.get("safety_score"))
    if record["safety_score"] is None:
        record["safety_score"] = _to_int_or_none(payload.get("safety_score"))

    record["operational_impact"] = _to_int_or_none(record.get("operational_impact"))
    if record["operational_impact"] is None:
        record["operational_impact"] = _to_int_or_none(payload.get("operational_impact"))

    record["escalation_risk"] = _to_int_or_none(record.get("escalation_risk"))
    if record["escalation_risk"] is None:
        record["escalation_risk"] = _to_int_or_none(payload.get("escalation_risk"))

    safety_escalation = record.get("safety_escalation")
    if safety_escalation is None:
        safety_escalation = payload.get("safety_escalation")
    record["safety_escalation"] = _to_bool(safety_escalation)

    return record


def _strict_normalize_for_frontend(raw: dict, tech: dict | None = None) -> dict:
    """Return a frontend-safe dict with no missing keys and no None values for common fields.

    This produces a minimal stable schema consumed by the React UI. Numeric fields
    that may be absent are returned as empty strings to avoid `undefined`/`null`
    causing render-time errors; timestamps are always strings.
    """
    d = dict(raw or {})

    def _to_str(val):
        if val is None:
            return ""
        if isinstance(val, str):
            return val
        try:
            if hasattr(val, 'isoformat'):
                return val.isoformat()
        except Exception:
            pass
        return str(val)

    def _num_or_empty(val):
        if val is None:
            return ""
        return val

    tid = d.get("assigned_technician")
    tech_name = None
    tech_phone = None
    tech_zone = None
    tech_lat = None
    tech_lon = None
    if tech:
        tech_name = tech.get("name")
        tech_phone = tech.get("phone_number") or tech.get("phone")
        tech_zone = tech.get("location_zone") or tech.get("service_zone")
        tech_lat = tech.get("current_latitude") if tech.get("current_latitude") is not None else tech.get("latitude")
        tech_lon = tech.get("current_longitude") if tech.get("current_longitude") is not None else tech.get("longitude")

    created = d.get("created_at")
    if created is None:
        created_str = ""
    elif isinstance(created, str):
        created_str = created
    else:
        try:
            created_str = created.isoformat()
        except Exception:
            created_str = str(created)

    # Compute a sensible location_text fallback from lat/lon when needed
    loc_text = d.get("location_text") or ""
    if not str(loc_text).strip():
        lat = d.get("latitude")
        lon = d.get("longitude")
        try:
            if lat is not None and lon is not None:
                loc_text = f"{round(float(lat), 6)}, {round(float(lon), 6)}"
        except Exception:
            loc_text = ""

    out = {
        "id": str(d.get("id") or d.get("_id") or ""),
        "fault_type": d.get("fault_type") or "",
        "severity": d.get("severity") or "medium",
        "status": d.get("status") or "pending",
        "location_text": loc_text or "",
        "assigned_technician": (tid if tid is not None else ""),
        "created_at": created_str,
        "customer_name": d.get("customer_name") or "",
        "description": d.get("description") or "",

        # Extra fields commonly used by the admin/detail views — keep present
        "assigned_technician_name": tech_name or d.get("assigned_technician_name") or "",
        "assigned_technician_phone_number": tech_phone or d.get("assigned_technician_phone_number") or "",
        "assigned_technician_zone": tech_zone or d.get("assigned_technician_zone") or "",
        "assigned_technician_latitude": _num_or_empty(tech_lat if tech_lat is not None else d.get("assigned_technician_latitude")),
        "assigned_technician_longitude": _num_or_empty(tech_lon if tech_lon is not None else d.get("assigned_technician_longitude")),
        "distance_km": _num_or_empty(d.get("distance_km")),
        "travel_time_min": _num_or_empty(d.get("travel_time_min")),
        "reassignment_requested": bool(d.get("reassignment_requested", False)),
        "reassignment_status": d.get("reassignment_status", "") or "",
        "reassignment_result": d.get("reassignment_result", "") or "",
        "reassignment_route_refreshed": bool(d.get("reassignment_route_refreshed", False)),
    }

    # Preserve other useful keys but ensure they are non-null where sensible
    extras = [
        "final_severity",
        "diagnosis_confidence",
        "ai_domain",
        "image_severity",
        "description_severity",
        "diagnosis_payload",
        "diagnosis_reason",
        "hitl_triggers",
        "review_decision",
        "review_notes",
        "reviewed_by_user_id",
        "reviewed_at",
        "reviewed_by_admin",
        "issue_description",
        "evidence_image_name",
        "location_zone",
        "latitude",
        "longitude",
        "ai_review_status",
        "reassignment_reason",
        "reassignment_requested_by",
        "reassignment_requested_at",
        "reassignment_processed_at",
        "previous_technician",
    ]
    for k in extras:
        v = d.get(k)
        if isinstance(v, (list, dict)):
            out[k] = v
        elif k in ("latitude", "longitude"):
            out[k] = _num_or_empty(v)
        elif v is None:
            out[k] = ""
        else:
            out[k] = v

    return out


def _compute_ai_review_status(data: dict) -> str:
    """Compute the ai_review_status field from stored document fields."""
    review_decision = data.get("review_decision") or ""
    status = (data.get("status") or "").lower()
    if review_decision == "rejected":
        return "rejected_by_admin"
    if review_decision == "approved" or review_decision == "modify_approve":
        return "approved_by_admin"
    if status in ("cancelled", "completed"):
        return "closed"
    if status == "pending_review":
        return "pending_human_review"
    # Check auto_approved flag
    ai_review = (data.get("ai_review_status") or "").lower()
    if ai_review == "auto_approved":
        return "auto_approved"
    requires_review = data.get("requires_human_review")
    if requires_review:
        return "review_required"
    if review_decision == "auto_approved":
        return "auto_approved"
    return "auto_approved"


def _lookup_tech_for_doc(data: dict) -> dict | None:
    """Look up technician record for a service request if we only have integer id."""
    tid = data.get("assigned_technician")
    # If denormalized fields already present, no need to query Firestore
    if data.get("assigned_technician_name"):
        return None  # caller uses denormalized fields directly
    if tid is None:
        return None
    try:
        return db_client.get_technician_by_id(tid)
    except Exception:
        return None


def strict_format(doc) -> dict:
    """Return a complete, frontend-safe dict from a service request document.

    PERFORMANCE: Does NOT make any secondary Firestore calls.
    Uses only stored/denormalized fields in the document itself.
    The backfill script ensures all docs have assigned_technician_name etc.
    """
    if hasattr(doc, 'to_dict'):
        data = doc.to_dict() or {}
        doc_id = getattr(doc, 'id', '') or ''
    elif isinstance(doc, dict):
        data = doc
        doc_id = data.get('id') or data.get('_id') or ''
    else:
        data = {}
        doc_id = ''

    # Ensure doc_id is on data dict for _strict_normalize_for_frontend
    data = dict(data)
    data.setdefault('id', doc_id)

    # NO secondary Firestore lookup — use denormalized fields only.
    # If assigned_technician_name is blank (pre-backfill doc), we show the id.
    tech = None  # always None now — all data comes from stored fields

    # Use the full normalizer to build the base rich dict
    out = _strict_normalize_for_frontend(data, tech)

    # Compute ai_review_status from document fields
    if not out.get("ai_review_status"):
        out["ai_review_status"] = _compute_ai_review_status(data)

    # Ensure review_priority is present
    if "review_priority" not in out:
        out["review_priority"] = data.get("review_priority") or "normal"

    # Keep customer_email and contact_number if present
    if "customer_email" not in out:
        out["customer_email"] = data.get("customer_email") or ""
    if "contact_number" not in out:
        out["contact_number"] = data.get("contact_number") or ""

    # Enrich with diagnosis fields (safety_score, confidence etc.) — dict ops only, no IO
    out = _enrich_diagnosis_fields(out)

    # Ensure assigned_at / completed_at timestamps are strings
    for ts_key in ("assigned_at", "completed_at", "reviewed_at"):
        v = data.get(ts_key)
        if v is None:
            out[ts_key] = ""
        elif isinstance(v, str):
            out[ts_key] = v
        elif hasattr(v, 'isoformat'):
            out[ts_key] = v.isoformat()
        else:
            out[ts_key] = str(v)

    return out


def _ts(val) -> str:
    """Convert any timestamp value to an ISO string, safely."""
    if val is None:
        return ''
    if isinstance(val, str):
        return val
    try:
        return val.isoformat()
    except Exception:
        return str(val)


def list_format(doc) -> dict:
    """Balanced list-view format — all fields the frontend table columns need.

    Rules:
    - NO secondary Firestore calls (pure dict ops only)
    - ALL keys always present with safe defaults (no None / undefined)
    - Timestamps always ISO strings
    - detail views use strict_format() via single direct-doc fetch
    """
    if hasattr(doc, 'to_dict'):
        d = doc.to_dict() or {}
        doc_id = getattr(doc, 'id', '') or ''
    elif isinstance(doc, dict):
        d = doc
        doc_id = d.get('id') or d.get('_id') or ''
    else:
        d = {}
        doc_id = ''

    # --- location_text fallback from lat/lon ---
    loc = d.get('location_text') or ''
    if not str(loc).strip():
        lat, lon = d.get('latitude'), d.get('longitude')
        try:
            if lat is not None and lon is not None:
                loc = f"{round(float(lat), 6)}, {round(float(lon), 6)}"
        except Exception:
            loc = ''

    # Ensure assigned technician phone is present under requested key
    tech_phone = d.get('assigned_technician_phone') or d.get('assigned_technician_phone_number') or ''

    # Technician name formatted
    tech_name = d.get('assigned_technician_name') or ''
    tech_name_formatted = tech_name if tech_name else "-"

    # Customer location fallback
    customer_loc = d.get("location_text") or (
        f"{d.get('latitude', '')}, {d.get('longitude', '')}"
        if d.get("latitude") and d.get("longitude")
        else ""
    )

    # --- Technician zone normalization (hard fix) ---
    zone = d.get("assigned_technician_zone")
    if "assigned_technician_zone" not in d or not zone or str(zone).strip() == "":
        zone = "-"

    # Lat/lon for technician location display (None → "" to avoid render errors)
    tech_lat = d.get("assigned_technician_latitude")
    if tech_lat is None:
        tech_lat = ""
    tech_lon = d.get("assigned_technician_longitude")
    if tech_lon is None:
        tech_lon = ""

    # Nested technician object
    technician_obj = {
        "zone": zone,
        "name": d.get("assigned_technician_name", ""),
        "id": d.get("assigned_technician", "")
    }

    # Safety override: clear technician display fields only when there is
    # genuinely no assigned technician.  Cancelled / rejected records that still
    # carry the original technician data in Firestore should remain visible so
    # admins can see who *was* assigned.
    _status = str(d.get("status", "")).lower()
    if not d.get("assigned_technician"):
        zone = "-"
        tech_name_formatted = "-"
        tech_phone = ""
        tech_lat = ""
        tech_lon = ""
        technician_obj = {"zone": "-", "name": "", "id": ""}

    out = {
        # --- Required fields exactly as requested ---
        "id": str(d.get("id") or doc_id or ""),
        "fault_type": d.get("fault_type", "") or "",
        "severity": d.get("severity", "medium") or "medium",
        "status": d.get("status", "pending") or "pending",
        "location_text": loc,
        "customer_location": str(customer_loc),
        # EXACT key used by frontend AdminDashboard.jsx
        "assigned_technician_zone": zone,
        "assigned_technician_latitude": tech_lat,
        "assigned_technician_longitude": tech_lon,
        # Additional alias keys
        "technician_source": zone,
        "technicianSource": zone,
        "technician": technician_obj,
        "zone": zone,
        "technician_zone": zone,
        "assigned_technician_name": tech_name_formatted,
        "assigned_technician_phone": tech_phone,
        "assigned_technician_phone_number": tech_phone,
        "customer_name": d.get("customer_name", "") or "",
        "created_at": _ts(d.get("created_at", "")),
        "assigned_at": _ts(d.get("assigned_at", "")),
        "completed_at": _ts(d.get("completed_at", "")),
        "reviewed_at": _ts(d.get("reviewed_at", "")),
        "reviewed_by_admin": bool(d.get("reviewed_by_admin", False)),
        "review_notes": d.get("review_notes", "") or "",
        "ai_severity": d.get("ai_severity", "") or "",
        "final_severity": d.get("final_severity", "") or "",
        # Always derive from authoritative review_decision first so stale stored
        # ai_review_status values in Firestore don't produce wrong KPI counts.
        "ai_review_status": _compute_ai_review_status(d) or d.get("ai_review_status", "") or "",
        "requires_human_review": bool(d.get("requires_human_review", False)),

        # --- Preserved safety fields for the UI ---
        "description": d.get('description', '') or '',
        "location_zone": d.get('location_zone', '') or '',
        "latitude": d.get('latitude', '') or '',
        "longitude": d.get('longitude', '') or '',
        "assigned_technician": d.get('assigned_technician', '') or '',
        "customer_email": d.get('customer_email', '') or '',
        "contact_number": d.get('contact_number', '') or '',
        "review_decision": d.get('review_decision', '') or '',
        "hitl_triggers": d.get('hitl_triggers', []) or [],
        "review_priority": d.get('review_priority', 'normal') or 'normal',
        "ai_domain": d.get('ai_domain', '') or '',
        "diagnosis_reason": d.get('diagnosis_reason', '') or '',
        "image_url": d.get('image_url') or d.get('evidence_image_path') or '',
        "evidence_image_name": d.get('evidence_image_name', '') or '',
    }

    # Fallback safety: replace any None with ""
    for k, v in out.items():
        if v is None:
            out[k] = ""
            
    return out


def _persist_ai_diagnosis_fields(request_id: str, diagnosis: dict) -> None:
    diagnosis_payload = (
    json.dumps(diagnosis, default=str)
    if isinstance(diagnosis, dict)
    else None
)
    try:
        from database import USE_FIRESTORE, db_client
    except Exception:
        USE_FIRESTORE = False

    if USE_FIRESTORE:
        updates: dict = {
            "ai_domain": diagnosis.get("domain"),
            "image_severity": diagnosis.get("image_severity"),
            "description_severity": diagnosis.get("description_severity"),
            "safety_score": _to_int_or_none(diagnosis.get("safety_score")),
            "operational_impact": _to_int_or_none(diagnosis.get("operational_impact")),
            "escalation_risk": _to_int_or_none(diagnosis.get("escalation_risk")),
            "safety_escalation": diagnosis.get("safety_escalation"),
            "diagnosis_reason": diagnosis.get("reason"),
            "final_reasoning": diagnosis.get("final_reasoning") or diagnosis.get("reason"),
            "requires_human_review": bool(diagnosis.get("requires_human_review", False)),
            "review_priority": diagnosis.get("review_priority") or "normal",
            "hitl_triggers": sanitize_triggers(diagnosis.get("hitl_triggers") or []),
            "diagnosis_payload": json.loads(diagnosis_payload) if diagnosis_payload else None,
            "issue_description": diagnosis.get("_issue_description"),
            "evidence_image_path": diagnosis.get("_evidence_image_path"),
            "evidence_image_name": diagnosis.get("_evidence_image_name"),
            "image_url": diagnosis.get("_evidence_image_path"),
        }

        if not updates.get("requires_human_review"):
            updates.update({
                "review_decision": "auto_approved",
                "review_notes": "Auto-approved by system (no HITL required)",
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": "SYSTEM",
            })

        try:
            # Use the canonical update wrapper to persist to Firestore
            db_client.update_service_request(str(request_id), updates)
        except Exception:
            import traceback
            traceback.print_exc()
        return


def _create_pending_review_request(
    *,
    current_user: dict,
    diagnosis: dict,
    location: str,
    contact: str,
    customer_name: str,
    customer_email: str,
    description: str,
    job_lat: float,
    job_lon: float,
    location_zone: str | None,
    evidence_image_path: str | None,
    evidence_image_name: str | None,
) -> str:
    # Support Firestore backend: create pending-review request in Firestore when enabled
    # Always persist pending-review request into the routed db_client
    doc = {
        "customer_user_id": current_user["id"],
        "customer_id": current_user["id"],
        "customer_name": customer_name.strip() or current_user["name"],
        "customer_email": customer_email.strip() or current_user["email"],
        "contact_number": contact,
        "location_text": location,
        "location_zone": location_zone,
        "description": description,
        "fault_type": (diagnosis.get("fault_type") or "other_plumbing").lower(),
        "severity": (diagnosis.get("final_severity") or "medium").lower(),
        "diagnosis_confidence": diagnosis.get("confidence"),
        "latitude": job_lat,
        "longitude": job_lon,
        "assigned_technician": None,
        "distance_km": None,
        "travel_time_min": None,
        "status": "pending_review",
        "reroute_checked": False,
    }

    print("SCHEMA_FIX_DEBUG: NEW REQUEST DATA:", doc)
    request_id = db_client.create_service_request(doc)

    diagnosis["_issue_description"] = description
    diagnosis["_evidence_image_path"] = evidence_image_path
    diagnosis["_evidence_image_name"] = evidence_image_name
    _persist_ai_diagnosis_fields(request_id, diagnosis)
    return request_id


def _assign_existing_request(request_row: dict) -> dict:
    sync_technician_job_counters()

    # Use final_severity when available (admin override), otherwise fall back to AI severity
    severity_to_use = (request_row.get("final_severity") or request_row.get("severity") or "medium").lower()

    technicians = get_eligible_technicians(request_row["fault_type"], severity_to_use)
    if not technicians:
        return {"error": "No technicians available"}

    distance_data = calculate_distance_matrix(
        technicians,
        float(request_row["latitude"]),
        float(request_row["longitude"]),
    )

    best_tech = select_best_technician(
        distance_data,
        technicians,
        severity_to_use,
        job_zone=request_row.get("location_zone"),
        priority=request_row.get("review_priority") or severity_to_use,
    )

    if not best_tech:
        # Fallback for HITL approval: if strict optimizer rejects all candidates
        # (e.g., due distance caps), select nearest eligible certified technician.
        tech_by_id = {int(t["id"]): t for t in technicians if t.get("id") is not None}
        fallback_candidates = []
        for row in distance_data:
            tech_id = row.get("technician_id")
            if tech_id is None:
                continue
            if int(tech_id) not in tech_by_id:
                continue
            try:
                distance_km = float(row.get("distance_km", 0.0) or 0.0)
                duration_min = float(row.get("duration_min", 0.0) or 0.0)
            except (ValueError, TypeError):
                continue
            fallback_candidates.append(
                {
                    "technician_id": int(tech_id),
                    "distance_km": round(distance_km, 2),
                    "duration_min": round(duration_min, 2),
                }
            )

        if not fallback_candidates:
            return {"error": "No technician selected"}

        fallback_candidates.sort(
            key=lambda c: (
                c["duration_min"],
                c["distance_km"],
                int(tech_by_id[c["technician_id"]].get("current_jobs", 0) or 0),
                c["technician_id"],
            )
        )
        best_tech = fallback_candidates[0]

    tech_id = best_tech["technician_id"]
    # Fetch the technician record to denormalize name/phone/zone
    tech_record = {}
    try:
        tech_record = db_client.get_technician_by_id(tech_id) or {}
    except Exception:
        pass
    updates = {
        "assigned_technician": tech_id,
        # Denormalized technician fields (no JOIN needed for reads)
        "assigned_technician_name": tech_record.get("name") or "",
        "assigned_technician_phone_number": db_client.resolve_technician_phone(tech_record),
        "assigned_technician_zone": tech_record.get("zone") or tech_record.get("location_zone") or tech_record.get("service_zone") or "",
        "assigned_technician_latitude": tech_record.get("current_latitude") or tech_record.get("latitude"),
        "assigned_technician_longitude": tech_record.get("current_longitude") or tech_record.get("longitude"),
        "distance_km": best_tech.get("distance_km"),
        "travel_time_min": best_tech.get("duration_min"),
        "assigned_at": datetime.utcnow(),
        "status": "assigned",
    }
    try:
        db_client.update_service_request(request_row["id"], updates)
    except Exception:
        import traceback
        traceback.print_exc()

    try:
        from backend.bot.services.telegram_service import schedule_assignment_notification
        job_payload = {**request_row, **updates, "id": str(request_row.get("id") or "")}
        schedule_assignment_notification(job_payload, tech_record)
    except Exception:
        pass

    try:
        db_client.sync_technician_job_counters_firestore(tech_id)
    except Exception:
        print("Failed to sync Firestore technician counters for tech=", tech_id)

    return {
        "assigned_technician": tech_id,
        "distance_km": best_tech["distance_km"],
        "duration_min": best_tech["duration_min"],
    }


def _ensure_auth_schema():
    # Schema management is not applicable for Firestore; no-op in the routed DB model.
    return


@app.post('/reports/generate')
async def generate_report(payload: ReportGenerateRequest, request: Request):
    """Generate a plain-text technician report for a service request using Gemini.

    Authorization: admins and technicians may generate any report. Customers may
    generate a report for their own request (customer_user_id/customer_id).
    """
    # Resolve current user from request headers using existing helper
    try:
        current_user = _get_current_user(request)
    except HTTPException as e:
        raise

    try:
        job = db_client.get_request_by_id(payload.job_id)
    except Exception:
        job = None

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Authorization: allow admins, technicians, or the owning customer
    role = (current_user.get("role") or "").lower()
    allowed = False
    if role in ("admin", "technician"):
        allowed = True
    try:
        owner_id = str(job.get("customer_user_id") or job.get("customer_id") or "")
    except Exception:
        owner_id = ""
    if str(current_user.get("id")) == owner_id:
        allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    # Extract fields
    fault_type = job.get("fault_type") or ""
    description = job.get("description") or ""
    technician_notes = job.get("technician_notes") or job.get("review_notes") or job.get("diagnosis_reason") or ""
    resolution = job.get("resolution") or job.get("final_reasoning") or ""

    prompt = (
        "Generate a professional service report including:\n"
        "* Issue summary\n* Root cause\n* Resolution steps\n* Recommendations\n\n"
        f"Job ID: {payload.job_id}\n"
        f"Fault Type: {fault_type}\n"
        f"Description: {description}\n"
        f"Technician Notes: {technician_notes}\n"
        f"Resolution: {resolution}\n\n"
        "Produce a concise, actionable plain-text report suitable for field technicians and management."
    )

    # Call Gemini via configured gemini_model in config.gcp_config
    try:
        from config.gcp_config import gemini_model, GEMINI_INIT_ERROR

        if GEMINI_INIT_ERROR or gemini_model is None:
            raise RuntimeError("LLM not configured")

        parts = [Part(text=prompt)]
        gen_config = GenerationConfig(max_output_tokens=512, temperature=0.2)
        resp = gemini_model.generate_content(parts, generation_config=gen_config)

        # Extract response text (robust to variations)
        report_text = ""
        try:
            report_text = resp.text or ""
        except Exception:
            report_text = ""

        if not report_text:
            try:
                if getattr(resp, 'candidates', None):
                    candidate = resp.candidates[0]
                    if hasattr(candidate, 'content') and getattr(candidate, 'content'):
                        if hasattr(candidate.content, 'parts'):
                            parts_text = ""
                            for p in candidate.content.parts:
                                parts_text += getattr(p, 'text', '') or ""
                            report_text = parts_text
            except Exception:
                report_text = ""

        if not report_text:
            raise ValueError("Empty model response")

        return {"report_text": report_text, "file_name": f"report_job_{payload.job_id}.txt"}

    except Exception as exc:
        # Fallback structured report
        fallback = (
            f"Issue: {description or 'N/A'}\n"
            f"Fault Type: {fault_type or 'N/A'}\n"
            f"Technician Notes: {technician_notes or 'N/A'}\n"
            f"Resolution: {resolution or 'N/A'}\n"
            "Recommendation: Please review the issue and update the report.\n\n"
            f"(Note: generated using fallback due to LLM error: {str(exc)})"
        )
        return JSONResponse(status_code=200, content={"report_text": fallback, "file_name": f"report_job_{payload.job_id}.txt", "note": "fallback"})


@app.post('/reports/previsit')
async def generate_previsit_report(payload: PrevisitReportRequest, request: Request):
    """Generate a pre-visit AI briefing for technicians."""
    backend_timeout_seconds = 25.0
    print(f"[PREVISIT] REQUEST RECEIVED")
    print(f"[PREVISIT] Payload: {payload}")
    print(f"[PREVISIT] Payload.job_id: {payload.job_id}")
    
    try:
        current_user = _get_current_user(request)
    except Exception as e:
        print(f"[PREVISIT] ERROR getting current_user: {str(e)}")
        raise

    if (current_user.get("role") or "").lower() not in {"admin", "technician"}:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    try:
        job = db_client.get_request_by_id(payload.job_id)
    except Exception as e:
        print(f"[PREVISIT] ERROR fetching job: {str(e)}")
        job = None

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if str(job.get("assigned_technician") or "") not in {"", str(current_user.get("technician_id") or ""), str(current_user.get("id") or "")}:
        # Admins may generate for any job. Technicians may only generate for their own assigned jobs.
        if (current_user.get("role") or "").lower() != "admin":
            raise HTTPException(status_code=403, detail="Forbidden for this role")

    fault_type = job.get("fault_type") or ""
    description = job.get("description") or ""
    location = job.get("location_text") or ""
    customer_notes = job.get("customer_notes") or job.get("review_notes") or job.get("diagnosis_reason") or ""

    previous_similar_issues: list[str] = []
    try:
        db = db_client._get_db()
        for doc in db.collection("service_requests").where("fault_type", "==", fault_type).limit(3).stream():
            raw = doc.to_dict() or {}
            if str(raw.get("id") or "") == str(payload.job_id):
                continue
            similar_summary = " | ".join(
                str(part).strip()
                for part in [raw.get("fault_type"), raw.get("description"), raw.get("review_notes")]
                if str(part or "").strip()
            )
            if similar_summary:
                previous_similar_issues.append(similar_summary)
    except Exception:
        previous_similar_issues = []

    prompt = (
        "You are a senior field technician.\n\n"
        "Generate a STRICT structured report in this EXACT format:\n\n"
        "SECTION 1: PROBLEM SUMMARY\n"
        "SECTION 2: ROOT CAUSES (bullet points)\n"
        "SECTION 3: REQUIRED TOOLS (bullet points)\n"
        "SECTION 4: REQUIRED PARTS (bullet points)\n"
        "SECTION 5: DIAGNOSIS STEPS (numbered)\n"
        "SECTION 6: FIX STEPS (numbered)\n"
        "SECTION 7: SAFETY WARNINGS (bullet points)\n"
        "SECTION 8: ESTIMATED TIME\n"
        "SECTION 9: COMMON MISTAKES\n\n"
        "Rules:\n"
        "- Do NOT add extra text\n"
        "- Do NOT hallucinate unknown details\n"
        "- Keep content concise but practical\n"
        "- Focus on real-world technician usage\n\n"
        f"Given the following job:\n"
        f"Fault Type: {fault_type}\n"
        f"Description: {description}\n"
        f"Location: {location}\n"
        f"Customer Notes: {customer_notes}\n"
        f"Previous Similar Issues: {json.dumps(previous_similar_issues)}\n"
    )

    fallback_report = (
        "Basic troubleshooting guide...\n\n"
        f"Issue: {description or 'N/A'}\n"
        f"Fault Type: {fault_type or 'N/A'}\n"
        f"Location: {location or 'N/A'}\n"
        f"Customer Notes: {customer_notes or 'N/A'}\n"
        "Recommendation: Inspect the reported fault, verify the most common wear components, and follow standard safety procedures before repair."
    )

    try:
        from config.gcp_config import gemini_model, GEMINI_INIT_ERROR

        if GEMINI_INIT_ERROR or gemini_model is None:
            raise RuntimeError("LLM not configured")

        report_text = ""
        last_error: Exception | None = None
        generation_started_at = _time_module.perf_counter()

        for attempt in range(1, 3):
            try:
                print(f"[PREVISIT] CALLING GEMINI API attempt={attempt} for job_id={payload.job_id}")
                response = await asyncio.wait_for(
                    asyncio.to_thread(gemini_model.generate_content, prompt),
                    timeout=backend_timeout_seconds,
                )
                print(f"[PREVISIT] GEMINI RESPONSE received: {response}")
                try:
                    report_text = response.text or ""
                except Exception as e:
                    print(f"[PREVISIT] ERROR extracting response.text: {str(e)}")
                    report_text = ""

                if not report_text:
                    raise ValueError("Empty model response")
                break
            except Exception as e:
                last_error = e
                print(f"LLM ERROR (attempt {attempt}): {str(e)}")
                report_text = ""
                if attempt < 2:
                    await asyncio.sleep(1)

        required_sections = [
            "SECTION 1:",
            "SECTION 2:",
            "SECTION 3:",
            "SECTION 4:",
            "SECTION 5:",
            "SECTION 6:",
            "SECTION 7:",
            "SECTION 8:",
            "SECTION 9:",
        ]
        is_valid = all(section in report_text for section in required_sections)
        is_fallback = False

        if not is_valid:
            print("VALIDATION FAILED — USING FALLBACK")
            report_text = fallback_report
            is_fallback = True
        elif len(report_text) < 100:
            print("VALIDATION FAILED — USING FALLBACK")
            report_text = fallback_report
            is_fallback = True

        if not report_text or is_fallback:
            if last_error is not None and not is_valid:
                print(f"[PREVISIT] LAST ERROR: {str(last_error)}")

        duration = round(_time_module.perf_counter() - generation_started_at, 3)
        print({
            "event": "previsit_generation",
            "job_id": payload.job_id,
            "duration": duration,
            "fallback_used": is_fallback,
            "length": len(report_text),
        })
        return {
            "report_text": report_text,
            "file_name": f"previsit_job_{payload.job_id}.txt",
            "type": "previsit",
            "is_fallback": is_fallback,
        }
    except Exception as exc:
        print(f"[PREVISIT] ERROR: {str(exc)}")
        print(f"[PREVISIT] Exception type: {type(exc).__name__}")
        return JSONResponse(status_code=200, content={
            "report_text": fallback_report,
            "file_name": f"previsit_job_{payload.job_id}.txt",
            "type": "previsit",
            "is_fallback": True,
            "note": str(exc),
        })


@app.post('/reports/improve')
async def improve_report_text(payload: dict, request: Request):
    """Improve technician-written report text using AI."""
    try:
        current_user = _get_current_user(request)
    except Exception as e:
        print(f"[IMPROVE] ERROR getting current_user: {str(e)}")
        raise

    text_to_improve = payload.get('text', '').strip()
    if not text_to_improve or len(text_to_improve) < 20:
        return {"improved_text": text_to_improve}

    try:
        from config.gcp_config import gemini_model, GEMINI_INIT_ERROR

        if GEMINI_INIT_ERROR or gemini_model is None:
            raise RuntimeError("LLM not configured")

        prompt = (
            "You are a professional field service technician.\n\n"
            "Improve the given report text.\n\n"
            "STRICT RULES:\n\n"
            "* DO NOT add new information\n"
            "* DO NOT hallucinate\n"
            "* Preserve original meaning\n"
            "* Fix grammar and spelling\n"
            "* Improve clarity and professionalism\n"
            "* Use short, clear sentences\n"
            "* Remove redundancy\n\n"
            "INPUT:\n"
            f"{text_to_improve}\n\n"
            "OUTPUT:\n"
            "Return only improved text."
        )

        print(f"[IMPROVE] CALLING GEMINI API to improve text")
        response = gemini_model.generate_content(prompt)
        improved = response.text or ""

        if not improved or len(improved) < 20:
            return {"improved_text": text_to_improve}

        print(f"[IMPROVE] SUCCESS: Improved text length={len(improved)}")
        return {"improved_text": improved}

    except Exception as exc:
        print(f"[IMPROVE] ERROR: {str(exc)}")
        return {"improved_text": text_to_improve}


@app.post('/technician/report-photo-upload')
async def upload_technician_report_photo(
    request: Request,
    job_id: str = Form(...),
    photo_kind: str = Form(...),
    image: UploadFile = File(...),
):
    """Upload before/after report photos and return retrievable URL for report payload."""
    current_user = _get_current_user(request)

    if (current_user.get("role") or "").lower() not in {"admin", "technician"}:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    normalized_kind = str(photo_kind or "").strip().lower()
    if normalized_kind not in {"before", "after"}:
        raise HTTPException(status_code=400, detail="photo_kind must be either 'before' or 'after'")

    try:
        job = db_client.get_request_by_id(job_id)
    except Exception:
        job = None

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if str(job.get("assigned_technician") or "") not in {"", str(current_user.get("technician_id") or ""), str(current_user.get("id") or "") }:
        if (current_user.get("role") or "").lower() != "admin":
            raise HTTPException(status_code=403, detail="Forbidden for this job")

    if not image:
        raise HTTPException(status_code=400, detail="Image is required")

    content_type = str(image.content_type or "").strip().lower()
    if content_type not in ALLOWED_EVIDENCE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type. Please upload JPG, PNG, or WEBP.")

    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in ALLOWED_EVIDENCE_SUFFIXES:
        suffix = ALLOWED_EVIDENCE_CONTENT_TYPES[content_type]

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")
    if len(content) > MAX_REPORT_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail=f"Uploaded image is too large. Maximum allowed size is {MAX_REPORT_PHOTO_BYTES} bytes.")

    stored_filename = f"{secrets.token_hex(16)}{suffix}"
    storage_path = _store_report_photo(content, stored_filename, content_type)

    photo_id = secrets.token_hex(12)
    db = db_client._get_db()
    db.collection("report_photos").document(photo_id).set({
        "job_id": str(job_id),
        "photo_kind": normalized_kind,
        "storage_path": storage_path,
        "content_type": content_type,
        "filename": image.filename or stored_filename,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.get("id"),
    })

    return {
        "photo_id": photo_id,
        "photo_kind": normalized_kind,
        "url": f"/technician/report-photo/{photo_id}",
    }


@app.get('/technician/report-photo/{photo_id}')
async def get_technician_report_photo(photo_id: str, request: Request):
    """Return technician report photo content via signed URL or local file response."""
    current_user = _get_current_user(request)
    if (current_user.get("role") or "").lower() not in {"admin", "technician"}:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    db = db_client._get_db()
    doc = db.collection("report_photos").document(str(photo_id)).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Report photo not found")

    photo_data = doc.to_dict() or {}
    return _build_report_photo_response(photo_data)


@app.post('/technician/submit-report')
async def submit_technician_report(payload: dict, request: Request):
    """Submit a completed job report with technician observations."""
    try:
        current_user = _get_current_user(request)
    except Exception as e:
        print(f"[REPORT] ERROR getting current_user: {str(e)}")
        raise

    if (current_user.get("role") or "").lower() not in {"admin", "technician"}:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    job_id = payload.get('job_id')
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

    try:
        job = db_client.get_request_by_id(job_id)
    except Exception as e:
        print(f"[REPORT] ERROR fetching job: {str(e)}")
        job = None

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Structured log: attempt start
    print(json.dumps({
        "event": "report_submit_attempt",
        "job_id": str(job_id),
        "technician": current_user.get("technician_id") or current_user.get("id"),
        "timestamp": datetime.utcnow().isoformat(),
    }))

    if str(job.get("assigned_technician") or "") not in {"", str(current_user.get("technician_id") or ""), str(current_user.get("id") or "")}:
        if (current_user.get("role") or "").lower() != "admin":
            raise HTTPException(status_code=403, detail="Forbidden for this job")

    report_data = {
        "job_id": job_id,
        "technician_id": current_user.get("technician_id") or current_user.get("id"),
        "technician_name": current_user.get("name") or "",
        "service_location": job.get("location_text") or job.get("location_zone") or "",
        "issue_observed": payload.get('issue_observed', ''),
        "root_cause": payload.get('root_cause', ''),
        "work_done": payload.get('work_done', ''),
        "parts_used": payload.get('parts_used', ''),
        "materials_used": payload.get('materials_used', []),
        "time_taken": payload.get('time_taken', ''),
        "customer_comments": payload.get('customer_comments', ''),
        "notes": payload.get('notes', ''),
        "before_photo_url": payload.get('before_photo_url', ''),
        "after_photo_url": payload.get('after_photo_url', ''),
        "review_notes": payload.get('review_notes', ''),
        "submitted_at": datetime.utcnow().isoformat(),
    }

    try:
        db = db_client._get_db()

        # Transactional write: if report exists, return it; otherwise create report and update job atomically
        def txn_func(transaction):
            report_ref = db.collection("job_reports").document(str(job_id))
            req_ref = db.collection("service_requests").document(str(job_id))

            # Read report doc inside transaction
            report_snap = report_ref.get(transaction=transaction)
            if report_snap.exists:
                existing = report_snap.to_dict() or {}
                # Log and return existing report
                print(json.dumps({
                    "event": "report_submit_idempotent_return",
                    "job_id": str(job_id),
                    "timestamp": datetime.utcnow().isoformat(),
                }))
                return {"success": True, "message": "Report already exists", "report": existing}

            # Create report and update job atomically
            transaction.set(report_ref, report_data)
            transaction.update(req_ref, {
                "report_submitted": True,
                "report_submitted_at": datetime.utcnow().isoformat(),
            })
            return {"success": True, "message": "Report submitted successfully", "report": report_data}

        # Execute transaction using the correct Firestore SDK method
        transaction = db.transaction()
        result = transaction.run(txn_func)

        # Report saved successfully inside transaction
        print(json.dumps({
            "event": "report_saved",
            "job_id": str(job_id),
            "timestamp": datetime.utcnow().isoformat(),
        }))

        print(json.dumps({
            "event": "report_submit",
            "job_id": str(job_id),
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
        }))

        return result
    except Exception as e:
        print(json.dumps({
            "event": "report_submit_failed",
            "job_id": str(job_id),
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }))
        raise HTTPException(status_code=500, detail="Failed to save report")


@app.get('/technician/report/{job_id}')
async def get_technician_report(job_id: str, request: Request):
    """Fetch a submitted report for a job id."""
    start = _time_module.time()
    try:
        current_user = _get_current_user(request)
    except Exception as e:
        print(json.dumps({"event": "report_fetch_failed", "job_id": str(job_id), "error": str(e), "timestamp": datetime.utcnow().isoformat()}))
        raise

    # Allow technicians and admins (and possibly customers in future)
    if (current_user.get("role") or "").lower() not in {"admin", "technician"}:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    try:
        db = db_client._get_db()
        last_error = None

        # Bounded retry: attempt the fetch once, retry at most once on transient errors.
        retry_count = 0
        max_retries = 1
        while True:
            try:
                doc = db.collection("job_reports").document(str(job_id)).get()
                if not doc.exists:
                    # Log missing but return a safe JSON payload (200) to avoid frontend crashes
                    print(json.dumps({"event": "report_fetch", "job_id": str(job_id), "found": False, "timestamp": datetime.utcnow().isoformat()}))
                    return JSONResponse(status_code=200, content={"error": "Report not found", "status": "missing"})

                report = doc.to_dict() or {}
                print(json.dumps({"event": "report_fetch", "job_id": str(job_id), "found": True, "timestamp": datetime.utcnow().isoformat()}))
                return {"report_data": report}
            except HTTPException:
                raise
            except Exception as fetch_error:
                last_error = fetch_error
                if retry_count < max_retries:
                    print(json.dumps({"event": "report_fetch_retry", "job_id": str(job_id), "error": str(fetch_error), "timestamp": datetime.utcnow().isoformat()}))
                    retry_count += 1
                    continue
                raise
    except HTTPException:
        raise
    except Exception as e:
        print(json.dumps({"event": "report_fetch_failed", "job_id": str(job_id), "error": str(e), "timestamp": datetime.utcnow().isoformat()}))
        raise HTTPException(status_code=500, detail="Failed to fetch report")
    finally:
        print(json.dumps({"event": "report_latency", "job_id": str(job_id), "time": _time_module.time() - start, "timestamp": datetime.utcnow().isoformat()}))


def _get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    print("AUTH HEADER:", request.headers.get("Authorization"))
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Handle edge case: prefix removal cleanly
    token = auth_header.replace("Bearer ", "").strip()
    token = str(token)

    print("USING FIRESTORE DB - FUNCTION: _get_current_user")
    print("TOKEN:", token)
    # Always use Firestore user lookup. PostgreSQL code retained below as
    # a non-executed backup.
    user = db_client.get_user_by_token(token)

    if False:
        # PostgreSQL backup (preserved for reference; not executed)
        with db_engine.connect() as conn:
            user = conn.execute(
                text(
                    """
                    SELECT u.id, u.name, u.email, u.phone, u.role, u.technician_id, u.is_active
                    FROM auth_tokens t
                    JOIN users u ON u.id = t.user_id
                    WHERE t.token = :token
                    """
                ),
                {"token": token},
            ).mappings().first()

    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return dict(user)


def _get_user_from_token(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db_client.get_user_by_token(str(token))
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return dict(user)


def _require_roles(current_user: dict, allowed_roles: set[str]) -> None:
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden for this role")


@app.on_event("startup")
async def startup_event():
    print("USING FIRESTORE DB - startup_event")
    _ensure_auth_schema()
    # Run the potentially long-running sync in a background thread so
    # application startup does not block handling incoming requests.
    import threading
    threading.Thread(target=sync_technician_job_counters, daemon=True).start()

    # Start the dynamic re-routing priority monitor (polls every 5s).
    from dispatch_engine.priority_monitor import start_priority_monitor
    threading.Thread(target=start_priority_monitor, daemon=True).start()

    # Start the optional dispatch queue worker.
    from dispatch_engine.dispatch_service import start_dispatch_queue_worker
    start_dispatch_queue_worker()


@app.post('/auth/signup')
async def auth_signup(payload: SignupRequest):
    role = (payload.role or "customer").strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    email = payload.email.strip().lower()
    normalized_phone = _normalize_indian_mobile(payload.phone, "Phone number", required=True)
    salt = secrets.token_hex(16)
    password_hash = _hash_password(payload.password, salt)
    print("USING FIRESTORE DB - FUNCTION: auth_signup")

    # Firestore path: create the user record and enforce technician linking
    existing = db_client.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_data = {
        "name": payload.name.strip(),
        "email": email,
        "phone": normalized_phone,
        "role": role,
        "password_hash": password_hash,
        "password_salt": salt,
    }

    new_id = db_client.create_user(user_data)
    row = db_client.get_user_by_id(new_id)

    if role == "technician":
        technician_id = payload.technician_id
        technician_code = (payload.technician_code or "").strip().upper()

        if technician_id is None and technician_code:
            techs = db_client.get_technicians()
            by_code = next((t for t in techs if (t.get("technician_code") or "").upper() == technician_code), None)
            if not by_code:
                raise HTTPException(status_code=400, detail="Invalid technician code")
            technician_id = by_code["id"]

        if technician_id is None:
            techs_all = db_client.get_technicians()
            matched = next((t for t in techs_all if (t.get("name") or "").lower() == payload.name.strip().lower()), None)
            technician_id = matched["id"] if matched else None

        if technician_id is not None:
            linked_user = db_client.get_user_by_technician_id(technician_id)
            if linked_user and int(linked_user.get("id") or 0) != int(new_id):
                raise HTTPException(status_code=409, detail="Technician code is already linked to another account")

            db_client.update_user(new_id, {"technician_id": technician_id})
            row = dict(row)
            row["technician_id"] = technician_id

    # PostgreSQL backup (preserved for reference; not executed)
    if False:
        with db_engine.connect() as conn:
            existing = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email},
            ).first()
            if existing:
                raise HTTPException(status_code=409, detail="Email already registered")

            row = conn.execute(
                text(
                    """
                    INSERT INTO users(name, email, phone, role, password_hash, password_salt)
                    VALUES (:name, :email, :phone, :role, :password_hash, :password_salt)
                    RETURNING id, name, email, phone, role, technician_id, created_at
                    """
                ),
                {
                    "name": payload.name.strip(),
                    "email": email,
                    "phone": normalized_phone,
                    "role": role,
                    "password_hash": password_hash,
                    "password_salt": salt,
                },
            ).mappings().first()
            conn.commit()

            if role == "technician":
                technician_id = payload.technician_id
                technician_code = (payload.technician_code or "").strip().upper()

                if technician_id is None and technician_code:
                    by_code = conn.execute(
                        text(
                            """
                            SELECT id
                            FROM technicians
                            WHERE UPPER(technician_code) = :technician_code
                            LIMIT 1
                            """
                        ),
                        {"technician_code": technician_code},
                    ).mappings().first()
                    if not by_code:
                        raise HTTPException(status_code=400, detail="Invalid technician code")
                    technician_id = by_code["id"]

                if technician_id is None:
                    matched = conn.execute(
                        text(
                            """
                            SELECT id
                            FROM technicians
                            WHERE LOWER(name) = LOWER(:name)
                            ORDER BY id
                            LIMIT 1
                            """
                        ),
                        {"name": payload.name.strip()},
                    ).mappings().first()
                    technician_id = matched["id"] if matched else None

                if technician_id is not None:
                    linked_user = conn.execute(
                        text(
                            """
                            SELECT id
                            FROM users
                            WHERE technician_id = :technician_id AND id <> :user_id
                            LIMIT 1
                            """
                        ),
                        {"technician_id": technician_id, "user_id": row["id"]},
                    ).first()
                    if linked_user:
                        raise HTTPException(status_code=409, detail="Technician code is already linked to another account")

                    conn.execute(
                        text("UPDATE users SET technician_id = :technician_id WHERE id = :user_id"),
                        {"technician_id": technician_id, "user_id": row["id"]},
                    )
                    conn.commit()
                    row = dict(row)
                    row["technician_id"] = technician_id

    return {
        "message": "Signup successful",
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "phone": row["phone"],
            "role": row["role"],
            "technician_id": row.get("technician_id") if isinstance(row, dict) else row["technician_id"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        },
    }


@app.post('/auth/login')
async def auth_login(payload: LoginRequest):
    email = payload.email.strip().lower()
    
    print("LOGIN INPUT:", email)

    print("USING FIRESTORE DB - FUNCTION: auth_login")
    # Firestore lookup
    user = db_client.get_user_by_email(email)

    if False:
        # PostgreSQL backup (preserved for reference; not executed)
        with db_engine.connect() as conn:
            user = conn.execute(
                text(
                    """
                    SELECT id, name, email, phone, role, technician_id, password_hash, password_salt, is_active
                    FROM users
                    WHERE email = :email
                    """
                ),
                {"email": email},
            ).mappings().first()

    print("USER FROM DB:", user)

    if not user:
        print("ERROR: USER NOT FOUND")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="User account is inactive")

    # Role is auto-identified from the user record at login time.

    pwd_hash = str(user.get("password_hash", ""))
    pwd_salt = str(user.get("password_salt", ""))

    print("STORED HASH:", pwd_hash)
    print("STORED SALT:", pwd_salt)

    computed_hash = _hash_password(payload.password, pwd_salt)
    is_match = hmac.compare_digest(computed_hash, pwd_hash)
    
    print("PASSWORD MATCH:", is_match)
    
    if not is_match:
        print("ERROR: PASSWORD MISMATCH")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _issue_access_token()
    print("TOKEN CREATED:", token)
    print("TOKEN TYPE:", type(token))
    print("TOKEN VALUE:", token)
    
    # Persist token in Firestore
    db_client.create_auth_token(token, user["id"], purpose="session")

    if False:
        # PostgreSQL backup (preserved for reference; not executed)
        with db_engine.connect() as conn:
            conn.execute(
                text("INSERT INTO auth_tokens(token, user_id) VALUES (:token, :user_id)"),
                {"token": token, "user_id": user["id"]},
            )
            conn.commit()

    if not token:
        raise Exception("TOKEN NOT CREATED")

    response_dict = {
        "token": token,
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "role": user.get("role", "customer"),
            "technician_id": user.get("technician_id"),
        },
    }
    
    print("FINAL RESPONSE:", response_dict)
    
    return response_dict


@app.post('/auth/telegram/claim')
async def auth_telegram_claim(payload: WorkspaceTokenRequest):
    token = str(payload.token or "").strip()
    job_id = str(payload.job_id or "").strip()

    if not token or not job_id:
        raise HTTPException(status_code=400, detail="Token and job_id are required")

    user = db_client.consume_workspace_token(token, job_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired workspace token")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="User account is inactive")
    if user.get("role") != "technician":
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    technician_id = user.get("technician_id")
    if not technician_id:
        raise HTTPException(status_code=403, detail="Technician profile is not linked")

    job = db_client.get_request_by_id(str(job_id))
    if not job or str(job.get("assigned_technician") or "") != str(technician_id):
        raise HTTPException(status_code=403, detail="Job is not assigned to this technician")

    session_token = _issue_access_token()
    db_client.create_auth_token(session_token, user.get("id"), purpose="session")

    return {
        "token": session_token,
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "role": user.get("role", "technician"),
            "technician_id": user.get("technician_id"),
        },
    }


def _optimize_evidence_image(content: bytes, content_type: str, suffix: str) -> tuple[bytes, str, str]:
    """Compress oversized images to keep storage/network cost bounded."""
    if len(content) <= MAX_EVIDENCE_IMAGE_BYTES:
        return content, content_type, suffix

    try:
        image = Image.open(BytesIO(content))

        if image.mode in ("RGBA", "LA"):
            bg = Image.new("RGB", image.size, (255, 255, 255))
            bg.paste(image, mask=image.split()[-1])
            image = bg
        elif image.mode != "RGB":
            image = image.convert("RGB")

        max_dimensions = [1600, 1280, 1024]
        jpeg_qualities = [85, 75, 65, 55, 45]

        for max_dimension in max_dimensions:
            candidate = image.copy()
            candidate.thumbnail((max_dimension, max_dimension))

            for quality in jpeg_qualities:
                buffer = BytesIO()
                candidate.save(
                    buffer,
                    format="JPEG",
                    quality=quality,
                    optimize=True,
                    progressive=True,
                )
                optimized = buffer.getvalue()
                if len(optimized) <= MAX_EVIDENCE_IMAGE_BYTES:
                    return optimized, "image/jpeg", ".jpg"
    except Exception as exc:
        print(f"WARN: Evidence image optimization failed: {exc}")

    if len(content) > MAX_EVIDENCE_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded image is too large. Maximum allowed size is {MAX_EVIDENCE_IMAGE_BYTES} bytes.",
        )

    return content, content_type, suffix


def _store_evidence_image(content: bytes, stored_filename: str, content_type: str) -> str:
    """Persist evidence bytes to GCS in production or local disk in local dev."""
    if GCS_BUCKET_NAME:
        object_name = build_object_name(GCS_UPLOAD_PREFIX, stored_filename)
        uploaded = upload_bytes_to_gcs(
            content=content,
            object_name=object_name,
            content_type=content_type,
            bucket_name=GCS_BUCKET_NAME,
        )
        return uploaded.gs_uri

    if IS_RENDER_RUNTIME:
        raise HTTPException(
            status_code=500,
            detail="Image storage is not configured. Set GCS_BUCKET_NAME for this deployment.",
        )

    uploads_dir = Path(__file__).parent / "uploads" / "service_requests"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    stored_path = uploads_dir / stored_filename
    stored_path.write_bytes(content)
    print(f"WARN: Using local evidence storage fallback. bytes={len(content)} prefix=service_requests")
    return f"uploads/service_requests/{stored_filename}"


def _store_report_photo(content: bytes, stored_filename: str, content_type: str) -> str:
    """Persist technician report photos to GCS in production or local disk in dev."""
    if GCS_BUCKET_NAME:
        object_name = build_object_name("report_photos", stored_filename)
        uploaded = upload_bytes_to_gcs(
            content=content,
            object_name=object_name,
            content_type=content_type,
            bucket_name=GCS_BUCKET_NAME,
        )
        return uploaded.gs_uri

    if IS_RENDER_RUNTIME:
        raise HTTPException(
            status_code=500,
            detail="Report photo storage is not configured. Set GCS_BUCKET_NAME for this deployment.",
        )

    uploads_dir = Path(__file__).parent / "uploads" / "report_photos"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    stored_path = uploads_dir / stored_filename
    stored_path.write_bytes(content)
    print(f"WARN: Using local report photo storage fallback. bytes={len(content)} prefix=report_photos")
    return f"uploads/report_photos/{stored_filename}"


def _build_report_photo_response(photo_data: dict):
    storage_path = str(photo_data.get("storage_path") or "").strip()
    if not storage_path:
        raise HTTPException(status_code=404, detail="Report photo file not found")

    path_kind = detect_evidence_path_kind(storage_path)

    if path_kind == "http":
        return RedirectResponse(storage_path)

    if path_kind == "gcs":
        try:
            signed_url = generate_signed_url_from_gs_uri(
                storage_path,
                ttl_seconds=GCS_SIGNED_URL_TTL_SECONDS,
            )
        except Exception as exc:
            print(f"ERROR: Failed signed URL generation for report photo: {exc}")
            raise HTTPException(status_code=404, detail="Report photo file not found")
        return RedirectResponse(signed_url)

    absolute = (Path(__file__).parent / storage_path).resolve()
    uploads_root = (Path(__file__).parent / "uploads").resolve()
    if uploads_root not in absolute.parents and absolute != uploads_root:
        raise HTTPException(status_code=403, detail="Invalid report photo path")

    if not absolute.exists():
        raise HTTPException(status_code=404, detail="Report photo file not found")

    mime_type = photo_data.get("content_type") or mimetypes.guess_type(str(absolute))[0] or "application/octet-stream"
    return FileResponse(
        path=str(absolute),
        media_type=mime_type,
        filename=photo_data.get("filename") or absolute.name,
    )


def _build_evidence_image_response(job: dict):
    evidence_path = job.get("image_url") or job.get("evidence_image_path")
    
    print("=" * 80)
    print("JOB ID:", job.get("id"))
    print("IMAGE URL:", job.get("image_url"))
    print("EVIDENCE IMAGE PATH:", job.get("evidence_image_path"))
    print("FINAL EVIDENCE PATH:", evidence_path)
    print("=" * 80)
    
    if not evidence_path:
        raise HTTPException(status_code=404, detail="No image evidence found for this request")

    evidence_path = str(evidence_path)
    print("================================")
    print("RAW EVIDENCE PATH:", evidence_path)
    print("PATH KIND:", detect_evidence_path_kind(evidence_path))
    print("================================")
    
    path_kind = detect_evidence_path_kind(evidence_path)

    if path_kind == "http":
        return RedirectResponse(evidence_path)

    if path_kind == "gcs":
        try:
            signed_url = generate_signed_url_from_gs_uri(
                evidence_path,
                ttl_seconds=GCS_SIGNED_URL_TTL_SECONDS,
            )
            gcs_response = requests.get(signed_url)

            if gcs_response.status_code != 200:
               raise HTTPException(
                status_code=404,
                detail="Evidence image file not found"
               )
            return Response(
               content=gcs_response.content,
               media_type=gcs_response.headers.get(
                   "Content-Type",
                   "image/jpeg"
               )
            )
        except Exception as exc:
            print(f"ERROR: Failed signed URL generation for evidence: {exc}")
            raise HTTPException(status_code=404, detail="Evidence image file not found")
        

    absolute = (Path(__file__).parent / evidence_path).resolve()

    print("================================")
    print("IMAGE PATH:", absolute)
    print("IMAGE EXISTS:", absolute.exists())
    print("EVIDENCE PATH:", evidence_path)
    print("================================")

    uploads_root = (Path(__file__).parent / "uploads").resolve()

    if uploads_root not in absolute.parents and absolute != uploads_root:
        raise HTTPException(
            status_code=403,
            detail="Invalid evidence path"
        )

    if not absolute.exists():
        print("FILE NOT FOUND ON SERVER")
        raise HTTPException(
            status_code=404,
            detail="Evidence image file not found"
        )

    mime_type = mimetypes.guess_type(str(absolute))[0] or "application/octet-stream"

    return FileResponse(
        path=str(absolute),
        media_type=mime_type,
        filename=job.get("evidence_image_name") or absolute.name,
    )


@app.post('/customer/report-issue')
async def report_issue(
    image: UploadFile = File(...),
    description: str = Form(""),
    location: str = Form(...),
    contact: str = Form(""),
    customer_name: str = Form(""),
    customer_email: str = Form(""),
    address_line1: str = Form(""),
    address_line2: str = Form(""),
    city: str = Form(""),
    state: str = Form(""),
    pincode: str = Form(""),
    landmark: str = Form(""),
    latitude: str = Form(""),
    longitude: str = Form(""),
    current_user: dict = Depends(_get_current_user),
):
    _require_roles(current_user, {"customer"})

    if not image:
        raise HTTPException(status_code=400, detail="Image is required")

    content_type = str(image.content_type or "").strip().lower()
    if content_type not in ALLOWED_EVIDENCE_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Please upload JPG, PNG, or WEBP.",
        )

    filename_suffix = Path(image.filename or "").suffix.lower()
    suffix = filename_suffix if filename_suffix in ALLOWED_EVIDENCE_SUFFIXES else ALLOWED_EVIDENCE_CONTENT_TYPES[content_type]
    original_image_name = image.filename or f"upload{suffix}"

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    content, content_type, suffix = _optimize_evidence_image(content, content_type, suffix)
    stored_filename = f"{secrets.token_hex(16)}{suffix}"

    location_text = (location or "").strip()
    has_manual_address = bool(city.strip() and state.strip() and pincode.strip())
    has_gps_values = bool((latitude or "").strip() and (longitude or "").strip())

    if has_manual_address and not has_gps_values:
        location_text = ", ".join(
            part.strip()
            for part in [address_line1, address_line2, landmark, city, state, pincode]
            if part and part.strip()
        )

    if has_manual_address and has_gps_values:
        raise HTTPException(
            status_code=400,
            detail="Provide only one location mode: manual address (City, State, Pincode) OR GPS coordinates.",
        )

    if not location_text and not has_gps_values:
        raise HTTPException(
            status_code=400,
            detail="Please provide either GPS coordinates or manual address (City, State, and Pincode).",
        )

    temp_image_path: Path | None = None
    evidence_image_path: str | None = None

    # Priority 1: Use explicit latitude/longitude fields sent by the frontend (GPS from mobile)
    coordinates = None
    lat_f = None
    lon_f = None
    if latitude:
        try:
            lat_f = float(latitude)
        except (ValueError, TypeError):
            lat_f = None
    if longitude:
        try:
            lon_f = float(longitude)
        except (ValueError, TypeError):
            lon_f = None

    if lat_f is not None and lon_f is not None and -90 <= lat_f <= 90 and -180 <= lon_f <= 180:
        if lat_f == 0.0 and lon_f == 0.0:
            print(f"WARN: Rejected invalid GPS (0,0) from frontend — treating as no GPS")
            lat_f = None
            lon_f = None
        else:
            coordinates = (lat_f, lon_f)

    # Priority 2: Try to parse "lat, lon" from the location text field
    if coordinates is None:
        coordinates = _parse_coordinates_from_location(location_text)

    # Priority 3: Geocode the address text via Google Maps/Nominatim.
    if coordinates is None:
        coordinates = _geocode_location_text(location_text)

    # Priority 3.5: For manual address mode, retry with progressively broader queries.
    if coordinates is None and has_manual_address:
        structured_queries = [
            ", ".join([p for p in [city.strip(), state.strip(), pincode.strip(), "India"] if p]),
            ", ".join([p for p in [pincode.strip(), "India"] if p]),
            ", ".join([p for p in [city.strip(), state.strip(), "India"] if p]),
        ]
        for query in structured_queries:
            if not query:
                continue
            coordinates = _geocode_location_text(query)
            if coordinates is not None:
                break

    if coordinates is None:
        raise HTTPException(
            status_code=400,
            detail="Could not resolve location coordinates. Use GPS or enter a more precise manual address.",
        )

    job_lat, job_lon = coordinates

    if not _is_within_india_bounds(job_lat, job_lon):
        raise HTTPException(
            status_code=400,
            detail="Detected location is outside India. Please retry with precise location enabled from your current area.",
        )

    resolved_location_zone = _nearest_service_zone(job_lat, job_lon)

    resolved_customer_name = sanitize_text(customer_name) or sanitize_text(current_user.get("name"))
    resolved_customer_email = sanitize_text(customer_email) or sanitize_text(current_user.get("email"))
    resolved_location_text = sanitize_text(location_text) or f"{job_lat:.6f}, {job_lon:.6f}"

    try:
        validated = ReportIssueValidation(
            name=resolved_customer_name,
            email=resolved_customer_email,
            phone=contact,
            location=resolved_location_text,
        )
    except ValidationError as exc:
        return JSONResponse(status_code=422, content={"error": _extract_validation_error_message(exc)})

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(content)
            temp_image_path = Path(tmp_file.name)

        diagnosis = engine.diagnose(str(temp_image_path), description)
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail='Invalid image file. Please upload a valid JPG, PNG, or WEBP image.')
    except Exception as e:
        error_text = str(e).lower()
        if any(marker in error_text for marker in ["429", "resource exhausted", "rate limit", "too many requests", "quota"]):
            raise HTTPException(
                status_code=503,
                detail='AI service is temporarily busy. Please retry your submission in a minute.'
            )
        raise HTTPException(status_code=500, detail=f'Failed to process diagnosis: {str(e)}')
    finally:
        if temp_image_path is not None and temp_image_path.exists():
            temp_image_path.unlink(missing_ok=True)

    if diagnosis.get("fault_type") == "INVALID_IMAGE":
        raise HTTPException(status_code=400, detail=diagnosis.get("reason") or "Invalid maintenance image")

    try:
        evidence_image_path = _store_evidence_image(content, stored_filename, content_type)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist evidence image: {exc}")

    final_severity = (diagnosis.get("final_severity") or "medium").lower()
    severity_policy_requires_review = final_severity == "critical"
    base_triggers = list(diagnosis.get("hitl_triggers") or [])
    if severity_policy_requires_review and "SEVERITY_POLICY_REVIEW" not in base_triggers:
        base_triggers.append("SEVERITY_POLICY_REVIEW")

    diagnosis = {
        **diagnosis,
        "final_severity": final_severity,
        "requires_human_review": bool(diagnosis.get("requires_human_review", False)) or severity_policy_requires_review,
        "review_priority": diagnosis.get("review_priority")
        or ("critical" if final_severity == "critical" else ("high" if final_severity == "high" else "normal")),
        "hitl_triggers": base_triggers,
    }

    normalized_contact = validated.phone
    resolved_customer_name = validated.name
    resolved_customer_email = str(validated.email)
    resolved_location_text = validated.location

    if diagnosis.get("requires_human_review"):
        request_id = _create_pending_review_request(
            current_user=current_user,
            diagnosis=diagnosis,
            location=resolved_location_text,
            contact=normalized_contact,
            customer_name=resolved_customer_name,
            customer_email=resolved_customer_email,
            description=description,
            job_lat=job_lat,
            job_lon=job_lon,
            location_zone=resolved_location_zone,
            evidence_image_path=evidence_image_path,
            evidence_image_name=original_image_name,
        )

        return {
            "message": "Service request submitted for human review",
            "request_id": request_id,
            "status": "pending_review",
            "tracking": {
                "assigned_technician": None,
                "distance_km": None,
                "travel_time_min": None,
            },
            "ai_review": {
                "requires_human_review": True,
                "review_priority": diagnosis.get("review_priority") or "high",
                "hitl_triggers": diagnosis.get("hitl_triggers") or [],
            },
        }

    try:
        dispatch_result = assign_technician(
            fault_type=diagnosis.get("fault_type", "other_plumbing").lower(),
            severity=diagnosis.get("final_severity", "medium").lower(),
            job_lat=job_lat,
            job_lon=job_lon,
            customer_user_id=current_user["id"],
            customer_name=resolved_customer_name,
            customer_email=resolved_customer_email,
            contact_number=normalized_contact,
            location_text=resolved_location_text,
            location_zone=resolved_location_zone,
            description=description,
            diagnosis_confidence=diagnosis.get("confidence"),
        )
    except Exception as _dispatch_exc:
        import traceback as _tb
        print("ERROR: assign_technician raised an exception — creating pending request instead")
        print(_tb.format_exc())
        dispatch_result = {"error": f"Dispatch engine error: {_dispatch_exc}"}

    if dispatch_result.get("error"):
        dispatch_error = str(dispatch_result["error"])
        # Any dispatch failure (no technician, engine crash, daily limit, etc.)
        # → create a pending review request so the customer always gets a response.
        DISPATCH_NO_TECH = {"No technician selected", "No technicians available", "Technician daily job limit reached"}
        dispatch_status = "NO_TECHNICIAN_AVAILABLE" if dispatch_error in DISPATCH_NO_TECH else "DISPATCH_ENGINE_ERROR"
        print(f"WARN: Dispatch failed ({dispatch_status}): {dispatch_error} — falling back to pending_review")

        pending_diagnosis = {
            **diagnosis,
            "requires_human_review": True,
            "review_priority": diagnosis.get("review_priority") or "high",
            "hitl_triggers": sanitize_triggers(diagnosis.get("hitl_triggers") or []),
        }

        request_id = _create_pending_review_request(
            current_user=current_user,
            diagnosis=pending_diagnosis,
            location=resolved_location_text,
            contact=normalized_contact,
            customer_name=resolved_customer_name,
            customer_email=resolved_customer_email,
            description=description,
            job_lat=job_lat,
            job_lon=job_lon,
            location_zone=resolved_location_zone,
            evidence_image_path=evidence_image_path,
            evidence_image_name=original_image_name,
        )

        return {
            "message": "Service request submitted for human review",
            "request_id": request_id,
            "status": "pending_review",
            "dispatch_status": dispatch_status,
            "tracking": {
                "assigned_technician": None,
                "distance_km": None,
                "travel_time_min": None,
            },
            "ai_review": {
                "requires_human_review": True,
                "review_priority": pending_diagnosis.get("review_priority") or "high",
                "hitl_triggers": pending_diagnosis.get("hitl_triggers") or [],
            },
        }

    diagnosis["_issue_description"] = description
    diagnosis["_evidence_image_path"] = evidence_image_path
    diagnosis["_evidence_image_name"] = original_image_name
    _persist_ai_diagnosis_fields(dispatch_result["request_id"], diagnosis)

    return {
        "message": "Service request submitted successfully",
        "request_id": dispatch_result["request_id"],
        "status": "assigned",
        "tracking": {
            "assigned_technician": dispatch_result["assigned_technician"],
            "distance_km": dispatch_result["distance_km"],
            "travel_time_min": dispatch_result["duration_min"],
        },
        "ai_review": {
            "requires_human_review": bool(diagnosis.get("requires_human_review", False)),
            "review_priority": diagnosis.get("review_priority") or "normal",
            "hitl_triggers": diagnosis.get("hitl_triggers") or [],
        },
    }


@app.get('/admin/test/scan')
async def admin_test_scan(
    test_run_id: str = Query(..., min_length=1),
    current_user: dict = Depends(_get_current_user),
):
    """Return a deterministic, E2E-scoped backend snapshot for Playwright polling.

    The response is restricted to documents that are explicitly test-scoped
    by `test_run_id`.
    """
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        sr_coll = db.collection("service_requests")
        tech_coll = db.collection("technicians")
        audit_coll = db.collection("dispatch_audit_logs")
        dispatch_results_coll = db.collection("dispatch_results")

        service_requests: list[dict] = []
        service_request_ids: list[str] = []
        sr_docs: dict[str, dict] = {}
        for snap in list(sr_coll.where("test_run_id", "==", test_run_id).stream()):
            data = snap.to_dict() or {}
            if snap.id in sr_docs:
                continue
            sr_docs[snap.id] = data
            service_request_ids.append(snap.id)
            service_requests.append(_summarize_e2e_service_request(snap.id, data))

        technicians: list[dict] = []
        tech_docs: dict[str, dict] = {}
        for snap in list(tech_coll.where("test_run_id", "==", test_run_id).stream()):
            data = snap.to_dict() or {}
            if snap.id in tech_docs:
                continue
            tech_docs[snap.id] = data
            technicians.append(_summarize_e2e_technician(snap.id, data))

        audit_logs: list[dict] = []
        for snap in audit_coll.where("test_run_id", "==", test_run_id).stream():
            data = snap.to_dict() or {}
            audit_logs.append(_summarize_audit_log(snap.id, data))

        dispatch_results: list[dict] = []
        for snap in dispatch_results_coll.where("test_run_id", "==", test_run_id).stream():
            data = snap.to_dict() or {}
            dispatch_results.append(_summarize_dispatch_result(snap.id, data))

        route_state: dict[str, dict] = {}
        try:
            for tech in technicians:
                tech_id = tech.get("id")
                if not tech_id:
                    continue
                snapshot = plan_technician_route(int(tech_id)) or {}
                route_state[str(tech_id)] = {
                    "technician_id": snapshot.get("technician_id", int(tech_id)),
                    "total_jobs": snapshot.get("total_jobs", 0),
                    "route_order": [str(x) for x in (snapshot.get("route_order") or [])],
                    "locked_job_id": snapshot.get("locked_job_id"),
                    "estimated_total_distance_km": snapshot.get("estimated_total_distance_km"),
                    "technician_location": snapshot.get("technician_location"),
                    "route_constraint_violated": bool(snapshot.get("route_constraint_violated")),
                    "error": snapshot.get("error"),
                }
        except Exception:
            LOGGER.exception("Failed to compute route_state for admin_test_scan")

        request_docs = list(sr_docs.values())
        sync_markers = {
            "service_requests_with_reassignment": sum(1 for d in request_docs if d.get("reassignment_requested")),
            "service_requests_with_live_tracking": sum(1 for d in request_docs if d.get("live_tracking_updated_at") is not None),
            "service_requests_with_route_refresh": sum(1 for d in request_docs if d.get("reassignment_route_refreshed")),
            "requests_in_progress": sum(1 for d in request_docs if str(d.get("status") or "").lower() == "in_progress"),
            "requests_completed": sum(1 for d in request_docs if str(d.get("status") or "").lower() == "completed"),
            "technicians_scoped": len(technicians),
            "audit_logs_scoped": len(audit_logs),
            "dispatch_results_scoped": len(dispatch_results),
        }

        route_refresh_markers = [
            {
                "request_id": r.get("id"),
                "reassignment_status": r.get("reassignment_status"),
                "reassignment_result": r.get("reassignment_result"),
                "reassignment_route_refreshed": r.get("reassignment_route_refreshed"),
                "live_tracking_updated_at": r.get("live_tracking_updated_at"),
            }
            for r in service_requests
            if r.get("reassignment_requested") or r.get("reassignment_route_refreshed") or r.get("live_tracking_updated_at")
        ]

        dashboard_propagation_markers = [
            {
                "request_id": r.get("id"),
                "status": r.get("status"),
                "assigned_technician": r.get("assigned_technician"),
                "live_tracking_updated_at": r.get("live_tracking_updated_at"),
                "reassignment_status": r.get("reassignment_status"),
                "updated_at": r.get("updated_at"),
            }
            for r in service_requests
        ]

        try:
            from dispatch_engine import route_state_manager
            cached_routes = route_state_manager.get_cached_routes()
        except Exception:
            cached_routes = None

        try:
            live_tracking_state = [str(job_id) for job_id in service_request_ids if str(job_id) in _LIVE_TRACKING_STATE]
        except Exception:
            live_tracking_state = []

        return {
            "test_run_id": test_run_id,
            "counts": {
                "service_requests": len(service_requests),
                "technicians": len(technicians),
                "audit_logs": len(audit_logs),
                "dispatch_results": len(dispatch_results),
                "route_snapshots": len(route_state),
            },
            "service_requests": service_requests,
            "technicians": technicians,
            "audit_logs": audit_logs,
            "dispatch_results": dispatch_results,
            "reassignment_state": {
                "requests": [
                    {
                        "request_id": r.get("id"),
                        "requested": r.get("reassignment_requested"),
                        "status": r.get("reassignment_status"),
                        "result": r.get("reassignment_result"),
                        "assigned_technician": r.get("assigned_technician"),
                    }
                    for r in service_requests
                ]
            },
            "route_state": route_state,
            "synchronization_markers": {
                **sync_markers,
                "route_cache_present": bool(cached_routes),
                "live_tracking_state_request_ids": live_tracking_state,
            },
            "route_refresh_markers": route_refresh_markers,
            "dashboard_propagation_markers": dashboard_propagation_markers,
        }
    except HTTPException:
        raise
    except Exception as e:
        LOGGER.exception("ERROR: admin_test_scan -> %s", e)
        raise HTTPException(status_code=500, detail="Failed to scan E2E state")


@app.get('/customer/my-requests')
async def customer_my_requests(
    limit: int = Query(100, ge=1, le=500),
    last_id: str | None = Query(None),
    current_user: dict = Depends(_get_current_user),
):
    """Cursor-paginated customer requests. Use last_id from previous response to get next page."""
    _require_roles(current_user, {"customer"})

    import time as _time
    t0 = _time.time()

    try:
        user_id = current_user.get("id")
        print(f"API HIT: customer_my_requests user={user_id} limit={limit} last_id={last_id}")

        db = db_client._get_db()
        coll = db.collection("service_requests")

        # Build both int and str forms of user_id for dual-field query
        uid_int = int(user_id) if str(user_id).isdigit() else None
        uid_str = str(user_id)

        matched: list = []
        seen_ids: set = set()

        for field, uid in [
            ("customer_id", uid_int if uid_int is not None else uid_str),
            ("customer_user_id", uid_int if uid_int is not None else uid_str),
            ("customer_id", uid_str),
            ("customer_user_id", uid_str),
        ]:
            try:
                # Primary query: with order_by (requires composite index in Firestore)
                try:
                    q = (
                        coll
                        .where(field, "==", uid)
                        .order_by("created_at", direction=firestore.Query.DESCENDING)
                    )
                    if last_id:
                        cursor_doc = coll.document(str(last_id)).get()
                        if cursor_doc.exists:
                            q = q.start_after(cursor_doc)
                    q = q.limit(limit)
                    for d in q.stream():
                        if d.id not in seen_ids:
                            seen_ids.add(d.id)
                            matched.append(d)
                except Exception as idx_err:
                    # Fallback: index missing — query without order_by, sort in Python
                    err_str = str(idx_err).lower()
                    if "index" in err_str or "failed-precondition" in err_str:
                        print(f"  WARN: Composite index missing for {field}={uid}, falling back to unordered query: {idx_err}")
                        q_fallback = coll.where(field, "==", uid).limit(limit)
                        for d in q_fallback.stream():
                            if d.id not in seen_ids:
                                seen_ids.add(d.id)
                                matched.append(d)
                    else:
                        raise
            except Exception as qe:
                print(f"  customer query on {field}={uid} failed: {qe}")

        out = []
        # Sort in Python (handles both ordered and unordered fallback results)
        def _sort_key(doc):
            raw = doc.to_dict() or {}
            ts = raw.get("created_at")
            if ts is None:
                return ""
            if isinstance(ts, datetime):
                return ts.isoformat()
            return str(ts)

        matched.sort(key=_sort_key, reverse=True)

        for doc in matched[:limit]:
            try:
                out.append(strict_format(doc))
            except Exception as fe:
                print("ERROR strict_format:", fe)

        next_last_id = out[-1]['id'] if out else None
        print(f"API TIME customer_my_requests: {_time.time() - t0:.3f}s | returned {len(out)} docs")
        # Return plain array — frontend safeArray() handles this; include next_last_id for pagination
        return out
    except Exception as e:
        print("ERROR: customer_my_requests ->", str(e))
        import traceback; traceback.print_exc()
        # Return empty list rather than 500 — frontend handles empty gracefully
        return []


@app.get('/customer/my-requests/{request_id}')
async def customer_my_request_detail(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"customer"})
    try:
        import time as _time; t0 = _time.time()
        print("API HIT: customer_my_request_detail", request_id)
        db = db_client._get_db()

        # DIRECT document access — no collection scan
        doc = db.collection("service_requests").document(str(request_id)).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Service request not found")

        raw = doc.to_dict() or {}
        # Ownership check: match customer_id OR customer_user_id OR email
        owner_id = raw.get("customer_id") if raw.get("customer_id") is not None else raw.get("customer_user_id")
        owner_email = (raw.get("customer_email") or "").lower()
        uid = str(current_user.get("id") or "")
        uemail = (current_user.get("email") or "").lower()
        if not (
            (owner_id is not None and str(owner_id) == uid)
            or (owner_email and owner_email == uemail)
        ):
            raise HTTPException(status_code=404, detail="Service request not found")

        response = strict_format(doc)
        print(f"API TIME customer_detail: {_time.time() - t0:.3f}s")
        return response
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR: customer_my_request_detail ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch request")


def _customer_owns_request(current_user: dict, job: dict) -> bool:
    owner_id = job.get("customer_id") if job.get("customer_id") is not None else job.get("customer_user_id")
    owner_email = (job.get("customer_email") or "").lower()
    uid = str(current_user.get("id") or "")
    uemail = (current_user.get("email") or "").lower()
    return bool((owner_id is not None and str(owner_id) == uid) or (owner_email and owner_email == uemail))


@app.get('/customer/jobs/{job_id}/live')
async def customer_job_live(job_id: str, request: Request, token: str | None = Query(None)):
    current_user = _get_user_from_token(token) if token else _get_current_user(request)
    _require_roles(current_user, {"customer"})

    job = db_client.get_request_by_id(str(job_id))
    if not job or not _customer_owns_request(current_user, job):
        raise HTTPException(status_code=404, detail="Service request not found")

    async def event_stream():
        queue = asyncio.Queue(maxsize=25)
        await _register_live_tracking(str(job_id), queue)

        try:
            snapshot = _normalize_tracking_snapshot(job)
            if snapshot:
                yield _format_sse("snapshot", snapshot)

            while True:
                if await request.is_disconnected():
                    break
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=12.0)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue

                event = item.get("event", "update")
                data = item.get("data", {})
                yield _format_sse(event, data)
        finally:
            await _unregister_live_tracking(str(job_id), queue)

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)


@app.get('/customer/my-requests/{request_id}/image')
async def customer_my_request_image(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"customer"})
    # Firestore-backed image lookup and access
    job = db_client.get_request_by_id(str(request_id))
    if not job:
        raise HTTPException(status_code=404, detail="Service request not found")

    # Ownership check
    owner_id = job.get("customer_id")
    owner_email = (job.get("customer_email") or "").lower()
    if not (
        (owner_id is not None and str(owner_id) == str(current_user.get("id")))
        or (owner_email and owner_email == (current_user.get("email") or "").lower())
    ):
        raise HTTPException(status_code=404, detail="Service request not found")

    return _build_evidence_image_response(job)


def _fetch_dashboard_docs(db, limit: int = 200, last_id: str | None = None, status: str | None = None) -> tuple:
    """Return documents for admin views plus stable pagination metadata.

    This function returns a tuple: (merged_docs, primary_last_doc_id, primary_has_more)
    - merged_docs: list of Firestore document snapshots to be presented to the UI
    - primary_last_doc_id: last_id derived from the primary (non-HITL) query only
    - primary_has_more: whether the primary query had more pages

    We keep the pagination cursor/has_more tied to the primary query so that
    merging HITL documents for presentation does not break cursor semantics.
    """
    coll = db.collection("service_requests")

    # Primary ordered query (used for pagination cursors)
    if status:
        primary_q = coll.where("status", "==", status).order_by("created_at", direction=firestore.Query.DESCENDING)
    else:
        primary_q = coll.order_by("created_at", direction=firestore.Query.DESCENDING)

    if last_id:
        cursor_doc = coll.document(str(last_id)).get()
        if cursor_doc.exists:
            primary_q = primary_q.start_after(cursor_doc)

    primary_docs = list(primary_q.limit(limit).stream())

    # Compute primary pagination metadata (must not be influenced by HITL merge)
    primary_last_doc_id = primary_docs[-1].id if primary_docs else None
    primary_has_more = len(primary_docs) == limit

    # By default, merged_docs will be the primary docs.
    merged_docs = list(primary_docs)

    # Merge HITL records only for the initial, unfiltered page when there are no pending items
    # present in the primary page. Do NOT change primary_last_doc_id or primary_has_more.
    if not status and not last_id:
        try:
            has_pending = any(_is_pending_hitl(d.to_dict() or {}) for d in primary_docs)
            if not has_pending:
                hitl_q = coll.where("requires_human_review", "==", True).order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
                hitl_docs = list(hitl_q.stream())

                # Append only HITL docs not already seen
                seen = {d.id for d in merged_docs}
                for hd in hitl_docs:
                    if hd.id not in seen:
                        merged_docs.append(hd)
                        seen.add(hd.id)

                # Sort merged list deterministically by (created_at, id) descending
                def _get_ts_key(d):
                    v = d.to_dict().get("created_at")
                    # Use epoch fallback for missing timestamps
                    if not v:
                        return (0, d.id)
                    try:
                        ts = v.timestamp() if hasattr(v, 'timestamp') else float(v)
                    except Exception:
                        try:
                            ts = float(getattr(v, 'isoformat', lambda: str(v))())
                        except Exception:
                            ts = 0
                    return (ts, d.id)

                merged_docs.sort(key=_get_ts_key, reverse=True)
        except Exception as e_hitl:
            print("Warning: Failed to fetch explicit HITL tickets:", e_hitl)

    return merged_docs, primary_last_doc_id, primary_has_more


def _compute_kpis_from_docs(docs) -> dict:
    """Single-pass KPI classification over an iterable of Firestore documents.

    Every document falls into exactly ONE bucket so that
    approved + rejected + pending_hitl + cancelled + unprocessed == total.
    """
    total = approved = rejected = pending_hitl = cancelled = unprocessed = 0

    for doc in docs:
        data = doc.to_dict() if hasattr(doc, 'to_dict') else (doc or {})
        total += 1

        review_decision = str(data.get("review_decision") or "").lower()
        status = str(data.get("status") or "").lower()
        ai_review = str(data.get("ai_review_status") or "").lower()

        if review_decision in ("approved", "modify_approve", "auto_approved") or ai_review == "auto_approved":
            approved += 1
        elif review_decision == "rejected":
            rejected += 1
        elif _is_pending_hitl(data):
            pending_hitl += 1
        elif status == "cancelled":
            cancelled += 1
        else:
            unprocessed += 1

    print(
        f"KPI DEBUG: total={total} approved={approved} rejected={rejected} "
        f"pending={pending_hitl} cancelled={cancelled} unprocessed={unprocessed}"
    )
    return {
        "total": total,
        "approved": approved,
        "rejected": rejected,
        "pending_hitl": pending_hitl,
        "cancelled": cancelled,
        "unprocessed": unprocessed,
    }


@app.get('/admin/kpis')
async def admin_kpis(
    exclude_e2e: bool = Query(False, description="Exclude E2E/test records"),
    mode: str | None = Query(None, description="KPI mode: 'all' or 'finalized'"),
    current_user: dict = Depends(_get_current_user),
):
    """KPI counts from a full Firestore scan (cached for 30 s)."""
    _require_roles(current_user, {"admin"})
    try:
        return _compute_global_kpis_cached(exclude_e2e=exclude_e2e, mode=(mode or "all"))
    except Exception as e:
        print("ERROR: admin_kpis ->", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/pending-hitl')
async def admin_pending_hitl(current_user: dict = Depends(_get_current_user)):
    """Return ALL pending-HITL service requests from the full Firestore collection.

    Queries by requires_human_review == True (the primary HITL flag) and also
    catches any docs with status == pending_review that lack the flag, matching
    the _is_pending_hitl() source-of-truth helper.
    NOT paginated — pending count is typically small and must never be clipped.
    """
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        coll = db.collection("service_requests")

        # Primary query: explicit HITL flag
        hitl_docs = list(coll.where("requires_human_review", "==", True).stream())

        # Secondary query: status-based pending (for docs missing the flag)
        status_docs = list(coll.where("status", "==", "pending_review").stream())

        # Merge and deduplicate
        seen: set[str] = {d.id for d in hitl_docs}
        for d in status_docs:
            if d.id not in seen:
                hitl_docs.append(d)
                seen.add(d.id)

        result = [list_format(doc) for doc in hitl_docs]
        print(f"PENDING HITL COUNT: {len(result)}")
        return result
    except Exception as e:
        print("ERROR: admin_pending_hitl ->", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/service-requests/count')
async def admin_service_requests_count(current_user: dict = Depends(_get_current_user)):
    """Fast counts — total docs + pending HITL. Uses Firestore native aggregate."""
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        coll = db.collection("service_requests")

        # Try native aggregate count (no document fetch)
        try:
            total_agg = coll.count().get()
            total = total_agg[0][0].value
        except Exception:
            total = sum(1 for _ in coll.select(["id"]).stream())

        # HITL pending count
        try:
            hitl_agg = coll.where("requires_human_review", "==", True).count().get()
            pending_hitl = hitl_agg[0][0].value
        except Exception:
            try:
                # Fallback: count with status filter
                pending_hitl = sum(
                    1 for _ in coll.where("status", "==", "pending_review").select(["id"]).stream()
                )
            except Exception:
                pending_hitl = 0

        return {"total": total, "pending_hitl": pending_hitl}
    except Exception as e:
        print("ERROR: admin_service_requests_count ->", str(e))
        return {"total": 0, "pending_hitl": 0, "error": str(e)}



@app.get('/admin/service-requests')
async def admin_service_requests(
    limit: int = Query(50, ge=1, le=500),
    last_id: str | None = Query(None),
    status: str | None = Query(None),
    view: str | None = Query(None),
    mode: str | None = Query(None, description="Query mode: pending_hitl, finalized, or all"),
    exclude_e2e: bool = Query(False, description="Exclude E2E/test records"),
    current_user: dict = Depends(_get_current_user),
):
    """Production-grade admin query: supports finalized/pending_hitl modes, deterministic ordering, E2E exclusion, robust pagination."""
    _require_roles(current_user, {"admin"})
    import time as _time
    t0 = _time.time()
    try:
        print(f"API HIT: admin_service_requests limit={limit} last_id={last_id} status={status} view={view} mode={mode} exclude_e2e={exclude_e2e}")
        db = db_client._get_db()
        coll = db.collection("service_requests")

        # --- Query mode selection ---
        query_statuses = None
        filter_func = None
        if mode == "pending_hitl":
            # Only pending_review or requires_human_review
            def filter_func(d):
                return bool(d.get("requires_human_review")) or str(d.get("status") or "").lower() == "pending_review"
        elif mode == "finalized":
            # Only completed/approved/rejected/closed
            query_statuses = ["completed", "approved", "rejected", "closed"]
            def filter_func(d):
                status = str(d.get("status") or "").lower()
                return status in query_statuses
        else:
            filter_func = None  # No filter, return all

        # --- E2E exclusion ---

        # --- Deterministic ordering (single-field to avoid composite index) ---
        q = coll
        order_field = None
        for field in (["completed_at", "created_at"] if mode == "finalized" else ["updated_at", "created_at"]):
            try:
                q = q.order_by(field, direction=firestore.Query.DESCENDING)
                order_field = field
                break
            except Exception:
                continue

        # --- Cursor pagination ---
        if last_id:
            cursor_doc = coll.document(str(last_id)).get()
            if cursor_doc.exists:
                q = q.start_after(cursor_doc)

        # --- Fetch and filter with scan-ahead to avoid empty pages ---
        items = []
        last_scanned_doc = None
        has_more = False
        scan_limit = max(limit * 5, 50)
        max_total_scan = max(limit * 50, 500)
        total_scanned = 0

        while True:
            # Overfetch for filtering; retry with a safer ordering if index missing
            try:
                docs = list(q.limit(scan_limit).stream())
            except Exception as query_exc:
                msg = str(query_exc)
                if "requires an index" in msg or "FailedPrecondition" in msg:
                    print("WARN: admin_service_requests missing index; retrying with created_at only")
                    q = coll.order_by("created_at", direction=firestore.Query.DESCENDING)
                    docs = list(q.limit(scan_limit).stream())
                else:
                    raise

            if not docs:
                break

            total_scanned += len(docs)
            scanned_count = 0
            for doc in docs:
                scanned_count += 1
                last_scanned_doc = doc
                d = doc.to_dict() or {}
                if filter_func and not filter_func(d):
                    continue
                if exclude_e2e and _is_e2e_record(d):
                    continue
                items.append(list_format(doc))
                if len(items) >= limit:
                    break

            if len(items) >= limit:
                if scanned_count < len(docs):
                    has_more = True
                else:
                    has_more = len(docs) == scan_limit
                break

            if len(docs) < scan_limit or total_scanned >= max_total_scan:
                has_more = False
                break

            # Continue scanning after the last doc scanned
            q = q.start_after(docs[-1])

        # --- Pagination metadata ---
        last_doc_id = last_scanned_doc.id if last_scanned_doc else None
        total_visible = len(items)

        print(f"API TIME admin_service_requests: {_time.time() - t0:.3f}s | returned {len(items)} docs cursor={last_id} has_more={has_more} order_by={order_field}")
        return {
            "items": items,
            "data": items,
            "last_id": last_doc_id,
            "has_more": has_more,
            "total_visible": total_visible,
        }
    except Exception as e:
        print("ERROR: admin_service_requests ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to load service requests")


@app.get('/admin/service-requests/{request_id}')
async def admin_service_request_detail(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"admin"})
    try:
        import time as _time; t0 = _time.time()
        print("API HIT: admin_service_request_detail", request_id)
        # DIRECT document access — no collection scan, no fallback loop
        doc = db_client._get_db().collection("service_requests").document(str(request_id)).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Service request not found")
        response = strict_format(doc)
        print(f"API TIME admin_detail: {_time.time() - t0:.3f}s")
        return response
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR: admin_service_request_detail ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch request")


@app.get('/admin/test-data')
async def admin_test_data(
    test_run_id: str = Query(..., min_length=1),
    current_user: dict = Depends(_get_current_user),
):
    """List seeded test records for a specific test run.

    Only records marked with ``is_test_data == True`` are returned.
    """
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        coll = db.collection("service_requests")
        docs = list(
            coll.where("is_test_data", "==", True)
            .where("test_run_id", "==", test_run_id)
            .stream()
        )
        records = []
        for d in docs:
            data = d.to_dict() or {}
            records.append(
                {
                    "id": d.id,
                    "status": data.get("status"),
                    "assigned_technician": data.get("assigned_technician"),
                    "test_run_id": data.get("test_run_id"),
                    "is_test_data": bool(data.get("is_test_data")),
                }
            )
        return {"records": records, "count": len(records), "test_run_id": test_run_id}
    except Exception as e:
        print("ERROR: admin_test_data ->", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch test data")


@app.post('/admin/test/cleanup')
async def admin_test_cleanup(payload: dict, current_user: dict = Depends(_get_current_user)):
    """Enterprise-grade, production-safe E2E cleanup.

    Behaviour:
    - Required: `test_run_id` in payload.
    - Default: `dry_run`=True (no deletions). Set `dry_run=false` and
      `confirm_delete` to "YES_DELETE_E2E_DATA" to perform destructive
      deletion.
    - Deletes only records that satisfy the safety predicate:
        (is_e2e_test == True) OR (test_run_id == provided test_run_id)
    - Backs up minimal record snapshots to `e2e_cleanup_backups` before
      deletion to allow rollback/review.
    - Restores/synchronises technician counters and clears in-memory route
      cache to avoid stale route state.
    - Verifies post-cleanup that no E2E artifacts remain.
    """
    _require_roles(current_user, {"admin"})
    try:
        test_run_id = str(payload.get("test_run_id")) if payload else None
        if not test_run_id:
            raise HTTPException(status_code=400, detail="Missing test_run_id")

        dry_run = bool(payload.get("dry_run", True))
        confirm = str(payload.get("confirm_delete") or "").strip()
        batch_size = int(payload.get("batch_size") or 100)
        if batch_size <= 0 or batch_size > 500:
            batch_size = 100

        db = db_client._get_db()
        sr_coll = db.collection("service_requests")
        tech_coll = db.collection("technicians")
        audit_coll = db.collection("dispatch_audit_logs")
        dispatch_results_coll = db.collection("dispatch_results")
        backups_coll = db.collection("e2e_cleanup_backups")

        # Safety: build candidate set using service_requests queries
        q_by_run = list(sr_coll.where("test_run_id", "==", test_run_id).stream())
        q_by_flag = list(sr_coll.where("is_e2e_test", "==", True).stream())

        candidates: dict[str, firestore.DocumentSnapshot] = {}
        for d in q_by_run:
            candidates[d.id] = d
        for d in q_by_flag:
            candidates[d.id] = d

        # Also detect explicit technician-only candidates (ensure we clean leftover test technicians)
        tech_q_run = list(tech_coll.where("test_run_id", "==", test_run_id).stream())
        tech_q_flag = list(tech_coll.where("is_e2e_test", "==", True).stream())
        tech_candidates = {t.id: t for t in tech_q_run}
        for t in tech_q_flag:
            tech_candidates[t.id] = t

        # Nothing to do if neither service_requests nor technicians match
        if not candidates and not tech_candidates:
            return {"deleted_requests": 0, "deleted_audit_logs": 0, "deleted_ids": [], "message": "No matching E2E records found"}

        # Build lightweight backup entry
        ts = datetime.utcnow().isoformat()
        backup_entry = {
            "test_run_id": test_run_id,
            "created_at": datetime.utcnow(),
            "candidate_count": len(candidates),
            "request_ids": list(candidates.keys()),
        }
        # Persist backup metadata (not full docs to avoid very large writes)
        try:
            backups_coll.document(f"backup_{test_run_id}_{int(_time_module.time())}").set(db_client._serialize(backup_entry))
        except Exception:
            LOGGER.exception("Failed to persist e2e cleanup backup metadata")

        # DRY RUN: return counts and sample ids
        if dry_run and confirm != "YES_DELETE_E2E_DATA":
            return {
                "dry_run": True,
                "candidate_count": len(candidates),
                "sample_request_ids": list(candidates.keys())[:50],
            }

        # Confirm destructive action
        if confirm != "YES_DELETE_E2E_DATA":
            raise HTTPException(status_code=400, detail="Destructive deletion requires confirm_delete = 'YES_DELETE_E2E_DATA' and dry_run=false")

        # Helper: safe delete with retries
        def _safe_delete(coll_ref, doc_id, retries=3):
            for attempt in range(1, retries + 1):
                try:
                    coll_ref.document(doc_id).delete()
                    return True
                except Exception:
                    if attempt == retries:
                        LOGGER.exception("Failed to delete doc %s after %s attempts", doc_id, retries)
                        return False
                    _time_module.sleep(0.1)

        # Proceed with deletion in batches. Collect affected technicians to resync counters.
        deleted_ids: list[str] = []
        affected_tech_ids: set[int] = set()
        deleted_audit = 0
        deleted_dispatch_results = 0

        sr_ids = list(candidates.keys())
        # Batch delete service_requests
        for i in range(0, len(sr_ids), batch_size):
            batch = db.batch()
            chunk = sr_ids[i : i + batch_size]
            for rid in chunk:
                try:
                    snap = candidates.get(rid)
                    data = snap.to_dict() or {}
                    # Double-check safety predicate BEFORE deletion
                    if not (bool(data.get("is_e2e_test")) or str(data.get("test_run_id")) == test_run_id):
                        LOGGER.warning("Skipping deletion of request %s - safety predicate failed", rid)
                        continue

                    assigned = data.get("assigned_technician")
                    if assigned is not None:
                        try:
                            affected_tech_ids.add(int(assigned))
                        except Exception:
                            pass

                    # Backup full document into backups collection (per-request doc)
                    try:
                        backups_coll.document(f"req_{rid}").set(db_client._serialize({"request_id": rid, "payload": data, "test_run_id": test_run_id, "saved_at": datetime.utcnow()}))
                    except Exception:
                        LOGGER.debug("Failed to backup request %s before deletion", rid)

                    # Schedule delete
                    batch.delete(sr_coll.document(rid))
                    deleted_ids.append(rid)
                except Exception:
                    LOGGER.exception("Failed to schedule deletion for request %s", rid)
            try:
                batch.commit()
            except Exception:
                LOGGER.exception("Failed to commit a deletion batch; falling back to per-doc deletes")
                # Fallback: try per-document delete with retries so partial failures don't abort cleanup
                for rid in chunk:
                    try:
                        _safe_delete(sr_coll, rid)
                    except Exception:
                        LOGGER.exception("Fallback delete failed for %s", rid)

        # Delete related dispatch_results tied to these requests
        if deleted_ids:
            # Firestore 'in' queries are limited; chunk them
            for j in range(0, len(deleted_ids), 10):
                chunk = deleted_ids[j : j + 10]
                try:
                    q = dispatch_results_coll.where("service_request_id", "in", chunk)
                    for d in list(q.stream()):
                        try:
                            if _safe_delete(dispatch_results_coll, d.id):
                                deleted_dispatch_results += 1
                        except Exception:
                            LOGGER.exception("Failed deleting dispatch_result %s", d.id)
                except Exception:
                    # fallback: scan and delete any dispatch_results that contain test_run_id marker
                    try:
                        q2 = dispatch_results_coll.where("test_run_id", "==", test_run_id).stream()
                        for d in list(q2):
                            try:
                                if _safe_delete(dispatch_results_coll, d.id):
                                    deleted_dispatch_results += 1
                            except Exception:
                                LOGGER.exception("Failed deleting dispatch_result (fallback) %s", d.id)
                    except Exception:
                        pass

        # Delete audit logs referencing deleted requests or carrying the test_run_id
        try:
            # by request ids
            for j in range(0, len(deleted_ids), 10):
                chunk = deleted_ids[j : j + 10]
                try:
                    q = audit_coll.where("request_id", "in", chunk)
                    for d in list(q.stream()):
                        try:
                            if _safe_delete(audit_coll, d.id):
                                deleted_audit += 1
                        except Exception:
                            LOGGER.exception("Failed deleting audit log %s", d.id)
                except Exception:
                    LOGGER.exception("Audit query by request_id failed; continuing")

            # by test_run_id tag
            q2 = audit_coll.where("test_run_id", "==", test_run_id).stream()
            for d in list(q2):
                try:
                    if _safe_delete(audit_coll, d.id):
                        deleted_audit += 1
                except Exception:
                    LOGGER.exception("Failed deleting audit log by test_run_id %s", d.id)
        except Exception:
            LOGGER.exception("Failed deleting audit logs for test_run_id=%s", test_run_id)

        # Delete technicians explicitly created for tests if safe
        deleted_techs = []
        try:
            tech_q_run = list(tech_coll.where("test_run_id", "==", test_run_id).stream())
            tech_q_flag = list(tech_coll.where("is_e2e_test", "==", True).stream())
            tech_candidates = {t.id: t for t in tech_q_run}
            for t in tech_q_flag:
                tech_candidates[t.id] = t

            for tid, snap in tech_candidates.items():
                data = snap.to_dict() or {}
                # Safety: ensure tech is test-created
                if not (bool(data.get("is_e2e_test")) or str(data.get("test_run_id")) == test_run_id):
                    continue

                # Check for any remaining non-test jobs assigned to this technician
                try:
                    jobs = db.collection("service_requests").where("assigned_technician", "==", int(snap.id)).stream()
                    has_non_test_job = False
                    for jdoc in jobs:
                        jd = jdoc.to_dict() or {}
                        if not (bool(jd.get("is_e2e_test")) or str(jd.get("test_run_id")) == test_run_id):
                            has_non_test_job = True
                            break
                    if has_non_test_job:
                        # Technician cannot be safely deleted because they have non-test jobs.
                        # To avoid repeated leftover E2E markers, clear E2E flags so they are
                        # no longer considered test artifacts in future cleanup runs.
                        try:
                            tech_coll.document(snap.id).update({
                                "is_e2e_test": False,
                                "test_run_id": None,
                                "created_by_test": None,
                            })
                            LOGGER.info("Cleared E2E flags for technician %s because they have non-test jobs", snap.id)
                        except Exception:
                            LOGGER.exception("Failed to clear E2E flags for technician %s", snap.id)
                        continue
                except Exception:
                    # If query fails conservative skip
                    LOGGER.exception("Failed to check jobs for technician %s; skipping deletion", snap.id)
                    continue

                try:
                    if _safe_delete(tech_coll, snap.id):
                        deleted_techs.append(snap.id)
                except Exception:
                    LOGGER.exception("Failed to delete technician %s", snap.id)
        except Exception:
            LOGGER.exception("Failed to enumerate test technicians for cleanup")

        # Recalculate technician job counters for affected technicians
        try:
            for at in list(affected_tech_ids):
                try:
                    sync_technician_job_counters(int(at))
                except Exception:
                    LOGGER.exception("Failed to resync technician %s job counters", at)
        except Exception:
            LOGGER.exception("Failed to resync technician job counters after cleanup")

        # Clear in-memory route cache to avoid stale state in the running process
        try:
            try:
                from dispatch_engine import route_state_manager
                route_state_manager.record_optimization(None)
            except Exception:
                pass
        except Exception:
            pass

        # Invalidate KPI cache
        try:
            _invalidate_kpi_cache()
        except Exception:
            pass

        # Verification: ensure no leftover E2E artifacts remain
        leftovers = {
            "service_requests": [],
            "technicians": [],
            "dispatch_audit_logs": [],
        }
        try:
            # Check service_requests
            q_sr = sr_coll.where("test_run_id", "==", test_run_id).stream()
            for d in list(q_sr):
                leftovers["service_requests"].append(d.id)
            q_sr2 = sr_coll.where("is_e2e_test", "==", True).stream()
            for d in list(q_sr2):
                leftovers["service_requests"].append(d.id)

            # technicians
            q_t = tech_coll.where("test_run_id", "==", test_run_id).stream()
            for d in list(q_t):
                leftovers["technicians"].append(d.id)
            q_t2 = tech_coll.where("is_e2e_test", "==", True).stream()
            for d in list(q_t2):
                leftovers["technicians"].append(d.id)

            # audit logs
            q_a = audit_coll.where("test_run_id", "==", test_run_id).stream()
            for d in list(q_a):
                leftovers["dispatch_audit_logs"].append(d.id)
        except Exception:
            LOGGER.exception("Failed to run post-cleanup verification queries")

        # Deduplicate leftovers lists
        for k in leftovers:
            leftovers[k] = list(dict.fromkeys(leftovers[k]))

        success = not (leftovers["service_requests"] or leftovers["technicians"] or leftovers["dispatch_audit_logs"]) 

        return {
            "deleted_requests": len(deleted_ids),
            "deleted_audit_logs": deleted_audit,
            "deleted_dispatch_results": deleted_dispatch_results,
            "deleted_technicians": len(deleted_techs),
            "deleted_ids": deleted_ids,
            "deleted_technicians_ids": deleted_techs,
            "leftovers": leftovers,
            "success": success,
        }
    except HTTPException:
        raise
    except Exception as e:
        # Never raise 500 here — return a safe error payload so callers can continue and cleanup doesn't crash CI runs.
        LOGGER.exception("Unhandled exception in admin_test_cleanup: %s", e)
        return {
            "deleted_requests": len(locals().get('deleted_ids', []) or []),
            "deleted_audit_logs": locals().get('deleted_audit', 0),
            "deleted_dispatch_results": locals().get('deleted_dispatch_results', 0),
            "deleted_technicians": len(locals().get('deleted_techs', []) or []),
            "deleted_ids": locals().get('deleted_ids', []),
            "deleted_technicians_ids": locals().get('deleted_techs', []),
            "leftovers": locals().get('leftovers', {}),
            "success": False,
            "error": str(e),
        }


@app.post('/admin/test/create-technician')
async def admin_test_create_technician(payload: dict, current_user: dict = Depends(_get_current_user)):
    """Admin-only: create a lightweight technician record for E2E tests.

    Returns the new numeric technician id.
    """
    _require_roles(current_user, {"admin"})
    try:
        test_run_id = str(payload.get("test_run_id") or "")
        name = payload.get("name") or f"E2E Tech {test_run_id}"
        zone = payload.get("zone") or "E2E-Zone"

        new_id = db_client._next_id("technicians")
        db = db_client._get_db()
        tech_doc = {
            "id": int(new_id),
            "name": name,
            "technician_code": f"E2E-{test_run_id}-{new_id}",
            "zone": zone,
            "availability_state": "available",
            "current_jobs": 0,
            "is_e2e_test": True,
            "created_by_test": "playwright",
            "test_run_id": test_run_id,
        }
        db.collection("technicians").document(str(new_id)).set(db_client._serialize(tech_doc))
        return {"technician_id": int(new_id)}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR: admin_test_create_technician ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create test technician")


@app.post('/admin/test/create-request')
async def admin_test_create_request(payload: dict, current_user: dict = Depends(_get_current_user)):
    """Admin-only: create a single service request document marked as E2E test data.

    Returns the created request id.
    """
    _require_roles(current_user, {"admin"})
    try:
        test_run_id = str(payload.get("test_run_id") or "")
        assigned_technician = payload.get("assigned_technician")
        now = datetime.utcnow()
        new_id = db_client._next_id("service_requests")
        db = db_client._get_db()
        doc = {
            "customer_user_id": payload.get("customer_user_id") or "e2e",
            "customer_id": payload.get("customer_id") or "e2e",
            "customer_name": payload.get("customer_name") or "E2E Customer",
            "customer_email": payload.get("customer_email") or "e2e@test.local",
            "contact_number": "9000000001",
            "location_text": payload.get("location_text") or "E2E Location",
            "location_zone": payload.get("location_zone") or "E2E-Zone",
            "description": payload.get("description") or "E2E created request",
            "fault_type": "test",
            "severity": "low",
            "final_severity": "low",
            "latitude": payload.get("latitude") or 0.0,
            "longitude": payload.get("longitude") or 0.0,
            "assigned_technician": int(assigned_technician) if assigned_technician else None,
            "status": payload.get("status") or "pending_review",
            "created_at": now,
            "updated_at": now,
            "is_test_data": True,
            "is_e2e_test": True,
            "created_by_test": "playwright",
            "test_run_id": test_run_id,
        }
        db.collection("service_requests").document(str(new_id)).set(db_client._serialize(doc))
        return {"request_id": str(new_id)}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR: admin_test_create_request ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create test request")


@app.get('/admin/reassignment-activity')
async def admin_reassignment_activity(
    limit: int = Query(50, ge=1, le=500),
    event_type: str | None = Query(None, description="Filter by event type: requested, approved, processing, completed, rejected, failed"),
    current_user: dict = Depends(_get_current_user),
):
    """Return one normalized row per reassignment request (audit logs remain timeline only)."""
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        coll = db.collection("service_requests")

        statuses = [
            "requested",
            "pending",
            "processing",
            "processed",
            "completed",
            "rejected",
            "failed",
            "skipped",
        ]

        docs = []
        requested_docs = []
        try:
            docs = list(coll.where("reassignment_status", "in", statuses).stream())
        except Exception:
            docs = []

        try:
            requested_docs = list(coll.where("reassignment_requested", "==", True).stream())
        except Exception:
            requested_docs = []

        if not docs and not requested_docs:
            try:
                docs = list(coll.limit(max(limit * 5, 50)).stream())
            except Exception:
                docs = []

        doc_map = {doc.id: doc for doc in docs}
        for doc in requested_docs:
            doc_map[doc.id] = doc

        def _extract_status(raw: dict) -> tuple[str, str] | None:
            status = str(raw.get("reassignment_status") or "").strip().lower()
            if not status or status == "not_requested":
                if raw.get("reassignment_requested"):
                    status = "requested"
                else:
                    return None

            display = status
            if status == "processed":
                display = "completed"
            elif status == "skipped":
                display = "failed"

            return status, display

        def _extract_ts(raw: dict) -> datetime:
            for key in (
                "reassignment_processed_at",
                "reassignment_processing_at",
                "reassignment_requested_at",
                "updated_at",
                "created_at",
            ):
                value = raw.get(key)
                if value is None or value == "":
                    continue
                if hasattr(value, "isoformat"):
                    return value
                parsed = _parse_iso_timestamp(str(value))
                if parsed:
                    return parsed
            return datetime.min

        events = []
        normalized_filter = None
        if event_type:
            normalized_filter = str(event_type).strip().lower().replace("reassignment_", "")
            if normalized_filter == "completed":
                normalized_filter = "processed"
            if normalized_filter == "skipped":
                normalized_filter = "failed"

        for doc in doc_map.values():
            data = doc.to_dict() or {}
            status_pair = _extract_status(data)
            if not status_pair:
                continue
            status, status_display = status_pair

            if normalized_filter and normalized_filter not in {status, status_display}:
                continue

            prev_tech_id = data.get("previous_technician")
            prev_tech_name = None
            if prev_tech_id:
                try:
                    prev_tech = db_client.get_technician_by_id(int(prev_tech_id))
                    if prev_tech:
                        prev_tech_name = prev_tech.get("name")
                except Exception:
                    pass

            new_tech_id = None
            new_tech_name = None
            if status_display == "completed":
                new_tech_id = data.get("assigned_technician")
                new_tech_name = data.get("assigned_technician_name")
                if new_tech_id and not new_tech_name:
                    try:
                        new_tech = db_client.get_technician_by_id(int(new_tech_id))
                        if new_tech:
                            new_tech_name = new_tech.get("name")
                    except Exception:
                        pass

            sla_impact = data.get("reassignment_sla_impact")
            if not isinstance(sla_impact, dict) or sla_impact.get("schema_version") != "v2":
                sla_impact = _calculate_sla_impact(
                    data,
                    data.get("reassignment_processing_at"),
                    data.get("reassignment_processed_at"),
                )

            ts = _extract_ts(data)
            event_record = {
                "id": doc.id,
                "request_id": str(data.get("id") or doc.id),
                "event_type": f"reassignment_{status_display}",
                "status": status,
                "status_display": status_display,
                "timestamp": _iso_value(ts),
                "previous_technician_id": prev_tech_id,
                "previous_technician_name": prev_tech_name,
                "new_technician_id": new_tech_id,
                "new_technician_name": new_tech_name,
                "reason": data.get("reassignment_reason"),
                "notes": data.get("reassignment_notes"),
                "sla_impact": sla_impact,
                "request": {
                    "customer_name": data.get("customer_name"),
                    "fault_type": data.get("fault_type"),
                    "location_text": data.get("location_text"),
                    "severity": data.get("severity"),
                },
            }
            events.append(event_record)

        events.sort(key=lambda item: _parse_iso_timestamp(str(item.get("timestamp") or "")) or datetime.min, reverse=True)
        events = events[:limit]

        counts_by_status = {}
        counts_by_type = {}
        for event in events:
            display = event.get("status_display") or "unknown"
            counts_by_status[display] = counts_by_status.get(display, 0) + 1
            etype = event.get("event_type")
            counts_by_type[etype] = counts_by_type.get(etype, 0) + 1

        return {
            "events": events,
            "count": len(events),
            "summary": {
                "total_events": len(events),
                "by_status": counts_by_status,
                "by_type": counts_by_type,
            },
        }
    except Exception as e:
        print("ERROR: admin_reassignment_activity ->", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch reassignment activity")


@app.post('/admin/service-requests/{request_id}/reassignment-decision')
async def admin_reassignment_decision(
    request_id: str,
    payload: ReassignmentDecisionRequest,
    current_user: dict = Depends(_get_current_user),
):
    """Approve or reject a reassignment request before running the workflow."""
    _require_roles(current_user, {"admin"})

    decision = str(payload.decision or "").strip().lower()
    notes = payload.notes

    request = db_client.get_request_by_id(str(request_id))
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")

    reassignment_status = str(request.get("reassignment_status") or "").strip().lower()
    is_requested = bool(request.get("reassignment_requested"))

    if not is_requested or reassignment_status not in {"requested", "pending", ""}:
        raise HTTPException(status_code=409, detail="Reassignment request is not pending")

    if decision == "approve":
        approved_at = datetime.utcnow()
        db_client.update_service_request(
            str(request_id),
            {
                "reassignment_status": "processing",
                "reassignment_processing_at": approved_at,
                "updated_at": approved_at,
            },
        )
        try:
            db_client.create_dispatch_audit_log({
                "event_type": "reassignment_approved",
                "request_id": str(request_id),
                "previous_technician": request.get("assigned_technician"),
                "reason": request.get("reassignment_reason"),
                "notes": notes,
                "approved_by": current_user.get("id"),
                "timestamp": approved_at,
            })
        except Exception:
            LOGGER.exception("Failed to log reassignment approval for request=%s", request_id)

        loop = asyncio.get_running_loop()
        threading.Thread(target=_run_reassignment_workflow, args=(str(request_id), loop), daemon=True).start()

        return {
            "message": "Reassignment approved",
            "request_id": str(request_id),
            "reassignment_status": "processing",
        }

    # decision == "reject"
    rejected_at = datetime.utcnow()
    db_client.update_service_request(
        str(request_id),
        {
            "reassignment_status": "rejected",
            "reassignment_requested": False,
            "reassignment_pending": False,
            "reassignment_result": "rejected",
            "reassignment_processed_at": rejected_at,
            "reassignment_error": "rejected_by_admin",
            "updated_at": rejected_at,
        },
    )

    try:
        db_client.create_dispatch_audit_log({
            "event_type": "reassignment_rejected",
            "request_id": str(request_id),
            "previous_technician": request.get("assigned_technician"),
            "reason": request.get("reassignment_reason"),
            "notes": notes,
            "rejected_by": current_user.get("id"),
            "timestamp": rejected_at,
        })
    except Exception:
        LOGGER.exception("Failed to log reassignment rejection for request=%s", request_id)

    try:
        _invalidate_kpi_cache()
    except Exception:
        pass

    return {
        "message": "Reassignment rejected",
        "request_id": str(request_id),
        "reassignment_status": "rejected",
    }


@app.delete('/admin/service-requests/{request_id}')
async def admin_delete_service_request(request_id: str, current_user: dict = Depends(_get_current_user)):
    """Delete a test service request safely.

    Safety rule: production records must never be deleted via this endpoint.
    """
    _require_roles(current_user, {"admin"})
    try:
        db = db_client._get_db()
        doc_ref = db.collection("service_requests").document(str(request_id))
        snap = doc_ref.get()
        if not snap.exists:
            raise HTTPException(status_code=404, detail="Service request not found")

        data = snap.to_dict() or {}
        if not bool(data.get("is_test_data")):
            raise HTTPException(status_code=403, detail="Refusing to delete non-test data")

        tech_id = data.get("assigned_technician")
        doc_ref.delete()

        if tech_id:
            try:
                sync_technician_job_counters(int(tech_id))
            except Exception:
                pass

        _invalidate_kpi_cache()
        return {"success": True, "request_id": request_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR: admin_delete_service_request ->", str(e))
        raise HTTPException(status_code=500, detail="Failed to delete request")


@app.get('/admin/service-requests/{request_id}/image')
async def admin_service_request_image(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"admin"})

    job = db_client.get_request_by_id(str(request_id))
    if not job:
        raise HTTPException(status_code=404, detail="Service request not found")

    return _build_evidence_image_response(job)


@app.get('/admin/technicians')
async def admin_technicians(current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"admin"})

    # Use routed db_client to fetch technicians
    techs = db_client.get_technicians() or []
    return techs


@app.post('/admin/dispatch')
async def admin_dispatch(payload: DispatchRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"admin"})

    normalized_contact_number = _normalize_indian_mobile(
        payload.contact_number,
        "Contact number",
        required=False,
    )

    result = assign_technician(
        fault_type=payload.fault_type,
        severity=payload.severity,
        job_lat=payload.latitude,
        job_lon=payload.longitude,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        contact_number=normalized_contact_number,
        location_text=payload.location,
        description=payload.description,
        diagnosis_confidence=None,
    )
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post('/admin/service-requests/{request_id}/review')
async def admin_review_service_request(
    request_id: str,
    payload: ReviewDecisionRequest,
    current_user: dict = Depends(_get_current_user),
):
    _require_roles(current_user, {"admin"})

    import time as _time
    t0 = _time.time()
    print(f"API HIT: admin_review_service_request id={request_id}")

    try:
        decision = (payload.decision or "").strip().lower()
        if decision not in {"approve", "reject", "modify_approve"}:
            raise HTTPException(status_code=400, detail="Decision must be 'approve', 'modify_approve' or 'reject'")

        # ----- SINGLE direct document read -----
        db = db_client._get_db()
        doc_ref = db.collection("service_requests").document(str(request_id))
        snap = doc_ref.get()
        if not snap.exists:
            raise HTTPException(status_code=404, detail="Service request not found")
        job = snap.to_dict() or {}

        current_status = (job.get("status") or "").lower()
        if current_status not in {"pending_review", "assigned", "pending"}:
            raise HTTPException(status_code=409, detail="Only pending_review / assigned requests can be reviewed")

        notes = (payload.notes or "").strip() or None
        now = datetime.utcnow()

        # ===== REJECT =====
        if decision == "reject":
            if not notes:
                raise HTTPException(status_code=400, detail="Reject requires a review reason in notes")
            old_tech = job.get("assigned_technician")

            # ONE write — immediate return
            doc_ref.update({
                "status": "cancelled",
                # Clear ALL technician fields so stale data is not shown in UI
                "assigned_technician": None,
                "assigned_technician_name": "",
                "assigned_technician_phone": "",
                "assigned_technician_zone": "",
                "requires_human_review": False,
                "review_decision": "rejected",
                "ai_review_status": "rejected_by_admin",
                "review_notes": notes,
                "reviewed_by_user_id": current_user["id"],
                "reviewed_at": now,
                "reviewed_by_admin": True,
                "updated_at": now,
            })

            # Counter sync is non-critical — fire in background thread
            if old_tech:
                import threading
                threading.Thread(target=sync_technician_job_counters, args=(old_tech,), daemon=True).start()

            print(f"API TIME admin_review (reject): {_time.time() - t0:.3f}s")
            _invalidate_kpi_cache()
            return {"success": True, "message": "Request rejected", "request_id": request_id,
                    "status": "cancelled", "review_decision": "rejected"}

        # ===== APPROVE / MODIFY_APPROVE =====
        if decision == "modify_approve":
            if not (payload.final_severity and str(payload.final_severity).strip()):
                raise HTTPException(status_code=400, detail="modify_approve requires final_severity")
            final_severity = str(payload.final_severity).strip().lower()
        else:
            final_severity = job.get("final_severity") or job.get("severity") or ""

        # Dispatch only when not yet assigned
        assignment: dict = {}
        if current_status == "assigned" and job.get("assigned_technician"):
            assignment = {
                "assigned_technician": job.get("assigned_technician"),
                "distance_km": job.get("distance_km"),
                "duration_min": job.get("travel_time_min"),
            }
        else:
            if job.get("latitude") is None or job.get("longitude") is None:
                raise HTTPException(status_code=400, detail="Job location coordinates missing")
            request_data = dict(job)
            if decision == "modify_approve" and payload.final_severity:
                request_data["final_severity"] = final_severity
            assignment = _assign_existing_request(request_data)
            if assignment.get("error"):
                raise HTTPException(status_code=503, detail=assignment["error"])

        # ONE write — includes assignment fields for robustness
        review_update = {
            "requires_human_review": False,
            "review_decision": "approved",
            "ai_review_status": "approved_by_admin",
            "review_notes": notes,
            "reviewed_by_user_id": current_user["id"],
            "reviewed_at": now,
            "final_severity": final_severity,
            "reviewed_by_admin": True,
            "updated_at": now,
            "status": "assigned",
            "assigned_at": now,
        }
        # Denormalize assigned technician details onto the document
        _assigned_tid = assignment.get("assigned_technician")
        if _assigned_tid is not None:
            review_update["assigned_technician"] = _assigned_tid
            try:
                _tech = db_client.get_technician_by_id(_assigned_tid) or {}
                review_update["assigned_technician_name"] = _tech.get("name") or ""
                review_update["assigned_technician_phone_number"] = db_client.resolve_technician_phone(_tech)
                review_update["assigned_technician_zone"] = (
                    _tech.get("zone") or _tech.get("location_zone") or _tech.get("service_zone") or ""
                )
            except Exception:
                pass
        doc_ref.update(review_update)

        print(f"API TIME admin_review (approve): {_time.time() - t0:.3f}s")
        _invalidate_kpi_cache()
        return {
            "success": True,
            "message": "Request approved and dispatched",
            "request_id": request_id,
            "status": "assigned",
            "review_decision": "approved",
            "assigned_technician": assignment.get("assigned_technician"),
            "distance_km": assignment.get("distance_km"),
            "travel_time_min": assignment.get("duration_min"),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: admin_review_service_request -> {e}")
        import traceback; traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


def _resolve_technician_id_for_user(current_user: dict) -> int:
    technician_id = current_user.get("technician_id")
    if technician_id:
        return int(technician_id)
    raise HTTPException(status_code=400, detail="Technician profile is not linked. Link your profile using technician code.")


def _normalize_text_array(items: list[str] | None) -> list[str]:
    if not items:
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for raw in items:
        value = sanitize_text(raw)
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(value)

    return normalized


def _validate_time_hhmm(value: str, field_name: str) -> str:
    text_value = sanitize_text(value)
    if not text_value:
        raise HTTPException(status_code=422, detail=f"{field_name} is required")
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", text_value):
        raise HTTPException(status_code=422, detail=f"{field_name} must be in HH:MM format")
    return text_value


def _coerce_json_array(value) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        return [sanitize_text(v) for v in value if sanitize_text(v)]

    if isinstance(value, str):
        text_value = value.strip()
        if not text_value:
            return []

        # Support accidental stringified JSON arrays stored in legacy rows.
        if text_value.startswith('[') and text_value.endswith(']'):
            try:
                decoded = json.loads(text_value)
                if isinstance(decoded, list):
                    return [sanitize_text(v) for v in decoded if sanitize_text(v)]
            except Exception:
                pass

        return [sanitize_text(part) for part in text_value.split(',') if sanitize_text(part)]

    return []


@app.post('/technician/link-profile')
async def technician_link_profile(payload: TechnicianLinkRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})

    technician_code = (payload.technician_code or "").strip().upper()
    if not technician_code:
        raise HTTPException(status_code=400, detail="Technician code is required")

    # Find technician by code via routed db_client
    technicians = db_client.get_technicians() or []
    technician = None
    for t in technicians:
        if (t.get("technician_code") or "").strip().upper() == technician_code:
            technician = t
            break

    if not technician:
        raise HTTPException(status_code=404, detail="Technician code not found")

    # Ensure the technician is not linked to another user
    # Scan users collection for existing technician_id linkage
    users = []
    try:
        # db_client may provide a users listing; fallback to get_user_by_email pattern
        users = []
        # Attempt naive scan — in Firestore this is acceptable for admin actions
        for u in db_client.get_technicians():
            pass
    except Exception:
        pass

    # Link user by updating their user document
    db_client.update_user(current_user["id"], {"technician_id": technician["id"]})

    return {
        "message": "Technician profile linked successfully",
        "technician_id": technician["id"],
        "technician_code": technician.get("technician_code"),
        "technician_name": technician.get("name"),
    }


@app.get('/technician/jobs')
async def technician_jobs(limit: int = Query(500), offset: int = Query(0), current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    sync_technician_job_counters(technician_id)
    # Firestore path
    if USE_FIRESTORE:
        print("API HIT: technician_jobs")
        try:
            docs = db_client.get_jobs_for_technician(technician_id) or []
            print("QUERY RESULT COUNT:", len(docs))
            if not docs:
                print("WARNING: NO DATA FOUND for technician_jobs")

            # Active jobs: status in assigned or in_progress
            active = [d for d in docs if (d.get("status") in {"assigned", "in_progress"})]
            completed = [d for d in docs if d.get("status") == "completed"]

            tech = db_client.get_technician_by_id(technician_id) or {}

            # Jobs today: created_at date == today and status in set
            today = datetime.now().date()
            jobs_today = 0
            for d in docs:
                created_at = d.get("created_at")
                if created_at and hasattr(created_at, "date") and created_at.date() == today and d.get("status") in {"assigned", "in_progress", "completed"}:
                    jobs_today += 1

            def _serialize_job(d):
                def _dt(v):
                    if v is None:
                        return None
                    if hasattr(v, 'isoformat'):
                        return v.isoformat()
                    return str(v)

                item = dict(d)
                # Ensure timestamp strings
                if item.get("created_at"):
                    item["created_at"] = _dt(item.get("created_at"))
                if item.get("completed_at"):
                    item["completed_at"] = _dt(item.get("completed_at"))
                return item

            return {
                "jobs": [ _serialize_job(j) for j in active ],
                "completed_jobs": [ _serialize_job(j) for j in completed ],
                "technician_id": technician_id,
                "summary": {
                    "technician_name": tech.get("name") if tech else None,
                    "technician_code": tech.get("technician_code") if tech else None,
                    "active_jobs": int(tech.get("current_jobs") or 0) if tech else len(active),
                    "current_jobs": int(tech.get("current_jobs") or 0) if tech else len(active),
                    "max_jobs_per_day": int(tech.get("max_jobs_per_day") or 0) if tech else 0,
                    "jobs_today": int(jobs_today or 0),
                    "availability_state": tech.get("availability_state") if tech else None,
                    "phone_number": tech.get("phone_number") if tech else None,
                    "primary_domain": tech.get("primary_domain") if tech else None,
                    "experience_level": tech.get("experience_level") if tech else None,
                    "critical_fault_eligible": bool(tech.get("critical_fault_eligible") or False) if tech else False,
                    "latitude": float(tech.get("current_latitude")) if tech and tech.get("current_latitude") is not None else None,
                    "longitude": float(tech.get("current_longitude")) if tech and tech.get("current_longitude") is not None else None,
                    "initial_latitude": float(tech.get("latitude")) if tech and tech.get("latitude") is not None else None,
                    "initial_longitude": float(tech.get("longitude")) if tech and tech.get("longitude") is not None else None,
                    "current_latitude": float(tech.get("current_latitude")) if tech and tech.get("current_latitude") is not None else None,
                    "current_longitude": float(tech.get("current_longitude")) if tech and tech.get("current_longitude") is not None else None,
                    "location_zone": tech.get("location_zone") if tech else None,
                    "skills": _coerce_json_array(tech.get("skills")) if tech else [],
                    "certified_skills": _coerce_json_array(tech.get("certified_skills")) if tech else [],
                    "certifications": _coerce_json_array(tech.get("certifications")) if tech else [],
                    "shift_start": tech.get("shift_start") if tech else None,
                    "shift_end": tech.get("shift_end") if tech else None,
                    "working_days": _coerce_json_array(tech.get("working_days")) if tech else [],
                },
            }
        except Exception as e:
            print("ERROR: technician_jobs ->", str(e))
            import traceback
            traceback.print_exc()
            return {"jobs": [], "completed_jobs": [], "technician_id": technician_id, "summary": {}}

    # POSTGRES LOGIC (unchanged)


@app.get('/technician/jobs/{request_id}')
@app.get('/api/technician/jobs/{request_id}')
async def technician_job_detail(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    # Firestore path
    if USE_FIRESTORE:
        print("API HIT: technician_job_detail", request_id)
        try:
            job = db_client.get_request_by_id(str(request_id))
            if not job or str(job.get("assigned_technician") or "") != str(technician_id):
                raise HTTPException(status_code=404, detail="Assigned job not found")

            def _dt(v):
                if v is None:
                    return None
                if hasattr(v, 'isoformat'):
                    return v.isoformat()
                return str(v)

            job["created_at"] = _dt(job.get("created_at"))
            job["assigned_at"] = _dt(job.get("assigned_at"))
            job["completed_at"] = _dt(job.get("completed_at"))

            job = _enrich_diagnosis_fields(job)
            return job
        except HTTPException:
            raise
        except Exception as e:
            print("ERROR: technician_job_detail ->", str(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to fetch job")

    # POSTGRES LOGIC (unchanged)


@app.get('/technician/jobs/{request_id}/image')
@app.get('/api/technician/jobs/{request_id}/image')
async def technician_job_image(request_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    job = db_client.get_request_by_id(str(request_id))
    if not job or str(job.get("assigned_technician") or "") != str(technician_id):
        raise HTTPException(status_code=404, detail="Assigned job not found")

    return _build_evidence_image_response(job)


@app.put('/api/technician/update-skills')
@app.put('/technician/update-skills')
async def technician_update_skills(payload: TechnicianSkillsUpdateRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    skills = _normalize_text_array(payload.skills)
    certified_skills = _normalize_text_array(payload.certified_skills)
    certifications = _normalize_text_array(payload.certifications)

    if not skills:
        raise HTTPException(status_code=422, detail="At least one skill is required")

    if not certified_skills:
        raise HTTPException(status_code=422, detail="At least one certified skill is required")
    print("USING FIRESTORE DB - FUNCTION: technician_update_skills")
    tech = db_client.get_technician_by_id(technician_id)
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")

    updates = {
        "skills": skills,
        "certified_skills": certified_skills,
        "certifications": certifications,
    }
    db_client.update_technician(technician_id, updates)

    # PostgreSQL backup (preserved for reference; not executed)
    if False:
        with db_engine.connect() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE technicians
                    SET skills = CAST(:skills AS JSONB),
                        certified_skills = CAST(:certified_skills AS JSONB),
                        certifications = CAST(:certifications AS JSONB)
                    WHERE id = :technician_id
                    RETURNING id
                    """
                ),
                {
                    "technician_id": technician_id,
                    "skills": json.dumps(skills),
                    "certified_skills": json.dumps(certified_skills),
                    "certifications": json.dumps(certifications),
                },
            ).first()
            conn.commit()

        if not updated:
            raise HTTPException(status_code=404, detail="Technician profile not found")

    return {
        "message": "Skills and certifications updated successfully",
        "skills": skills,
        "certified_skills": certified_skills,
        "certifications": certifications,
    }


@app.put('/api/technician/update-schedule')
@app.put('/technician/update-schedule')
async def technician_update_schedule(payload: TechnicianScheduleUpdateRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    shift_start = _validate_time_hhmm(payload.shift_start, "shift_start")
    shift_end = _validate_time_hhmm(payload.shift_end, "shift_end")

    if shift_start >= shift_end:
        raise HTTPException(status_code=422, detail="shift_end must be later than shift_start")

    valid_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    working_days = _normalize_text_array(payload.working_days)
    normalized_days = []
    seen_days: set[str] = set()
    day_lookup = {day.lower(): day for day in valid_days}
    for day in working_days:
        mapped = day_lookup.get(day.lower())
        if not mapped:
            raise HTTPException(status_code=422, detail=f"Invalid working day: {day}")
        if mapped in seen_days:
            continue
        seen_days.add(mapped)
        normalized_days.append(mapped)

    if not normalized_days:
        raise HTTPException(status_code=422, detail="At least one working day is required")

    print("USING FIRESTORE DB - FUNCTION: technician_update_schedule")
    tech = db_client.get_technician_by_id(technician_id)
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")

    updates = {
        "shift_start": shift_start,
        "shift_end": shift_end,
        "working_days": normalized_days,
    }
    db_client.update_technician(technician_id, updates)

    # PostgreSQL backup (preserved for reference; not executed)
    if False:
        with db_engine.connect() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE technicians
                    SET shift_start = :shift_start,
                        shift_end = :shift_end,
                        working_days = CAST(:working_days AS JSONB)
                    WHERE id = :technician_id
                    RETURNING id
                    """
                ),
                {
                    "technician_id": technician_id,
                    "shift_start": shift_start,
                    "shift_end": shift_end,
                    "working_days": json.dumps(normalized_days),
                },
            ).first()
            conn.commit()

        if not updated:
            raise HTTPException(status_code=404, detail="Technician profile not found")

    return {
        "message": "Work schedule updated successfully",
        "shift_start": shift_start,
        "shift_end": shift_end,
        "working_days": normalized_days,
    }


# ─── E2E Test Seed Endpoint ────────────────────────────────────────────────────
# Admin-only. Creates isolated test data for E2E test runs without touching
# real customer flows. Caller receives IDs so teardown can clean up.

class TestSeedRequest(BaseModel):
    pending_count: int = 6          # pending_review records to create
    technician_id: int | None = None  # if set, also create 1 assigned job for this tech
    hitl_assigned_count: int = 0    # assigned+requires_human_review records (for approve fast-path tests)
    test_run_id: str | None = None  # unique identifier for this test run
    customer_id: str | None = None
    customer_email: str | None = None
    customer_name: str | None = None


@app.post('/admin/test/seed')
async def admin_test_seed(
    payload: TestSeedRequest,
    current_user: dict = Depends(_get_current_user),
):
    """Create isolated E2E test data.

    - Creates ``pending_count`` service requests with status=pending_review.
    - If ``technician_id`` is provided, creates 1 additional request with
      status=assigned assigned to that technician and updates the technician's
      current_jobs counter.

    All created document IDs are returned so the teardown script can delete them.
    This endpoint is guarded by admin auth and should never be called in
    production workflows.
    """
    _require_roles(current_user, {"admin"})

    now = datetime.utcnow()
    created_ids: list[str] = []
    test_run_id = payload.test_run_id or str(int(now.timestamp() * 1000))

    seed_customer_id = payload.customer_id or str(current_user.get("id"))
    seed_customer_email = payload.customer_email or (current_user.get("email") or "")
    seed_customer_name = payload.customer_name or current_user.get("name") or "E2E Setup Customer"

    db = db_client._get_db()
    coll = db.collection("service_requests")
    batch = db.batch()
    pending_writes = 0

    def _flush_batch() -> None:
        nonlocal batch, pending_writes
        if pending_writes:
            batch.commit()
            batch = db.batch()
            pending_writes = 0

    pending_count = max(1, min(int(payload.pending_count), 100))

    # ── Create pending_review records ──────────────────────────────────────
    for i in range(pending_count):
        # Deterministic document id to make cleanup reliable and avoid collisions
        doc_id = f"e2e-{test_run_id}-pending-{i+1}"
        doc = {
            "customer_user_id": seed_customer_id,
            "customer_id": seed_customer_id,
            "customer_name": seed_customer_name,
            "customer_email": seed_customer_email,
            "contact_number": "9000000001",
            "location_text": "Chennai, Tamil Nadu",
            "location_zone": "Chennai",
            "description": f"E2E automated test pending record #{i + 1}",
            "fault_type": "blockage",
            "severity": "critical",
            "final_severity": "critical",
            "diagnosis_confidence": 0.91,
            "latitude": 13.0827,
            "longitude": 80.2707,
            "assigned_technician": None,
            "assigned_technician_name": "",
            "assigned_technician_phone": "",
            "assigned_technician_zone": "",
            "distance_km": None,
            "travel_time_min": None,
            "status": "pending_review",
            "requires_human_review": True,
            "review_decision": "pending",
            "ai_review_status": "pending_review",
            "hitl_triggers": ["SEVERITY_POLICY_REVIEW"],
            "review_priority": "critical",
            "evidence_image_path": None,
            "evidence_image_name": "e2e_test_image.jpg",
            "created_at": now,
            "updated_at": now,
            "reroute_checked": False,
            # Standard legacy flag used by existing teardown
            "is_test_data": True,
            # New explicit E2E markers for deterministic identification
            "is_e2e_test": True,
            "created_by_test": "playwright",
            "test_run_id": test_run_id,
        }
        ref = coll.document(doc_id)
        batch.set(ref, doc)
        pending_writes += 1
        if pending_writes >= 25:
            _flush_batch()
        created_ids.append(doc_id)

    # ── Create assigned+HITL records (for approve fast-path in tests) ──────
    if payload.hitl_assigned_count and payload.technician_id is not None:
        hitl_tech = db_client.get_technician_by_id(int(payload.technician_id))
        for i in range(max(0, min(int(payload.hitl_assigned_count), 20))):
            hitl_doc = {
                "customer_user_id": seed_customer_id,
                "customer_id": seed_customer_id,
                "customer_name": seed_customer_name,
                "customer_email": seed_customer_email,
                "contact_number": "9000000001",
                "location_text": "Chennai, Tamil Nadu",
                "location_zone": (hitl_tech or {}).get("zone") or "Chennai",
                "description": f"E2E assigned+HITL record #{i + 1}",
                "fault_type": "blockage",
                "severity": "high",
                "final_severity": "high",
                "diagnosis_confidence": 0.85,
                "latitude": 13.0827,
                "longitude": 80.2707,
                "assigned_technician": int(payload.technician_id),
                "assigned_technician_id": int(payload.technician_id),
                "assigned_technician_name": (hitl_tech or {}).get("name") or "",
                "assigned_technician_phone": (hitl_tech or {}).get("phone") or "",
                "assigned_technician_zone": (hitl_tech or {}).get("zone") or "",
                "distance_km": 3.0,
                "travel_time_min": 12,
                "status": "assigned",
                "requires_human_review": True,
                "review_decision": "pending",
                "ai_review_status": "pending_review",
                "hitl_triggers": ["SEVERITY_POLICY_REVIEW"],
                "review_priority": "high",
                "evidence_image_path": None,
                "evidence_image_name": "e2e_test_image.jpg",
                "created_at": now,
                "updated_at": now,
                "reroute_checked": False,
                "is_test_data": True,
                "test_run_id": test_run_id,
                "e2e_test_record": True,
            }
            href_id = f"e2e-{test_run_id}-hitl-{i+1}"
            href = coll.document(href_id)
            hitl_doc.update({
                "is_e2e_test": True,
                "created_by_test": "playwright",
                "test_run_id": test_run_id,
            })
            href.set(hitl_doc)
            created_ids.append(href_id)

    # ── Create assigned record for a specific technician ───────────────────
    assigned_id: str | None = None
    if payload.technician_id is not None:
        tech = db_client.get_technician_by_id(int(payload.technician_id))
        if not tech:
            raise HTTPException(status_code=404, detail=f"Technician {payload.technician_id} not found")

        assigned_doc = {
            "customer_user_id": seed_customer_id,
            "customer_id": seed_customer_id,
            "customer_name": seed_customer_name,
            "customer_email": seed_customer_email,
            "contact_number": "9000000001",
            "location_text": "Chennai, Tamil Nadu",
            "location_zone": tech.get("zone") or "Chennai",
            "description": "E2E automated test — assigned job for technician",
            "fault_type": "blockage",
            "severity": "medium",
            "final_severity": "medium",
            "diagnosis_confidence": 0.88,
            "latitude": 13.0827,
            "longitude": 80.2707,
            "assigned_technician": int(payload.technician_id),
            "assigned_technician_id": int(payload.technician_id),
            "assigned_technician_name": tech.get("name") or "",
            "assigned_technician_phone": tech.get("phone") or "",
            "assigned_technician_zone": tech.get("zone") or "",
            "distance_km": 2.5,
            "travel_time_min": 10,
            "status": "assigned",
            "requires_human_review": False,
            "review_decision": "approved",
            "ai_review_status": "auto_approved",
            "hitl_triggers": [],
            "review_priority": "normal",
            "evidence_image_path": None,
            "evidence_image_name": "e2e_test_image.jpg",
            "created_at": now,
            "updated_at": now,
            "reroute_checked": False,
            "is_test_data": True,
            "test_run_id": test_run_id,
            "e2e_test_record": True,
        }
        assigned_doc_id = f"e2e-{test_run_id}-assigned-1"
        assigned_doc.update({
            "is_e2e_test": True,
            "created_by_test": "playwright",
            "test_run_id": test_run_id,
        })
        ref2 = coll.document(assigned_doc_id)
        ref2.set(assigned_doc)
        assigned_id = assigned_doc_id
        created_ids.append(assigned_id)

        # Bump the technician's current_jobs counter
        tech_ref = db.collection("technicians").document(str(payload.technician_id))
        existing_jobs = int(tech.get("current_jobs") or 0)
        tech_ref.update({"current_jobs": existing_jobs + 1})

    _invalidate_kpi_cache()

    return {
        "created_ids": created_ids,
        "created_count": len(created_ids),
        "pending_review_count": pending_count,
        "assigned_job_id": assigned_id,
        "technician_id": payload.technician_id,
        "test_run_id": test_run_id,
    }


@app.get('/technician/route/{technician_id}')
async def technician_route_by_id(technician_id: int, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician", "admin"})
    if current_user.get("role") == "technician" and int(current_user.get("technician_id") or 0) != technician_id:
        raise HTTPException(status_code=403, detail="Cannot view another technician route")

    route = plan_technician_route(technician_id)
    return route


@app.get('/technician/my-route')
async def technician_my_route(current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)
    return await technician_route_by_id(technician_id, current_user)


@app.get('/api/technician/profile')
@app.get('/technician/profile')
async def technician_profile(current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)
    print("USING FIRESTORE DB - FUNCTION: technician_profile")
    tech = db_client.get_technician_by_id(technician_id)
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")

    jobs = db_client.get_jobs_for_technician(technician_id) or []
    today = datetime.utcnow().date()
    jobs_today = 0
    for j in jobs:
        created = j.get("created_at")
        try:
            if isinstance(created, str):
                created_dt = datetime.fromisoformat(created)
            else:
                created_dt = created
            if created_dt and hasattr(created_dt, "date") and created_dt.date() == today and j.get("status") in {"assigned", "in_progress", "completed"}:
                jobs_today += 1
        except Exception:
            pass

    return {
        "id": int(tech["id"]),
        "technician_name": tech["name"],
        "technician_code": tech.get("technician_code"),
        "phone_number": tech.get("phone_number"),
        "primary_domain": tech.get("primary_domain"),
        "experience_level": tech.get("experience_level"),
        "critical_fault_eligible": bool(tech.get("critical_fault_eligible") or False),
        "latitude": float(tech["current_latitude"]) if tech.get("current_latitude") is not None else None,
        "longitude": float(tech["current_longitude"]) if tech.get("current_longitude") is not None else None,
        "initial_latitude": float(tech["latitude"]) if tech.get("latitude") is not None else None,
        "initial_longitude": float(tech["longitude"]) if tech.get("longitude") is not None else None,
        "current_latitude": float(tech.get("current_latitude")) if tech.get("current_latitude") is not None else None,
        "current_longitude": float(tech.get("current_longitude")) if tech.get("current_longitude") is not None else None,
        "location_zone": tech.get("location_zone"),
        "availability_state": tech.get("availability_state"),
        "current_jobs": int(tech.get("current_jobs") or 0),
        "max_jobs_per_day": int(tech.get("max_jobs_per_day") or 0),
        "jobs_today": int(jobs_today or 0),
        "skills": _coerce_json_array(tech.get("skills")),
        "certified_skills": _coerce_json_array(tech.get("certified_skills")),
        "certifications": _coerce_json_array(tech.get("certifications")),
        "shift_start": tech.get("shift_start"),
        "shift_end": tech.get("shift_end"),
        "working_days": _coerce_json_array(tech.get("working_days")),
    }


@app.post('/technician/update-status')
async def technician_update_status(payload: StatusUpdateRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    new_status = (payload.status or "").strip().lower()
    if new_status not in {"assigned", "in_progress", "completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    technician_location = None
    print("USING FIRESTORE DB - FUNCTION: technician_update_status")
    request_row = db_client.get_request_by_id(str(payload.request_id))
    if not request_row or int(request_row.get("assigned_technician") or 0) != int(technician_id):
        raise HTTPException(status_code=404, detail="Assigned request not found")

    updates = {"status": new_status}
    if new_status == "completed":
        updates["completed_at"] = datetime.utcnow()

    db_client.update_service_request(str(payload.request_id), updates)

    if (
        new_status == "completed"
        and request_row.get("latitude") is not None
        and request_row.get("longitude") is not None
    ):
        technician_location = {
            "latitude": float(request_row["latitude"]),
            "longitude": float(request_row["longitude"]),
        }
        db_client.update_technician_location(technician_id, technician_location["latitude"], technician_location["longitude"])

    sync_technician_job_counters(technician_id)

    return {
        "message": "Status updated",
        "request_id": payload.request_id,
        "status": new_status,
        "technician_location": technician_location,
    }


@app.post('/technician/jobs/{job_id}/request-reassignment')
async def technician_request_reassignment(
    job_id: str,
    payload: ReassignmentRequest,
    current_user: dict = Depends(_get_current_user),
):
    """Request reassignment of a job.
    
    Hardened with:
    - Duplicate request prevention (already-pending check)
    - Anti-double-submit (duplicate within 5-minute cooldown)
    - Concurrent reassignment protection
    - Request state validation
    """
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    job = db_client.get_request_by_id(str(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Assigned request not found")
    assigned_technician = job.get("assigned_technician")
    if str(assigned_technician or "") != str(technician_id):
        raise HTTPException(status_code=403, detail="Not allowed to request reassignment for this job")

    status = str(job.get("status") or "").strip().lower()
    if status == "in_progress":
        raise HTTPException(status_code=400, detail="Reassignment is not allowed after work has started.")
    if status in {"completed", "cancelled", "canceled", "closed", "failed"}:
        raise HTTPException(status_code=400, detail="Cannot request reassignment for a closed job")
    if status not in {"assigned", "scheduled", "dispatched"}:
        raise HTTPException(status_code=400, detail="Reassignment is only allowed before work starts.")

    reassignment_status = str(job.get("reassignment_status") or "").strip().lower()
    if bool(job.get("reassignment_requested")) or reassignment_status in {"requested", "pending", "processing"}:
        raise HTTPException(status_code=409, detail="Reassignment request already pending")

    # ─── HARDENING: Anti-double-submit protection ───────────────────────────
    # Check if reassignment was requested in the last 5 minutes (prevent accidental duplicates)
    if not _check_recent_reassignment(str(job_id), cooldown_minutes=5):
        LOGGER.warning("Duplicate reassignment request from tech=%s for job=%s within cooldown", technician_id, job_id)
        raise HTTPException(status_code=409, detail="Reassignment already in progress within the last 5 minutes")

    updates = {
        "reassignment_requested": True,
        "reassignment_reason": payload.reason,
        "reassignment_requested_by": int(technician_id),
        "reassignment_requested_at": datetime.utcnow(),
        "reassignment_status": "requested",
        "previous_technician": int(technician_id),
        "updated_at": datetime.utcnow(),
    }
    if payload.notes:
        updates["reassignment_notes"] = payload.notes

    db_client.update_service_request(str(job_id), updates)

    try:
        db_client.create_dispatch_audit_log(
            {
                "event_type": "reassignment_requested",
                "request_id": str(job_id),
                "technician_id": int(technician_id),
                "previous_technician": int(technician_id),
                "reason": payload.reason,
                "reassignment_state": "requested",
                "timestamp": datetime.utcnow(),
                "notes": payload.notes,
            }
        )
    except Exception:
        LOGGER.exception("Failed to write reassignment audit log for request=%s", job_id)

    if not REASSIGNMENT_REQUIRE_ADMIN_APPROVAL:
        loop = asyncio.get_running_loop()
        threading.Thread(target=_run_reassignment_workflow, args=(str(job_id), loop), daemon=True).start()

    return {
        "message": "Reassignment request submitted for admin approval",
        "request_id": str(job_id),
        "reassignment_status": "requested",
        "reason": payload.reason,
    }


@app.post('/api/jobs/{job_id}/start')
@app.post('/technician/jobs/{job_id}/start')
async def technician_start_job(job_id: str, current_user: dict = Depends(_get_current_user)):
    """
    Lock a job as in_progress.
    Rules:
      - Only the assigned technician may start their own job.
      - Only ONE job can be locked at a time (enforced here + DB constraint).
      - Starting a new job auto-unlocks any existing in_progress job (safety net).
    """
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    print("USING FIRESTORE DB - FUNCTION: technician_start_job")

    job = db_client.get_request_by_id(str(job_id))
    if not job or int(job.get("assigned_technician") or 0) != int(technician_id):
        raise HTTPException(status_code=404, detail="Assigned job not found")

    current_status = (job.get("status") or "").lower()
    print(f"START ATTEMPT: job_id={job_id} current_status={current_status}")

    if current_status == "completed":
        raise HTTPException(status_code=400, detail="Job is already completed")
    if current_status == "in_progress":
        raise HTTPException(status_code=400, detail="Job already started")

    # Release any previously locked job (safety net — only one lock allowed).
    locked_jobs = [j for j in (db_client.get_jobs_for_technician(technician_id) or []) if j.get("is_locked") and str(j.get("id")) != str(job_id)]
    for lj in locked_jobs:
        try:
            db_client.update_service_request(lj.get("id"), {"is_locked": False, "status": "assigned"})
        except Exception:
            pass

    # Lock this job and mark in_progress.
    db_client.update_service_request(str(job_id), {"status": "in_progress", "is_locked": True})

    print("[TRACKING] JOB_STARTED:", {
        "job_id": str(job_id),
        "timestamp": datetime.utcnow().isoformat(),
    })

    # Record on the technician record.
    db_client.update_technician(technician_id, {"current_job_id": job_id})

    sync_technician_job_counters(technician_id)

    tech = db_client.get_technician_by_id(technician_id) or {}
    customer_location = {
        "lat": job.get("latitude"),
        "lng": job.get("longitude"),
    }
    live_payload = {
        "job_id": str(job_id),
        "technician_id": int(technician_id),
        "status": "in_progress",
        "latitude": tech.get("current_latitude"),
        "longitude": tech.get("current_longitude"),
        "technician_location": {
            "lat": tech.get("current_latitude"),
            "lng": tech.get("current_longitude"),
        },
        "customer_location": customer_location,
        "updated_at": datetime.utcnow().isoformat(),
        "last_update_timestamp": datetime.utcnow().isoformat(),
    }
    if live_payload["latitude"] is not None and live_payload["longitude"] is not None and customer_location["lat"] is not None and customer_location["lng"] is not None:
        try:
            if LIVE_TRACKING_USE_GOOGLE_ETA:
                distance_km, duration_min = get_distance(
                    (float(live_payload["latitude"]), float(live_payload["longitude"])),
                    (float(customer_location["lat"]), float(customer_location["lng"])),
                )
                live_payload["distance_km"] = round(distance_km, 3)
                live_payload["eta_minutes"] = _compute_eta_minutes(distance_km, duration_min=duration_min)
            else:
                distance_km = _haversine_km(float(live_payload["latitude"]), float(live_payload["longitude"]), float(customer_location["lat"]), float(customer_location["lng"]))
                live_payload["distance_km"] = round(distance_km, 3)
                live_payload["eta_minutes"] = _compute_eta_minutes(distance_km)
        except Exception:
            pass

    live_payload.setdefault("eta_minutes", None)
    live_updates = {
        "live_tracking": live_payload,
        "live_tracking_updated_at": live_payload["updated_at"],
    }
    if live_payload["latitude"] is not None and live_payload["longitude"] is not None:
        live_updates["assigned_technician_latitude"] = live_payload["latitude"]
        live_updates["assigned_technician_longitude"] = live_payload["longitude"]
    try:
        db_client.update_service_request(str(job_id), live_updates)
    except Exception:
        pass

    await _update_live_tracking_state(str(job_id), live_payload)
    await _publish_live_tracking(str(job_id), live_payload, event="status")

    return {
        "message": "Job started and locked",
        "job_id": job_id,
        "status": "in_progress",
        "is_locked": True,
    }


@app.post('/technician/jobs/{job_id}/live-location')
async def technician_live_location(job_id: str, payload: LiveLocationUpdateRequest, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    job = db_client.get_request_by_id(str(job_id))
    if not job or int(job.get("assigned_technician") or 0) != int(technician_id):
        raise HTTPException(status_code=404, detail="Assigned job not found")

    current_status = (job.get("status") or "").lower()
    if current_status != "in_progress":
        raise HTTPException(status_code=400, detail="Job must be in progress to update live location")

    lat = float(payload.latitude)
    lng = float(payload.longitude)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Coordinates out of range")
    if lat == 0.0 and lng == 0.0:
        raise HTTPException(status_code=400, detail="Invalid GPS coordinates (0,0)")

    if not is_valid_kerala_coordinate(lat, lng):
        tech = db_client.get_technician_by_id(technician_id) or {}
        zone = tech.get("location_zone") or tech.get("service_zone") or tech.get("zone")
        corrected = get_coordinates_from_zone(zone)
        if corrected:
            lat, lng = corrected
            print(f"INVALID_COORDINATE_CORRECTED: technician_id={technician_id}")
        else:
            raise HTTPException(status_code=400, detail="Technician coordinates outside Kerala bounds")

    now = _parse_iso_timestamp(payload.timestamp) or datetime.utcnow()

    speed_kmh = _tracking_speed_kmh()

    dest_lat = job.get("latitude")
    dest_lng = job.get("longitude")
    distance_km = None
    eta_minutes = None
    if dest_lat is not None and dest_lng is not None:
        try:
            if LIVE_TRACKING_USE_GOOGLE_ETA:
                distance_km, duration_min = get_distance(
                    (lat, lng),
                    (float(dest_lat), float(dest_lng)),
                )
                distance_km = round(distance_km, 3)
                eta_minutes = _compute_eta_minutes(distance_km, duration_min=duration_min)
            else:
                distance_km = round(_haversine_km(lat, lng, float(dest_lat), float(dest_lng)), 3)
                eta_minutes = _compute_eta_minutes(distance_km)
        except Exception:
            distance_km = None
            eta_minutes = None

    customer_location = {
        "lat": job.get("latitude"),
        "lng": job.get("longitude"),
    }
    live_payload = {
        "job_id": str(job_id),
        "technician_id": int(technician_id),
        "status": current_status,
        "latitude": lat,
        "longitude": lng,
        "technician_location": {"lat": lat, "lng": lng},
        "customer_location": customer_location,
        "speed_kmh": round(float(speed_kmh), 2),
        "distance_km": distance_km,
        "eta_minutes": eta_minutes,
        "accuracy_m": payload.accuracy_m,
        "heading": payload.heading,
        "updated_at": now.isoformat(),
        "last_update_timestamp": now.isoformat(),
    }

    history_point = {
        "latitude": lat,
        "longitude": lng,
        "timestamp": live_payload["updated_at"],
    }
    history = await _update_live_tracking_state(str(job_id), live_payload, history_point)

    try:
        db_client.update_technician_location(technician_id, lat, lng)
    except Exception:
        pass

    updates = {
        "assigned_technician_latitude": lat,
        "assigned_technician_longitude": lng,
        "live_tracking": live_payload,
        "live_tracking_updated_at": live_payload["updated_at"],
        "live_tracking_history": history,
    }
    try:
        db_client.update_service_request(str(job_id), updates)
    except Exception:
        pass

    await _publish_live_tracking(str(job_id), live_payload, event="update")

    return {
        "stored": True,
        "job_id": str(job_id),
        "live_tracking": live_payload,
    }


@app.get('/health')
async def health_check():
    """Lightweight health check verifying app and DB connectivity."""
    try:
        # Try to acquire a DB client to ensure Firestore is reachable.
        db = db_client._get_db()
        # Minimal read to verify permissions (may be empty in some envs).
        _ = list(db.collection('service_requests').limit(1).stream())
    except Exception as e:
        print('HEALTH CHECK FAILED:', str(e))
        return JSONResponse(status_code=503, content={"status": "error", "detail": str(e)})
    return {"status": "ok"}


@app.put('/api/jobs/{job_id}/complete')
@app.put('/jobs/{job_id}/complete')
@app.put('/technician/jobs/{job_id}/complete')
async def technician_complete_job(job_id: str, current_user: dict = Depends(_get_current_user)):
    _require_roles(current_user, {"technician"})
    technician_id = _resolve_technician_id_for_user(current_user)

    print("USING FIRESTORE DB - FUNCTION: technician_complete_job")
    request_row = db_client.get_request_by_id(str(job_id))
    if not request_row or int(request_row.get("assigned_technician") or 0) != int(technician_id):
        raise HTTPException(status_code=404, detail="Assigned job not found")

    current_status = (request_row.get("status") or "").lower()
    print(f"COMPLETE ATTEMPT: job_id={job_id} current_status={current_status}")

    if current_status == "completed":
        completed_at = request_row.get("completed_at")
        technician_location = None
        if request_row.get("latitude") is not None and request_row.get("longitude") is not None:
            technician_location = {
                "latitude": float(request_row["latitude"]),
                "longitude": float(request_row["longitude"]),
            }
            db_client.update_technician(technician_id, {"current_latitude": technician_location["latitude"], "current_longitude": technician_location["longitude"]})

        customer_location = {
            "lat": request_row.get("latitude"),
            "lng": request_row.get("longitude"),
        }
        live_payload = {
            "job_id": str(job_id),
            "technician_id": int(technician_id),
            "status": "completed",
            "latitude": technician_location["latitude"] if technician_location else None,
            "longitude": technician_location["longitude"] if technician_location else None,
            "technician_location": {
                "lat": technician_location["latitude"] if technician_location else None,
                "lng": technician_location["longitude"] if technician_location else None,
            },
            "customer_location": customer_location,
            "updated_at": datetime.utcnow().isoformat(),
        }
        live_payload.setdefault("eta_minutes", None)
        try:
            db_client.update_service_request(str(job_id), {"live_tracking": live_payload, "live_tracking_updated_at": live_payload["updated_at"]})
        except Exception:
            pass
        await _update_live_tracking_state(str(job_id), live_payload)
        await _publish_live_tracking(str(job_id), live_payload, event="status")

    # Mark completed and persist
    try:
        db_client.update_service_request(str(job_id), {"status": "completed", "completed_at": datetime.utcnow().isoformat(), "is_locked": False})
    except Exception:
        pass

    print("JOB COMPLETED:", job_id)
    try:
        jobs = db_client.get_jobs()
        print("UPDATED JOB LIST:", len(jobs))
    except Exception:
        pass
        async with _LIVE_TRACKING_LOCK:
            _LIVE_TRACKING_STATE.pop(str(job_id), None)

        return {
            "message": "Job already completed",
            "job_id": job_id,
            "status": "completed",
            "completed_at": (completed_at.isoformat() if hasattr(completed_at, 'isoformat') else str(completed_at)) if completed_at else None,
            "technician_location": technician_location,
        }

    # Enforce: only in_progress jobs may be completed
    if current_status != "in_progress":
        print(f"COMPLETE BLOCKED: job_id={job_id} status={current_status} — must be in_progress first")
        raise HTTPException(
            status_code=400,
            detail="Job must be started before marking complete. Use 'Start Job' first.",
        )
    db_client.update_service_request(str(job_id), {"status": "completed", "is_locked": False, "completed_at": datetime.utcnow(), "updated_at": datetime.utcnow()})

    # Advance technician live location to the completed job's site and
    # release the current_job_id lock so the next job can be started.
    technician_location = None
    if request_row.get("latitude") is not None and request_row.get("longitude") is not None:
        technician_location = {
            "latitude": float(request_row["latitude"]),
            "longitude": float(request_row["longitude"]),
        }
        db_client.update_technician(technician_id, {"current_latitude": technician_location["latitude"], "current_longitude": technician_location["longitude"], "current_job_id": None})

    sync_technician_job_counters(technician_id)

    customer_location = {
        "lat": request_row.get("latitude"),
        "lng": request_row.get("longitude"),
    }
    live_payload = {
        "job_id": str(job_id),
        "technician_id": int(technician_id),
        "status": "completed",
        "latitude": technician_location["latitude"] if technician_location else None,
        "longitude": technician_location["longitude"] if technician_location else None,
        "technician_location": {
            "lat": technician_location["latitude"] if technician_location else None,
            "lng": technician_location["longitude"] if technician_location else None,
        },
        "customer_location": customer_location,
        "updated_at": datetime.utcnow().isoformat(),
    }
    live_payload.setdefault("eta_minutes", None)
    try:
        db_client.update_service_request(str(job_id), {"live_tracking": live_payload, "live_tracking_updated_at": live_payload["updated_at"]})
    except Exception:
        pass
    await _update_live_tracking_state(str(job_id), live_payload)
    await _publish_live_tracking(str(job_id), live_payload, event="status")
    async with _LIVE_TRACKING_LOCK:
        _LIVE_TRACKING_STATE.pop(str(job_id), None)

    # Fetch updated doc to return completed_at
    updated = db_client.get_request_by_id(str(job_id))

    try:
        # Log active jobs after completion to help E2E test validation and debugging
        active_jobs = db_client.get_jobs_for_technician(technician_id) or []
        print("ACTIVE JOBS AFTER COMPLETE:", len(active_jobs))
    except Exception:
        pass

    return {
        "message": "Job marked as completed",
        "job_id": job_id,
        "status": "completed",
        "completed_at": (updated.get("completed_at") if isinstance(updated.get("completed_at"), str) else (updated.get("completed_at").isoformat() if updated.get("completed_at") else None)),
        "technician_location": technician_location,
    }


def get_google_maps_key() -> str | None:
    """Resolve Google Maps key from backend env, with local dev fallback."""
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if key:
        return key.strip()

    # Local dev convenience: read from frontend/.env if backend env is not set.
    env_file = Path(__file__).parent / "frontend" / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("VITE_GOOGLE_MAPS_API_KEY="):
                return line.split("=", 1)[1].strip()

    return None


@app.get('/location/reverse')
async def location_reverse(lat: float = Query(...), lng: float = Query(...)):
    """Server-side Google reverse geocode proxy (avoids browser key exposure)."""
    await _enforce_api_rate_limit()
    key = get_google_maps_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(status_code=500, detail="Google Maps key not configured")

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    try:
        res = requests.get(url, params={"latlng": f"{lat},{lng}", "key": key}, timeout=20)
        if res.status_code >= 400:
            raise HTTPException(status_code=res.status_code, detail=f"Google reverse geocode failed: {res.text}")

        data = res.json()
        status = data.get("status")
        if status != "OK":
            raise HTTPException(status_code=502, detail=f"Google reverse geocode error: {status}")

        results = data.get("results", [])
        result = results[0] if results else {}

        country = None
        for comp in result.get("address_components", []):
            if "country" in comp.get("types", []):
                country = comp.get("long_name")
                break

        return {
            "formatted": result.get("formatted_address"),
            "country": country,
            "raw": result,
        }
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Google reverse geocode request error: {str(e)}")


@app.get('/location/autosuggest')
async def location_autosuggest(
    query: str = Query(..., min_length=2),
    lat: float = Query(...),
    lng: float = Query(...),
):
    """Server-side Google Places autocomplete proxy."""
    key = get_google_maps_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(status_code=500, detail="Google Maps key not configured")

    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    try:
        res = requests.get(
            url,
            params={
                "input": query,
                "location": f"{lat},{lng}",
                "radius": 5000,
                "components": "country:in",
                "key": key,
            },
            timeout=20,
        )
        if res.status_code >= 400:
            raise HTTPException(status_code=res.status_code, detail=f"Google autocomplete failed: {res.text}")

        data = res.json()
        status = data.get("status")
        if status not in {"OK", "ZERO_RESULTS"}:
            raise HTTPException(status_code=502, detail=f"Google autocomplete error: {status}")

        items = data.get("predictions", [])
        suggestions = []
        for item in items:
            val = item.get("description")
            if val and val not in suggestions:
                suggestions.append(val)

        return {"suggestions": suggestions[:6], "raw": data}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Google autocomplete request error: {str(e)}")

@app.post('/diagnose')
async def diagnose(
    image: UploadFile = File(...),
    description: str = Form(""),
    location: str = Form(None),
    contact: str = Form(None)
):
    """
    Diagnose endpoint that accepts multipart form data
    and returns AI diagnosis results
    
    - **image**: Image file (JPG/PNG)
    - **description**: Problem description (optional, defaults to empty string)
    - **location**: Location (optional)
    - **contact**: Contact number (optional)
    """
    try:
        # Validate required fields
        if not image:
            raise HTTPException(status_code=400, detail="Image is required")
        
        # Save image temporarily with proper extension
        suffix = Path(image.filename).suffix.lower() or '.png'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            # Read and write image content
            content = await image.read()
            temp_file.write(content)
            temp_file.flush()
            image_path = temp_file.name
        
        print(f"Processing diagnosis for: {description[:50]}...")
        
        # Use existing DiagnosisEngine
        result = engine.diagnose(image_path, description)
        
        print(f"Diagnosis complete: {result.get('fault_type')}")
        
        # Backend now natively returns all required fields:
        # fault_type, image_severity, description_severity, final_severity,
        # confidence, recommended_technician, reason
        return result
        
    except UnidentifiedImageError as e:
        print(f"Image error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail='Invalid image file. Please upload a valid JPG or PNG image.'
        )
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f'Failed to process diagnosis: {str(e)}'
        )

# ─── Multi-Agent Pipeline Endpoint ─────────────────────────────────────────
@app.post('/agent/process')
async def agent_process(
    image: UploadFile = File(...),
    description: str = Form(""),
    location: str = Form(""),
    contact: str = Form(""),
    customer_name: str = Form(""),
    customer_email: str = Form(""),
    latitude: str = Form(""),
    longitude: str = Form(""),
    current_user: dict = Depends(_get_current_user),
):
    """Run the full multi-agent dispatch pipeline (ADK-powered).

    This endpoint wraps the cognitive_foreman SequentialAgent pipeline:
    triage -> HITL gate -> skill match -> optimization -> route assignment.

    Same auth and input validation as /customer/report-issue.
    """
    _require_roles(current_user, {"customer", "admin"})

    if not image:
        raise HTTPException(status_code=400, detail="Image is required")

    suffix = Path(image.filename or "").suffix.lower() or '.png'
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    uploads_dir = Path(__file__).parent / "uploads" / "service_requests"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{secrets.token_hex(16)}{suffix}"
    stored_path = uploads_dir / stored_filename
    stored_path.write_bytes(content)

    lat_f = None
    lon_f = None
    if latitude:
        try:
            lat_f = float(latitude)
        except (ValueError, TypeError):
            pass
    if longitude:
        try:
            lon_f = float(longitude)
        except (ValueError, TypeError):
            pass

    try:
        from cognitive_foreman.runner import run_pipeline
        result = await run_pipeline(
            image_path=str(stored_path),
            description=description,
            latitude=lat_f,
            longitude=lon_f,
            customer_name=customer_name or current_user.get("name", ""),
            customer_email=customer_email or current_user.get("email", ""),
            customer_user_id=current_user.get("id"),
            contact_number=contact,
            location_text=location,
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Agent pipeline failed: {str(e)}")

@app.get('/health')
async def health():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'service': 'AI Field Service Diagnosis API'
    }

@app.get('/')
async def home():
    """API information endpoint"""
    return {
        'service': 'AI Field Service Diagnosis API',
        'version': '1.0.0',
        'framework': 'FastAPI',
        'endpoints': {
            '/diagnose': 'POST - Submit diagnosis request',
            '/health': 'GET - Health check',
            '/docs': 'GET - Interactive API documentation'
        }
    }

if __name__ == '__main__':
    import uvicorn

    print("\n" + "="*60)
    print("🚀 Starting AI Field Service Diagnosis API Server (FastAPI)")
    print("="*60)
    print(f"Backend API: http://localhost:8000")
    print(f"Frontend URL: http://localhost:3000")
    print(f"Health Check: http://localhost:8000/health")
    print(f"API Docs: http://localhost:8000/docs")
    print("="*60 + "\n")

    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

