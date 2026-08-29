import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg
from pgvector.asyncpg import register_vector

from config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    await register_vector(conn)


def _connect_kwargs(dsn: str) -> dict:
    # min_size=0: do not open a connection during uvicorn startup.
    # Direct db.*.supabase.co:5432 often hangs on Windows IPv6 until timeout.
    kwargs: dict = {
        "dsn": dsn,
        "min_size": 0,
        "max_size": 5,
        "timeout": 30,
        "init": _init_connection,
    }
    if "supabase.co" in dsn or "supabase.com" in dsn:
        kwargs["ssl"] = "require"
    return kwargs


async def init_pool() -> None:
    global _pool
    dsn = get_settings().supabase_db_connection_string.strip()
    if not dsn:
        _pool = None
        return
    try:
        _pool = await asyncpg.create_pool(**_connect_kwargs(dsn))
    except Exception:
        logger.exception(
            "Could not create the Postgres pool. "
            "Use the Supabase Session pooler URI (port 6543), not db.*.supabase.co:5432, "
            "if connections time out on Windows."
        )
        _pool = None


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
