"""
db_pool.py — PostgreSQL connection pool for agent service.

Provides a singleton asyncpg connection pool shared across all modules
to avoid creating new connections for each database operation.
"""
import logging

import asyncpg

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global connection pool instance
_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the global PostgreSQL connection pool."""
    global _pool
    if _pool is None:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        _pool = await asyncpg.create_pool(
            dsn,
            min_size=2,
            max_size=10,
            timeout=5.0,
            command_timeout=30.0,
        )
        logger.info("[db_pool] PostgreSQL connection pool created (min=2, max=10)")
    return _pool


async def close_pool() -> None:
    """Close the global connection pool. Call this on application shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("[db_pool] PostgreSQL connection pool closed")


async def get_connection() -> asyncpg.Connection:
    """Acquire a connection from the pool. Use as async context manager."""
    pool = await get_pool()
    return await pool.acquire()
