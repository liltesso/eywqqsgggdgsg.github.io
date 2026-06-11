"""Database models.

Lightweight by design: we record finances, bindings and the on-chain
confirmation trail. MarketApp owns NFT custody and the native rental timer —
we do NOT track expiry ourselves; we DO track that each order actually settled
on TON before calling it fulfilled.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class OrderStatus(str, Enum):
    """State machine for an order.

    created ─▶ awaiting_signature ─▶ submitted ─▶ confirming ─▶ fulfilled
                                                         │
                                                         └─▶ failed / expired
    Stars path:
    created ─▶ invoiced ─▶ paid ─▶ fulfilled | paid_unfulfilled
    """

    CREATED = "created"
    AWAITING_SIGNATURE = "awaiting_signature"   # TonConnect tx returned to client
    INVOICED = "invoiced"                        # Stars invoice issued
    SUBMITTED = "submitted"                      # client sent the signed BOC
    CONFIRMING = "confirming"                    # being verified on-chain
    PAID = "paid"                                # Stars payment received
    FULFILLED = "fulfilled"                      # asset delivered & verified
    PAID_UNFULFILLED = "paid_unfulfilled"        # Stars paid, manual delivery
    FAILED = "failed"
    EXPIRED = "expired"

    @property
    def is_terminal(self) -> bool:
        return self in {
            OrderStatus.FULFILLED,
            OrderStatus.FAILED,
            OrderStatus.EXPIRED,
            OrderStatus.PAID_UNFULFILLED,
        }


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ton_wallet: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")


class Transaction(Base):
    """One financial + on-chain record per order.

    `provider_price` is what the transaction pays MarketApp; `our_price` is what
    the customer pays us; `markup` is the spread (our profit).
    """

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)

    # What was ordered
    kind: Mapped[str] = mapped_column(String(16))             # "rent" | "sale"
    nft_address: Mapped[str] = mapped_column(String(80), index=True)
    nft_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Money
    currency: Mapped[str] = mapped_column(String(8), default="TON")  # TON | USDT | XTR
    provider_price: Mapped[float] = mapped_column(Float, default=0.0)
    markup: Mapped[float] = mapped_column(Float, default=0.0)
    our_price: Mapped[float] = mapped_column(Float, default=0.0)
    markup_nano: Mapped[int] = mapped_column(BigInteger, default=0)  # markup in nanotons

    # Lifecycle
    status: Mapped[str] = mapped_column(String(24), default=OrderStatus.CREATED.value, index=True)
    payment_method: Mapped[str] = mapped_column(String(16), default="tonconnect")

    # On-chain trail
    customer_wallet: Mapped[str | None] = mapped_column(String(80), nullable=True)
    signed_boc: Mapped[str | None] = mapped_column(Text, nullable=True)
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    confirm_attempts: Mapped[int] = mapped_column(Integer, default=0)
    confirm_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Telegram Stars
    invoice_payload: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")

    def set_status(self, status: OrderStatus) -> None:
        self.status = status.value
