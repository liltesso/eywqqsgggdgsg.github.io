"""Structured error envelope.

Every error response has the shape:
    {"error": {"code": "snake_case", "message": "human", "request_id": "..."}}

This makes the Mini App's error handling trivial (one type to parse) and pairs
with the request-id middleware so a user-visible error can always be traced
back to a single log line.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .marketapp import MarketAppError
from .blockchain.tonapi import TonAPIError

log = logging.getLogger(__name__)


class AppError(Exception):
    """Domain error with a stable code + HTTP status."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _envelope(code: str, message: str, request_id: str | None) -> dict:
    return {"error": {"code": code, "message": message, "request_id": request_id}}


def _rid(req: Request) -> str | None:
    return getattr(req.state, "request_id", None)


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(req: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, _rid(req)),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exc(req: Request, exc: StarletteHTTPException):
        code = _http_code(exc.status_code)
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(code, detail, _rid(req)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation(req: Request, exc: RequestValidationError):
        msg = "; ".join(
            f"{'.'.join(str(p) for p in e['loc'][1:])}: {e['msg']}"
            for e in exc.errors()[:3]
        ) or "Invalid request"
        return JSONResponse(
            status_code=422,
            content=_envelope("validation_error", msg, _rid(req)),
        )

    @app.exception_handler(MarketAppError)
    async def mrkt_exc(req: Request, exc: MarketAppError):
        # Log the full upstream payload so the operator can see what MRKT
        # said. The client only sees a friendly, translated message.
        log.warning("MarketApp upstream %s: %r", exc.status, exc.detail)
        friendly = _translate_mrkt_error(exc)
        return JSONResponse(
            status_code=502,
            content=_envelope("marketapp_error", friendly, _rid(req)),
        )

    @app.exception_handler(TonAPIError)
    async def tonapi_exc(req: Request, exc: TonAPIError):
        return JSONResponse(
            status_code=502,
            content=_envelope("tonapi_error", str(exc.detail)[:200], _rid(req)),
        )

    @app.exception_handler(Exception)
    async def unhandled(req: Request, exc: Exception):
        log.exception("unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=_envelope("internal_error", "Internal server error", _rid(req)),
        )


def _http_code(status: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
    }.get(status, f"http_{status}")


def _translate_mrkt_error(exc: MarketAppError) -> str:
    """Map common MRKT upstream errors to friendly Ukrainian messages."""
    text = (str(exc.detail) or "").lower()

    if exc.status in (401, 403):
        return "Сервіс тимчасово недоступний (помилка авторизації MarketApp). Спробуйте пізніше."
    if exc.status == 404:
        return "Цей подарунок більше недоступний — імовірно його щойно орендували / продали."
    if exc.status == 429:
        return "MarketApp обмежує запити. Спробуйте через 10–20 секунд."

    # Heuristic mapping for 4xx with a JSON body
    if "price" in text and ("change" in text or "mismatch" in text or "drift" in text):
        return "Ціна на MarketApp щойно змінилась — оновіть каталог і спробуйте знову."
    if "not available" in text or "unavailable" in text or "sold" in text or "rented" in text:
        return "Подарунок щойно став недоступним. Поверніться до каталогу."
    if "balance" in text or "insufficient" in text:
        return "Недостатньо коштів для виконання операції."
    if "rate" in text and "limit" in text:
        return "Забагато запитів. Спробуйте за кілька секунд."

    # Generic but useful fallback — show first 120 chars of upstream detail
    detail_short = str(exc.detail)[:120]
    return f"MarketApp повернув помилку: {detail_short}"
