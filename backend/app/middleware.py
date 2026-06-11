"""HTTP middleware: request id, security headers, light rate limiting.

* RequestIDMiddleware  — adds `X-Request-ID` to every request/response and to
  the logging contextvar so all logs for one request share an id.
* RateLimitMiddleware — simple token-bucket per (client, route group). Keeps
  one rogue user from burning your MarketApp / TonAPI quotas. For multi-worker
  deployments, swap the in-process store for Redis.
* SecurityHeadersMiddleware — modest hardening for the API responses.
"""
from __future__ import annotations

import time
import uuid
from collections import defaultdict
from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .logging_setup import request_id_ctx


class RequestIDMiddleware(BaseHTTPMiddleware):
    HEADER = "X-Request-ID"

    async def dispatch(self, request: Request, call_next: Callable[..., Awaitable[Response]]) -> Response:
        rid = request.headers.get(self.HEADER) or uuid.uuid4().hex[:16]
        token = request_id_ctx.set(rid)
        request.state.request_id = rid
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers[self.HEADER] = rid
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-client token bucket.

    `rules` maps a path prefix to (capacity, refill_per_second). Anything not
    matched is rate-limited under the default rule. Identifies a client by the
    `cf-connecting-ip` / `x-forwarded-for` / socket IP — or by Telegram user id
    when the Mini App provides initData.
    """

    def __init__(self, app, *, default=(60, 30), rules: dict[str, tuple[int, float]] | None = None):
        super().__init__(app)
        self.default = default
        self.rules = rules or {
            "/api/rent/checkout": (10, 2.0),
            "/api/sale/checkout": (10, 2.0),
            "/api/telegram/webhook": (200, 100.0),  # Telegram, not the user
        }
        self._buckets: dict[tuple[str, str], tuple[float, float]] = defaultdict(
            lambda: (float(default[0]), time.monotonic())
        )

    def _rule_for(self, path: str) -> tuple[int, float]:
        for prefix, rule in self.rules.items():
            if path.startswith(prefix):
                return rule
        return self.default

    def _client_id(self, request: Request) -> str:
        init = request.headers.get("X-Telegram-Init-Data", "")
        if init and "user=" in init:
            # not validated yet — only used as a bucket key; cheap parsing
            chunk = init.split("user=", 1)[1].split("&", 1)[0]
            return f"tg:{chunk[:64]}"
        return (
            request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "anon")
        )

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        capacity, refill = self._rule_for(request.url.path)
        key = (self._client_id(request), request.url.path[:32])

        tokens, last = self._buckets[key]
        now = time.monotonic()
        tokens = min(capacity, tokens + (now - last) * refill)
        if tokens < 1.0:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "rate_limited",
                        "message": "Too many requests, slow down.",
                        "request_id": getattr(request.state, "request_id", None),
                    }
                },
                headers={"Retry-After": "1"},
            )
        self._buckets[key] = (tokens - 1.0, now)
        return await call_next(request)
