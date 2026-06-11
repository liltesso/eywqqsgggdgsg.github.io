"""Telegram helpers: initData validation + Bot API calls.

`validate_init_data` implements the official WebApp data-check algorithm so we
can trust the `user_id` the Mini App sends, without a separate login.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

import httpx

from .config import settings

_BOT_API = "https://api.telegram.org/bot{token}/{method}"


def validate_init_data(init_data: str, *, max_age_seconds: int = 86_400) -> dict | None:
    """Validate Telegram WebApp initData. Returns the parsed user dict or None.

    Algorithm: secret_key = HMAC_SHA256("WebAppData", bot_token); the data-check
    string is all fields except `hash`, sorted, joined by "\\n".
    """
    if not init_data or not settings.telegram_bot_token:
        return None

    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        return None

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None

    # Optional freshness check
    auth_date = pairs.get("auth_date")
    if auth_date and auth_date.isdigit():
        if time.time() - int(auth_date) > max_age_seconds:
            return None

    data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calc_hash, received_hash):
        return None

    user_raw = pairs.get("user")
    if not user_raw:
        return None
    try:
        return json.loads(user_raw)
    except json.JSONDecodeError:
        return None


# ─── Bot API ───────────────────────────────────────────────────────────────

async def _call(method: str, payload: dict) -> dict:
    url = _BOT_API.format(token=settings.telegram_bot_token, method=method)
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=payload)
        data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram {method} failed: {data}")
    return data["result"]


async def create_stars_invoice_link(
    *, title: str, description: str, payload: str, amount_stars: int
) -> str:
    """Create a Telegram Stars invoice link (currency 'XTR', provider_token empty)."""
    result = await _call(
        "createInvoiceLink",
        {
            "title": title[:32],
            "description": description[:255],
            "payload": payload,
            "provider_token": "",
            "currency": "XTR",
            "prices": [{"label": title[:32], "amount": amount_stars}],
        },
    )
    return result  # the invoice URL string


async def answer_pre_checkout(query_id: str, ok: bool = True, error: str = "") -> None:
    payload = {"pre_checkout_query_id": query_id, "ok": ok}
    if not ok:
        payload["error_message"] = error or "Payment could not be processed."
    await _call("answerPreCheckoutQuery", payload)


async def send_message(chat_id: int, text: str) -> None:
    await _call("sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "HTML"})


async def set_webhook(url: str, secret_token: str) -> None:
    await _call(
        "setWebhook",
        {
            "url": url,
            "secret_token": secret_token,
            "allowed_updates": ["pre_checkout_query", "message"],
        },
    )


async def set_chat_menu_button(mini_app_url: str, text: str = "🎁 Магазин") -> None:
    """Make the bot's menu button open the Mini App for every chat."""
    await _call(
        "setChatMenuButton",
        {"menu_button": {"type": "web_app", "text": text, "web_app": {"url": mini_app_url}}},
    )


async def send_webapp_button(chat_id: int, mini_app_url: str, text: str) -> None:
    await _call(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [[{"text": "🎁 Відкрити магазин", "web_app": {"url": mini_app_url}}]]
            },
        },
    )
