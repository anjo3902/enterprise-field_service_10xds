from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from telegram import Bot
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import TelegramError
from telegram.request import HTTPXRequest

from backend.bot.keyboards.technician_keyboard import build_assignment_keyboard
from backend.bot.keyboards.technician_keyboard import build_main_menu
from database import db_client

LOGGER = logging.getLogger(__name__)

_BOT: Bot | None = None
_ENV_LOADED = False


def _load_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    _ENV_LOADED = True

    try:
        from dotenv import load_dotenv
    except Exception:
        return

    project_root = Path(__file__).resolve().parents[3]
    load_dotenv(project_root / ".env", override=False)
    load_dotenv(project_root / "backend" / ".env", override=False)


def get_telegram_token() -> str:
    _load_env()
    return str(os.getenv("TELEGRAM_BOT_TOKEN", "")).strip()


def _get_bot() -> Bot | None:
    global _BOT
    token = get_telegram_token()
    if not token:
        return None

    if _BOT is None:
        request = HTTPXRequest(
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10,
            pool_timeout=5,
        )
        _BOT = Bot(token=token, request=request)
    return _BOT


async def send_message(chat_id: str | int, text: str, reply_markup: Any | None = None) -> bool:
    bot = _get_bot()
    if not bot:
        LOGGER.debug("Telegram token not configured; skipping message")
        return False

    try:
        await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup,
            disable_web_page_preview=True,
        )
        return True
    except TelegramError as exc:
        LOGGER.warning("Telegram send failed chat_id=%s error=%s", chat_id, exc)
        return False


def _format_assignment_message(job: dict) -> str:
    job_id = job.get("id") or job.get("request_id") or ""
    fault_type = str(job.get("fault_type") or "").strip() or "-"
    severity = str(job.get("severity") or "").strip() or "-"
    location = str(job.get("location_text") or "").strip() or "-"
    customer_name = str(job.get("customer_name") or "").strip() or "-"

    return (
        "New Assignment\n"
        f"Job ID: {job_id}\n"
        f"Fault: {fault_type}\n"
        f"Severity: {severity}\n"
        f"Location: {location}\n"
        f"Customer: {customer_name}\n\n"
        "Use the buttons below to acknowledge and update status."
    )


def format_job_summary(job: dict) -> str:
    from datetime import datetime, timezone

    job_id = job.get("id") or job.get("request_id") or ""
    status = str(job.get("status") or "").title()
    location = str(job.get("location_text") or "").strip() or "-"
    fault = str(job.get("fault_type") or "").strip() or "-"
    severity = str(job.get("severity") or job.get("final_severity") or "").title() or "-"
    priority = str(job.get("priority") or "").title() or "-"

    # Assigned at: try common fields
    assigned_at = job.get("assigned_at") or job.get("assigned_at_iso") or job.get("assignedAt")

    def _parse_dt(v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v)
            except Exception:
                return None
        if isinstance(v, datetime):
            return v
        return None

    dt = _parse_dt(assigned_at)
    now = datetime.utcnow()
    assigned_str = ""
    if dt:
        try:
            delta = now - (dt.replace(tzinfo=None) if hasattr(dt, 'tzinfo') else dt)
            mins = int(delta.total_seconds() // 60)
            if mins < 1:
                assigned_str = "just now"
            elif mins < 60:
                assigned_str = f"{mins} mins ago"
            else:
                hours = mins // 60
                assigned_str = f"{hours}h ago"
        except Exception:
            assigned_str = str(dt)
    else:
        assigned_str = "-"

    ticket_label = f"SR-{job_id}" if str(job_id).isdigit() else str(job_id)

    lines = [
        f"🚨 Ticket: {ticket_label}",
        f"\nFault: {fault}",
        f"Severity: {severity}",
        f"Priority: {priority}",
        f"Status: {status}",
        "",
        f"📍 {location}",
        f"🕒 Assigned: {assigned_str}",
    ]

    return "\n".join(lines)


async def send_assignment_notification(job: dict, technician: dict) -> bool:
    chat_id = technician.get("telegram_chat_id")
    if not chat_id:
        LOGGER.info("Technician %s has no telegram_chat_id; skipping", technician.get("id"))
        return False

    job_id = job.get("id") or job.get("request_id") or ""
    latitude = job.get("latitude")
    longitude = job.get("longitude")

    # Pass technician id so keyboard builders can generate contextual actions
    tech_id = technician.get("id") if isinstance(technician, dict) else None
    keyboard = build_assignment_keyboard(
        str(job_id),
        latitude,
        longitude,
        str(tech_id) if tech_id is not None else None,
        job.get("status"),
    )
    text = _format_assignment_message(job)
    return await send_message(chat_id, text, reply_markup=keyboard)


def _schedule_task(coro: Any) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(coro)
        return

    task = loop.create_task(coro)

    def _log_task_result(t: asyncio.Task) -> None:
        try:
            _ = t.result()
        except Exception:
            LOGGER.exception("Telegram background task failed")

    task.add_done_callback(_log_task_result)


def schedule_assignment_notification(job: dict, technician: dict) -> None:
    _schedule_task(send_assignment_notification(job, technician))


async def send_reroute_notification(technician: dict, route_snapshot: dict | None = None, reason: str | None = None) -> bool:
    """Send a reroute alert to the given technician with the latest route order."""
    if not technician:
        return False

    chat_id = technician.get("telegram_chat_id")
    if not chat_id:
        LOGGER.info("Technician %s has no telegram_chat_id; skipping reroute notif", technician.get("id"))
        return False

    # Ensure we have a fresh route snapshot if not provided
    if route_snapshot is None:
        try:
            from dispatch_engine.route_planner import plan_technician_route

            route_snapshot = plan_technician_route(int(technician.get("id")))
        except Exception:
            route_snapshot = None

    msg_lines: list[str] = []
    msg_lines.append("⚠️ Route Updated")
    if reason:
        msg_lines.append("")
        msg_lines.append(reason)

    if not route_snapshot:
        msg_lines.append("")
        msg_lines.append("Updated route is available in the dashboard.")
        text = "\n".join(msg_lines)
        return await send_message(chat_id, text)

    order = route_snapshot.get("route_order") or []
    if not order:
        msg_lines.append("")
        msg_lines.append("No active route items.")
        text = "\n".join(msg_lines)
        return await send_message(chat_id, text)

    # Build a human-friendly ordered list with severity where available
    details: list[str] = []
    buttons = []
    count = 0
    for jid in order:
        try:
            job = db_client.get_request_by_id(str(jid)) or {}
        except Exception:
            job = None
        if not job:
            continue
        count += 1
        jid_label = f"SR-{job.get('id')}" if str(job.get("id")).isdigit() else str(job.get("id"))
        sev = str(job.get("severity") or job.get("final_severity") or "").title() or "-"
        details.append(f"{count}️⃣ {jid_label} — {sev}")
        maps = _maps_url_for_job(job)
        if maps:
            buttons.append([InlineKeyboardButton(f"{count} · Maps", url=maps)])

    msg_lines.append("")
    msg_lines.append("New Route Order:")
    msg_lines.extend(details)
    msg_lines.append("")
    msg_lines.append("📍 Updated route available.")

    text = "\n".join(msg_lines)

    kb = InlineKeyboardMarkup(buttons) if buttons else None
    return await send_message(chat_id, text, reply_markup=kb)


def schedule_reroute_notification_for_technician(technician_id: int | str, reason: str | None = None) -> None:
    try:
        tech = db_client.get_technician_by_id(int(technician_id)) or {}
    except Exception:
        tech = None
    _schedule_task(send_reroute_notification(tech, None, reason))


async def send_assignment_released(technician: dict | None, job: dict | None = None) -> bool:
    """Notify a technician that an assignment was released (job reassigned away)."""
    if not technician:
        return False

    chat_id = technician.get("telegram_chat_id")
    if not chat_id:
        LOGGER.info("Technician %s has no telegram_chat_id; skipping assignment released notif", technician.get("id"))
        return False

    lines = ["⚠️ Assignment Released", "", "This job has been reassigned."]
    if job:
        jid = job.get("id") or job.get("request_id") or ""
        if jid:
            jid_label = f"SR-{jid}" if str(jid).isdigit() else str(jid)
            lines.insert(1, f"Job: {jid_label}")

    text = "\n".join(lines)
    return await send_message(chat_id, text)


def schedule_assignment_released_notification(technician_id: int | str, job_id: int | str | None = None) -> None:
    try:
        tech = db_client.get_technician_by_id(int(technician_id)) or {}
    except Exception:
        tech = None

    job = None
    if job_id:
        try:
            job = db_client.get_request_by_id(str(job_id)) or None
        except Exception:
            job = None

    _schedule_task(send_assignment_released(tech, job))


async def send_reassigned_new_job(technician: dict | None, job: dict | None = None) -> bool:
    """Notify the new assigned technician about reassignment and that a new optimized route is available."""
    if not technician:
        return False

    chat_id = technician.get("telegram_chat_id")
    if not chat_id:
        LOGGER.info("Technician %s has no telegram_chat_id; skipping reassigned notif", technician.get("id"))
        return False

    lines = ["🚨 Reassigned Critical Job", "", "New optimized route available."]
    if job:
        jid = job.get("id") or job.get("request_id") or ""
        if jid:
            jid_label = f"SR-{jid}" if str(jid).isdigit() else str(jid)
            lines.insert(1, f"Job: {jid_label}")

    text = "\n".join(lines)
    return await send_message(chat_id, text)


def schedule_reassigned_notification_for_technician(technician_id: int | str, job_id: int | str | None = None) -> None:
    try:
        tech = db_client.get_technician_by_id(int(technician_id)) or {}
    except Exception:
        tech = None

    job = None
    if job_id:
        try:
            job = db_client.get_request_by_id(str(job_id)) or None
        except Exception:
            job = None

    _schedule_task(send_reassigned_new_job(tech, job))


def get_active_jobs_for_technician(technician_id: int | str) -> list[dict]:
    try:
        jobs = db_client.get_jobs_for_technician(technician_id) or []
        # Filter out completed/closed/cancelled statuses (case-insensitive)
        filtered = []
        exclude = {"completed", "cancelled", "closed"}
        seen_ids = set()
        for j in jobs:
            jid = str(j.get("id") or j.get("request_id") or "")
            if not jid or jid in seen_ids:
                continue
            seen_ids.add(jid)
            st = str(j.get("status") or "").strip().lower()
            if st in exclude:
                continue
            filtered.append(j)

        # Sort by assigned_at if present (newest first)
        def _assigned_key(x):
            a = x.get("assigned_at") or x.get("created_at")
            try:
                if isinstance(a, str):
                    from datetime import datetime
                    return datetime.fromisoformat(a)
                return a or None
            except Exception:
                return None

        filtered.sort(key=lambda z: _assigned_key(z) or 0, reverse=True)
        return filtered
    except Exception:
        LOGGER.exception("Failed to fetch active jobs for technician=%s", technician_id)
        return []


def get_active_job_summary(technician_id: int | str) -> dict:
    """Return counts for a technician's active jobs.

    Returns dict: {total, critical, delayed}
    """
    try:
        jobs = get_active_jobs_for_technician(technician_id) or []
        total = len(jobs)
        critical = 0
        delayed = 0
        for j in jobs:
            sev = str(j.get("severity") or j.get("final_severity") or "").strip().lower()
            if "critical" in sev:
                critical += 1

            # delayed if explicit delay_status or status == delayed or delay_reason present
            ds = str(j.get("delay_status") or "").strip().lower()
            st = str(j.get("status") or "").strip().lower()
            if ds == "delayed" or st == "delayed" or j.get("delay_reason"):
                delayed += 1

        return {"total": total, "critical": critical, "delayed": delayed}
    except Exception:
        LOGGER.exception("Failed to compute job summary for technician=%s", technician_id)
        return {"total": 0, "critical": 0, "delayed": 0}


def _coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    to_datetime = getattr(value, "to_datetime", None)
    if callable(to_datetime):
        try:
            return to_datetime()
        except Exception:
            return None

    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None

    return None


def _normalize_status_label(value: Any, default: str = "Unknown") -> str:
    raw = str(value or "").strip()
    if not raw:
        return default
    normalized = raw.replace("_", " ").replace("-", " ").strip()
    if not normalized:
        return default
    return normalized[0].upper() + normalized[1:]


def _latest_timestamp(values: list[Any]) -> datetime | None:
    parsed: list[datetime] = []
    for value in values:
        dt = _coerce_datetime(value)
        if dt is not None:
            parsed.append(dt)
    if not parsed:
        return None
    return max(parsed)


def get_technician_status_snapshot(technician_id: int | str) -> dict:
    """Build a Firestore-backed status snapshot for the technician dashboard."""
    technician = db_client.get_technician_by_id(int(technician_id)) or {}
    jobs = db_client.get_jobs_for_technician(technician_id) or []

    active_jobs = []
    completed_today = 0
    delayed_jobs = 0
    latest_activity: datetime | None = None

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59, microsecond=999999)

    for job in jobs:
        status = str(job.get("status") or "").strip().lower()
        job_activity = _latest_timestamp(
            [
                job.get("updated_at"),
                job.get("status_updated_at"),
                job.get("assigned_at"),
                job.get("completed_at"),
                job.get("closed_at"),
                job.get("acknowledged_at"),
                job.get("assignment_acknowledged_at"),
                job.get("en_route_at"),
                job.get("started_at"),
                job.get("arrived_at"),
                job.get("delay_updated_at"),
            ]
        )
        if job_activity and (latest_activity is None or job_activity > latest_activity):
            latest_activity = job_activity

        is_terminal = status in {"completed", "closed", "cancelled", "canceled"}
        if not is_terminal:
            active_jobs.append(job)

        completed_flag = status == "completed" or bool(job.get("completed_at")) or bool(job.get("closed_at"))
        completed_activity = _latest_timestamp(
            [
                job.get("completed_at"),
                job.get("closed_at"),
                job.get("completed_at_iso"),
                job.get("completed_timestamp"),
                job.get("status_updated_at"),
                job.get("updated_at"),
            ]
        )
        if completed_flag and completed_activity and today_start <= completed_activity <= today_end:
            completed_today += 1

        delayed_flag = (
            status == "delayed"
            or str(job.get("delay_status") or "").strip().lower() == "delayed"
            or bool(job.get("delay_reason"))
        )
        if delayed_flag and not is_terminal:
            delayed_jobs += 1

    technician_activity = _latest_timestamp(
        [
            technician.get("last_activity_at"),
            technician.get("last_seen_at"),
            technician.get("status_updated_at"),
            technician.get("updated_at"),
            technician.get("availability_updated_at"),
        ]
    )
    if technician_activity and (latest_activity is None or technician_activity > latest_activity):
        latest_activity = technician_activity

    state_value = (
        technician.get("availability_state")
        or technician.get("technician_status")
        or technician.get("current_state")
        or technician.get("state")
        or technician.get("status")
    )
    if state_value is None and technician.get("is_available") is False:
        state_value = "unavailable"

    return {
        "technician": technician,
        "active_jobs": len(active_jobs),
        "completed_today": completed_today,
        "delayed_jobs": delayed_jobs,
        "technician_state": _normalize_status_label(state_value),
        "last_activity_at": latest_activity,
    }


def _maps_url_for_job(job: dict) -> str | None:
    lat = job.get("latitude") or job.get("assigned_technician_latitude") or job.get("current_latitude")
    lon = job.get("longitude") or job.get("assigned_technician_longitude") or job.get("current_longitude")
    try:
        if lat is None or lon is None:
            return None
        return f"https://www.google.com/maps/search/?api=1&query={float(lat)},{float(lon)}"
    except Exception:
        return None


def get_todays_route(technician_id: int | str) -> list[dict]:
    """Return an ordered list of active assignments for the technician.

    Ordering preference:
      1. explicit route_sequence/route_index/sequence fields on job
      2. assigned_at
      3. created_at
    """
    # ALWAYS use backend-optimized route planner to get the latest route order.
    from dispatch_engine.route_planner import plan_technician_route

    route_snapshot = plan_technician_route(int(technician_id))
    order = route_snapshot.get("route_order") or []
    ordered_jobs: list[dict] = []
    for jid in order:
        job = db_client.get_request_by_id(str(jid)) or {}
        if not job:
            # skip missing job entries but preserve ordering integrity
            continue
        job["maps_url"] = _maps_url_for_job(job)
        ordered_jobs.append(job)

    return ordered_jobs


class TechnicianWorkflowService:
    @staticmethod
    def _load_job(job_id: str | int) -> dict:
        job = db_client.get_request_by_id(str(job_id))
        if not job:
            raise ValueError("Job not found")
        return job

    @staticmethod
    def _assert_owner(job: dict, technician_id: int | str) -> None:
        assigned = job.get("assigned_technician")
        if str(assigned or "") != str(technician_id):
            raise PermissionError("Forbidden")

    @staticmethod
    def acknowledge_assignment(job_id: str | int, technician_id: int) -> dict:
        job = TechnicianWorkflowService._load_job(job_id)
        TechnicianWorkflowService._assert_owner(job, technician_id)

        updates = {
            "assignment_acknowledged": True,
            "assignment_acknowledged_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        return job

    @staticmethod
    def set_en_route(job_id: str | int, technician_id: int) -> dict:
        job = TechnicianWorkflowService._load_job(job_id)
        TechnicianWorkflowService._assert_owner(job, technician_id)

        updates = {
            "technician_status": "on_the_way",
            "en_route_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        return job

    @staticmethod
    def start_work(job_id: str | int, technician_id: int) -> dict:
        job = TechnicianWorkflowService._load_job(job_id)
        TechnicianWorkflowService._assert_owner(job, technician_id)

        current_status = str(job.get("status") or "").lower()
        if current_status == "in_progress":
            raise ValueError("ℹ️ Job already started.\nCurrent status: In Progress.")
        if current_status == "completed":
            raise ValueError("❌ Job already completed.")
        if current_status in {"cancelled", "canceled", "closed"}:
            raise ValueError("❌ Job is cancelled and cannot be started.")
        if current_status not in {"assigned", "scheduled", "dispatched"}:
            raise ValueError("❌ Job cannot be started in its current state.")

        jobs = db_client.get_jobs_for_technician(technician_id) or []
        for other in jobs:
            if other.get("is_locked") and str(other.get("id")) != str(job_id):
                try:
                    db_client.update_service_request(str(other.get("id")), {"is_locked": False, "status": "assigned"})
                except Exception:
                    pass

        updates = {
            "status": "in_progress",
            "is_locked": True,
            "work_started_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        db_client.update_technician(technician_id, {"current_job_id": str(job_id)})
        try:
            db_client.sync_technician_job_counters_firestore(technician_id)
        except Exception:
            pass
        refreshed = db_client.get_request_by_id(str(job_id))
        return refreshed or job

    @staticmethod
    def mark_delayed(job_id: str | int, technician_id: int, reason: str) -> dict:
        job = TechnicianWorkflowService._load_job(job_id)
        TechnicianWorkflowService._assert_owner(job, technician_id)

        updates = {
            "delay_status": "delayed",
            "delay_reason": reason,
            "delay_reported_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        return job

    @staticmethod
    def complete_job(job_id: str | int, technician_id: int, note: str | None = None) -> dict:
        job = TechnicianWorkflowService._load_job(job_id)
        TechnicianWorkflowService._assert_owner(job, technician_id)

        current_status = str(job.get("status") or "").lower()
        if current_status != "in_progress":
            raise ValueError("Job must be started before completion")

        updates = {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "is_locked": False,
            "updated_at": datetime.utcnow(),
        }
        if note:
            updates["completion_note"] = note

        db_client.update_service_request(str(job_id), updates)
        db_client.update_technician(technician_id, {"current_job_id": None})
        try:
            db_client.sync_technician_job_counters_firestore(technician_id)
        except Exception:
            pass
        return job
