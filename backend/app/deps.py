"""Shared FastAPI dependencies: MRKT client and authenticated Telegram user."""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .marketapp import MarketAppClient
from .models import User
from .telegram import validate_init_data


def get_marketapp(request: Request) -> MarketAppClient:
    """Single shared client created in the app lifespan."""
    return request.app.state.marketapp


def get_tonapi(request: Request):
    """Shared TonAPI client created in the app lifespan."""
    return request.app.state.tonapi


async def get_current_user(
    x_telegram_init_data: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate Telegram initData and upsert the user."""
    tg_user = validate_init_data(x_telegram_init_data or "")
    if not tg_user:
        raise HTTPException(status_code=401, detail="Invalid Telegram init data")

    uid = int(tg_user["id"])
    user = await db.get(User, uid)
    if user is None:
        user = User(
            id=uid,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_optional_user(
    x_telegram_init_data: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising.

    Used for the public catalog so it renders even before auth is wired up.
    """
    tg_user = validate_init_data(x_telegram_init_data or "")
    if not tg_user:
        return None
    uid = int(tg_user["id"])
    user = await db.get(User, uid)
    if user is None:
        user = User(id=uid, username=tg_user.get("username"), first_name=tg_user.get("first_name"))
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


__all__ = ["get_marketapp", "get_current_user", "get_optional_user", "select"]
