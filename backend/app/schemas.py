"""Pydantic request/response schemas for our own API surface."""
from __future__ import annotations

from pydantic import BaseModel, Field


# ─── Catalog ────────────────────────────────────────────────────────────────

class GiftRentOut(BaseModel):
    nft_address: str
    name: str
    image_url: str | None = None
    attributes: dict = {}
    min_duration_days: int
    max_duration_days: int
    price_per_day_ton: float
    price_per_day_stars: int
    discount_per_day: float = 0


class GiftSaleOut(BaseModel):
    nft_address: str
    name: str
    image_url: str | None = None
    attributes: dict = {}
    price: float
    price_with_markup: float
    price_stars: int
    currency: str = "TON"


class CatalogPage(BaseModel):
    items: list[dict]
    cursor: str | None = None


# ─── Checkout requests ──────────────────────────────────────────────────────

class RentCheckoutRequest(BaseModel):
    nft_address: str
    duration_days: int = Field(ge=1, le=365)
    method: str = Field(default="tonconnect", pattern="^(tonconnect|stars)$")


class RentExtendRequest(BaseModel):
    nft_address: str
    additional_days: int = Field(ge=1, le=365)
    method: str = Field(default="tonconnect", pattern="^(tonconnect|stars)$")


class SaleCheckoutRequest(BaseModel):
    nft_address: str
    method: str = Field(default="tonconnect", pattern="^(tonconnect|stars)$")


# ─── Checkout responses ─────────────────────────────────────────────────────

class TonConnectTx(BaseModel):
    """A ready-to-sign TonConnect transaction payload."""
    valid_until: int
    messages: list[dict]


class TonCheckoutResponse(BaseModel):
    method: str = "tonconnect"
    transaction: TonConnectTx
    order_id: int
    provider_price: float
    markup: float
    total_price: float
    currency: str = "TON"


class StarsCheckoutResponse(BaseModel):
    method: str = "stars"
    invoice_link: str
    order_id: int
    amount_stars: int
