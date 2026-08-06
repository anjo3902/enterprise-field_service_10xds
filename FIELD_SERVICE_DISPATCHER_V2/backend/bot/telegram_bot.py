from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure project root is on sys.path when running this file directly.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, MessageHandler, filters

from backend.bot.handlers.technician_handlers import handle_callback, help_command, start, text_router, my_active_jobs
from backend.bot.services.telegram_service import get_telegram_token

LOGGER = logging.getLogger(__name__)


def build_application():
    token = get_telegram_token()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")

    app = ApplicationBuilder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("myjobs", my_active_jobs))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_router))

    return app


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    try:
        app = build_application()
    except Exception as exc:
        LOGGER.error("Telegram bot startup failed: %s", exc)
        sys.exit(1)

    LOGGER.info("Telegram technician assistant started")
    app.run_polling(close_loop=False)


if __name__ == "__main__":
    main()
