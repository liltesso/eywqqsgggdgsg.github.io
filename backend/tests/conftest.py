"""Pytest setup: configure env BEFORE any `app.*` import so that the global
SQLAlchemy engine in `app.database` binds to the test DB, not a real one.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

# Run at conftest import time — i.e. before any test (and thus before any
# `from app...` import inside tests). This is the only reliable way to
# pre-seed env vars for a module that creates an engine at import.
_TMP = tempfile.mkdtemp(prefix="mp_test_")
_DB = Path(_TMP) / "test.db"

os.environ.setdefault("MARKETAPP_API_TOKEN", "test_token")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:TESTTOKEN")
os.environ.setdefault("TELEGRAM_WEBHOOK_SECRET", "secret123")
os.environ.setdefault("MERCHANT_WALLET", "0:" + "dd" * 32)
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_DB}")
os.environ.setdefault("ENABLE_CONFIRMATION_WORKER", "false")
