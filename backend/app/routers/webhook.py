"""Telegram webhook: pre-checkout approval + Stars payment fulfilment.

For the Stars path, fulfilment means signing & broadcasting the MRKT
transaction from the treasury wallet (see app/blockchain/wallet.py). That
requires custody and TON funds; if the treasury isn't configured the order is
marked `paid_unfulfilled` and flagged for manual handling, so no money is lost
silently.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_marketapp
from ..marketapp import SECONDS_PER_DAY, MarketAppClient
from ..models import OrderStatus, Transaction
from ..services.orders import get_order_by_payload
from ..telegram import answer_pre_checkout, send_message, send_webapp_button

router = APIRouter(prefix="/api", tags=["webhook"])

# Public URL of the deployed Mini App (rent.html).
MINI_APP_URL = "https://eywqqsgggdgsg.github.io/rent.html"


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
    mrkt: MarketAppClient = Depends(get_marketapp),
):
    # Verify the call really comes from Telegram.
    if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=403, detail="Bad webhook secret")

    update = await request.json()

    # 1. Pre-checkout: approve quickly (Telegram requires a reply <10s).
    if pre := update.get("pre_checkout_query"):
        payload = pre.get("invoice_payload")
        order = await get_order_by_payload(db, payload)
        ok = order is not None and order.status == OrderStatus.INVOICED.value
        await answer_pre_checkout(pre["id"], ok=ok, error="" if ok else "Order expired")
        return {"ok": True}

    message = update.get("message") or {}

    # 2. /start -> open the Mini App.
    if (message.get("text") or "").startswith("/start"):
        await send_webapp_button(
            message["chat"]["id"],
            MINI_APP_URL,
            "<b>Merchant Partners</b> — оренда та купівля Telegram-подарунків.\n\n"
            "Тисни кнопку нижче, щоб відкрити вітрину 👇",
        )
        return {"ok": True}

    # 3. Successful payment.
    if sp := message.get("successful_payment"):
        payload = sp.get("invoice_payload")
        order = await get_order_by_payload(db, payload)
        if order and order.status == OrderStatus.INVOICED.value:
            order.set_status(OrderStatus.PAID)
            await db.commit()
            await _fulfil_stars_order(db, mrkt, order, chat_id=message["chat"]["id"])
        return {"ok": True}

    return {"ok": True}


async def _fulfil_stars_order(
    db: AsyncSession, mrkt: MarketAppClient, order: Transaction, *, chat_id: int
) -> None:
    """Execute the MRKT action for a Stars-paid order via the treasury wallet."""
    try:
        from ..blockchain.wallet import sign_and_send, treasury_available
    except Exception:  # noqa: BLE001
        treasury_available = lambda: False  # noqa: E731
        sign_and_send = None

    if not treasury_available():
        order.set_status(OrderStatus.PAID_UNFULFILLED)
        await db.commit()
        await send_message(
            chat_id,
            "✅ Оплату отримано. Видача подарунка обробляється вручну — "
            "ми зв'яжемося з вами найближчим часом.",
        )
        return

    # Build the MRKT transaction, then sign from treasury.
    if order.kind == "rent":
        gift = await _refresh_rent(mrkt, order.nft_address)
        sendtx = await mrkt.rent_pay(
            order.nft_address,
            duration_seconds=(order.duration_days or 1) * SECONDS_PER_DAY,
            price_per_day_nano=gift["price_per_day_nano"] if gift else "0",
        )
    else:
        sendtx = await mrkt.buy_nft(
            [{"nft_address": order.nft_address, "price": order.provider_price, "currency": "TON"}]
        )

    tx_hash = await sign_and_send(sendtx)
    order.set_status(OrderStatus.FULFILLED)
    order.tx_hash = tx_hash
    await db.commit()
    await send_message(chat_id, "🎉 Готово! Подарунок видано. Перевірте свій гаманець / Telegram.")


async def _refresh_rent(mrkt: MarketAppClient, nft_address: str) -> dict | None:
    from ..marketapp import normalize_rent_item

    data = await mrkt.rent_gifts()
    for raw in data.get("items", []):
        if raw.get("nft_address") == nft_address:
            return normalize_rent_item(raw)
    return None
