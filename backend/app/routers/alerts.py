"""Public proxy to mapa.ua air-alert API.

mapa.ua is open and unauthenticated, but proxying through our backend
lets us:
  * avoid browser CORS issues from a custom domain,
  * cache hot endpoints (current, cities) for a few seconds,
  * forward ngrok-skip headers transparently.
"""
from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

MAPA_BASE = "https://mapa.ua/api/v1"

_client = httpx.AsyncClient(
    base_url=MAPA_BASE,
    timeout=httpx.Timeout(15.0),
    headers={"User-Agent": "GiftsMarket/1.0 (+air-alert proxy)"},
)

# Tiny in-process cache for endpoints that hammer mapa.ua otherwise.
_cache: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str, ttl: float) -> Any | None:
    item = _cache.get(key)
    if item is None:
        return None
    ts, value = item
    if time.time() - ts > ttl:
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.time(), value)


async def _proxy(path: str, params: dict | None = None) -> Any:
    try:
        r = await _client.get(path, params=params or {})
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"mapa.ua unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text[:200])
    return r.json()


@router.get("/current")
async def current():
    cached = _cache_get("current", ttl=8)
    if cached is not None:
        return cached
    data = await _proxy("/current")
    _cache_set("current", data)
    return data


@router.get("/attacks")
async def attacks(
    date: str | None = None,
    limit: int = Query(60, ge=1, le=500),
):
    params = {"limit": limit}
    if date:
        params["date"] = date
    return await _proxy("/attacks", params=params)


@router.get("/objects")
async def objects(attack_id: int = Query(...)):
    return await _proxy("/objects", params={"attack_id": attack_id})


@router.get("/cities")
async def cities():
    cached = _cache_get("cities", ttl=600)
    if cached is not None:
        return cached
    data = await _proxy("/geo/cities")
    _cache_set("cities", data)
    return data


@router.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: int = Query(150, ge=10, le=1000),
):
    return await _proxy(
        "/nearby",
        params={"lat": lat, "lon": lon, "radius_km": radius_km},
    )


@router.get("/calendar")
async def calendar():
    cached = _cache_get("calendar", ttl=120)
    if cached is not None:
        return cached
    data = await _proxy("/calendar")
    _cache_set("calendar", data)
    return data
