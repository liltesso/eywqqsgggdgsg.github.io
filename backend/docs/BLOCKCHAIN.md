# TON Blockchain Layer — Deep Dive

This document explains, in detail, how the backend interacts with the TON
blockchain: the money model, address formats, the exact transaction shape
MarketApp returns, how a payment is **signed** and — most importantly — how we
**verify on-chain** that an order actually settled before we tell the customer
"done".

> TL;DR — MarketApp does not move an asset for you server-side. It hands you an
> **unsigned TON transaction**. *Someone* must sign it. Who signs decides who
> receives the gift and whether you need capital. We default to the customer
> signing (TonConnect), and we never trust the wallet's "sent" callback — we
> re-check the chain via TonAPI.

---

## 1. Money on TON: units

| Concept | Value |
|---|---|
| 1 TON | `1_000_000_000` nanotons (9 decimals) |
| USDT (jUSDT) | 6 decimals → 1 USDT = `1_000_000` units |
| On-chain amounts | always **integers** of the smallest unit |

We keep money as integer nano internally (`app/blockchain/units.py`) and only
convert to float for display. `ton_to_nano` **truncates** sub-nano precision so
a rounding error can never *over*-charge. MarketApp returns `price_per_day` as a
string in **nanotons**; durations come in **seconds**. The `marketapp.py`
normaliser converts these to TON/days for the UI and keeps the raw nano string
for the actual transaction.

```python
ton_to_nano("0.02")        # 20_000_000
nano_to_ton(2_980_000_000) # Decimal("2.98")
to_smallest("5", "USDT")   # 5_000_000
```

---

## 2. TON addresses (`app/blockchain/address.py`)

An account is `(workchain, account_id)` where `account_id` is a 32-byte hash.
Two textual forms exist and we must treat them as equal:

* **Raw** — `0:e3b0c44298fc1c14...` (`workchain:hex`)
* **User-friendly** — 48-char base64url of 36 bytes:

```
┌────────┬───────────┬──────────────────────────┬───────────┐
│ byte 0 │  byte 1   │      bytes 2..33         │ bytes 34-35│
│  tag   │ workchain │      account_id (32 B)   │  CRC16     │
└────────┴───────────┴──────────────────────────┴───────────┘
 tag:  0x11 bounceable (EQ…) | 0x51 non-bounceable (UQ…) | |0x80 testnet
 wc:   0x00 basechain (0)    | 0xFF masterchain (-1)
 CRC:  CRC-16/XMODEM of the first 34 bytes, big-endian
```

The same account has different `EQ…`/`UQ…` strings depending on the bounceable
flag, so comparing raw strings is wrong. We normalise everything to raw and
compare that:

```python
same_address("EQ...", "UQ...")  # True if same account, regardless of flags
normalize(any_form)             # -> "0:hex" or None if checksum is bad
```

The CRC implementation is verified against the canonical
`CRC-16/XMODEM("123456789") == 0x31C3` vector plus full round-trip tests
(`tests/test_blockchain.py`).

---

## 3. The transaction MarketApp returns (`SendTxSchema`)

Both `POST /v1/rent/{nft}/pay/` and `POST /v1/nfts/buy/` respond with:

```json
{
  "transaction": {
    "validUntil": 1750000000,
    "messages": [
      {
        "address": "EQ...marketapp_contract",
        "amount": "2980000000",
        "payload": "te6cck...base64-BOC",
        "stateInit": null
      }
    ]
  }
}
```

This is exactly the [TonConnect `sendTransaction`](https://docs.ton.org/develop/dapps/ton-connect/transactions)
request shape. Each message is an internal transfer with:

* `address` — destination contract,
* `amount` — value in **nanotons**,
* `payload` — a serialized cell (BOC) carrying the contract call (e.g. "rent
  this NFT to the sender for N seconds"),
* `stateInit` — optional contract deployment data.

**Whoever signs and pays these messages becomes the counterparty** — i.e. the
NFT is rented/sold *to the signer's wallet*. That single fact drives the whole
architecture.

---

## 4. Two payment models

### 4a. TonConnect (default, zero-capital) ✅

```
Customer wallet ── signs ──▶ [ MRKT message(s) ] + [ markup → MERCHANT_WALLET ]
                                                              (one transaction)
```

The backend takes the MRKT messages and **appends one extra message** that
sends your markup to `MERCHANT_WALLET` (`pricing.markup_message`). The customer
signs the whole bundle in their wallet. Result:

* the gift goes straight to the **customer's** Telegram/wallet,
* your spread arrives at your wallet in the **same atomic transaction**,
* you never hold the asset or float any capital — a true broker.

This fulfils the spec's headline promise ("повна відсутність капітальних
витрат") better than a custody model.

### 4b. Telegram Stars (optional, needs custody)

```
Customer ── Stars ──▶ You ── TON (treasury) ──▶ MarketApp ──▶ gift to treasury
```

The customer pays you in Stars; your **treasury wallet** signs the MRKT
transaction (`app/blockchain/wallet.py`, needs `WALLET_MNEMONIC` + `tonutils`).
The gift lands in your wallet and you re-deliver. This requires a TON float and
custody, so it is gated and optional. If no treasury is configured, a Stars
order is marked `paid_unfulfilled` and flagged — **money is never silently
lost**.

---

## 5. Why "sent" ≠ "paid": on-chain verification

`tonConnectUI.sendTransaction()` resolves when the wallet **broadcasts** the
external message — *not* when it's committed. Network finality follows a few
seconds later and is never pushed to us. Showing success on the callback would
be lying to the customer (and to ourselves). So:

1. Frontend signs → gets a `boc`.
2. Frontend `POST /api/orders/{id}/confirm { boc, wallet_address }`.
   Order → `submitted`.
3. The **confirmation worker** (`app/services/confirmation.py`) sweeps every
   `CONFIRM_POLL_INTERVAL` seconds and re-checks each pending order on-chain via
   TonAPI (`app/blockchain/verifier.py`):
   * **Authoritative signal** — `GET /v2/nfts/{nft}` → does `owner.address` now
     equal the customer's wallet? If yes, the gift was delivered.
   * **Secondary signal** — scan `MERCHANT_WALLET` incoming transactions for the
     markup amount (with a 3% slack for forward fees) from the customer, after
     the order's creation time.
4. On success → `fulfilled` (+ `confirmed_at`). After `CONFIRM_TIMEOUT` without
   confirmation → `expired`.
5. Frontend polls `GET /api/orders/{id}` and shows the success screen only when
   the backend says `fulfilled`.

Every transition is **idempotent**: replaying a confirm, or re-sweeping a
terminal order, never double-fulfils. This is verified by the lifecycle test.

### Order state machine

```
 TonConnect:
   created ─▶ awaiting_signature ─▶ submitted ─▶ confirming ─▶ fulfilled
                                                       └─────▶ expired

 Stars:
   created ─▶ invoiced ─▶ paid ─▶ fulfilled
                                └▶ paid_unfulfilled   (no treasury configured)
```

---

## 6. TonAPI client (`app/blockchain/tonapi.py`)

Thin async wrapper over <https://tonapi.io> (v2). Methods we rely on:

| Method | Endpoint | Used for |
|---|---|---|
| `get_account` | `/v2/accounts/{id}` | liveness / balances |
| `get_transactions` | `/v2/blockchain/accounts/{id}/transactions` | payment verification |
| `get_nft_item` / `get_owner_of` | `/v2/nfts/{id}` | delivery verification |
| `get_account_nfts` | `/v2/accounts/{id}/nfts` | inventory checks |
| `get_jetton_balance` | `/v2/accounts/{id}/jettons/{jetton}` | USDT balances |
| `send_boc` | `POST /v2/blockchain/message` | optional broadcast |

Auth is `Authorization: Bearer {TONAPI_KEY}` (optional). Set `TESTNET=true` and
`TONAPI_BASE_URL=https://testnet.tonapi.io` to develop against testnet.

---

## 7. Treasury signing (`app/blockchain/wallet.py`)

Only for the Stars path. Loads a `WalletV4R2` from `WALLET_MNEMONIC` via
`tonutils`, replays the MRKT messages as a batch transfer, and broadcasts.
`tonutils` is commented out in `requirements.txt` so the default install stays
lean; uncomment it if you enable this path. `treasury_available()` guards every
call, so the rest of the system runs fine without it.

---

## 8. Security & correctness notes

* **initData** from the Mini App is validated with the official WebApp HMAC
  algorithm (`app/telegram.py`) before any order is created — we trust the
  Telegram user id, not a client-supplied value.
* **Order ownership** is enforced on every `/api/orders/*` call (a user can only
  see/confirm their own orders).
* **Price drift** — checkout re-fetches the live MRKT price right before issuing
  the transaction, so a stale catalog price can't be exploited.
* **No floating-point money** — all on-chain math is integer nano.
* **Rate limits** — the catalog is cached (`CATALOG_CACHE_TTL`) to protect your
  MRKT key; swap `app/cache.py` for Redis when you scale to multiple workers.
* **Provider risk** — all MRKT calls live in `app/marketapp.py`; all TON calls
  live in `app/blockchain/`. An upstream change touches one isolated layer.

---

## 9. Tests

```bash
cd backend && python -m pytest -q
```

Covers unit conversions (incl. truncation), the address codec + CRC vector,
markup math, MRKT normalisation, and the verifier policy with a mocked TonAPI.
The order lifecycle (`created → submitted → confirming → fulfilled`, idempotent)
is exercised against a real SQLite session with a simulated "settles late"
TonAPI.
