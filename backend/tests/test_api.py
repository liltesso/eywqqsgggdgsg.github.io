"""Integration tests for the public API surface.

Boots the real FastAPI app against a SQLite DB (path set in conftest.py) with
the confirmation worker disabled, and exercises:
  * the structured error envelope (404, 401, 422),
  * request-id propagation,
  * the orders list / cancel / status routes (incl. ownership),
  * the rate limiter (as a unit test on the middleware, to stay deterministic).
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import time
import uuid
from urllib.parse import urlencode

import pytest


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c


def init_data(uid: int = 42) -> str:
    from app.config import settings

    user = json.dumps({"id": uid, "first_name": "Vlad", "username": "vlad"})
    fields = {"auth_date": str(int(time.time())), "query_id": "AAA", "user": user}
    dcs = "\n".join(f"{k}={fields[k]}" for k in sorted(fields))
    secret = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


def auth_headers(uid: int = 42):
    return {"X-Telegram-Init-Data": init_data(uid)}


# ─── error envelope + request id ────────────────────────────────────────────

def test_request_id_propagates(client):
    r = client.get("/health", headers={"X-Request-ID": "abc123"})
    assert r.status_code == 200
    assert r.headers["X-Request-ID"] == "abc123"


def test_unknown_route_uses_error_envelope(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "not_found"
    assert "request_id" in body["error"]


def test_orders_require_auth(client):
    r = client.get("/api/orders/1")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_invalid_init_data(client):
    r = client.get("/api/orders/1", headers={"X-Telegram-Init-Data": "garbage"})
    assert r.status_code == 401


def test_validation_error_shape(client):
    r = client.post(
        "/api/rent/checkout",
        headers={**auth_headers(uid=43), "Content-Type": "application/json"},
        json={"nft_address": "EQabc", "duration_days": 0},  # ge=1
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


# ─── orders list / cancel ───────────────────────────────────────────────────

def test_list_and_cancel_orders(client):
    """Seed two orders for user 50 directly via the DB, then exercise routes."""
    from app.database import SessionLocal
    from app.models import OrderStatus, Transaction, User

    UID = 50

    async def seed():
        async with SessionLocal() as db:
            # Idempotent upsert of the test user, so we don't conflict if
            # another test already created them through the auth path.
            await db.merge(User(id=UID, first_name="Vlad"))
            for i in range(2):
                db.add(
                    Transaction(
                        user_id=UID,
                        kind="rent" if i == 0 else "sale",
                        nft_address=f"0:{'aa' * 31}{i:02x}",
                        nft_name=f"Test #{i}",
                        duration_days=5 if i == 0 else None,
                        currency="TON",
                        provider_price=1.0,
                        markup=0.15,
                        our_price=1.15,
                        status=OrderStatus.AWAITING_SIGNATURE.value,
                        payment_method="tonconnect",
                        invoice_payload=uuid.uuid4().hex,
                    )
                )
            await db.commit()

    asyncio.run(seed())

    # List all
    r = client.get("/api/orders", headers=auth_headers(uid=UID))
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 2

    # Filter by kind
    rents = client.get("/api/orders?kind=rent", headers=auth_headers(uid=UID)).json()
    assert len(rents) >= 1 and rents[0]["kind"] == "rent" and rents[0]["can_cancel"]

    # Cancel the rent
    oid = rents[0]["order_id"]
    cancelled = client.post(f"/api/orders/{oid}/cancel", headers=auth_headers(uid=UID)).json()
    assert cancelled["status"] == "failed"
    assert cancelled["confirm_reason"] == "cancelled_by_user"
    assert not cancelled["can_cancel"]

    # Re-cancel should now 409
    again = client.post(f"/api/orders/{oid}/cancel", headers=auth_headers(uid=UID))
    assert again.status_code == 409

    # Another user cannot see this user's order
    other = client.get(f"/api/orders/{oid}", headers=auth_headers(uid=99))
    assert other.status_code == 403


# ─── rate limiting (unit test on the middleware) ────────────────────────────

def test_rate_limit_token_bucket_behaviour():
    """Drive the middleware directly so the test is deterministic, not
    dependent on event-loop timing or upstream service latency."""
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Route
    from starlette.testclient import TestClient
    from app.middleware import RateLimitMiddleware

    async def ok(_request):
        return PlainTextResponse("ok")

    app = Starlette(routes=[Route("/x", ok)])
    app.add_middleware(RateLimitMiddleware, default=(3, 0.0))  # 3 calls, no refill
    c = TestClient(app)

    # IPs are unique per call via X-Forwarded-For so we control the bucket key.
    statuses = [c.get("/x", headers={"X-Forwarded-For": "1.1.1.1"}).status_code for _ in range(5)]
    assert statuses[:3] == [200, 200, 200], statuses
    assert statuses[3] == 429 and statuses[4] == 429, statuses

    # A different IP gets its own fresh bucket.
    other = c.get("/x", headers={"X-Forwarded-For": "2.2.2.2"})
    assert other.status_code == 200
