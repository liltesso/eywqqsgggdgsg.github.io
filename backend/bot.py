"""One-shot Telegram setup script (webhook mode).

Run ONCE after deploying the backend, or whenever PUBLIC_BASE_URL changes:

    python bot.py

It does three things via the Bot API:
  1. Registers the payment webhook -> {PUBLIC_BASE_URL}/api/telegram/webhook
     (delivers pre_checkout_query, successful_payment AND /start updates).
  2. Sets the chat menu button to open your Mini App.
  3. Prints the result.

We use webhook mode (not long-polling) because Telegram forbids running both
at once, and payments are handled by the FastAPI `/api/telegram/webhook`
route. No long-running bot process is required — FastAPI is the bot.
"""
from __future__ import annotations

import asyncio
import sys

from app.config import settings
from app.telegram import set_chat_menu_button, set_webhook

MINI_APP_URL = "https://eywqqsgggdgsg.github.io/rent.html"


async def main() -> None:
    if not settings.telegram_bot_token:
        sys.exit("TELEGRAM_BOT_TOKEN is not set in .env")
    if not settings.public_base_url:
        sys.exit("PUBLIC_BASE_URL is not set in .env")

    webhook_url = settings.public_base_url.rstrip("/") + "/api/telegram/webhook"
    await set_webhook(webhook_url, settings.telegram_webhook_secret)
    await set_chat_menu_button(MINI_APP_URL)

    print("✅ Webhook set to:", webhook_url)
    print("✅ Menu button opens:", MINI_APP_URL)
    print("Done. The FastAPI backend now receives Telegram updates.")


if __name__ == "__main__":
    asyncio.run(main())
