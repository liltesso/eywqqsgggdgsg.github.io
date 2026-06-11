"""Pricing & MRKT normalisation tests."""
from __future__ import annotations

from app import pricing
from app.marketapp import normalize_rent_item, normalize_sale_item, slugify_gift_image


def test_apply_markup():
    customer, markup = pricing.apply_markup(2.0)
    assert customer == 2.3
    assert markup == 0.3


def test_rent_total_with_discount():
    # 0.02/day * 10 days * (1 - 0.05) = 0.19
    assert pricing.rent_total(0.02, 10, 0.05) == 0.19


def test_rent_total_no_discount_single_day():
    assert pricing.rent_total(0.02, 1, 0.05) == 0.02


def test_markup_message_present(monkeypatch):
    monkeypatch.setattr(pricing.settings, "merchant_wallet", "UQmerchant", raising=False)
    monkeypatch.setattr(pricing.settings, "markup_percent", 15.0, raising=False)
    msg = pricing.markup_message(2.0)
    assert msg["address"] == "UQmerchant"
    assert msg["amount"] == "300000000"  # 0.3 TON in nano


def test_slugify_gift_image():
    assert slugify_gift_image("Toy Bear #50336") == \
        "https://nft.fragment.com/gift/toybear-50336.medium.jpg"
    assert slugify_gift_image("no-number") is None


def test_normalize_rent_item_units():
    g = normalize_rent_item({
        "nft_address": "EQabc", "nft_name": "Toy Bear #50336",
        "attributes": [{"trait_type": "Model", "value": "Gold"}],
        "min_duration": 86400, "max_duration": 2937600,
        "price_per_day": "20000000", "discount_per_day": 0.05,
    })
    assert g["price_per_day_ton"] == 0.02
    assert g["min_duration_days"] == 1
    assert g["max_duration_days"] == 34
    assert g["price_per_day_nano"] == "20000000"


def test_normalize_sale_item():
    s = normalize_sale_item({
        "address": "EQxyz", "name": "Lego #4468",
        "min_bid": "2980000000", "currency": "TON", "attributes": [],
    })
    assert s["price"] == 2.98
    assert s["currency"] == "TON"
