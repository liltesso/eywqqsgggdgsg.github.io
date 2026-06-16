"""Monetary unit conversions for TON and jettons (e.g. USDT).

TON uses 9 decimals: 1 TON = 1_000_000_000 nanotons.
Jettons declare their own decimals; USDT on TON uses 6.

All on-chain amounts are integers of the smallest unit. We keep amounts as
`int` (nano) internally and only convert to float for display, never for
on-chain math, to avoid floating-point drift on money.
"""
from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

TON_DECIMALS = 9
NANOTON = 10 ** TON_DECIMALS

# Common jetton decimals
JETTON_DECIMALS = {
    "TON": 9,
    "USDT": 6,  # jUSDT / USD₮ on TON
}


def ton_to_nano(amount: float | str | Decimal) -> int:
    """Convert a human TON amount to integer nanotons (truncates extra precision)."""
    d = Decimal(str(amount))
    return int((d * NANOTON).to_integral_value(rounding=ROUND_DOWN))


def nano_to_ton(nano: int | str) -> Decimal:
    """Convert integer nanotons to a Decimal TON amount."""
    return (Decimal(int(nano)) / NANOTON)


def to_smallest(amount: float | str | Decimal, currency: str = "TON") -> int:
    """Convert a human amount in `currency` to its smallest integer unit."""
    decimals = JETTON_DECIMALS.get(currency.upper(), 9)
    d = Decimal(str(amount))
    return int((d * (10 ** decimals)).to_integral_value(rounding=ROUND_DOWN))


def from_smallest(value: int | str, currency: str = "TON") -> Decimal:
    decimals = JETTON_DECIMALS.get(currency.upper(), 9)
    return Decimal(int(value)) / (10 ** decimals)


def round_money(amount: float | Decimal, places: int = 4) -> float:
    """Round a display amount to `places` decimals, half-up."""
    q = Decimal(10) ** -places
    return float(Decimal(str(amount)).quantize(q, rounding=ROUND_HALF_UP))
