"""Public catalog: rental & sale gift lists (cached, marked-up)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ..cache import catalog_cache
from ..deps import get_marketapp
from ..marketapp import (
    MarketAppClient,
    MarketAppError,
    normalize_rent_item,
    normalize_sale_item,
)
from ..pricing import apply_markup, ton_to_stars

router = APIRouter(prefix="/api", tags=["catalog"])

# Map the Mini App's friendly sort keys to MRKT's enum values.
RENT_SORT = {
    "popular": "recently_touch",
    "price_asc": "price_per_day",
    "price_desc": "min_price",
    "duration": "duration_desc",
}
SALE_SORT = {
    "popular": "recently_touch",
    "price_asc": "min_bid_asc",
    "price_desc": "min_bid_desc",
}


@router.get("/rent/gifts")
async def list_rent_gifts(
    cursor: str | None = None,
    sort: str = Query("popular"),
    model: str | None = None,
    symbol: str | None = None,
    backdrop: str | None = None,
    mrkt: MarketAppClient = Depends(get_marketapp),
):
    cache_key = f"rent:{sort}:{cursor}:{model}:{symbol}:{backdrop}"
    if (cached := catalog_cache.get(cache_key)) is not None:
        return cached

    try:
        data = await mrkt.rent_gifts(
            cursor=cursor,
            sort_by=RENT_SORT.get(sort, "recently_touch"),
            model=model,
            symbol=symbol,
            backdrop=backdrop,
        )
    except MarketAppError as e:
        raise HTTPException(status_code=502, detail=f"MarketApp error: {e.detail}")

    items = []
    for raw in data.get("items", []):
        g = normalize_rent_item(raw)
        g["price_per_day_stars"] = ton_to_stars(apply_markup(g["price_per_day_ton"])[0])
        # Show the marked-up per-day TON too, so the UI is honest.
        g["price_per_day_ton"] = round(apply_markup(g["price_per_day_ton"])[0], 4)
        items.append(g)

    result = {"items": items, "cursor": data.get("cursor")}
    catalog_cache.set(cache_key, result)
    return result


@router.get("/sale/gifts")
async def list_sale_gifts(
    cursor: str | None = None,
    sort: str = Query("price_asc"),
    model: str | None = None,
    symbol: str | None = None,
    backdrop: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    mrkt: MarketAppClient = Depends(get_marketapp),
):
    cache_key = f"sale:{sort}:{cursor}:{model}:{symbol}:{backdrop}:{min_price}:{max_price}"
    if (cached := catalog_cache.get(cache_key)) is not None:
        return cached

    try:
        data = await mrkt.gifts_on_sale(
            cursor=cursor,
            sort_by=SALE_SORT.get(sort, "min_bid_asc"),
            model=model,
            symbol=symbol,
            backdrop=backdrop,
            min_price=min_price,
            max_price=max_price,
        )
    except MarketAppError as e:
        raise HTTPException(status_code=502, detail=f"MarketApp error: {e.detail}")

    items = []
    for raw in data.get("items", []):
        g = normalize_sale_item(raw)
        customer_price, _ = apply_markup(g["price"])
        g["price_with_markup"] = round(customer_price, 4)
        g["price_stars"] = ton_to_stars(customer_price)
        items.append(g)

    result = {"items": items, "cursor": data.get("cursor")}
    catalog_cache.set(cache_key, result)
    return result


@router.get("/collections/gifts")
async def gift_collections(mrkt: MarketAppClient = Depends(get_marketapp)):
    try:
        return await mrkt.gift_collections()
    except MarketAppError as e:
        raise HTTPException(status_code=502, detail=f"MarketApp error: {e.detail}")
