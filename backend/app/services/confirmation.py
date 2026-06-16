"""Background confirmation worker.

Webhook/HTTP events are not enough: a TonConnect transaction settles a few
seconds *after* the client's wallet returns, and network confirmation is never
pushed to us. So we run a periodic sweep that re-checks every pending order
on-chain via TonAPI until it is fulfilled or expires.

Started/stopped from the FastAPI lifespan. Uses its own DB session per sweep.
"""
from __future__ import annotations

import asyncio
import logging

from ..blockchain.tonapi import TonAPIClient
from ..config import settings
from ..database import SessionLocal
from .orders import pending_confirmations, try_confirm

log = logging.getLogger(__name__)


class ConfirmationWorker:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    def start(self) -> None:
        if not settings.enable_confirmation_worker:
            log.info("Confirmation worker disabled by config.")
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._run(), name="confirmation-worker")
        log.info("Confirmation worker started (interval=%ss).", settings.confirm_poll_interval)

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        log.info("Confirmation worker stopped.")

    async def _run(self) -> None:
        tonapi = TonAPIClient(api_key=settings.tonapi_key, base_url=settings.tonapi_base_url)
        try:
            while not self._stop.is_set():
                try:
                    await self._sweep(tonapi)
                except Exception:  # noqa: BLE001
                    log.exception("Confirmation sweep failed")
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=settings.confirm_poll_interval)
                except asyncio.TimeoutError:
                    pass
        finally:
            await tonapi.aclose()

    async def _sweep(self, tonapi: TonAPIClient) -> None:
        async with SessionLocal() as db:
            orders = await pending_confirmations(db)
            if not orders:
                return
            log.debug("Confirming %d pending order(s)", len(orders))
            for order in orders:
                await try_confirm(db, order, tonapi)
