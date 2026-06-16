"""Order service: business logic for the order lifecycle.

Keeps routers thin and makes the state transitions testable in isolation.
All transitions are idempotent — replaying the same event never double-fulfils
or double-charges.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..blockchain.tonapi import TonAPIClient
from ..blockchain.verifier import confirm_order, now_unix
from ..config import settings
from ..models import OrderStatus, Transaction

log = logging.getLogger(__name__)


async def get_order(db: AsyncSession, order_id: int) -> Transaction | None:
    return await db.get(Transaction, order_id)


async def get_order_by_payload(db: AsyncSession, payload: str | None) -> Transaction | None:
    if not payload:
        return None
    res = await db.execute(select(Transaction).where(Transaction.invoice_payload == payload))
    return res.scalar_one_or_none()


async def attach_signed_tx(
    db: AsyncSession, order: Transaction, *, boc: str | None, customer_wallet: str | None
) -> Transaction:
    """Record that the client signed & broadcast the TonConnect transaction.

    Idempotent: if the order already moved past SUBMITTED we leave it as is.
    """
    if order.status in (OrderStatus.CREATED.value, OrderStatus.AWAITING_SIGNATURE.value):
        order.signed_boc = boc
        order.customer_wallet = customer_wallet
        order.set_status(OrderStatus.SUBMITTED)
        await db.commit()
        await db.refresh(order)
    return order


async def try_confirm(db: AsyncSession, order: Transaction, tonapi: TonAPIClient) -> Transaction:
    """Attempt on-chain confirmation of a SUBMITTED/CONFIRMING order.

    Marks FULFILLED on success, EXPIRED once the timeout elapses, otherwise
    leaves it CONFIRMING for the next sweep. Idempotent and safe to call often.
    """
    if order.status not in (OrderStatus.SUBMITTED.value, OrderStatus.CONFIRMING.value):
        return order

    order.set_status(OrderStatus.CONFIRMING)
    order.confirm_attempts += 1

    result = await confirm_order(
        tonapi,
        kind=order.kind,
        nft_address=order.nft_address,
        customer_wallet=order.customer_wallet,
        merchant_wallet=settings.merchant_wallet or None,
        markup_nano=order.markup_nano or 0,
        created_unix=int(order.created_at.replace(tzinfo=timezone.utc).timestamp())
        if order.created_at
        else now_unix(),
        currency=order.currency,
    )
    order.confirm_reason = result.reason

    if result.confirmed:
        order.set_status(OrderStatus.FULFILLED)
        order.confirmed_at = datetime.now(timezone.utc)
        log.info("Order %s fulfilled (%s)", order.id, result.reason)
    elif _is_expired(order):
        order.set_status(OrderStatus.EXPIRED)
        log.warning("Order %s expired after %d attempts", order.id, order.confirm_attempts)

    await db.commit()
    await db.refresh(order)
    return order


def _is_expired(order: Transaction) -> bool:
    if not order.created_at:
        return False
    age = (datetime.now(timezone.utc) - order.created_at.replace(tzinfo=timezone.utc)).total_seconds()
    return age > settings.confirm_timeout


async def pending_confirmations(db: AsyncSession, limit: int = 50) -> list[Transaction]:
    res = await db.execute(
        select(Transaction)
        .where(Transaction.status.in_([OrderStatus.SUBMITTED.value, OrderStatus.CONFIRMING.value]))
        .order_by(Transaction.created_at.asc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def list_user_orders(
    db: AsyncSession, user_id: int, *, limit: int = 30, kind: str | None = None
) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if kind in ("rent", "sale"):
        stmt = stmt.where(Transaction.kind == kind)
    stmt = stmt.order_by(Transaction.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def cancel_order(db: AsyncSession, order: Transaction) -> Transaction:
    """Mark a pre-payment order as failed. Idempotent.

    Only orders that haven't been submitted on-chain or paid in Stars can be
    cancelled; everything else needs the on-chain or refund flow.
    """
    if order.status in (
        OrderStatus.CREATED.value,
        OrderStatus.AWAITING_SIGNATURE.value,
        OrderStatus.INVOICED.value,
    ):
        order.set_status(OrderStatus.FAILED)
        order.confirm_reason = "cancelled_by_user"
        await db.commit()
        await db.refresh(order)
    return order


def can_cancel(order: Transaction) -> bool:
    return order.status in (
        OrderStatus.CREATED.value,
        OrderStatus.AWAITING_SIGNATURE.value,
        OrderStatus.INVOICED.value,
    )
