# ─── Core web stack ──────────────────────────────────────────────
fastapi==0.115.6
uvicorn[standard]==0.34.0
httpx==0.28.1
pydantic==2.10.4
pydantic-settings==2.7.1

# ─── Database (async) ────────────────────────────────────────────
SQLAlchemy[asyncio]==2.0.36
aiosqlite==0.20.0
# Uncomment for PostgreSQL in production:
# asyncpg==0.30.0

# ─── Telegram ────────────────────────────────────────────────────
# No bot framework needed — we use the Bot API directly over httpx and
# receive updates through the FastAPI webhook route.

# ─── TON wallet signing (ONLY needed for the Stars/treasury path) ─
# The default TonConnect flow does NOT require these.
# tonutils==0.3.5

# ─── Dev / tests ─────────────────────────────────────────────────
# pytest==8.3.4
