"""TON address codec and normalisation.

A TON address identifies an account by `(workchain, account_id)` where
account_id is a 32-byte hash. Two textual forms exist:

  * **Raw**:        "0:e3b0c4...{64 hex}"   (workchain ":" hex-hash)
  * **User-friendly**: 48-char base64url of 36 bytes:
        byte 0      tag   (0x11 bounceable / 0x51 non-bounceable, |0x80 testnet)
        byte 1      workchain (0x00 basechain, 0xff masterchain)
        bytes 2..33 account_id (32 bytes)
        bytes 34..35 CRC16-CCITT/XMODEM of the first 34 bytes (big-endian)

We need this to compare addresses returned by TonAPI (often raw) with the
user-friendly forms used by wallets / TonConnect, e.g. to confirm an NFT's
owner equals the customer's wallet.

Implemented from scratch (no deps) so it is fully unit-testable.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass

TAG_BOUNCEABLE = 0x11
TAG_NON_BOUNCEABLE = 0x51
TAG_TEST_FLAG = 0x80


def crc16_xmodem(data: bytes) -> int:
    """CRC-16/XMODEM (poly 0x1021, init 0x0000). Check: crc("123456789") == 0x31C3."""
    crc = 0
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return crc


@dataclass(frozen=True)
class Address:
    workchain: int
    hash_part: bytes  # 32 bytes

    def __post_init__(self) -> None:
        if len(self.hash_part) != 32:
            raise ValueError("account hash must be 32 bytes")
        if self.workchain not in (0, -1):
            raise ValueError(f"unsupported workchain {self.workchain}")

    # ─── Parsing ──────────────────────────────────────────────────────────
    @classmethod
    def parse(cls, value: str | "Address") -> "Address":
        if isinstance(value, Address):
            return value
        value = value.strip()
        if ":" in value:
            return cls._parse_raw(value)
        return cls._parse_friendly(value)

    @classmethod
    def _parse_raw(cls, value: str) -> "Address":
        wc_str, _, hex_part = value.partition(":")
        wc = int(wc_str)
        hash_part = bytes.fromhex(hex_part)
        if len(hash_part) != 32:
            raise ValueError("raw address hash must be 32 bytes (64 hex chars)")
        return cls(workchain=wc, hash_part=hash_part)

    @classmethod
    def _parse_friendly(cls, value: str) -> "Address":
        # base64url, may use - _ and optional padding
        padded = value + "=" * (-len(value) % 4)
        try:
            raw = base64.urlsafe_b64decode(padded)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"invalid base64 address: {value}") from exc
        if len(raw) != 36:
            raise ValueError("friendly address must decode to 36 bytes")
        tag, wc_byte = raw[0], raw[1]
        body, crc = raw[:34], raw[34:]
        if crc16_xmodem(body).to_bytes(2, "big") != crc:
            raise ValueError("address checksum mismatch")
        tag &= ~TAG_TEST_FLAG  # ignore testnet flag for identity
        if tag not in (TAG_BOUNCEABLE, TAG_NON_BOUNCEABLE):
            raise ValueError(f"unknown address tag 0x{tag:02x}")
        workchain = -1 if wc_byte == 0xFF else wc_byte
        return cls(workchain=workchain, hash_part=raw[2:34])

    # ─── Rendering ────────────────────────────────────────────────────────
    def to_raw(self) -> str:
        return f"{self.workchain}:{self.hash_part.hex()}"

    def to_friendly(self, *, bounceable: bool = True, testnet: bool = False, urlsafe: bool = True) -> str:
        tag = TAG_BOUNCEABLE if bounceable else TAG_NON_BOUNCEABLE
        if testnet:
            tag |= TAG_TEST_FLAG
        wc_byte = 0xFF if self.workchain == -1 else self.workchain & 0xFF
        body = bytes([tag, wc_byte]) + self.hash_part
        crc = crc16_xmodem(body).to_bytes(2, "big")
        raw = body + crc
        encoded = base64.urlsafe_b64encode(raw) if urlsafe else base64.b64encode(raw)
        return encoded.decode()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Address):
            return NotImplemented
        return self.workchain == other.workchain and self.hash_part == other.hash_part

    def __hash__(self) -> int:
        return hash((self.workchain, self.hash_part))


def normalize(value: str | Address | None) -> str | None:
    """Return the canonical raw form of any address, or None if unparseable."""
    if not value:
        return None
    try:
        return Address.parse(value).to_raw()
    except (ValueError, Exception):  # noqa: BLE001
        return None


def same_address(a: str | Address | None, b: str | Address | None) -> bool:
    """True if two addresses refer to the same account, regardless of form."""
    na, nb = normalize(a), normalize(b)
    return na is not None and na == nb
