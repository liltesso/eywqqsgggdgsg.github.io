"""Unit tests for the blockchain primitives and verifier.

Run:  cd backend && python -m pytest -q
These cover the parts that MUST be correct for money to be safe: unit
conversion, address codec/CRC, and the on-chain confirmation policy.
"""
from __future__ import annotations

import asyncio
from decimal import Decimal

import pytest

from app.blockchain import units
from app.blockchain.address import Address, crc16_xmodem, normalize, same_address
from app.blockchain.verifier import confirm_order, verify_incoming_payment, verify_nft_owner


# ─── units ──────────────────────────────────────────────────────────────────

def test_ton_nano_roundtrip():
    assert units.ton_to_nano("1") == 1_000_000_000
    assert units.ton_to_nano(0.02) == 20_000_000
    assert units.nano_to_ton(2_980_000_000) == Decimal("2.98")


def test_ton_to_nano_truncates_below_nano():
    # more than 9 decimals -> truncated, never rounded up (no over-charge)
    assert units.ton_to_nano("0.0000000019") == 1


def test_usdt_decimals():
    assert units.to_smallest("5", "USDT") == 5_000_000
    assert units.from_smallest(5_000_000, "USDT") == Decimal("5")


# ─── CRC16 / address codec ──────────────────────────────────────────────────

def test_crc16_xmodem_known_vector():
    # Canonical CRC-16/XMODEM check value
    assert crc16_xmodem(b"123456789") == 0x31C3


def test_address_friendly_roundtrip():
    raw = "0:" + "ab" * 32
    addr = Address.parse(raw)
    friendly = addr.to_friendly(bounceable=True)
    assert len(friendly) == 48
    assert Address.parse(friendly).to_raw() == raw


def test_address_bounceable_and_nonbounceable_equal_identity():
    raw = "0:" + "cd" * 32
    addr = Address.parse(raw)
    eq = addr.to_friendly(bounceable=True)
    uq = addr.to_friendly(bounceable=False)
    assert eq != uq
    assert same_address(eq, uq)  # same account, different flags


def test_address_bad_checksum_rejected():
    raw = "0:" + "ef" * 32
    bad = Address.parse(raw).to_friendly()[:-2] + "00"
    assert normalize(bad) is None  # checksum mismatch -> unparseable


def test_masterchain_workchain():
    raw = "-1:" + "11" * 32
    assert Address.parse(Address.parse(raw).to_friendly()).to_raw() == raw


def test_same_address_handles_none():
    assert not same_address(None, "0:" + "00" * 32)


# ─── verifier (mocked TonAPI) ───────────────────────────────────────────────

class FakeTonAPI:
    def __init__(self, *, owner=None, txs=None):
        self._owner = owner
        self._txs = txs or []

    async def get_owner_of(self, nft_address):
        return normalize(self._owner) if self._owner else None

    async def get_transactions(self, address, limit=20):
        return self._txs


def run(coro):
    return asyncio.run(coro)


def test_verify_nft_owner_match():
    customer = "0:" + "aa" * 32
    api = FakeTonAPI(owner=Address.parse(customer).to_friendly())
    assert run(verify_nft_owner(api, nft_address="0:" + "bb" * 32, expected_owner=customer))


def test_verify_nft_owner_mismatch():
    api = FakeTonAPI(owner="0:" + "cc" * 32)
    assert not run(verify_nft_owner(api, nft_address="0:" + "bb" * 32, expected_owner="0:" + "aa" * 32))


def test_verify_incoming_payment_accepts_with_fee_slack():
    merchant = "0:" + "dd" * 32
    customer = "0:" + "aa" * 32
    txs = [{
        "utime": 2000,
        "in_msg": {"value": 295_000_000, "source": {"address": customer}},
    }]
    api = FakeTonAPI(txs=txs)
    # expected 0.3 TON; 0.295 received -> within 3% tolerance
    assert run(verify_incoming_payment(
        api, merchant_wallet=merchant, min_amount_nano=300_000_000,
        since_unix=1000, from_wallet=customer,
    ))


def test_verify_incoming_payment_rejects_too_small():
    api = FakeTonAPI(txs=[{"utime": 2000, "in_msg": {"value": 100_000_000}}])
    assert not run(verify_incoming_payment(
        api, merchant_wallet="0:" + "dd" * 32, min_amount_nano=300_000_000, since_unix=1000,
    ))


def test_verify_incoming_payment_rejects_old_tx():
    api = FakeTonAPI(txs=[{"utime": 500, "in_msg": {"value": 999_000_000}}])
    assert not run(verify_incoming_payment(
        api, merchant_wallet="0:" + "dd" * 32, min_amount_nano=300_000_000, since_unix=1000,
    ))


def test_confirm_order_nft_delivered_is_authoritative():
    customer = "0:" + "aa" * 32
    api = FakeTonAPI(owner=customer)  # NFT now owned by customer
    res = run(confirm_order(
        api, kind="sale", nft_address="0:" + "bb" * 32,
        customer_wallet=customer, merchant_wallet="0:" + "dd" * 32,
        markup_nano=0, created_unix=1000, currency="TON",
    ))
    assert res.confirmed and res.reason == "nft_delivered"


def test_confirm_order_unconfirmed_when_owner_unchanged():
    api = FakeTonAPI(owner="0:" + "99" * 32, txs=[])
    res = run(confirm_order(
        api, kind="rent", nft_address="0:" + "bb" * 32,
        customer_wallet="0:" + "aa" * 32, merchant_wallet="0:" + "dd" * 32,
        markup_nano=300_000_000, created_unix=1000, currency="TON",
    ))
    assert not res.confirmed
