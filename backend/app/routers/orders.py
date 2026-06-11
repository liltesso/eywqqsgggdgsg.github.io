"""Order status & TonConnect confirmation endpoints.

Flow for a TonConnect payment:
  1. POST /api/rent|sale/checkout  -> order_id + unsigned tx
  2. client signs with its wallet, gets a `boc`
  3. POST /api/orders/{id}/confirm {boc, wallet_address}  -> status: submitted
  4. client polls GET /api/orders/{id} until status == fulfilled (or expired)

Step 4 is what makes "paid" honest: we only report success once the asset is
verified on-chain by the background worker (or an inline first check).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user, get_tonapi
from ..models import OrderStatus, Transaction, User
from ..services.orders import (
    attach_signed_tx,
    can_cancel,
    cancel_order,
    get_order,
    list_user_orders,
    try_confirm,
)

router = APIRouter(prefix="/api/orders", tags=["orders"])


class ConfirmRequest(BaseModel):
    boc: str | None = None
    wallet_address: str | None = None


class OrderStatusOut(BaseModel):
    order_id: int
    kind: str
    nft_address: str
    nft_name: str | None
    status: str
    is_terminal: bool
    can_cancel: bool
    duration_days: int | None
    our_price: float
    currency: str
    payment_method: str
    tx_hash: str | None
    confirm_reason: str | None
    created_at: str | None


def _to_out(o: Transaction) -> OrderStatusOut:
    return OrderStatusOut(
        order_id=o.id,
        kind=o.kind,
        nft_address=o.nft_address,
        nft_name=o.nft_name,
        status=o.status,
        is_terminal=OrderStatus(o.status).is_terminal,
        can_cancel=can_cancel(o),
        duration_days=o.duration_days,
        our_price=o.our_price,
        currency=o.currency,
        payment_method=o.payment_method,
        tx_hash=o.tx_hash,
        confirm_reason=o.confirm_reason,
        created_at=o.created_at.isoformat() if o.created_at else None,
    )


def _ensure_owner(order: Transaction | None, user: User) -> Transaction:
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    return order


@router.get("", response_model=list[OrderStatusOut])
async def list_my_orders(
    kind: str | None = None,
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the calling user's recent orders, newest first."""
    orders = await list_user_orders(db, user.id, kind=kind, limit=min(max(1, limit), 100))
    return [_to_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderStatusOut)
async def order_status(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = _ensure_owner(await get_order(db, order_id), user)
    return _to_out(order)


@router.post("/{order_id}/cancel", response_model=OrderStatusOut)
async def cancel_my_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = _ensure_owner(await get_order(db, order_id), user)
    if not can_cancel(order):
        raise HTTPException(status_code=409, detail="Order can no longer be cancelled")
    order = await cancel_order(db, order)
    return _to_out(order)


@router.post("/{order_id}/confirm", response_model=OrderStatusOut)
async def confirm_order_endpoint(
    order_id: int,
    req: ConfirmRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    tonapi=Depends(get_tonapi),
):
    order = _ensure_owner(await get_order(db, order_id), user)

    # Record the signed transaction & customer wallet (idempotent).
    order = await attach_signed_tx(
        db, order, boc=req.boc, customer_wallet=req.wallet_address
    )
    if order.customer_wallet and not user.ton_wallet:
        user.ton_wallet = order.customer_wallet
        await db.commit()

    # Try an immediate confirmation; the worker keeps retrying afterwards.
    order = await try_confirm(db, order, tonapi)
    return _to_out(order)
