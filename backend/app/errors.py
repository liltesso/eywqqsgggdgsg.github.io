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
        # 401/403 from upstream usually means a misconfigured backend, not a
        # client problem. Surface as 502 so clients can retry the user action.
        return JSONResponse(
            status_code=502,
            content=_envelope("marketapp_error", str(exc.detail)[:200], _rid(req)),
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
