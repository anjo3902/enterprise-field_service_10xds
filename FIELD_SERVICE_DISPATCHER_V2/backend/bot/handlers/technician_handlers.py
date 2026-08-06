from __future__ import annotations

import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from backend.bot.keyboards.technician_keyboard import build_delay_reason_keyboard
from backend.bot.keyboards.technician_keyboard import build_main_menu
from backend.bot.services.telegram_service import TechnicianWorkflowService
from backend.bot.services.telegram_service import get_active_jobs_for_technician, format_job_summary, get_active_job_summary, get_todays_route, get_technician_status_snapshot
from backend.bot.utils import auth_utils
from database import db_client
import os
import secrets
from datetime import datetime
from urllib.parse import urlparse

LOGGER = logging.getLogger(__name__)


def _is_localhost_host(hostname: str | None) -> bool:
    host = str(hostname or "").strip().lower()
    return host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local")


def _resolve_frontend_base_url() -> str | None:
    raw = str(os.getenv("FRONTEND_BASE_URL", "")).strip()
    if not raw:
        return None
    base = raw.rstrip("/")
    parsed = urlparse(base)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    if _is_localhost_host(parsed.hostname):
        return None
    return base


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return
    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if linked:
        name = linked.get("name") or "Technician"
        # Fetch operational counts from Firestore
        try:
            summary = await asyncio.to_thread(get_active_job_summary, int(linked.get("id")))
        except Exception:
            summary = {"total": 0, "critical": 0, "delayed": 0}

        msg = (
            f"Welcome back, {name} 👋\n\n"
            f"📋 Active Jobs Today: {summary.get('total', 0)}\n"
            f"🚨 Critical Jobs: {summary.get('critical', 0)}\n"
            f"⏳ Delayed Jobs: {summary.get('delayed', 0)}\n\n"
            "Choose an option below."
        )

        await update.message.reply_text(msg, reply_markup=build_main_menu())
        return

    # Not linked: prompt for employee id but still show the main menu for discovery
    context.user_data["awaiting_employee_id"] = True
    await update.message.reply_text(
        "Welcome. Please send your technician code or employee ID to link your account.",
        reply_markup=build_main_menu(),
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Choose an option from the menu below.",
        reply_markup=build_main_menu(),
    )


async def text_router(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return

    text = (update.message.text or "").strip()
    if not text:
        return

    if context.user_data.get("awaiting_employee_id"):
        await _handle_employee_id(update, context, text)
        return

    pending_delay = context.user_data.get("pending_delay_job_id")
    if pending_delay:
        await _handle_delay_reason(update, context, pending_delay, text)
        return
    pending_reassign = context.user_data.get("pending_reassign_job_id")
    if pending_reassign:
        await _handle_reassign_reason(update, context, pending_reassign, text)
        return

    t = text.lower()
    if t == "help" or t == "/help":
        await help_command(update, context)
        return

    if "my active jobs" in t or t.startswith("📋") or t.replace(" ", "") == "myjobs" or t == "/myjobs":
        await my_active_jobs(update, context)
        return

    if "route" in t or t.startswith("📍"):
        await my_route(update, context)
        return

    if "status" in t or t.startswith("📊"):
        await my_status(update, context)
        return

    # Default: show the persistent menu rather than asking to type commands
    await update.message.reply_text("Please choose an option from the menu below.", reply_markup=build_main_menu())


async def my_active_jobs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await update.message.reply_text("Please link your technician account with /start.")
        return

    technician_id = int(linked.get("id"))

    try:
        jobs = await asyncio.to_thread(get_active_jobs_for_technician, technician_id)
        if not jobs:
            await update.message.reply_text("You have no active jobs at the moment.")
            return

        # Send a summary message per job with the standard action keyboard
        for job in jobs:
            job_text = format_job_summary(job)
            job_id = job.get("id") or job.get("request_id") or ""
            latitude = job.get("latitude")
            longitude = job.get("longitude")
            keyboard = build_delay_reason_keyboard(job_id) if False else None
            # Use assignment keyboard for actions
            from backend.bot.keyboards.technician_keyboard import build_assignment_keyboard
            kb = build_assignment_keyboard(
                str(job_id),
                latitude,
                longitude,
                str(linked.get("id")),
                job.get("status"),
            )
            await update.message.reply_text(job_text, reply_markup=kb)

    except Exception:
        LOGGER.exception("Failed to fetch or send active jobs")
        await update.message.reply_text("Unable to fetch active jobs. Try again later.")


async def my_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await update.message.reply_text("Please link your technician account with /start.", reply_markup=build_main_menu())
        return

    technician_id = int(linked.get("id"))

    try:
        snapshot = await asyncio.to_thread(get_technician_status_snapshot, technician_id)
    except Exception:
        LOGGER.exception("Failed to fetch technician status snapshot")
        snapshot = {
            "technician": linked,
            "active_jobs": 0,
            "completed_today": 0,
            "delayed_jobs": 0,
            "technician_state": "Unknown",
            "last_activity_at": None,
        }

    tech = snapshot.get("technician") or linked
    name = tech.get("name") or "Technician"
    last_activity_at = snapshot.get("last_activity_at")
    if last_activity_at:
        try:
            last_activity_text = last_activity_at.astimezone().strftime("%d %b %Y, %H:%M")
        except Exception:
            last_activity_text = str(last_activity_at)
    else:
        last_activity_text = "No recent activity"

    msg = (
        f"📊 My Status\n"
        f"{name}\n\n"
        f"✅ Active jobs: {snapshot.get('active_jobs', 0)}\n"
        f"🟢 Completed today: {snapshot.get('completed_today', 0)}\n"
        f"⏳ Delayed jobs: {snapshot.get('delayed_jobs', 0)}\n"
        f"🧭 Current state: {snapshot.get('technician_state') or 'Unknown'}\n"
        f"🕒 Last activity: {last_activity_text}"
    )

    await update.message.reply_text(msg, reply_markup=build_main_menu())


async def my_route(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await update.message.reply_text("Please link your technician account with /start.", reply_markup=build_main_menu())
        return

    technician_id = int(linked.get("id"))

    try:
        jobs = await asyncio.to_thread(get_todays_route, technician_id)
        if not jobs:
            await update.message.reply_text("You have no active route for today.", reply_markup=build_main_menu())
            return

        # Build ordered list text
        header = f"📍 Today's Route — {len(jobs)} stops\n\n"
        lines = []
        buttons = []
        idx = 1
        for j in jobs:
            job_id = j.get("id") or j.get("request_id") or ""
            label = f"SR-{job_id}" if str(job_id).isdigit() else str(job_id)
            loc = str(j.get("location_text") or j.get("latitude") or j.get("longitude") or "Unknown location")
            fault = str(j.get("fault_type") or "").strip() or "-"
            lines.append(f"{idx}. {label} — {loc} — {fault}")

            maps = j.get("maps_url")
            if maps:
                buttons.append([InlineKeyboardButton(f"{idx} · Maps", url=maps)])

            idx += 1

        text = header + "\n".join(lines)
        kb = InlineKeyboardMarkup(buttons) if buttons else None
        await update.message.reply_text(text, reply_markup=kb or build_main_menu())

    except Exception:
        LOGGER.exception("Failed to build today's route")
        await update.message.reply_text("Unable to fetch route. Try again later.", reply_markup=build_main_menu())


async def _handle_employee_id(update: Update, context: ContextTypes.DEFAULT_TYPE, employee_id: str) -> None:
    tech = auth_utils.resolve_technician_by_employee_id(employee_id)
    if not tech:
        await update.message.reply_text(
            "Technician code not found. Please re-check and send again."
        )
        return

    try:
        linked = auth_utils.link_chat_to_technician(
            technician_id=int(tech.get("id")),
            chat_id=update.effective_chat.id,
            username=update.effective_user.username if update.effective_user else None,
            first_name=update.effective_user.first_name if update.effective_user else None,
            last_name=update.effective_user.last_name if update.effective_user else None,
        )
    except ValueError as exc:
        await update.message.reply_text(str(exc))
        return

    context.user_data["awaiting_employee_id"] = False
    name = linked.get("name") or "Technician"
    await update.message.reply_text(
        f"Linked successfully. Welcome, {name}."
    )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.data:
        return

    await query.answer()

    chat_id = query.message.chat.id if query.message and query.message.chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await query.message.reply_text("Please link your technician account with /start.")
        return

    technician_id = int(linked.get("id"))
    data = query.data

    if data.startswith("delay_reason:"):
        await _handle_delay_reason_callback(query, context, technician_id, data)
        return
    if data.startswith("reassign_reason:"):
        await _handle_reassign_reason_callback(query, context, technician_id, data)
        return

    try:
        action, job_id = data.split(":", 1)
    except ValueError:
        await query.message.reply_text("Invalid action.")
        return

    if not job_id:
        await query.message.reply_text("Invalid job reference.")
        return

    if action == "noop":
        return

    try:
        if action == "ack":
            await asyncio.to_thread(TechnicianWorkflowService.acknowledge_assignment, job_id, technician_id)
            await query.message.reply_text("Assignment acknowledged.")
        elif action == "enroute":
            await asyncio.to_thread(TechnicianWorkflowService.set_en_route, job_id, technician_id)
            await query.message.reply_text("Marked as on the way.")
        elif action == "start":
            updated_job = None
            try:
                updated_job = await asyncio.to_thread(TechnicianWorkflowService.start_work, job_id, technician_id)
                await query.message.reply_text("Work started successfully.")
            except ValueError as exc:
                await query.message.reply_text(str(exc))

            if updated_job is None:
                try:
                    updated_job = db_client.get_request_by_id(str(job_id)) or None
                except Exception:
                    updated_job = None

            if updated_job:
                try:
                    from backend.bot.keyboards.technician_keyboard import build_assignment_keyboard

                    kb = build_assignment_keyboard(
                        str(job_id),
                        updated_job.get("latitude"),
                        updated_job.get("longitude"),
                        str(technician_id),
                        updated_job.get("status"),
                    )
                    await query.message.edit_reply_markup(reply_markup=kb)
                except Exception:
                    pass
            return
        elif action == "view":
            # Fetch canonical job details and show to technician
            job = db_client.get_request_by_id(str(job_id)) or {}
            if not job:
                await query.message.reply_text("Job not found.")
            else:
                text = format_job_summary(job)
                # Add short details
                extras = []
                desc = job.get("description")
                if desc:
                    extras.append(f"\nDescription: {desc}")
                cust = job.get("customer_name")
                if cust:
                    extras.append(f"Customer: {cust}")
                await query.message.reply_text(text + "\n" + "\n".join(extras))
        elif action == "previsit":
            # Attempt AI-generated previsit; fall back to terse summary
            job = db_client.get_request_by_id(str(job_id)) or None
            if not job:
                await query.message.reply_text("Job not found")
            else:
                try:
                    from config.gcp_config import gemini_model, GEMINI_INIT_ERROR
                    if GEMINI_INIT_ERROR or gemini_model is None:
                        raise RuntimeError("LLM not configured")
                    fault_type = job.get("fault_type") or ""
                    description = job.get("description") or ""
                    location = job.get("location_text") or ""
                    customer_notes = job.get("customer_notes") or job.get("review_notes") or ""
                    previous_similar = []
                    try:
                        db = db_client._get_db()
                        for doc in db.collection("service_requests").where("fault_type", "==", fault_type).limit(3).stream():
                            raw = doc.to_dict() or {}
                            if str(raw.get("id") or "") == str(job_id):
                                continue
                            previous_similar.append(str(raw.get("fault_type") or "") + " - " + str(raw.get("description") or ""))
                    except Exception:
                        previous_similar = []

                    prompt = (
                        "You are a senior field technician.\n\nGenerate a STRICT structured previsit briefing for the technician.\n\n"
                        f"Fault Type: {fault_type}\n"
                        f"Description: {description}\n"
                        f"Location: {location}\n"
                        f"Customer Notes: {customer_notes}\n"
                        f"Previous Similar: {previous_similar}\n"
                    )
                    resp = await asyncio.to_thread(gemini_model.generate_content, prompt)
                    report_text = getattr(resp, "text", None) or str(resp)
                    await query.message.reply_text(f"Previsit Report:\n\n{report_text}")
                except Exception:
                    # Fallback summary
                    summary = f"Previsit summary:\nFault: {job.get('fault_type') or '-'}\nDescription: {job.get('description') or '-'}\nBring basic tools and PPE."
                    await query.message.reply_text(summary)
        elif action == "reassign":
            job = db_client.get_request_by_id(str(job_id)) or None
            if not job:
                await query.message.reply_text("Job not found.")
                return
            assigned = job.get("assigned_technician")
            if str(assigned or "") != str(technician_id):
                await query.message.reply_text("This job is not assigned to you.")
                return

            status = str(job.get("status") or "").strip().lower()
            if status == "in_progress":
                await query.message.reply_text("Reassignment is not allowed after work has started.")
                return
            if status in {"completed", "cancelled", "canceled", "closed", "failed"}:
                await query.message.reply_text("Cannot request reassignment for a closed job.")
                return
            if status not in {"assigned", "scheduled", "dispatched"}:
                await query.message.reply_text("Reassignment is only allowed before work starts.")
                return

            # Offer reason choices via inline keyboard
            reasons = [
                ("Emergency / unavailable", "emergency_unavailable"),
                ("Route overload", "route_overload"),
                ("Vehicle issue", "vehicle_issue"),
                ("Customer reschedule", "customer_reschedule"),
                ("Skill mismatch", "skill_mismatch"),
                ("Safety issue", "safety_issue"),
                ("Time constraint", "time_constraint"),
            ]
            buttons = [[InlineKeyboardButton(label, callback_data=f"reassign_reason:{val}:{job_id}")] for (label, val) in reasons]
            buttons.append([InlineKeyboardButton("Other", callback_data=f"reassign_reason:other:{job_id}")])
            await query.message.reply_text("Select a reassignment reason:", reply_markup=InlineKeyboardMarkup(buttons))
        elif action == "reassign_reason":
            await query.message.reply_text("Invalid reassignment flow. Please retry.")
        elif action == "open_ws":
            # Create a short-lived auth token and send a deep-link to frontend
            job = db_client.get_request_by_id(str(job_id)) or None
            if not job:
                await query.message.reply_text("Job not found.")
                return
            assigned = job.get("assigned_technician")
            if str(assigned or "") != str(technician_id):
                await query.message.reply_text("This job is not assigned to you.")
                return

            base = _resolve_frontend_base_url()
            if not base:
                await query.message.reply_text(
                    "Workspace link is not configured. Please contact your admin to set FRONTEND_BASE_URL."
                )
                return

            user = db_client.get_user_by_technician_id(technician_id) or {}
            if not user:
                await query.message.reply_text("Technician account is not linked to a user profile.")
                return

            token = secrets.token_urlsafe(48)
            try:
                ttl_seconds = int(os.getenv("TELEGRAM_WORKSPACE_TOKEN_TTL_SECONDS", "300") or "300")
            except ValueError:
                ttl_seconds = 300
            try:
                db_client.create_workspace_token(token, int(user.get("id")), str(job_id), ttl_seconds)
            except Exception:
                await query.message.reply_text("Unable to generate workspace link. Please retry.")
                return

            url = f"{base}/technician/jobs/{job_id}?token={token}"
            button = InlineKeyboardButton("📂 Open Technician Workspace", url=url)
            await query.message.reply_text(
                "Tap to open your assigned job in the Technician Workspace:",
                reply_markup=InlineKeyboardMarkup([[button]]),
                disable_web_page_preview=True,
            )
        elif action == "delay":
            context.user_data["pending_delay_job_id"] = job_id
            await query.message.reply_text(
                "Select a delay reason or reply with a short note.",
                reply_markup=build_delay_reason_keyboard(job_id),
            )
        elif action == "complete":
            await asyncio.to_thread(TechnicianWorkflowService.complete_job, job_id, technician_id)
            await query.message.reply_text("Job marked as completed.")
        else:
            await query.message.reply_text("Unsupported action.")
    except PermissionError:
        await query.message.reply_text("This job is not assigned to you.")
    except ValueError as exc:
        await query.message.reply_text(str(exc))
    except Exception:
        LOGGER.exception("Callback handler failed")
        await query.message.reply_text("Unable to update status. Please try again.")


async def _handle_delay_reason_callback(query, context: ContextTypes.DEFAULT_TYPE, technician_id: int, data: str) -> None:
    parts = data.split(":", 2)
    if len(parts) != 3:
        await query.message.reply_text("Invalid delay option.")
        return

    _, reason_key, job_id = parts
    if reason_key == "other":
        context.user_data["pending_delay_job_id"] = job_id
        await query.message.reply_text("Please reply with the delay reason.")
        return

    reason_map = {
        "traffic": "Traffic",
        "parts": "Waiting for parts",
        "access": "Access issue",
    }
    reason = reason_map.get(reason_key, "Delayed")

    try:
        await asyncio.to_thread(TechnicianWorkflowService.mark_delayed, job_id, technician_id, reason)
        await query.message.reply_text("Delay noted and synced.")
    except PermissionError:
        await query.message.reply_text("This job is not assigned to you.")
    except Exception:
        LOGGER.exception("Delay callback failed")
        await query.message.reply_text("Unable to record delay.")


async def _handle_reassign_reason_callback(query, context: ContextTypes.DEFAULT_TYPE, technician_id: int, data: str) -> None:
    parts = data.split(":", 2)
    if len(parts) != 3:
        await query.message.reply_text("Invalid reassignment option.")
        return

    _, reason_key, job_id = parts
    if reason_key == "other":
        context.user_data["pending_reassign_job_id"] = job_id
        await query.message.reply_text("Please reply with a short reassignment reason.")
        return

    reason = reason_key

    # Minimal implementation: mark reassignment requested on the job and write an audit log.
    try:
        job = db_client.get_request_by_id(str(job_id))
        if not job:
            await query.message.reply_text("Job not found.")
            return
        assigned = job.get("assigned_technician")
        if str(assigned or "") != str(technician_id):
            await query.message.reply_text("This job is not assigned to you.")
            return

        status = str(job.get("status") or "").strip().lower()
        if status == "in_progress":
            await query.message.reply_text("Reassignment is not allowed after work has started.")
            return
        if status in {"completed", "cancelled", "canceled", "closed", "failed"}:
            await query.message.reply_text("Cannot request reassignment for a closed job.")
            return
        if status not in {"assigned", "scheduled", "dispatched"}:
            await query.message.reply_text("Reassignment is only allowed before work starts.")
            return

        updates = {
            "reassignment_requested": True,
            "reassignment_reason": reason,
            "reassignment_requested_by": int(technician_id),
            "reassignment_requested_at": datetime.utcnow(),
            "reassignment_status": "requested",
            "previous_technician": int(technician_id),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        try:
            db_client.create_dispatch_audit_log(
                {
                    "event_type": "reassignment_requested",
                    "request_id": str(job_id),
                    "technician_id": int(technician_id),
                    "previous_technician": int(technician_id),
                    "reason": reason,
                    "reassignment_state": "requested",
                    "timestamp": datetime.utcnow(),
                    "notes": None,
                }
            )
        except Exception:
            LOGGER.exception("Failed to write reassignment audit log for request=%s", job_id)

        await query.message.reply_text("Reassignment request submitted for admin approval.")
    except PermissionError:
        await query.message.reply_text("This job is not assigned to you.")
    except Exception:
        LOGGER.exception("Reassignment callback failed")
        await query.message.reply_text("Unable to request reassignment.")


async def _handle_delay_reason(update: Update, context: ContextTypes.DEFAULT_TYPE, job_id: str, reason: str) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await update.message.reply_text("Please link your technician account with /start.")
        return

    technician_id = int(linked.get("id"))
    try:
        await asyncio.to_thread(TechnicianWorkflowService.mark_delayed, job_id, technician_id, reason)
        await update.message.reply_text("Delay noted and synced.")
        context.user_data.pop("pending_delay_job_id", None)
    except PermissionError:
        await update.message.reply_text("This job is not assigned to you.")
    except Exception:
        LOGGER.exception("Delay reason update failed")
        await update.message.reply_text("Unable to record delay.")


async def _handle_reassign_reason(update: Update, context: ContextTypes.DEFAULT_TYPE, job_id: str, reason: str) -> None:
    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is None:
        return

    linked = auth_utils.get_technician_by_chat_id(chat_id)
    if not linked:
        await update.message.reply_text("Please link your technician account with /start.")
        return

    technician_id = int(linked.get("id"))
    try:
        job = db_client.get_request_by_id(str(job_id))
        if not job:
            await update.message.reply_text("Job not found.")
            context.user_data.pop("pending_reassign_job_id", None)
            return
        assigned = job.get("assigned_technician")
        if str(assigned or "") != str(technician_id):
            await update.message.reply_text("This job is not assigned to you.")
            context.user_data.pop("pending_reassign_job_id", None)
            return

        status = str(job.get("status") or "").strip().lower()
        if status == "in_progress":
            await update.message.reply_text("Reassignment is not allowed after work has started.")
            context.user_data.pop("pending_reassign_job_id", None)
            return
        if status in {"completed", "cancelled", "canceled", "closed", "failed"}:
            await update.message.reply_text("Cannot request reassignment for a closed job.")
            context.user_data.pop("pending_reassign_job_id", None)
            return
        if status not in {"assigned", "scheduled", "dispatched"}:
            await update.message.reply_text("Reassignment is only allowed before work starts.")
            context.user_data.pop("pending_reassign_job_id", None)
            return

        updates = {
            "reassignment_requested": True,
            "reassignment_reason": reason,
            "reassignment_requested_by": int(technician_id),
            "reassignment_requested_at": datetime.utcnow(),
            "reassignment_status": "requested",
            "previous_technician": int(technician_id),
            "updated_at": datetime.utcnow(),
        }
        db_client.update_service_request(str(job_id), updates)
        try:
            db_client.create_dispatch_audit_log(
                {
                    "event_type": "reassignment_requested",
                    "request_id": str(job_id),
                    "technician_id": int(technician_id),
                    "previous_technician": int(technician_id),
                    "reason": reason,
                    "reassignment_state": "requested",
                    "timestamp": datetime.utcnow(),
                    "notes": None,
                }
            )
        except Exception:
            LOGGER.exception("Failed to write reassignment audit log for request=%s", job_id)

        await update.message.reply_text("Reassignment request submitted for admin approval.")
        context.user_data.pop("pending_reassign_job_id", None)
    except PermissionError:
        await update.message.reply_text("This job is not assigned to you.")
    except Exception:
        LOGGER.exception("Reassignment reason update failed")
        await update.message.reply_text("Unable to request reassignment.")
