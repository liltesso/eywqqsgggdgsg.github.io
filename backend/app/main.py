"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

On startup we:
  * create DB tables,
  * open shared MarketApp and TonAPI clients,
  * start the background on-chain confirmation worker.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .blockchain.tonapi import TonAPIClient
from .config import settings
from .database import init_db
from .marketapp import MarketAppClient
from .routers import catalog, checkout, orders, webhook
from .services.confirmation import ConfirmationWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s — %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.marketapp = MarketAppClient()
    app.state.tonapi = TonAPIClient(api_key=settings.tonapi_key, base_url=settings.tonapi_base_url)
    app.state.worker = ConfirmationWorker()
    app.state.worker.start()
    try:
        yield
    finally:
        await app.state.worker.stop()
        await app.state.marketapp.aclose()
        await app.state.tonapi.aclose()


app = FastAPI(
    title="Merchant Partners — NFT Rental & Sale API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(webhook.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "network": "testnet" if settings.testnet else "mainnet",
        "marketapp_configured": bool(settings.marketapp_api_token),
        "bot_configured": bool(settings.telegram_bot_token),
        "merchant_wallet": bool(settings.merchant_wallet),
        "tonapi_key": bool(settings.tonapi_key),
        "confirmation_worker": settings.enable_confirmation_worker,
        "markup_percent": settings.markup_percent,
    }
