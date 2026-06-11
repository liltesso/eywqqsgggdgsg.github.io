# Merchant Partners — NFT Gifts Rental & Sale

Telegram Mini App + Python backend that resells [MarketApp](https://marketapp.ws)
liquidity for Telegram gift NFTs with your own markup. Customer pays, asset
goes to them — **you hold no inventory and no capital** (broker model).

```
┌──────────────────────────┐   ┌──────────────────────────┐   ┌────────────────────┐
│ Telegram Mini App        │ → │ FastAPI backend          │ → │ MarketApp (MRKT)   │
│ rent.html / css / js     │   │ /api/*  (this repo)      │   │ api.marketapp.ws   │
│ TonConnect / Stars       │   │ on-chain confirmation    │   │                    │
└──────────────────────────┘   └─────────────┬────────────┘   └────────────────────┘
                                             │
                                             ▼
                                  ┌──────────────────────────┐
                                  │ TonAPI  (tonapi.io)      │
                                  │ on-chain verification    │
                                  └──────────────────────────┘
```

## Repository layout

```
.
├── rent.html, rent.css, rent.js    Mini App (deploy to GitHub Pages)
├── tonconnect-manifest.json        TonConnect manifest for the Mini App URL
├── index.html, style.css, app.js   public offer page (existing)
├── backend/                        the FastAPI server (see backend/README.md)
│   ├── app/                          routers, services, blockchain layer
│   ├── tests/                        33 passing unit + integration tests
│   ├── docs/BLOCKCHAIN.md           deep dive on the TON layer
│   ├── Dockerfile + docker-compose.yml
│   └── README.md + .env.example
└── PROJECT.md                       (this file)
```

## Quick start (10 minutes)

1. **MRKT token** — https://marketapp.ws/api-token
2. **Bot** — `@BotFather` → new bot, enable Telegram Stars payments
3. **Backend**
   ```bash
   cd backend
   cp .env.example .env        # fill in token, bot, MERCHANT_WALLET, ...
   docker compose up -d        # or: pip install -r requirements.txt; ./run.sh
   python bot.py               # one-shot: set webhook + menu button
   ```
4. **Mini App** — host the four root files (already on GitHub Pages) and set
   ```html
   <script>window.BACKEND_URL = 'https://your-backend.example.com';</script>
   ```
   in `rent.html`. In `@BotFather` set the Mini App URL to
   `https://eywqqsgggdgsg.github.io/rent.html`.

## What's in the Mini App

* **Каталог** — Rent / Sale tabs, sort filters, search, infinite scroll
* **Замовлення** — your order history with status badges and one-click cancel
  for pre-payment states
* **Профіль** — Telegram identity, TonConnect wallet status, network info,
  link to the public offer

Payments go through **TonConnect by default** (customer signs, asset to
customer, your markup arrives in the same atomic transaction) with **Telegram
Stars** as an optional secondary path. After signing, the app polls
`/api/orders/{id}` until the backend confirms the transaction **settled
on-chain** (NFT now owned by the customer + markup received).

## What's in the backend

* `app/marketapp.py` — single MRKT integration file (Repository pattern). Retries
  on transient 5xx/429 with exponential back-off.
* `app/blockchain/` — TON layer: units, address codec (raw ↔ `EQ…`/`UQ…` with
  CRC-16), TonAPI client, on-chain verifier, optional treasury wallet.
* `app/services/` — order state machine + background confirmation worker that
  re-checks pending orders against TonAPI every few seconds.
* `app/routers/` — catalog, checkout (rent / sale / extend), orders
  (list / status / confirm / cancel), Telegram webhook.
* `app/errors.py` + `middleware.py` — structured error envelope, request-id,
  rate limiter, security headers.
* `app/health.py` — basic `/health` plus `/health/deep` with DB / MRKT /
  TonAPI subchecks.
* **Tests** — 33 passing: address codec + CRC vector, units math, pricing,
  MRKT normalisation, verifier policy, retry, full API integration (auth,
  error envelope, rate limiter, orders lifecycle).
* **Docker** — multi-stage `Dockerfile` + `docker-compose.yml` + `Procfile`
  for Railway / Render / Heroku-style hosts.

## Order state machine

```
 TonConnect:
   created → awaiting_signature → submitted → confirming → fulfilled
                                                    └────→ expired

 Telegram Stars:
   created → invoiced → paid → fulfilled
                            └→ paid_unfulfilled  (no treasury configured)
```

Every transition is **idempotent** — replaying the same event never
double-charges or double-fulfils. Confirmed by the lifecycle test.

## Documentation

* `backend/README.md` — backend overview + setup + endpoint table
* `backend/docs/BLOCKCHAIN.md` — TON deep dive: units, address codec,
  `SendTxSchema`, payment models, why "sent ≠ paid", verifier policy

## Tests

```bash
cd backend
pip install -r requirements.txt pytest
python -m pytest -q     # 33 tests, ~1s
```
