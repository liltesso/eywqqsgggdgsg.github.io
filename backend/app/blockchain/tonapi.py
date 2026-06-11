"""Async REST client for TonAPI (https://tonapi.io).

TonAPI is an indexer over the TON blockchain. We use it to:
  * read account state and incoming transactions (confirm payments),
  * read NFT items and their current owner (confirm a gift was delivered),
  * read jetton balances (USDT),
  * optionally broadcast a signed BOC.

Auth is an optional Bearer key (higher rate limits). Without a key the public
tier still works for low volume. Mainnet base is https://tonapi.io; testnet is
https://testnet.tonapi.io.

Docs: https://docs.tonconsole.com/tonapi/api-v2
"""
from __future__ import annotations

from typing import Any

import httpx

from ..retry import with_retry
from .address import Address, normalize


class TonAPIError(Exception):
    def __init__(self, status: int, detail: Any):
        self.status = status
        self.detail = detail
        super().__init__(f"TonAPI {status}: {detail}")


class TonAPIClient:
    def __init__(self, *, api_key: str = "", base_url: str = "https://tonapi.io"):
        headers = {"Accept": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=httpx.Timeout(15.0),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict | None = None) -> Any:
        async def _do() -> httpx.Response:
            r = await self._client.get(path, params=params)
            if r.status_code in (429,) or 500 <= r.status_code < 600:
                r.raise_for_status()
            return r

        resp = await with_retry(_do, name=f"TonAPI GET {path}")
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:  # noqa: BLE001
                detail = resp.text
            raise TonAPIError(resp.status_code, detail)
        return resp.json()

    async def _post(self, path: str, json: dict) -> Any:
        async def _do() -> httpx.Response:
            r = await self._client.post(path, json=json)
            if r.status_code in (429,) or 500 <= r.status_code < 600:
                r.raise_for_status()
            return r

        resp = await with_retry(_do, name=f"TonAPI POST {path}")
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:  # noqa: BLE001
                detail = resp.text
            raise TonAPIError(resp.status_code, detail)
        return resp.json()

    # ─── Accounts ─────────────────────────────────────────────────────────
    async def get_account(self, address: str | Address) -> dict:
        return await self._get(f"/v2/accounts/{_acc(address)}")

    async def get_transactions(
        self, address: str | Address, *, limit: int = 20, after_lt: int | None = None
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit}
        if after_lt is not None:
            params["after_lt"] = after_lt
        data = await self._get(f"/v2/blockchain/accounts/{_acc(address)}/transactions", params)
        return data.get("transactions", [])

    # ─── NFTs ─────────────────────────────────────────────────────────────
    async def get_nft_item(self, nft_address: str | Address) -> dict:
        """Returns the NFT item incl. `owner.address` (raw form)."""
        return await self._get(f"/v2/nfts/{_acc(nft_address)}")

    async def get_account_nfts(
        self, address: str | Address, *, collection: str | None = None, limit: int = 100
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "indirect_ownership": False}
        if collection:
            params["collection"] = _acc(collection)
        data = await self._get(f"/v2/accounts/{_acc(address)}/nfts", params)
        return data.get("nft_items", [])

    # ─── Jettons (USDT) ───────────────────────────────────────────────────
    async def get_jetton_balance(self, address: str | Address, jetton: str | Address) -> int:
        data = await self._get(f"/v2/accounts/{_acc(address)}/jettons/{_acc(jetton)}")
        return int(data.get("balance", 0))

    # ─── Broadcast ────────────────────────────────────────────────────────
    async def send_boc(self, boc_base64: str) -> None:
        """Broadcast a signed external message BOC to the network."""
        await self._post("/v2/blockchain/message", {"boc": boc_base64})

    async def get_owner_of(self, nft_address: str | Address) -> str | None:
        """Convenience: normalized raw owner address of an NFT, or None."""
        try:
            item = await self.get_nft_item(nft_address)
        except TonAPIError:
            return None
        owner = (item.get("owner") or {}).get("address")
        return normalize(owner)


def _acc(address: str | Address) -> str:
    """TonAPI accepts raw or friendly; we send canonical raw for stability."""
    return Address.parse(address).to_raw() if address else ""
