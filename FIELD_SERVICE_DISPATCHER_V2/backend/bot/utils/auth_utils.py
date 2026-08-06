from __future__ import annotations

import logging
from datetime import datetime
import re
from typing import Any

from database import db_client

LOGGER = logging.getLogger(__name__)


def normalize_employee_id(raw: str | None) -> str:
    return str(raw or "").strip()


def _normalize_technician_code(raw: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(raw or "").upper())


def resolve_technician_by_employee_id(employee_id: str) -> dict | None:
    employee_id = normalize_employee_id(employee_id)
    if not employee_id:
        return None

    if employee_id.isdigit():
        tech = db_client.get_technician_by_id(int(employee_id))
        if tech:
            return tech

    techs = db_client.get_technicians() or []
    lookup = employee_id.upper()
    lookup_norm = _normalize_technician_code(employee_id)
    for tech in techs:
        code_raw = str(tech.get("technician_code") or "")
        alt_raw = str(tech.get("employee_id") or "")
        code = code_raw.strip().upper()
        alt = alt_raw.strip().upper()
        if lookup and (lookup == code or lookup == alt):
            return tech
        if lookup_norm and (
            lookup_norm == _normalize_technician_code(code_raw)
            or lookup_norm == _normalize_technician_code(alt_raw)
        ):
            return tech

    synced = _sync_technician_from_postgres(employee_id)
    if synced:
        return synced

    return None


def _sync_technician_from_postgres(employee_id: str) -> dict | None:
    """Best-effort backfill from Postgres when Firestore lacks a technician."""
    try:
        from database.postgres_client import engine, text
    except Exception:
        return None

    if not engine:
        return None

    lookup = normalize_employee_id(employee_id)
    if not lookup:
        return None

    lookup_upper = lookup.upper()
    lookup_norm = _normalize_technician_code(lookup)

    try:
        with engine.connect() as conn:
            if lookup.isdigit():
                row = conn.execute(
                    text("SELECT * FROM technicians WHERE id = :id"),
                    {"id": int(lookup)},
                ).mappings().first()
            else:
                row = conn.execute(
                    text(
                        """
                        SELECT *
                        FROM technicians
                        WHERE upper(technician_code) = :code
                           OR regexp_replace(upper(technician_code), '[^A-Z0-9]', '', 'g') = :code_norm
                        LIMIT 1
                        """
                    ),
                    {"code": lookup_upper, "code_norm": lookup_norm},
                ).mappings().first()

        if not row:
            return None

        data = dict(row)
        tech_id = data.get("id")
        if tech_id is None:
            return None

        if hasattr(db_client, "upsert_technician"):
            db_client.upsert_technician(tech_id, data)
        else:
            return None

        return db_client.get_technician_by_id(tech_id)
    except Exception as exc:
        LOGGER.warning("Failed to sync technician from Postgres: %s", exc)
        return None


def _get_firestore_db():
    if hasattr(db_client, "_get_db"):
        return db_client._get_db()
    raise RuntimeError("Firestore client unavailable")


def get_technician_by_chat_id(chat_id: str | int) -> dict | None:
    chat_key = str(chat_id)
    try:
        db = _get_firestore_db()
        docs = list(
            db.collection("technicians")
            .where("telegram_chat_id", "==", chat_key)
            .limit(1)
            .stream()
        )
        if docs:
            return docs[0].to_dict() or {}
    except Exception as exc:
        LOGGER.warning("Failed to query technician by chat_id: %s", exc)
    return None


def link_chat_to_technician(
    technician_id: int,
    chat_id: str | int,
    username: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> dict:
    existing = get_technician_by_chat_id(chat_id)
    if existing and str(existing.get("id")) != str(technician_id):
        raise ValueError("This Telegram account is already linked to another technician")

    updates: dict[str, Any] = {
        "telegram_chat_id": str(chat_id),
        "telegram_linked": True,
        "telegram_linked_at": datetime.utcnow(),
        "telegram_username": username or "",
        "telegram_first_name": first_name or "",
        "telegram_last_name": last_name or "",
    }
    db_client.update_technician(technician_id, updates)

    tech = db_client.get_technician_by_id(technician_id) or {}
    return tech


def assert_job_ownership(technician_id: int, job_id: str | int) -> dict:
    job = db_client.get_request_by_id(str(job_id))
    if not job:
        raise ValueError("Job not found")

    if str(job.get("assigned_technician") or "") != str(technician_id):
        raise PermissionError("Forbidden")

    return job
