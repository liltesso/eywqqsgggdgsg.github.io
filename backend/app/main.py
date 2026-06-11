"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

On startup we:
  * configure structured logging,
  * create DB tables,
  * open shared MarketApp and TonAPI clients,
  * start the background on-chain confirmation worker.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .blockchain.tonapi import TonAPIClient
from .config import settings
from .database import init_db
from .errors import install_exception_handlers
from .health import router as health_router
from .logging_setup import setup_logging
from .marketapp import MarketAppClient
from .middleware import (
    RateLimitMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
)
from .routers import catalog, checkout, orders, webhook
from .services.confirmation import ConfirmationWorker


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(level="INFO", json_output=False)
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
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Order matters: request-id first so every other layer (incl. errors) has it.
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

install_exception_handlers(app)

app.include_router(health_router)
app.include_router(catalog.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(webhook.router)
