"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .marketapp import MarketAppClient
from .routers import catalog, checkout, webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.marketapp = MarketAppClient()
    try:
        yield
    finally:
        await app.state.marketapp.aclose()


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
app.include_router(webhook.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "marketapp_configured": bool(settings.marketapp_api_token),
        "bot_configured": bool(settings.telegram_bot_token),
        "merchant_wallet": bool(settings.merchant_wallet),
        "markup_percent": settings.markup_percent,
    }
