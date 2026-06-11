# Merchant Partners — NFT Gifts Rental & Sale

A Telegram Mini App + Python backend that **rents and sells Telegram gift NFTs**
by reselling MarketApp (MRKT) liquidity with your own markup. You hold **no
inventory and no capital** — you are a broker.

```
Telegram Mini App (rent.html)  ──>  FastAPI backend  ──>  api.marketapp.ws
        TonConnect / Stars              (this folder)         (MRKT)
```

## How it actually works (important)

MarketApp's rent/buy endpoints **do not silently move an NFT server-side**.
They return an **unsigned TON transaction** that must be *signed by a wallet*.
That single fact dictates the two supported payment models:

| Method | Who signs | Capital needed | Where the gift lands |
|---|---|---|---|
| **TonConnect** *(default)* | the **customer's** wallet | none | customer's account |
| **Stars** *(optional)* | your **treasury** wallet | yes (TON float) | treasury, then you re-deliver |

**TonConnect is the recommended path** and the one that matches the "zero
capital" promise: the customer signs a single transaction that pays MRKT **and**
your markup (an extra message to `MERCHANT_WALLET`) at once. You never touch the
funds or the asset.

The Stars path is included for completeness (charge in Telegram Stars, pay MRKT
from your own TON). It requires custody and is gated behind `WALLET_MNEMONIC` +
the optional `tonutils` dependency. Without a treasury configured, Stars orders
are marked `paid_unfulfilled` and flagged for manual handling — money is never
lost silently.

## Layout

```
backend/
├── app/
│   ├── main.py            FastAPI app + lifespan
│   ├── config.py          env settings
│   ├── database.py        async SQLAlchemy
│   ├── models.py          User, Transaction
│   ├── schemas.py         request/response models
│   ├── marketapp.py       ★ ALL MRKT calls live here (Repository pattern)
│   ├── pricing.py         markup, TON↔Stars, markup message
│   ├── cache.py           TTL catalog cache (anti rate-limit)
│   ├── telegram.py        initData validation + Bot API
│   ├── ton.py             OPTIONAL treasury signing (Stars path)
│   ├── deps.py            auth + shared deps
│   └── routers/
│       ├── catalog.py     GET /api/rent/gifts, /api/sale/gifts
│       ├── checkout.py    POST /api/rent/checkout, /api/sale/checkout
│       └── webhook.py     POST /api/telegram/webhook (/start, payments)
└── bot.py                 one-shot: set webhook + menu button
```

> **Repository pattern:** if MRKT changes its API, you edit only
> `app/marketapp.py`. Routers, pricing, bot and the Mini App stay untouched.

## API surface (what the Mini App calls)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/rent/gifts?sort=&cursor=` | rentable gifts (marked-up) |
| GET  | `/api/sale/gifts?sort=&cursor=` | gifts on sale (marked-up) |
| POST | `/api/rent/checkout` | `{nft_address, duration_days, method}` |
| POST | `/api/sale/checkout` | `{nft_address, method}` |
| POST | `/api/telegram/webhook` | Telegram updates (auth via secret header) |
| GET  | `/health` | config / liveness |

Checkout returns either a TonConnect transaction (`method: "tonconnect"`) or a
Stars invoice link (`method: "stars"`).

## Setup

1. **MRKT token** — get one at <https://marketapp.ws/api-token>.
2. **Bot** — create with [@BotFather](https://t.me/BotFather), enable Stars.
3. **Config**
   ```bash
   cd backend
   cp .env.example .env      # fill in MARKETAPP_API_TOKEN, TELEGRAM_BOT_TOKEN,
                             # MERCHANT_WALLET, PUBLIC_BASE_URL, ...
   pip install -r requirements.txt
   ```
4. **Run**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Put it behind HTTPS (Railway / Render / a VPS + Caddy). Then register the
   webhook + menu button once:
   ```bash
   python bot.py
   ```
5. **Frontend** — host `rent.html` / `rent.css` / `rent.js` (GitHub Pages works)
   and point it at the backend by editing one line in `rent.html`:
   ```html
   <script>window.BACKEND_URL = 'https://your-backend.example.com';</script>
   ```
   In BotFather, set the Mini App URL to `https://…/rent.html`.

## Units & money (verified against the live OpenAPI schema)

* `price_per_day` from MRKT is a **string in nanotons** (1 TON = 1e9).
* `min_duration` / `max_duration` are in **seconds** (we expose days).
* Your markup = `MARKUP_PERCENT`; in TonConnect it rides as an extra message to
  `MERCHANT_WALLET`, so the difference is yours the moment the customer signs.

## Config reference

See [`.env.example`](./.env.example). Key knobs: `MARKUP_PERCENT`,
`MERCHANT_WALLET`, `STARS_PER_TON` (display), `CATALOG_CACHE_TTL`,
`CORS_ORIGINS`, `DATABASE_URL`.

## Production notes

* **Caching** — `CATALOG_CACHE_TTL` (default 8s) protects your MRKT key from
  rate limits. For multiple workers, swap `app/cache.py` for Redis.
* **Database** — SQLite by default; set `DATABASE_URL` to
  `postgresql+asyncpg://…` and uncomment `asyncpg` in requirements for prod.
* **Migrations** — `init_db()` auto-creates tables; use Alembic for real changes.
* **Risk** — your business depends entirely on `api.marketapp.ws`. The
  Repository pattern keeps the blast radius of an upstream change to one file.
