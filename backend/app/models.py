"""Database models.

Lightweight by design (per the simplified architecture): we record only
finances and bindings. MarketApp owns the NFT custody and the native rental
timer — we do NOT track expiry ourselves.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    # Telegram user id is the primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ton_wallet: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")


class Transaction(Base):
    """One financial record per order.

    `our_price` is what the customer paid us; `provider_price` is what the
    transaction pays MarketApp. The difference is our profit.
    """

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"))

    kind: Mapped[str] = mapped_column(String(16))          # "rent" | "sale"
    nft_address: Mapped[str] = mapped_column(String(80))
    nft_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    duration_days: Mapped[int | None] = mapped_column(nullable=True)  # rent only

    currency: Mapped[str] = mapped_column(String(8), default="TON")   # TON | USDT | XTR
    provider_price: Mapped[float] = mapped_column(Float, default=0.0)  # paid to MRKT
    markup: Mapped[float] = mapped_column(Float, default=0.0)          # our commission
    our_price: Mapped[float] = mapped_column(Float, default=0.0)       # customer paid

    # "pending" -> "paid" -> "fulfilled" | "failed"
    status: Mapped[str] = mapped_column(String(16), default="pending")
    payment_method: Mapped[str] = mapped_column(String(16), default="tonconnect")
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    invoice_payload: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="transactions")
