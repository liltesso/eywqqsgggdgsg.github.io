"""Blockchain layer for TON.

This package isolates everything that touches the TON network:

  * `units`     — nanoton / jetton decimal conversions (pure).
  * `address`   — TON address codec: raw <-> user-friendly (pure, CRC16).
  * `tonapi`    — async REST client for https://tonapi.io.
  * `verifier`  — on-chain confirmation of payments and NFT ownership.
  * `wallet`    — OPTIONAL treasury wallet signing (tonutils), for the
                  Stars path only.

Nothing else in the app imports `tonutils` directly; if TON tooling changes,
the blast radius stays inside this package.
"""
