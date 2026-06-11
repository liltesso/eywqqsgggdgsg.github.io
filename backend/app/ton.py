"""OPTIONAL treasury wallet signing for the Stars path.

This is only used when you pay MarketApp from your OWN TON funds after a
customer pays you in Stars. It needs `WALLET_MNEMONIC` configured and the
`tonutils` dependency installed. The default (recommended) TonConnect flow
does NOT use this module at all — there the customer signs themselves.

Keeping this isolated means the app boots and the catalog/TonConnect flow
work even without a treasury.
"""
from __future__ import annotations

from .config import settings


def treasury_available() -> bool:
    if not settings.wallet_mnemonic.strip():
        return False
    try:
        import tonutils  # noqa: F401
    except Exception:
        return False
    return True


async def sign_and_send(sendtx: dict) -> str:
    """Sign a MRKT SendTxSchema with the treasury wallet and broadcast it.

    Returns the transaction hash. Raises if the treasury isn't configured.
    """
    if not treasury_available():
        raise RuntimeError("Treasury wallet not configured (set WALLET_MNEMONIC + install tonutils)")

    from tonutils.client import TonapiClient
    from tonutils.wallet import WalletV4R2
    from tonutils.wallet.data import TransferMessage

    client = TonapiClient(api_key=settings.tonapi_key)
    mnemonic = settings.wallet_mnemonic.split()
    wallet, _pub, _priv, _mnem = WalletV4R2.from_mnemonic(client, mnemonic)

    tx = sendtx.get("transaction", {})
    messages = [
        TransferMessage(
            destination=m["address"],
            amount=int(m["amount"]) / 1_000_000_000,
            body=m.get("payload"),
            state_init=m.get("stateInit"),
        )
        for m in tx.get("messages", [])
    ]
    tx_hash = await wallet.batch_transfer_messages(messages)
    return tx_hash
