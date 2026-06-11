"""Tests for the retry helper — succeeds on a transient burst, gives up cleanly,
and propagates a non-transient error without retrying.
"""
from __future__ import annotations

import asyncio

import httpx
import pytest

from app.retry import is_transient, with_retry


def test_is_transient_classification():
    req = httpx.Request("GET", "http://x")
    assert is_transient(httpx.HTTPStatusError("x", request=req, response=httpx.Response(429, request=req)))
    assert is_transient(httpx.HTTPStatusError("x", request=req, response=httpx.Response(500, request=req)))
    assert not is_transient(httpx.HTTPStatusError("x", request=req, response=httpx.Response(400, request=req)))
    assert not is_transient(ValueError("nope"))


def test_with_retry_recovers_after_transient_burst():
    calls = {"n": 0}
    req = httpx.Request("GET", "http://x")

    async def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise httpx.HTTPStatusError(
                "boom", request=req, response=httpx.Response(503, request=req)
            )
        return "ok"

    result = asyncio.run(with_retry(flaky, attempts=4, base_delay=0.01, name="t"))
    assert result == "ok"
    assert calls["n"] == 3


def test_with_retry_propagates_non_transient_immediately():
    calls = {"n": 0}

    async def bad():
        calls["n"] += 1
        raise ValueError("nope")

    with pytest.raises(ValueError):
        asyncio.run(with_retry(bad, attempts=4, base_delay=0.01, name="t"))
    assert calls["n"] == 1  # no retry on a non-transient error
