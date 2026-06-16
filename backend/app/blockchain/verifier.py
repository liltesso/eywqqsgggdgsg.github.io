"""On-chain verification of orders.

The TonConnect callback only tells the frontend a transaction was *sent* — not
that it *settled*. Money/asset truth lives on-chain, so before we mark an order
fulfilled we independently confirm it via TonAPI:

  * SALE  — the customer's wallet must now OWN the NFT, and (for TON sales) our
            merchant wallet must have received the markup.
  * RENT  — the rented NFT's owner/holder must now be the customer's wallet for
            the rental period; markup received as above.

Verification is idempotent and side-effect free: it returns a `VerificationResult`
that the order service acts upon. This separation keeps the rules testable with a
mocked TonAPI client.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

from .address import same_address
from .tonapi import TonAPIClient


@dataclass
class VerificationResult:
    confirmed: bool
    reason: str
    nft_owner_ok: bool = False
    payment_ok: bool = False


async def verify_nft_owner(
    tonapi: TonAPIClient, *, nft_address: str, expected_owner: str
) -> bool:
    """True if the NFT is currently owned by `expected_owner`."""
    owner = await tonapi.get_owner_of(nft_address)
    return owner is not None and same_address(owner, expected_owner)


async def verify_incoming_payment(
    tonapi: TonAPIClient,
    *,
    merchant_wallet: str,
    min_amount_nano: int,
    since_unix: int,
    from_wallet: str | None = None,
    tolerance: float = 0.97,
) -> bool:
    """Scan the merchant wallet's recent transactions for an incoming transfer.

    Accepts a payment whose value is at least `tolerance` * `min_amount_nano`
    (a small slack covers TON forward fees) and that arrived at or after
    `since_unix`. If `from_wallet` is given, the sender must match.
    """
    threshold = int(min_amount_nano * tolerance)
    try:
        txs = await tonapi.get_transactions(merchant_wallet, limit=30)
    except Exception:  # noqa: BLE001
        return False

    for tx in txs:
        utime = tx.get("utime", 0)
        if utime < since_unix - 60:  # 60s clock slack
            continue
        in_msg = tx.get("in_msg") or {}
        value = int(in_msg.get("value", 0) or 0)
        if value < threshold:
            continue
        if from_wallet:
            sender = (in_msg.get("source") or {}).get("address")
            if not same_address(sender, from_wallet):
                continue
        return True
    return False


async def confirm_order(
    tonapi: TonAPIClient,
    *,
    kind: str,
    nft_address: str,
    customer_wallet: str | None,
    merchant_wallet: str | None,
    markup_nano: int,
    created_unix: int,
    currency: str = "TON",
) -> VerificationResult:
    """Full confirmation policy for one order.

    Primary signal: the customer now owns the NFT (works for both rent & sale).
    Secondary signal: the markup landed on the merchant wallet (TON only — for
    USDT it would be a jetton transfer we don't deep-inspect here).
    """
    nft_owner_ok = False
    if customer_wallet:
        nft_owner_ok = await verify_nft_owner(
            tonapi, nft_address=nft_address, expected_owner=customer_wallet
        )

    payment_ok = True
    if merchant_wallet and markup_nano > 0 and currency.upper() == "TON":
        payment_ok = await verify_incoming_payment(
            tonapi,
            merchant_wallet=merchant_wallet,
            min_amount_nano=markup_nano,
            since_unix=created_unix,
            from_wallet=customer_wallet,
        )

    # The NFT actually moving to the customer is the authoritative outcome.
    if nft_owner_ok:
        return VerificationResult(True, "nft_delivered", nft_owner_ok=True, payment_ok=payment_ok)

    # If we cannot read the customer wallet (e.g. Stars path) fall back to
    # payment-only confirmation.
    if not customer_wallet and payment_ok:
        return VerificationResult(True, "payment_received", payment_ok=True)

    return VerificationResult(False, "pending_or_unconfirmed", nft_owner_ok=nft_owner_ok, payment_ok=payment_ok)


def now_unix() -> int:
    return int(time.time())
