"""Tiny in-process TTL cache for the MRKT catalog.

Per spec §4: do NOT hammer MRKT on every Mini App open. Cache catalog pages
for a few seconds. For a multi-worker deployment, swap this for Redis — the
interface (`get` / `set`) stays identical.
"""
from __future__ import annotations

import time
from typing import Any

from .config import settings


class TTLCache:
    def __init__(self, ttl: int):
        self.ttl = ttl
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.monotonic() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.monotonic() + self.ttl, value)

    def clear(self) -> None:
        self._store.clear()


catalog_cache = TTLCache(ttl=settings.catalog_cache_ttl)
