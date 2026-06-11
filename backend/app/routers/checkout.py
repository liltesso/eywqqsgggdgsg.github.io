"""Checkout: turn a gift selection into a payable transaction.

Two payment methods:
  * tonconnect  — return an unsigned TON tx (MRKT messages + our markup
                  message). The customer signs with their own wallet, so the
                  gift lands in THEIR Telegram. No treasury, no custody.
  * stars       — create a Telegram Stars invoice for our marked-up price.
                  Fulfilment (signing the MRKT tx from the treasury wallet)
                  happens in the webhook after `successful_payment`.
"""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, get_marketapp
from ..marketapp import (
    SECONDS_PER_DAY,
    MarketAppClient,
    MarketAppError,
    normalize_rent_item,
)
from ..blockchain.units import ton_to_nano
from ..models import OrderStatus, Transaction, User
from ..pricing import apply_markup, markup_message, rent_total, ton_to_stars
from ..schemas import (
    RentCheckoutRequest,
    RentExtendRequest,
    SaleCheckoutRequest,
    StarsCheckoutResponse,
    TonCheckoutResponse,
)
from ..telegram import create_stars_invoice_link

router = APIRouter(prefix="/api", tags=["checkout"])


def _tx_from_sendtx(sendtx: dict) -> tuple[int, list[dict]]:
    """Extract (valid_until, messages) from a MRKT SendTxSchema."""
    tx = sendtx.get("transaction", {})
    return int(tx.get("validUntil", 0)), list(tx.get("messages", []))


# ─── RENT ────────────────────────────────────────────────────────────────────

@router.post("/rent/checkout")
async def rent_checkout(
    req: RentCheckoutRequest,
    user: User = Depends(get_current_user),
    mrkt: MarketAppClient = Depends(get_marketapp),
    db: AsyncSession = Depends(get_db),
):
    # 1. Re-fetch the gift to get a fresh price_per_day (anti price-drift).
    try:
        info = await mrkt.nft_info(req.nft_address)
    except MarketAppError:
        info = {}

    # We need the nanoton price + bounds; re-list is the reliable source.
    gift = await _find_rent_gift(mrkt, req.nft_address)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift no longer available for rent")

    days = max(gift["min_duration_days"], min(req.duration_days, gift["max_duration_days"]))
    provider_total = rent_total(gift["price_per_day_ton"], days, gift["discount_per_day"])
    customer_total, markup = apply_markup(provider_total)

    payload = uuid.uuid4().hex
    is_ton = req.method == "tonconnect"
    order = Transaction(
        user_id=user.id,
        kind="rent",
        nft_address=req.nft_address,
        nft_name=gift["name"],
        duration_days=days,
        currency="TON" if is_ton else "XTR",
        provider_price=provider_total,
        markup=markup,
        our_price=customer_total,
        markup_nano=ton_to_nano(markup) if is_ton else 0,
        status=(OrderStatus.AWAITING_SIGNATURE if is_ton else OrderStatus.INVOICED).value,
        payment_method=req.method,
        invoice_payload=payload,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if req.method == "tonconnect":
        try:
            sendtx = await mrkt.rent_pay(
                req.nft_address,
                duration_seconds=days * SECONDS_PER_DAY,
                price_per_day_nano=gift["price_per_day_nano"],
            )
        except MarketAppError as e:
            raise HTTPException(status_code=502, detail=f"MarketApp error: {e.detail}")
        valid_until, messages = _tx_from_sendtx(sendtx)
        if (mm := markup_message(provider_total)):
            messages.append(mm)
        return TonCheckoutResponse(
            transaction={"valid_until": valid_until, "messages": messages},
            order_id=order.id,
            provider_price=provider_total,
            markup=markup,
            total_price=customer_total,
        )

    # Stars
    amount_stars = ton_to_stars(customer_total)
    invoice = await create_stars_invoice_link(
        title=gift["name"] or "Gift rental",
        description=f"Оренда на {days} дн.",
        payload=payload,
        amount_stars=amount_stars,
    )
    return StarsCheckoutResponse(invoice_link=invoice, order_id=order.id, amount_stars=amount_stars)


# ─── RENT: extend ───────────────────────────────────────────────────────────

@router.post("/rent/extend")
async def rent_extend(
    req: RentExtendRequest,
    user: User = Depends(get_current_user),
    mrkt: MarketAppClient = Depends(get_marketapp),
    db: AsyncSession = Depends(get_db),
):
    """Extend an existing rental by N additional days.

    Mirrors the rent flow: re-fetch fresh per-day price, build a checkout
    record and return a signable TonConnect tx or a Stars invoice.
    """
    gift = await _find_rent_gift(mrkt, req.nft_address)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift no longer rentable")

    days = req.additional_days
    provider_total = rent_total(gift["price_per_day_ton"], days, gift["discount_per_day"])
    customer_total, markup = apply_markup(provider_total)

    payload = uuid.uuid4().hex
    is_ton = req.method == "tonconnect"
    order = Transaction(
        user_id=user.id,
        kind="rent",
        nft_address=req.nft_address,
        nft_name=(gift["name"] or "") + " (extend)",
        duration_days=days,
        currency="TON" if is_ton else "XTR",
        provider_price=provider_total,
        markup=markup,
        our_price=customer_total,
        markup_nano=ton_to_nano(markup) if is_ton else 0,
        status=(OrderStatus.AWAITING_SIGNATURE if is_ton else OrderStatus.INVOICED).value,
        payment_method=req.method,
        invoice_payload=payload,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if is_ton:
        sendtx = await mrkt.rent_extend(
            req.nft_address,
            duration_seconds=days * SECONDS_PER_DAY,
            price_per_day_nano=gift["price_per_day_nano"],
        )
        valid_until, messages = _tx_from_sendtx(sendtx)
        if (mm := markup_message(provider_total)):
            messages.append(mm)
        return TonCheckoutResponse(
            transaction={"valid_until": valid_until, "messages": messages},
            order_id=order.id,
            provider_price=provider_total,
            markup=markup,
            total_price=customer_total,
        )

    amount_stars = ton_to_stars(customer_total)
    invoice = await create_stars_invoice_link(
        title=(gift["name"] or "Rent extend")[:32],
        description=f"Продовження оренди на {days} дн.",
        payload=payload,
        amount_stars=amount_stars,
    )
    return StarsCheckoutResponse(invoice_link=invoice, order_id=order.id, amount_stars=amount_stars)


# ─── SALE (buy) ──────────────────────────────────────────────────────────────

@router.post("/sale/checkout")
async def sale_checkout(
    req: SaleCheckoutRequest,
    user: User = Depends(get_current_user),
    mrkt: MarketAppClient = Depends(get_marketapp),
    db: AsyncSession = Depends(get_db),
):
    gift = await _find_sale_gift(mrkt, req.nft_address)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift no longer on sale")

    provider_price = gift["price"]
    customer_price, markup = apply_markup(provider_price)
    currency = gift["currency"]

    payload = uuid.uuid4().hex
    is_ton = req.method == "tonconnect"
    order = Transaction(
        user_id=user.id,
        kind="sale",
        nft_address=req.nft_address,
        nft_name=gift["name"],
        currency=currency if is_ton else "XTR",
        provider_price=provider_price,
        markup=markup,
        our_price=customer_price,
        markup_nano=ton_to_nano(markup) if (is_ton and currency == "TON") else 0,
        status=(OrderStatus.AWAITING_SIGNATURE if is_ton else OrderStatus.INVOICED).value,
        payment_method=req.method,
        invoice_payload=payload,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if req.method == "tonconnect":
        try:
            sendtx = await mrkt.buy_nft(
                [{"nft_address": req.nft_address, "price": provider_price, "currency": currency}]
            )
        except MarketAppError as e:
            raise HTTPException(status_code=502, detail=f"MarketApp error: {e.detail}")
        valid_until, messages = _tx_from_sendtx(sendtx)
        if currency == "TON" and (mm := markup_message(provider_price)):
            messages.append(mm)
        return TonCheckoutResponse(
            transaction={"valid_until": valid_until, "messages": messages},
            order_id=order.id,
            provider_price=provider_price,
            markup=markup,
            total_price=customer_price,
            currency=currency,
        )

    amount_stars = ton_to_stars(customer_price)
    invoice = await create_stars_invoice_link(
        title=gift["name"] or "Gift",
        description="Купівля подарунка",
        payload=payload,
        amount_stars=amount_stars,
    )
    return StarsCheckoutResponse(invoice_link=invoice, order_id=order.id, amount_stars=amount_stars)


# ─── helpers ─────────────────────────────────────────────────────────────────

async def _find_rent_gift(mrkt: MarketAppClient, nft_address: str) -> dict | None:
    """Locate a single rentable gift by address (paging through a few pages)."""
    cursor = None
    for _ in range(5):
        data = await mrkt.rent_gifts(cursor=cursor)
        for raw in data.get("items", []):
            if raw.get("nft_address") == nft_address:
                return normalize_rent_item(raw)
        cursor = data.get("cursor")
        if not cursor:
            break
    return None


async def _find_sale_gift(mrkt: MarketAppClient, nft_address: str) -> dict | None:
    from ..marketapp import normalize_sale_item

    cursor = None
    for _ in range(5):
        data = await mrkt.gifts_on_sale(cursor=cursor)
        for raw in data.get("items", []):
            if raw.get("address") == nft_address:
                return normalize_sale_item(raw)
        cursor = data.get("cursor")
        if not cursor:
            break
    return None
