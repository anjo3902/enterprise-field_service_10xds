"""
database/firestore_client.py
============================
Firestore wrapper that mirrors the PostgreSQL-backed dispatch system API.

Every public function in this module has the EXACT same signature and return
shape as its SQLAlchemy / psycopg2 counterpart so callers need ZERO changes.

Relationship preservation strategy (Firestore has no JOINs):
  - service_requests.assigned_technician stores the integer technician id.
  - Callers resolve the technician by id via get_technician_by_id().

Collections (database: field-service-dispatcher):
  technicians      → same fields as PostgreSQL technicians table
  service_requests → same fields as PostgreSQL service_requests table
  dispatch_results → same fields as PostgreSQL dispatch_results table
  users            → same fields as PostgreSQL users table
  auth_tokens      → same fields as PostgreSQL auth_tokens table
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
import os
from pathlib import Path
from typing import Any

from google.cloud import firestore
from google.oauth2 import service_account
from dispatch_engine.geo_validation import (
    get_coordinates_from_zone,
    is_valid_kerala_coordinate,
)

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection (lazy singleton)
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_SERVICE_ACCOUNT_PATH = _PROJECT_ROOT / "service-account.json"
_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "field-service-dispatcher")
_PROJECT_ID = None

_db_instance: firestore.Client | None = None


def _get_db() -> firestore.Client:
    """Return the singleton Firestore client (initialised lazily)."""
    global _db_instance
    if _db_instance is None:
        # Prefer local file; fall back to GOOGLE_APPLICATION_CREDENTIALS_JSON env var.
        if _SERVICE_ACCOUNT_PATH.exists():
            creds = service_account.Credentials.from_service_account_file(
                str(_SERVICE_ACCOUNT_PATH),
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        else:
            cred_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
            if cred_json:
                info = json.loads(cred_json)
                creds = service_account.Credentials.from_service_account_info(
                    info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
            else:
                raise RuntimeError(
                    "No credentials found. Provide service-account.json or set GOOGLE_APPLICATION_CREDENTIALS_JSON."
                )
        project_id = getattr(creds, "project_id", None) or _PROJECT_ID or os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
        _db_instance = firestore.Client(
            project=project_id,
            database=_DATABASE_ID,
            credentials=creds,
        )
        LOGGER.info(
            "FirestoreClient connected → project=%s database=%s",
            project_id, _DATABASE_ID,
        )
    return _db_instance


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(value: Any) -> Any:
    """Coerce Python values to Firestore-safe types (recursive)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


def _coerce_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_technician_coordinate_updates(technician_id: int | str, updates: dict) -> dict:
    coord_keys = {"latitude", "longitude", "current_latitude", "current_longitude"}
    if not coord_keys.intersection(updates.keys()):
        return updates

    normalized = dict(updates)
    existing: dict | None = None
    zone: str | None = None

    def _load_existing() -> dict:
        nonlocal existing, zone
        if existing is None:
            existing = get_technician_by_id(technician_id) or {}
            zone = (
                normalized.get("location_zone")
                or existing.get("location_zone")
                or existing.get("service_zone")
                or existing.get("zone")
            )
        return existing

    for lat_key, lng_key in (("latitude", "longitude"), ("current_latitude", "current_longitude")):
        if lat_key not in normalized and lng_key not in normalized:
            continue

        lat_raw = normalized.get(lat_key)
        lng_raw = normalized.get(lng_key)
        if lat_raw is None or lng_raw is None:
            existing = _load_existing()
            lat_raw = lat_raw if lat_raw is not None else existing.get(lat_key)
            lng_raw = lng_raw if lng_raw is not None else existing.get(lng_key)

        lat = _coerce_float(lat_raw)
        lng = _coerce_float(lng_raw)
        if lat is None or lng is None:
            continue

        if is_valid_kerala_coordinate(lat, lng):
            if lat_key in normalized:
                normalized[lat_key] = float(lat)
            if lng_key in normalized:
                normalized[lng_key] = float(lng)
            continue

        if zone is None:
            _load_existing()

        corrected = get_coordinates_from_zone(zone)
        if corrected:
            new_lat, new_lng = corrected
            normalized[lat_key] = float(new_lat)
            normalized[lng_key] = float(new_lng)
            LOGGER.warning(
                "INVALID_COORDINATE_CORRECTED: technician_id=%s %s/%s from %s,%s to %s,%s",
                technician_id,
                lat_key,
                lng_key,
                lat,
                lng,
                new_lat,
                new_lng,
            )
        else:
            raise ValueError(
                f"Invalid technician coordinates for {technician_id} (zone={zone})"
            )

    return normalized


def _doc_to_dict(doc: firestore.DocumentSnapshot, numeric_id: bool = True) -> dict:
    """
    Convert a Firestore DocumentSnapshot to a plain dict.

    - Adds an 'id' key equal to the document ID (cast to int when numeric_id=True).
    - Converts Firestore Timestamps to naive UTC datetime objects (matching
      PostgreSQL behaviour expected by callers).
    """
    data = doc.to_dict() or {}
    raw_id = doc.id
    try:
        data["id"] = int(raw_id) if numeric_id else raw_id
    except (ValueError, TypeError):
        data["id"] = raw_id

    # Normalise timestamps: remove tzinfo so callers get naive datetimes
    # (consistent with SQLAlchemy datetime columns).
    for key, val in data.items():
        if isinstance(val, datetime) and val.tzinfo is not None:
            data[key] = val.replace(tzinfo=None)

    return data


def _next_id(collection_name: str) -> int:
    """
    Generate a monotonically increasing integer document ID.
    Uses a Firestore counter document: _meta/counters/{collection_name}.
    Thread-safe via Firestore transaction.
    """
    db = _get_db()
    counter_ref = db.collection("_meta").document("counters")

    @firestore.transactional
    def _increment(transaction: firestore.Transaction) -> int:
        snapshot = counter_ref.get(transaction=transaction)
        counters = snapshot.to_dict() or {} if snapshot.exists else {}
        current = int(counters.get(collection_name, 0))
        new_val = current + 1
        transaction.set(counter_ref, {collection_name: new_val}, merge=True)
        return new_val

    transaction = db.transaction()
    return _increment(transaction)


# ===========================================================================
# Technician operations
# ===========================================================================

def create_dispatch_audit_log(entry: dict) -> str:
    """
    Persist a dispatch audit log entry.

    Expected fields: technician_id, job_id, distance, zone_match, score, timestamp.
    """
    db = _get_db()
    new_id = _next_id("dispatch_audit_logs")
    doc_data = {
        **_serialize(entry),
        "id": str(new_id),
        "created_at": _now_utc(),
    }
    db.collection("dispatch_audit_logs").document(str(new_id)).set(doc_data)
    return str(new_id)

def get_technicians() -> list[dict]:
    """Return all technicians (mirrors: SELECT * FROM technicians)."""
    db = _get_db()
    docs = db.collection("technicians").stream()
    return [_doc_to_dict(doc) for doc in docs]


def get_technician_by_id(technician_id: int | str) -> dict | None:
    """Return a single technician by integer id."""
    db = _get_db()
    doc = db.collection("technicians").document(str(technician_id)).get()
    if not doc.exists:
        return None
    return _doc_to_dict(doc)


def upsert_technician(technician_id: int | str, data: dict) -> None:
    """Create or merge a technician document."""
    db = _get_db()
    payload = dict(data or {})
    if "id" not in payload:
        try:
            payload["id"] = int(technician_id)
        except (TypeError, ValueError):
            payload["id"] = str(technician_id)
    db.collection("technicians").document(str(technician_id)).set(
        _serialize(payload),
        merge=True,
    )


def resolve_technician_phone(tech_record: dict) -> str:
    """Return the technician's phone number, generating and persisting one if missing.

    Generates a deterministic Indian mobile number (+91-XXXXXXXXXX) from the
    technician's integer ID so the same tech always gets the same number.
    The generated number is written back to the Firestore technician document
    so subsequent reads find it immediately.
    """
    phone = tech_record.get("phone_number") or tech_record.get("phone") or ""
    if phone:
        return phone

    tid = tech_record.get("id")
    if tid is None:
        return ""

    # Deterministic phone: +91-9 + zero-padded 9-digit suffix derived from tech ID
    phone = f"+91-9{int(tid):09d}"
    try:
        db = _get_db()
        db.collection("technicians").document(str(tid)).update(
            {"phone_number": phone}
        )
    except Exception as e:
        LOGGER.warning("Could not persist generated phone for tech %s: %s", tid, e)
    return phone


def get_available_technicians(domain: str | None = None) -> list[dict]:
    """
    Return available technicians, optionally filtered by primary_domain.
    Mirrors: SELECT * FROM technicians WHERE availability_state = 'available'.
    """
    db = _get_db()
    query = db.collection("technicians").where("availability_state", "==", "available")
    if domain:
        query = query.where("primary_domain", "==", domain)
    docs = query.stream()
    return [_doc_to_dict(doc) for doc in docs]


def update_technician(technician_id: int | str, updates: dict) -> None:
    """
    Partial update a technician document.
    Mirrors: UPDATE technicians SET ... WHERE id = :id
    """
    db = _get_db()
    normalized_updates = _normalize_technician_coordinate_updates(technician_id, updates)
    db.collection("technicians").document(str(technician_id)).update(
        _serialize(normalized_updates)
    )


def update_technician_location(technician_id: int | str, current_latitude: float, current_longitude: float) -> None:
    """Update a technician's live location."""
    update_technician(technician_id, {
        "current_latitude": current_latitude,
        "current_longitude": current_longitude,
    })


def update_technician_job_counts(technician_id: int | str, current_jobs: int) -> None:
    """Sync workload counter for a technician."""
    update_technician(technician_id, {
        "current_jobs": current_jobs,
        "workload": current_jobs,
    })


# ===========================================================================
# Service Request operations
# ===========================================================================

def get_jobs() -> list[dict]:
    """Return all service requests (mirrors: SELECT * FROM service_requests)."""
    db = _get_db()
    docs = db.collection("service_requests").stream()
    results: list[dict] = []
    for doc in docs:
        raw = _doc_to_dict(doc, numeric_id=False)
        results.append(normalize_service_request(raw) or {})
    return results


def get_job_by_id(request_id: int | str) -> dict | None:
    """Return a single service request by id."""
    db = _get_db()
    # Delegate to the newer get_request_by_id which returns a normalized
    # service request representation (IDs as strings, image field normalized,
    # safe defaults for missing fields).
    return get_request_by_id(request_id)


def normalize_service_request(data: dict | None) -> dict | None:
    """Normalize a raw Firestore service_request dict to a stable schema.

    - Ensures `id` is a string
    - Normalizes image field to `image_url`
    - Provides safe defaults for missing fields (e.g., `status` -> 'pending')
    - Converts datetime-like fields to ISO strings
    """
    if data is None:
        return None

    d = dict(data or {})

    # Canonical minimal shape required by frontends and APIs (preserve extras below)
    out: dict = {
        "id": str(d.get("id") if d.get("id") is not None else d.get("_id") or ""),
        "customer_id": d.get("customer_id") or d.get("customer_user_id"),
        "status": d.get("status") or "pending",
        "fault_type": d.get("fault_type"),
        "severity": d.get("severity"),
        "assigned_technician": d.get("assigned_technician"),
        "created_at": None,
        "image_url": d.get("image_url") or d.get("evidence_image_path"),
        "description": d.get("description"),
    }

    # Ensure created_at is a string if present
    created = d.get("created_at")
    try:
        if created is None:
            out["created_at"] = None
        elif hasattr(created, "isoformat"):
            out["created_at"] = created.isoformat()
        else:
            out["created_at"] = str(created)
    except Exception:
        out["created_at"] = str(created)

    # For backward compatibility, include common additional fields without overwriting
    extras = [
        "customer_name",
        "customer_email",
        "contact_number",
        "distance_km",
        "travel_time_min",
        "location_text",
        "location_zone",
        "latitude",
        "longitude",
        "final_severity",
        "diagnosis_confidence",
        "ai_domain",
        "review_decision",
        "review_notes",
        "reassignment_requested",
        "reassignment_reason",
        "reassignment_requested_by",
        "reassignment_requested_at",
        "reassignment_status",
        "previous_technician",
    ]
    for k in extras:
        if k not in out and k in d:
            out[k] = d.get(k)

    # Preserve any other keys for advanced backend consumers
    for k, v in d.items():
        if k in out:
            continue
        out[k] = v

    return out


def get_request_by_id(request_id: int | str) -> dict | None:
    """Fetch a service_request document and return a normalized dict.

    Uses string IDs for document access and for the returned `id` field.
    """
    db = _get_db()
    doc = db.collection("service_requests").document(str(request_id)).get()
    if not doc.exists:
        print("REQUEST NOT FOUND:", request_id)
        return None

    # Use _doc_to_dict with numeric_id=False so the id is kept as string
    raw = _doc_to_dict(doc, numeric_id=False)
    normalized = normalize_service_request(raw)
    print("FETCHED DOC:", normalized)
    return normalized


def get_jobs_for_technician(technician_id: int | str) -> list[dict]:
    """
    Return all service requests assigned to a specific technician.
    Tries both integer and string forms of technician_id since old docs
    may have stored the id as either type.
    """
    db = _get_db()
    coll = db.collection("service_requests")
    results: list[dict] = []
    seen: set[str] = set()

    for query_val in [int(technician_id), str(technician_id)]:
        try:
            docs = coll.where("assigned_technician", "==", query_val).stream()
            for doc in docs:
                if doc.id in seen:
                    continue
                seen.add(doc.id)
                raw = _doc_to_dict(doc, numeric_id=False)
                results.append(normalize_service_request(raw) or {})
        except Exception:
            pass

    return results


def get_jobs_by_status(status: str) -> list[dict]:
    """
    Return service requests filtered by status.
    Mirrors: SELECT * FROM service_requests WHERE status = :status
    """
    db = _get_db()
    docs = db.collection("service_requests").where("status", "==", status).stream()
    results: list[dict] = []
    for doc in docs:
        raw = _doc_to_dict(doc, numeric_id=False)
        results.append(normalize_service_request(raw) or {})
    return results


def get_jobs_for_customer(customer_user_id: int) -> list[dict]:
    """Return service requests for a specific customer."""
    db = _get_db()
    docs = []

    # Try common field names used in different migrations: `customer_user_id` and `customer_id`.
    try:
        q1 = db.collection("service_requests").where("customer_user_id", "==", customer_user_id).stream()
        docs.extend(list(q1))
    except Exception:
        pass

    try:
        q2 = db.collection("service_requests").where("customer_id", "==", customer_user_id).stream()
        docs.extend(list(q2))
    except Exception:
        pass

    # Deduplicate by document id
    seen = set()
    results: list[dict] = []
    for doc in docs:
        if doc.id in seen:
            continue
        seen.add(doc.id)
        raw = _doc_to_dict(doc, numeric_id=False)
        results.append(normalize_service_request(raw) or {})

    return results


def _prepare_service_request_doc(data: dict, request_id: int | str) -> dict:
    doc_data = {**_serialize(data)}
    # Always store string id on the document
    doc_data["id"] = str(request_id)
    # Ensure created_at (naive UTC) exists
    doc_data.setdefault("created_at", datetime.utcnow())
    # Ensure customer_id is present when customer_user_id exists
    if "customer_id" not in doc_data and "customer_user_id" in doc_data:
        doc_data["customer_id"] = doc_data.get("customer_user_id")
    # Safe defaults
    doc_data.setdefault("status", "pending")
    doc_data.setdefault("reassignment_requested", False)
    doc_data.setdefault("reassignment_reason", None)
    doc_data.setdefault("reassignment_requested_by", None)
    doc_data.setdefault("reassignment_requested_at", None)
    doc_data.setdefault("reassignment_status", "not_requested")
    # Normalize image field to image_url if other fields present
    if "image_url" not in doc_data and "evidence_image_path" in doc_data:
        doc_data["image_url"] = doc_data.get("evidence_image_path")

    # Enforce Location existence if missing
    loc_text = doc_data.get("location_text") or ""
    if not str(loc_text).strip():
        lat = doc_data.get("latitude")
        lon = doc_data.get("longitude")
        if lat is not None and lon is not None:
            doc_data["location_text"] = f"{lat}, {lon}"
        else:
            doc_data["location_text"] = ""

    return doc_data


def create_service_request(data: dict) -> str:
    """
    Insert a new service request into Firestore.

    Enforces a canonical document shape and returns the new document id as a string.
    """
    db = _get_db()
    new_id = _next_id("service_requests")
    doc_data = _prepare_service_request_doc(data, new_id)
    db.collection("service_requests").document(str(new_id)).set(doc_data)
    return str(new_id)


def create_service_request_with_assignment(
    data: dict,
    technician_id: int | None = None,
) -> str:
    """
    Create a service request and update technician counters atomically.
    """
    db = _get_db()
    new_id = _next_id("service_requests")
    doc_data = _prepare_service_request_doc(data, new_id)

    batch = db.batch()
    req_ref = db.collection("service_requests").document(str(new_id))
    batch.set(req_ref, doc_data)

    if technician_id is not None:
        tech_ref = db.collection("technicians").document(str(technician_id))
        batch.update(
            tech_ref,
            {
                "current_jobs": firestore.Increment(1),
                "workload": firestore.Increment(1),
            },
        )

    batch.commit()
    return str(new_id)


def update_job(request_id: int | str, updates: dict) -> None:
    """
    Partial update a service request.
    Mirrors: UPDATE service_requests SET ... WHERE id = :id
    """
    db = _get_db()
    db.collection("service_requests").document(str(request_id)).update(
        _serialize(updates)
    )


def update_service_request(request_id: int | str, updates: dict) -> None:
    """
    Backwards-compatible wrapper matching the requested API name.

    Use this across the codebase when replacing SQL UPDATE statements.
    """
    return update_job(request_id, updates)


def request_service_reassignment(
    request_id: int | str,
    *,
    technician_id: int | str,
    reason: str,
    requested_by: int | str,
    notes: str | None = None,
) -> None:
    """Persist a reassignment request on an existing service request document."""
    updates = {
        "reassignment_requested": True,
        "reassignment_reason": reason,
        "reassignment_requested_by": int(requested_by),
        "reassignment_requested_at": datetime.utcnow(),
        "reassignment_status": "requested",
        "previous_technician": int(technician_id),
        "updated_at": datetime.utcnow(),
    }
    if notes:
        updates["reassignment_notes"] = notes
    update_service_request(request_id, updates)


def assign_service_request_atomic(
    request_id: int | str,
    updates: dict,
    technician_id: int | None = None,
    previous_technician_id: int | None = None,
) -> None:
    """
    Atomically update a service request and technician counters in Firestore.
    """
    db = _get_db()
    batch = db.batch()
    req_ref = db.collection("service_requests").document(str(request_id))
    batch.update(req_ref, _serialize(updates))

    if technician_id is not None:
        tech_ref = db.collection("technicians").document(str(technician_id))
        batch.update(
            tech_ref,
            {
                "current_jobs": firestore.Increment(1),
                "workload": firestore.Increment(1),
            },
        )

    if previous_technician_id is not None:
        old_ref = db.collection("technicians").document(str(previous_technician_id))
        batch.update(
            old_ref,
            {
                "current_jobs": firestore.Increment(-1),
                "workload": firestore.Increment(-1),
            },
        )

    batch.commit()


def create_dispatch_queue_item(data: dict) -> str:
    """Persist a dispatch queue item in Firestore."""
    db = _get_db()
    new_id = _next_id("dispatch_queue")
    doc_data = {
        **_serialize(data),
        "id": str(new_id),
        "status": data.get("status") or "pending",
        "attempts": int(data.get("attempts") or 0),
        "created_at": _now_utc(),
    }
    db.collection("dispatch_queue").document(str(new_id)).set(doc_data)
    return str(new_id)


def get_pending_dispatch_queue(limit: int = 20) -> list[dict]:
    db = _get_db()
    coll = db.collection("dispatch_queue")
    try:
        docs = coll.where("status", "==", "pending").order_by("created_at").limit(limit).stream()
    except Exception:
        docs = coll.where("status", "==", "pending").limit(limit).stream()

    return [_doc_to_dict(doc, numeric_id=False) for doc in docs]


def update_dispatch_queue_item(queue_id: int | str, updates: dict) -> None:
    db = _get_db()
    db.collection("dispatch_queue").document(str(queue_id)).update(_serialize(updates))


def set_job_by_id(request_id: int | str, data: dict) -> None:
    """
    Create or overwrite a service_requests document with the given id.

    This is used when the system needs to ensure the Firestore document id
    matches an external integer id (e.g. Postgres primary key) so reads by id
    are consistent across backends.
    """
    db = _get_db()
    # Ensure numeric id stored on the document and coerce types for Firestore
    try:
        stored_id = int(request_id) if str(request_id).isdigit() else request_id
    except Exception:
        stored_id = request_id

    doc_data = {**_serialize(data)}
    # Always include an `id` field on the document
    doc_data["id"] = stored_id

    # If caller didn't provide created_at, set a sensible UTC now (naive datetime;
    # _serialize will attach tzinfo for Firestore storage and _doc_to_dict strips it)
    if "created_at" not in doc_data:
        doc_data["created_at"] = datetime.utcnow()

    db.collection("service_requests").document(str(request_id)).set(doc_data, merge=True)


def debug_latest_requests(limit: int = 5) -> None:
    """Print the latest `limit` requests (for quick diagnostic checks)."""
    db = _get_db()
    try:
        docs = db.collection("service_requests").order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit).stream()
    except Exception:
        docs = db.collection("service_requests").stream()

    for d in docs:
        raw = _doc_to_dict(d, numeric_id=False)
        print("LATEST:", raw.get("id"), normalize_service_request(raw))


def assign_technician_to_job(
    request_id: int | str,
    technician_id: int,
    distance_km: float,
    travel_time_min: float,
    tech_record: dict | None = None,
) -> None:
    """
    Assign a technician to a service request, denormalizing name/phone/zone.
    """
    updates: dict = {
        "assigned_technician": technician_id,
        "distance_km": distance_km,
        "travel_time_min": travel_time_min,
        "assigned_at": _now_utc(),
        "status": "assigned",
    }
    if tech_record:
        updates["assigned_technician_name"] = tech_record.get("name") or ""
        updates["assigned_technician_phone_number"] = (
            tech_record.get("phone_number") or tech_record.get("phone") or ""
        )
        updates["assigned_technician_zone"] = (
            tech_record.get("location_zone") or tech_record.get("service_zone") or ""
        )
        updates["assigned_technician_latitude"] = (
            tech_record.get("current_latitude") or tech_record.get("latitude")
        )
        updates["assigned_technician_longitude"] = (
            tech_record.get("current_longitude") or tech_record.get("longitude")
        )
    update_job(request_id, updates)


def update_job_status(request_id: int | str, status: str, extra: dict | None = None) -> None:
    """
    Update the lifecycle status of a service request.
    Mirrors: UPDATE service_requests SET status = :status WHERE id = :id
    """
    updates: dict = {"status": status}
    if status == "completed":
        updates["completed_at"] = _now_utc()
    if extra:
        updates.update(extra)
    update_job(request_id, updates)


# ===========================================================================
# Dispatch Result operations
# ===========================================================================

def save_dispatch_result(result_data: dict) -> int:
    """
    Persist a dispatch result record.
    Mirrors: INSERT INTO dispatch_results (...) RETURNING id
    """
    db = _get_db()
    new_id = _next_id("dispatch_results")
    doc_data = {
        **_serialize(result_data),
        "id": new_id,
        "assigned_at": _now_utc(),
    }
    db.collection("dispatch_results").document(str(new_id)).set(doc_data)
    return new_id


def get_dispatch_results() -> list[dict]:
    """Return all dispatch result records."""
    db = _get_db()
    docs = db.collection("dispatch_results").stream()
    return [_doc_to_dict(doc) for doc in docs]


# ===========================================================================
# User / Auth operations
# ===========================================================================

def get_user_by_email(email: str) -> dict | None:
    """
    Return user record by email.
    Mirrors: SELECT * FROM users WHERE email = :email
    """
    db = _get_db()
    docs = list(
        db.collection("users").where("email", "==", email.strip().lower()).limit(1).stream()
    )
    if not docs:
        return None
    return _doc_to_dict(docs[0])


def get_user_by_id(user_id: int | str) -> dict | None:
    """Return user by integer id."""
    db = _get_db()
    doc = db.collection("users").document(str(user_id)).get()
    if not doc.exists:
        return None
    return _doc_to_dict(doc)


def get_user_by_technician_id(technician_id: int | str) -> dict | None:
    """
    Return a single user who is linked to a given technician_id.

    Mirrors: SELECT id FROM users WHERE technician_id = :technician_id LIMIT 1
    """
    db = _get_db()
    try:
        docs = list(db.collection("users").where("technician_id", "==", int(technician_id)).limit(1).stream())
    except Exception:
        # Fallback: try string comparison
        docs = list(db.collection("users").where("technician_id", "==", str(technician_id)).limit(1).stream())

    if not docs:
        return None
    return _doc_to_dict(docs[0])


def create_user(user_data: dict) -> int:
    """
    Create a new user record.
    Mirrors: INSERT INTO users (...) RETURNING id
    """
    db = _get_db()
    new_id = _next_id("users")
    doc_data = {
        **_serialize(user_data),
        "id": new_id,
        "is_active": True,
        "created_at": _now_utc(),
    }
    doc_data.setdefault("role", "customer")
    db.collection("users").document(str(new_id)).set(doc_data)
    return new_id


def update_user(user_id: int | str, updates: dict) -> None:
    """Partial update a user document."""
    db = _get_db()
    db.collection("users").document(str(user_id)).update(_serialize(updates))


def create_auth_token(
    token: str,
    user_id: int,
    purpose: str | None = None,
    expires_at: datetime | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Persist an auth token.
    Mirrors: INSERT INTO auth_tokens (token, user_id, created_at) VALUES (...)
    """
    payload: dict[str, Any] = {
        "token": token,
        "user_id": str(user_id),
        "created_at": _now_utc(),
    }
    if purpose:
        payload["purpose"] = purpose
    if expires_at:
        payload["expires_at"] = expires_at
    if metadata:
        payload["metadata"] = _serialize(metadata)

    db = _get_db()
    db.collection("auth_tokens").document(token).set(_serialize(payload))


def create_workspace_token(token: str, user_id: int, job_id: str | int, ttl_seconds: int = 300) -> None:
    """Create a short-lived, single-use workspace deeplink token."""
    ttl_seconds = int(ttl_seconds or 0)
    if ttl_seconds < 60:
        ttl_seconds = 60
    now = _now_utc()
    expires_at = now + timedelta(seconds=ttl_seconds)
    payload = {
        "token": token,
        "user_id": str(user_id),
        "job_id": str(job_id),
        "purpose": "workspace_deeplink",
        "created_at": now,
        "expires_at": expires_at,
        "used_at": None,
    }
    db = _get_db()
    db.collection("auth_tokens").document(token).set(_serialize(payload))


def consume_workspace_token(token: str, job_id: str | int) -> dict | None:
    """Validate and consume a workspace deeplink token (single use)."""
    if not token:
        return None

    db = _get_db()
    doc_ref = db.collection("auth_tokens").document(str(token))
    expected_job_id = str(job_id)
    now = _now_utc()

    @firestore.transactional
    def _consume(transaction: firestore.Transaction) -> str | None:
        snapshot = doc_ref.get(transaction=transaction)
        if not snapshot.exists:
            return None

        data = snapshot.to_dict() or {}
        if data.get("purpose") != "workspace_deeplink":
            return None
        if data.get("used_at") is not None:
            return None

        expires_at = data.get("expires_at")
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at <= now:
            transaction.delete(doc_ref)
            return None

        if str(data.get("job_id") or "") != expected_job_id:
            return None

        user_id = data.get("user_id")
        if not user_id:
            return None

        transaction.update(doc_ref, {"used_at": now})
        return str(user_id)

    user_id = _consume(db.transaction())
    if not user_id:
        return None
    return get_user_by_id(user_id)


def validate_auth_token(token: str) -> dict | None:
    """
    Validate an auth token and return the associated user record.
    Mirrors:
        SELECT u.* FROM auth_tokens t JOIN users u ON u.id = t.user_id
        WHERE t.token = :token
    """
    print("VALIDATING TOKEN:", token)
    db = _get_db()
    token_doc = db.collection("auth_tokens").document(str(token)).get()
    if not token_doc.exists:
        return None
    token_data = token_doc.to_dict() or {}
    purpose = token_data.get("purpose")
    if purpose and purpose != "session":
        return None
    expires_at = token_data.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at <= _now_utc():
        return None
    user_id = token_data.get("user_id")
    if user_id is None:
        return None
    return get_user_by_id(user_id)


def get_user_by_token(token: str) -> dict | None:
    """
    Mirror of PostgreSQL auth_tokens JOIN users lookup by token.

    Returns the user dict (matching SQL shape) or None.
    """
    print("VALIDATING TOKEN:", token)
    if not token:
        return None

    try:
        db = _get_db()
        token_doc = db.collection("auth_tokens").document(str(token)).get()
        if not token_doc.exists:
            print("TOKEN NOT FOUND")
            return None

        token_data = token_doc.to_dict() or {}
        purpose = token_data.get("purpose")
        if purpose and purpose != "session":
            print("TOKEN PURPOSE NOT ALLOWED")
            return None

        expires_at = token_data.get("expires_at")
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at <= _now_utc():
            print("TOKEN EXPIRED")
            return None
        user_id = token_data.get("user_id")
        if not user_id:
            print("USER ID MISSING IN TOKEN")
            return None

        # Reuse existing helper to fetch and normalise the user
        user = get_user_by_id(user_id)
        if not user:
            print("USER NOT FOUND")
            return None

        # Ensure id field exists and is consistent with stored token user_id
        try:
            user["id"] = int(user_id) if str(user_id).isdigit() else user_id
        except Exception:
            user["id"] = user_id

        return user
    except Exception as e:
        print("ERROR in get_user_by_token:", str(e))
        import traceback
        traceback.print_exc()
        return None


def delete_auth_token(token: str) -> None:
    """
    Invalidate a session token.
    Mirrors: DELETE FROM auth_tokens WHERE token = :token
    """
    db = _get_db()
    db.collection("auth_tokens").document(token).delete()


# ===========================================================================
# Utility / diagnostic
# ===========================================================================

def count_collection(collection_name: str) -> int:
    """Return the number of documents in a collection."""
    db = _get_db()
    return len(list(db.collection(collection_name).stream()))


def sync_technician_job_counters_firestore(technician_id: int | None = None) -> None:
    """
    Recalculate and persist current_jobs / workload for technicians.
    Mirrors: dispatch_service.sync_technician_job_counters() but against Firestore.
    
    For performance:
    - If technician_id provided: query only that technician's jobs (fast, always runs)
    - If technician_id is None: skip full sync (would timeout on large datasets)
      Full sync is only needed in batch jobs, not on startup.
    """
    db = _get_db()
    active_statuses = {"assigned", "in_progress"}

    if technician_id is not None:
        # Targeted sync: count jobs for ONE technician (fast, always safe)
        try:
            jobs = list(
                db.collection("service_requests")
                .where("assigned_technician", "==", int(technician_id))
                .stream(timeout=10)
            )
            count = sum(
                1 for j in jobs
                if (j.to_dict() or {}).get("status") in active_statuses
            )
            update_technician_job_counts(technician_id, count)
        except Exception as e:
            LOGGER.exception("Failed to sync job counts for technician %s: %s", technician_id, e)
    else:
        # Full sync would require streaming all requests + all technicians
        # Skip on startup to avoid deadline exceeded errors
        # This sync should only run during batch operations, not server init
        LOGGER.info("Skipping full technician job counter sync (runs only in batch jobs, not on startup)")
