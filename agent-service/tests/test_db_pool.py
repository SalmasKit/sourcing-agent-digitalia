"""
Unit tests for db_pool module.
"""
from unittest.mock import AsyncMock, patch

import pytest

from src.mcp_server.tools.db_pool import close_pool, get_connection, get_pool


@pytest.fixture(autouse=True)
def reset_pool():
    """Reset the global pool before and after each test to prevent singleton leaks."""
    import src.mcp_server.tools.db_pool as m
    m._pool = None
    yield
    m._pool = None


@pytest.mark.asyncio
async def test_get_pool_creates_pool_on_first_call():
    """Test that get_pool creates a new pool on first call."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
        pool = await get_pool()

        assert pool is mock_pool


@pytest.mark.asyncio
async def test_get_pool_returns_singleton():
    """Test that get_pool returns the same pool instance on subsequent calls."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
        pool1 = await get_pool()
        pool2 = await get_pool()

        assert pool1 is pool2


@pytest.mark.asyncio
async def test_get_pool_replaces_dsn_prefix():
    """Test that get_pool replaces postgresql+asyncpg:// with postgresql://."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool) as mock_create_pool:
        with patch("src.mcp_server.tools.db_pool.settings") as mock_settings:
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"
            await get_pool()

            call_args = mock_create_pool.call_args
            dsn_arg = call_args[0][0]
            assert dsn_arg.startswith("postgresql://")
            assert "postgresql+asyncpg://" not in dsn_arg


@pytest.mark.asyncio
async def test_get_pool_configures_pool_parameters():
    """Test that get_pool configures pool with correct parameters."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool) as mock_create_pool:
        await get_pool()

        call_args = mock_create_pool.call_args
        kwargs = call_args[1]
        assert kwargs["min_size"] == 2
        assert kwargs["max_size"] == 10
        assert kwargs["timeout"] == 5.0
        assert kwargs["command_timeout"] == 30.0


@pytest.mark.asyncio
async def test_close_pool_closes_existing_pool():
    """Test that close_pool closes the existing pool."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
        await get_pool()
        await close_pool()

        mock_pool.close.assert_called_once()


@pytest.mark.asyncio
async def test_close_pool_sets_pool_to_none():
    """Test that close_pool sets the global pool to None."""
    mock_pool = AsyncMock()
    with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
        await get_pool()
        await close_pool()

        # Create a new pool to verify the old one was set to None
        mock_pool2 = AsyncMock()
        with patch("src.mcp_server.tools.db_pool.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool2) as mock_create_pool:
            await get_pool()

            mock_create_pool.assert_called()  # Should be called twice now


@pytest.mark.asyncio
async def test_close_pool_does_nothing_when_pool_is_none():
    """Test that close_pool does nothing when pool is already None."""
    with patch("src.mcp_server.tools.db_pool._pool", None):
        await close_pool()
        # Should not raise an exception


@pytest.mark.asyncio
async def test_get_connection_acquires_from_pool():
    """Test that get_connection acquires a connection from the pool."""
    with patch("src.mcp_server.tools.db_pool.get_pool") as mock_get_pool:
        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire.return_value = mock_conn
        mock_get_pool.return_value = mock_pool

        conn = await get_connection()

        assert conn is mock_conn
        mock_pool.acquire.assert_called_once()


@pytest.mark.asyncio
async def test_get_connection_calls_get_pool():
    """Test that get_connection calls get_pool to get the pool."""
    with patch("src.mcp_server.tools.db_pool.get_pool") as mock_get_pool:
        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire.return_value = mock_conn
        mock_get_pool.return_value = mock_pool

        await get_connection()

        mock_get_pool.assert_called_once()
