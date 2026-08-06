from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup


def _google_maps_url(latitude: float | None, longitude: float | None) -> str | None:
    if latitude is None or longitude is None:
        return None
    # Use the simple q=lat,lng format which works reliably on mobile and Telegram
    return f"https://www.google.com/maps?q={latitude},{longitude}"


def build_assignment_keyboard(
    job_id: str,
    latitude: float | None,
    longitude: float | None,
    technician_id: str | None = None,
    status: str | None = None,
) -> InlineKeyboardMarkup:
    """Build an action keyboard for an assignment.

    Buttons required by enterprise workflow:
      - View Details (callback)
      - Prepare Visit (AI) (callback)
      - Start Job (callback)
      - Mark Complete (callback)
      - Request Reassignment (callback)
      - Maps (url)
      - Open Technician Workspace (callback -> will generate deep link)
    """
    rows = []
    maps_url = _google_maps_url(latitude, longitude)
    if maps_url:
        rows.append([InlineKeyboardButton("📍 Maps", url=maps_url)])

    # First action row: Details, Previsit (AI), Open Workspace
    rows.append([
        InlineKeyboardButton("🔎 View Details", callback_data=f"view:{job_id}"),
        InlineKeyboardButton("🤖 Prepare Visit (AI)", callback_data=f"previsit:{job_id}"),
        InlineKeyboardButton("🗂️ Open Workspace", callback_data=f"open_ws:{job_id}"),
    ])

    status_value = str(status or "").strip().lower()
    allow_reassign = status_value in {"assigned", "scheduled", "dispatched"}
    allow_start = status_value in {"assigned", "scheduled", "dispatched"}

    # Second row: Start (if eligible), Request Reassignment (if eligible), Complete
    action_row = []
    if allow_start:
        action_row.append(InlineKeyboardButton("▶️ Start Job", callback_data=f"start:{job_id}"))
    elif status_value == "in_progress":
        action_row.append(InlineKeyboardButton("⏳ In Progress", callback_data="noop"))
    elif status_value in {"completed"}:
        action_row.append(InlineKeyboardButton("✅ Completed", callback_data="noop"))
    elif status_value in {"cancelled", "canceled", "closed"}:
        action_row.append(InlineKeyboardButton("🚫 Cancelled", callback_data="noop"))

    if allow_reassign:
        action_row.append(InlineKeyboardButton("🔁 Request Reassignment", callback_data=f"reassign:{job_id}"))
    action_row.append(InlineKeyboardButton("✅ Mark Complete", callback_data=f"complete:{job_id}"))
    rows.append(action_row)

    return InlineKeyboardMarkup(rows)


def build_delay_reason_keyboard(job_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Traffic", callback_data=f"delay_reason:traffic:{job_id}")],
        [InlineKeyboardButton("Parts", callback_data=f"delay_reason:parts:{job_id}")],
        [InlineKeyboardButton("Access Issue", callback_data=f"delay_reason:access:{job_id}")],
        [InlineKeyboardButton("Other", callback_data=f"delay_reason:other:{job_id}")],
    ])


def build_main_menu() -> ReplyKeyboardMarkup:
    buttons = [["📋 My Active Jobs"], ["📍 Today's Route"], ["📊 My Status"]]
    return ReplyKeyboardMarkup(buttons, resize_keyboard=True, one_time_keyboard=False)
