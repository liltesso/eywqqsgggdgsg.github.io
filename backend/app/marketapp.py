"""MarketApp (MRKT) API client — the ONLY module that talks to MRKT.

Repository pattern (per spec §4): if MRKT changes its endpoints, you edit
this file alone; routers, pricing, bot and the Mini App stay untouched.

Important unit facts discovered from the live OpenAPI schema:
  * `price_per_day` is a string in **nanotons** (1 TON = 1e9 nanotons).
  * `min_duration` / `max_duration` are in **seconds**.
  * pay / buy endpoints return an **unsigned TON transaction** (SendTxSchema)
    that must be signed by a wallet (TonConnect on the client, or a treasury
    wallet on the server).
"""
from __future__ import annotations

from typing import Any

import httpx

from .config import settings
from .retry import with_retry

NANOTON = 1_000_000_000
SECONDS_PER_DAY = 86_400


class MarketAppError(Exception):
    def __init__(self, status: int, detail: Any):
        self.status = status
        self.detail = detail
        super().__init__(f"MarketApp {status}: {detail}")


class MarketAppClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.marketapp_base_url,
            headers={"Authorization": settings.marketapp_api_token},
            timeout=httpx.Timeout(20.0),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        async def _do() -> httpx.Response:
            r = await self._client.request(method, path, **kwargs)
            # Make transient status codes raise so the retry helper sees them.
            if r.status_code in (429,) or 500 <= r.status_code < 600:
                r.raise_for_status()
            return r

        resp = await with_retry(_do, name=f"MRKT {method} {path}")

        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:  # noqa: BLE001
                detail = resp.text
            raise MarketAppError(resp.status_code, detail)
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    # ─── Catalog: rent ────────────────────────────────────────────────────
    async def rent_gifts(
        self,
        *,
        cursor: str | None = None,
        sort_by: str = "recently_touch",
        collection_address: str | None = None,
        model: str | None = None,
        symbol: str | None = None,
        backdrop: str | None = None,
    ) -> dict:
        params = _clean(
            cursor=cursor,
            sort_by=sort_by,
            collection_address=collection_address,
            model=model,
            symbol=symbol,
            backdrop=backdrop,
        )
        return await self._request("GET", "/v1/rent/gifts/", params=params)

    async def rent_pay(self, nft_address: str, *, duration_seconds: int, price_per_day_nano: str) -> dict:
        """Returns an unsigned TON transaction (SendTxSchema)."""
        body = {"duration": duration_seconds, "price_per_day": price_per_day_nano}
        return await self._request("POST", f"/v1/rent/{nft_address}/pay/", json=body)

    async def rent_extend(self, nft_address: str, *, duration_seconds: int, price_per_day_nano: str) -> dict:
        body = {"duration": duration_seconds, "price_per_day": price_per_day_nano}
        return await self._request("POST", f"/v1/rent/{nft_address}/extend/", json=body)

    async def rent_cancel(self, nft_addresses: list[str]) -> dict:
        return await self._request("POST", "/v1/rent/cancel/", json={"nft_addresses": nft_addresses})

    async def my_rented(self, *, cursor: str | None = None) -> dict:
        return await self._request("GET", "/v1/rent/my-rented/", params=_clean(cursor=cursor))

    # ─── Catalog: sale ────────────────────────────────────────────────────
    async def gifts_on_sale(
        self,
        *,
        cursor: str | None = None,
        sort_by: str = "min_bid_asc",
        collection_address: str | None = None,
        model: str | None = None,
        symbol: str | None = None,
        backdrop: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> dict:
        params = _clean(
            cursor=cursor,
            sort_by=sort_by,
            collection_address=collection_address,
            model=model,
            symbol=symbol,
            backdrop=backdrop,
            min_price=min_price,
            max_price=max_price,
        )
        return await self._request("GET", "/v1/gifts/onsale/", params=params)

    async def nft_info(self, nft_address: str) -> dict:
        return await self._request("GET", f"/v1/nfts/{nft_address}/")

    async def buy_nft(self, items: list[dict]) -> dict:
        """items: [{nft_address, price (float), currency: 'TON'|'USDT'}].

        Returns an unsigned TON transaction (SendTxSchema).
        """
        return await self._request("POST", "/v1/nfts/buy/", json={"data": items})

    # ─── Collections (for filters) ────────────────────────────────────────
    async def gift_collections(self) -> Any:
        return await self._request("GET", "/v1/collections/gifts/")


def _clean(**kwargs) -> dict:
    """Drop None values so we don't send empty query params."""
    return {k: v for k, v in kwargs.items() if v is not None}


# ─── Normalisation helpers (MRKT shapes -> our Mini App shapes) ────────────

def slugify_gift_image(nft_name: str) -> str | None:
    """Derive the Fragment CDN image for a Telegram gift NFT.

    "Toy Bear #50336" -> https://nft.fragment.com/gift/toybear-50336.medium.jpg
    """
    if not nft_name or "#" not in nft_name:
        return None
    name_part, _, num_part = nft_name.partition("#")
    slug = name_part.strip().lower().replace(" ", "").replace("-", "")
    num = num_part.strip()
    if not slug or not num.isdigit():
        return None
    return f"https://nft.fragment.com/gift/{slug}-{num}.medium.jpg"


def attrs_to_dict(attributes: list[dict] | None) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for a in attributes or []:
        out[a.get("trait_type", "").lower()] = a.get("value")
    return out


def normalize_rent_item(item: dict) -> dict:
    """MRKT RentItem -> Mini App gift (prices in TON, durations in days)."""
    ppd_nano = item.get("price_per_day") or "0"
    try:
        ppd_ton = int(ppd_nano) / NANOTON
    except (TypeError, ValueError):
        ppd_ton = 0.0
    min_s = int(item.get("min_duration") or SECONDS_PER_DAY)
    max_s = int(item.get("max_duration") or SECONDS_PER_DAY)
    name = item.get("nft_name", "")
    return {
        "nft_address": item.get("nft_address"),
        "name": name,
        "image_url": slugify_gift_image(name),
        "attributes": attrs_to_dict(item.get("attributes")),
        "min_duration_days": max(1, min_s // SECONDS_PER_DAY),
        "max_duration_days": max(1, max_s // SECONDS_PER_DAY),
        "price_per_day_ton": round(ppd_ton, 4),
        "price_per_day_nano": str(ppd_nano),
        "discount_per_day": item.get("discount_per_day") or 0,
    }


def normalize_sale_item(item: dict) -> dict:
    """MRKT NFTItem (on sale) -> Mini App gift."""
    bid_nano = item.get("min_bid") or "0"
    currency = item.get("currency") or "TON"
    try:
        price = int(bid_nano) / NANOTON
    except (TypeError, ValueError):
        try:
            price = float(bid_nano)
        except (TypeError, ValueError):
            price = 0.0
    name = item.get("name", "")
    return {
        "nft_address": item.get("address"),
        "name": name,
        "image_url": slugify_gift_image(name),
        "attributes": attrs_to_dict(item.get("attributes")),
        "collection_address": item.get("collection_address"),
        "price": round(price, 4),
        "price_nano": str(bid_nano),
        "currency": currency,
    }
