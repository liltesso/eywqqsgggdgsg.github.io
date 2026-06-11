"""Merchant Partners — NFT Rental & Sale backend.

A thin broker over the MarketApp (MRKT) API. The frontend Mini App talks
only to this backend; this backend talks to MRKT. All MRKT integration is
isolated in `app.marketapp` (Repository pattern) so that an upstream API
change touches exactly one file.
"""

__version__ = "1.0.0"
