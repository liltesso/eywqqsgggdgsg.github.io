"""OPTIONAL treasury wallet — signs and broadcasts the MRKT transaction.

Only used by the Telegram Stars path: the customer pays you in Stars, then your
server pays MarketApp in TON from your own treasury wallet. This needs:

  * `WALLET_MNEMONIC` (24 words) in the environment,
  * the `tonutils` package installed (it is commented out in requirements by
    default so the rest of the system installs cleanly without it).

The recommended TonConnect flow does NOT use this module: there the customer
signs with their own wallet and the asset goes straight to them.

MRKT returns a `SendTxSchema`:
    {"transaction": {"validUntil": int,
                     "messages": [{"address","amount","payload","stateInit"}]}}
We replay those messages from the treasury wallet in a single batch transfer,
which is exactly what a wallet app would do when signing the TonConnect request.
"""
from __future__ import annotations

import logging

from ..config import settings

log = logging.getLogger(__name__)


def treasury_available() -> bool:
    if not settings.wallet_mnemonic.strip():
        return False
    try:
        import tonutils  # noqa: F401
    except Exception:  # noqa: BLE001
        log.warning("WALLET_MNEMONIC is set but `tonutils` is not installed.")
        return False
    return True


async def sign_and_send(sendtx: dict) -> str:
    """Sign a MRKT SendTxSchema with the treasury wallet and broadcast it.

    Returns a transaction/identifier string. Raises if the treasury is not
    configured so callers can fall back to manual fulfilment.
    """
    if not treasury_available():
        raise RuntimeError(
            "Treasury wallet not configured. Set WALLET_MNEMONIC and install tonutils, "
            "or use the TonConnect payment method instead."
        )

    from tonutils.client import TonapiClient
    from tonutils.wallet import WalletV4R2
    from tonutils.wallet.messages import TransferMessage

    client = TonapiClient(api_key=settings.tonapi_key, is_testnet=False)
    mnemonic = settings.wallet_mnemonic.split()
    wallet, _public_key, _private_key, _mnemo = WalletV4R2.from_mnemonic(client, mnemonic)

    tx = sendtx.get("transaction", {})
    messages = []
    for m in tx.get("messages", []):
        messages.append(
            TransferMessage(
                destination=m["address"],
                amount=_nano_to_ton(m["amount"]),
                body=m.get("payload"),
                state_init=m.get("stateInit"),
            )
        )

    if not messages:
        raise RuntimeError("SendTxSchema contained no messages")

    tx_hash = await wallet.batch_transfer_messages(messages)
    log.info("Treasury broadcast tx=%s (%d messages)", tx_hash, len(messages))
    return str(tx_hash)


def _nano_to_ton(nano: str | int) -> float:
    return int(nano) / 1_000_000_000
