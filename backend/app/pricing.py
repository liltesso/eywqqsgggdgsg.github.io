"""Pricing & markup logic — kept separate so business rules live in one place."""
from __future__ import annotations

from .config import settings

NANOTON = 1_000_000_000


def apply_markup(provider_price: float) -> tuple[float, float]:
    """Return (customer_price, markup) given a provider price.

    customer_price = provider_price * (1 + markup_percent/100)
    """
    customer = round(provider_price * settings.markup_multiplier, 6)
    markup = round(customer - provider_price, 6)
    return customer, markup


def rent_total(price_per_day_ton: float, days: int, discount_per_day: float = 0.0) -> float:
    """Provider-side total for a rental, before our markup.

    discount_per_day is a fraction (e.g. 0.05) applied per day; MRKT computes
    the real on-chain amount, this is for display/record only.
    """
    base = price_per_day_ton * days
    if discount_per_day and days > 1:
        base *= max(0.0, 1.0 - discount_per_day)
    return round(base, 6)


def ton_to_stars(ton: float) -> int:
    """Display-only conversion of a TON amount to approximate Telegram Stars."""
    return max(1, round(ton * settings.stars_per_ton))


def ton_to_nano(ton: float) -> str:
    return str(int(round(ton * NANOTON)))


def markup_message(provider_total_ton: float) -> dict | None:
    """Build an extra TON transfer message carrying our commission.

    In the TonConnect flow this is appended to MarketApp's transaction so the
    customer pays MRKT + our markup in a single signed transaction. Returns
    None if markup or merchant wallet is not configured.
    """
    _, markup = apply_markup(provider_total_ton)
    if markup <= 0 or not settings.merchant_wallet:
        return None
    return {
        "address": settings.merchant_wallet,
        "amount": ton_to_nano(markup),
        "payload": None,
    }
