"""Application configuration loaded from environment / .env file."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # MarketApp
    marketapp_api_token: str = ""
    marketapp_base_url: str = "https://api.marketapp.ws"

    # Telegram
    telegram_bot_token: str = ""
    public_base_url: str = ""
    telegram_webhook_secret: str = "change_me"

    # Pricing / markup
    markup_percent: float = 15.0
    merchant_wallet: str = ""
    stars_per_ton: float = 77.0

    # Caching
    catalog_cache_ttl: int = 8

    # Database
    database_url: str = "sqlite+aiosqlite:///./rental.db"

    # CORS
    cors_origins: str = "*"

    # Optional treasury / TON signing path
    wallet_mnemonic: str = ""

    # TON blockchain / TonAPI (on-chain verification)
    tonapi_key: str = ""
    tonapi_base_url: str = "https://tonapi.io"
    testnet: bool = False
    # USDT jetton master (mainnet). Used for jetton-priced sales.
    usdt_jetton_master: str = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"

    # Order confirmation worker
    confirm_poll_interval: int = 6        # seconds between confirmation sweeps
    confirm_timeout: int = 600            # seconds before a pending order expires
    enable_confirmation_worker: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def markup_multiplier(self) -> float:
        """e.g. markup_percent=15 -> 1.15"""
        return 1.0 + self.markup_percent / 100.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
