"""Tiny async retry helper for transient HTTP failures.

We retry on httpx network errors, on 429 (rate limited) and on 5xx server
errors, with exponential back-off + jitter. Anything else (4xx that the caller
sent on purpose) is propagated immediately so a bug is not hidden by retries.
"""
from __future__ import annotations

import asyncio
import logging
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx

log = logging.getLogger(__name__)

T = TypeVar("T")


def is_transient(exc: BaseException) -> bool:
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        s = exc.response.status_code
        return s == 429 or 500 <= s < 600
    return False


async def with_retry(
    op: Callable[[], Awaitable[T]],
    *,
    attempts: int = 4,
    base_delay: float = 0.3,
    max_delay: float = 4.0,
    name: str = "op",
) -> T:
    last: BaseException | None = None
    for i in range(attempts):
        try:
            return await op()
        except Exception as exc:  # noqa: BLE001
            if not is_transient(exc) or i == attempts - 1:
                raise
            last = exc
            delay = min(max_delay, base_delay * (2 ** i)) * (0.5 + random.random())
            log.warning("%s transient failure (%s), retrying in %.2fs", name, exc.__class__.__name__, delay)
            await asyncio.sleep(delay)
    assert last is not None
    raise last
