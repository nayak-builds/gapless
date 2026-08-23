from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from config import get_settings

_pool: asyncpg.Pool | None = None


def _connect_kwargs(dsn: str) -> dict:
    kwargs: dict = {"dsn": dsn, "min_size": 1, "max_size": 5, "timeout": 15}
    if "supabase.co" in dsn:
        kwargs["ssl"] = "require"
    return kwargs


async def init_pool() -> None:
    global _pool
    dsn = get_settings().supabase_db_connection_string.strip()
    if not dsn:
        _pool = None
        return
    _pool = await asyncpg.create_pool(**_connect_kwargs(dsn))


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool


@asynccontextmanager
async def acquire() -> AsyncIterator[asyncpg.Connection]:
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn
