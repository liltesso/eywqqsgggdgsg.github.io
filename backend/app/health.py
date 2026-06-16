"""Health endpoints.

`/health` is a fast liveness probe (no upstream calls). `/health/deep` actively
checks DB, MarketApp and TonAPI so an operator can tell where the failure is.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_basic():
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


@router.get("/health/deep")
async def health_deep(request: Request, db: AsyncSession = Depends(get_db)):
    """Active subchecks. Returns 200 even if some are down — read the body."""
    async def check_db() -> dict:
        try:
            await db.execute(text("SELECT 1"))
            return {"ok": True}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)[:120]}

    async def check_mrkt() -> dict:
        try:
            data = await request.app.state.marketapp.rent_gifts()
            return {"ok": True, "items_seen": len(data.get("items", []))}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)[:120]}

    async def check_tonapi() -> dict:
        if not settings.merchant_wallet:
            return {"ok": True, "skipped": "no merchant wallet configured"}
        try:
            await asyncio.wait_for(
                request.app.state.tonapi.get_account(settings.merchant_wallet), timeout=5.0
            )
            return {"ok": True}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)[:120]}

    db_res, mrkt_res, tonapi_res = await asyncio.gather(
        check_db(), check_mrkt(), check_tonapi(), return_exceptions=False
    )
    all_ok = db_res["ok"] and mrkt_res["ok"] and tonapi_res["ok"]
    return {
        "status": "ok" if all_ok else "degraded",
        "checks": {"database": db_res, "marketapp": mrkt_res, "tonapi": tonapi_res},
    }
