from datetime import datetime, timedelta, timezone
import math
import os
from pathlib import Path
import socket
from threading import Lock
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel


_DEFAULT_SESSION_TTL_SECONDS = 600
_POLL_INTERVAL_SECONDS = 2


class SessionCreateResponse(BaseModel):
    session_id: str
    mobile_page_url: str
    expires_in_seconds: int
    poll_interval_seconds: int


class SessionGPSUpdateRequest(BaseModel):
    session_id: str
    lat: float
    lng: float


class LegacyMobileGPSUpdateRequest(BaseModel):
    latitude: float
    longitude: float


_project_root = Path(__file__).resolve().parents[2]
_session_ttl_seconds = max(int(os.getenv("GPS_SESSION_TTL_SECONDS", _DEFAULT_SESSION_TTL_SECONDS)), 60)

_gps_sessions: dict[str, dict[str, Any]] = {}
_gps_session_lock = Lock()
_legacy_active_session_id: str | None = None

gps_router = APIRouter(prefix="/api/gps", tags=["gps"])
mobile_gps_router = APIRouter(prefix="/api/mobile-gps", tags=["mobile-gps-legacy"])
mobile_gps_page_router = APIRouter(tags=["mobile-gps"])


def _detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso_z(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_session_id(session_id: str) -> str:
    try:
        return str(UUID(str(session_id)))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session_id")


def _resolve_public_base_url(request: Request) -> str:
    configured_base = os.getenv("MOBILE_GPS_PUBLIC_BASE_URL", "").strip()
    if configured_base:
        return configured_base.rstrip("/")

    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")

    return str(request.base_url).rstrip("/")


def _cleanup_expired_sessions(now: datetime) -> None:
    expired_ids = [
        session_id
        for session_id, session in _gps_sessions.items()
        if session["expires_at"] <= now
    ]
    for session_id in expired_ids:
        _gps_sessions.pop(session_id, None)


def _new_session(now: datetime) -> dict[str, Any]:
    session_id = str(uuid4())
    session = {
        "session_id": session_id,
        "lat": None,
        "lng": None,
        "timestamp": None,
        "expires_at": now + timedelta(seconds=_session_ttl_seconds),
    }
    _gps_sessions[session_id] = session
    return session


def _update_session(session_id: str, lat: float, lng: float, now: datetime) -> dict[str, Any]:
    session = _gps_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or expired")

    if session["expires_at"] <= now:
        _gps_sessions.pop(session_id, None)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Session expired")

    session["lat"] = lat
    session["lng"] = lng
    session["timestamp"] = now
    session["expires_at"] = now + timedelta(seconds=_session_ttl_seconds)
    return session


def _validate_coordinates(lat: float, lng: float) -> None:
    if not math.isfinite(lat) or not math.isfinite(lng):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid coordinates")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coordinates out of range")
    if lat == 0.0 and lng == 0.0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GPS coordinates (0,0)")


@gps_router.post("/session/new", response_model=SessionCreateResponse)
def create_gps_session(request: Request):
    now = _utcnow()
    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        session = _new_session(now)

    base_url = _resolve_public_base_url(request)
    session_id = session["session_id"]
    return {
        "session_id": session_id,
        "mobile_page_url": f"{base_url}/mobile-gps?session_id={session_id}",
        "expires_in_seconds": _session_ttl_seconds,
        "poll_interval_seconds": _POLL_INTERVAL_SECONDS,
    }


@gps_router.get("/session/{session_id}")
def get_gps_session(session_id: str):
    normalized_session_id = _parse_session_id(session_id)
    now = _utcnow()

    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        session = _gps_sessions.get(normalized_session_id)

    if not session:
        return {
            "session_id": normalized_session_id,
            "available": False,
            "lat": None,
            "lng": None,
            "timestamp": None,
            "status": "expired_or_missing",
        }

    timestamp = session.get("timestamp")
    if timestamp is None:
        return {
            "session_id": normalized_session_id,
            "available": False,
            "lat": None,
            "lng": None,
            "timestamp": None,
            "status": "pending",
        }

    return {
        "session_id": normalized_session_id,
        "available": True,
        "lat": session.get("lat"),
        "lng": session.get("lng"),
        "timestamp": _to_iso_z(timestamp),
        "status": "received",
    }


@gps_router.post("/update")
def update_gps_session(data: SessionGPSUpdateRequest):
    session_id = _parse_session_id(data.session_id)
    lat = float(data.lat)
    lng = float(data.lng)
    _validate_coordinates(lat, lng)
    now = _utcnow()

    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        session = _update_session(session_id, lat, lng, now)

    return {
        "stored": True,
        "session_id": session_id,
        "lat": session["lat"],
        "lng": session["lng"],
        "timestamp": _to_iso_z(session["timestamp"]),
    }


@mobile_gps_router.get("/qr-url")
def get_mobile_gps_qr_url(request: Request):
    global _legacy_active_session_id

    now = _utcnow()
    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        session = _new_session(now)
        _legacy_active_session_id = session["session_id"]

    base_url = _resolve_public_base_url(request)
    session_id = session["session_id"]
    return {
        "base_url": base_url,
        "mobile_page_url": f"{base_url}/mobile-gps?session_id={session_id}",
        "session_id": session_id,
        "expires_in_seconds": _session_ttl_seconds,
    }


@mobile_gps_router.get("/latest")
def get_latest_mobile_gps():
    active_session_id = _legacy_active_session_id
    if not active_session_id:
        return {
            "latitude": None,
            "longitude": None,
            "timestamp": None,
            "available": False,
        }

    now = _utcnow()
    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        session = _gps_sessions.get(active_session_id)

    if not session or session.get("timestamp") is None:
        return {
            "latitude": None,
            "longitude": None,
            "timestamp": None,
            "available": False,
        }

    return {
        "latitude": session.get("lat"),
        "longitude": session.get("lng"),
        "timestamp": _to_iso_z(session.get("timestamp")),
        "available": True,
    }


@mobile_gps_router.post("/update")
def update_mobile_gps(data: LegacyMobileGPSUpdateRequest):
    global _legacy_active_session_id

    lat = float(data.latitude)
    lng = float(data.longitude)
    _validate_coordinates(lat, lng)
    now = _utcnow()

    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        if not _legacy_active_session_id or _legacy_active_session_id not in _gps_sessions:
            session = _new_session(now)
            _legacy_active_session_id = session["session_id"]

        session = _update_session(_legacy_active_session_id, lat, lng, now)

    return {
        "message": "Location updated",
        "stored": True,
        "session_id": session["session_id"],
        "timestamp": _to_iso_z(session["timestamp"]),
    }


@mobile_gps_router.get("/debug-path")
def debug_path():
    now = _utcnow()
    with _gps_session_lock:
        _cleanup_expired_sessions(now)
        active_sessions = len(_gps_sessions)
    return {
        "sessions_active": active_sessions,
        "session_ttl_seconds": _session_ttl_seconds,
        "legacy_active_session_id": _legacy_active_session_id,
    }


def _serve_mobile_gps_page():
    file_path = _project_root / "frontend" / "public" / "mobile-gps.html"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="mobile-gps.html not found")
    return FileResponse(str(file_path), media_type="text/html")


@mobile_gps_page_router.get("/mobile-gps")
def serve_mobile_gps_page_route():
    return _serve_mobile_gps_page()


@mobile_gps_page_router.get("/mobile-gps.html")
def serve_mobile_gps_page_html():
    return _serve_mobile_gps_page()
