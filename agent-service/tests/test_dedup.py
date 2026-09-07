"""
test_dedup.py — Unit tests for cross-search candidate deduplication tool.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.mcp_server.tools.dedup import _canonical_fingerprint, filter_and_record_duplicates


def test_canonical_fingerprint_linkedin_url():
    profile = {
        "full_name": "Youssef Alami",
        "linkedin_url": "https://www.linkedin.com/in/youssef-alami-12345/",
        "current_company": "OCP Group",
    }
    fp = _canonical_fingerprint(profile)
    assert fp == "li:youssef-alami-12345"


def test_canonical_fingerprint_fallback_name_company():
    profile_a = {
        "full_name": "Fatima Zahra",
        "linkedin_url": "",
        "current_company": "Maroc Telecom",
    }
    profile_b = {
        "full_name": "Fatima  Zahra",
        "linkedin_url": None,
        "current_company": "maroc telecom",
    }
    # Name and company normalization should produce identical fingerprints
    assert _canonical_fingerprint(profile_a) == _canonical_fingerprint(profile_b)
    assert _canonical_fingerprint(profile_a).startswith("nc:")


@pytest.mark.asyncio
async def test_filter_and_record_duplicates_db_unavailable_fallback():
    """Test fallback behavior when DB is unavailable."""
    with patch("src.mcp_server.tools.dedup.get_pool", side_effect=Exception("DB unavailable")):
        profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice"},
            {"id": "p2", "full_name": "Bob", "linkedin_url": "https://linkedin.com/in/bob"},
        ]
        tagged = await filter_and_record_duplicates(profiles)

        # Fallback should set default values
        assert tagged[0]["is_duplicate"] is False
        assert tagged[0]["times_seen"] == 1
        assert tagged[1]["is_duplicate"] is False
        assert tagged[1]["times_seen"] == 1


@pytest.mark.asyncio
async def test_filter_and_record_duplicates_first_visit():
    """Test first visit: times_seen=1, is_duplicate=False."""
    mock_conn = AsyncMock()
    # First insert returns times_seen=1
    mock_conn.fetchrow.return_value = {"times_seen": 1}

    # Create proper async context manager mock
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_context_manager.__aexit__ = AsyncMock(return_value=None)

    with patch("src.mcp_server.tools.dedup.get_pool", new_callable=AsyncMock) as mock_get_pool:
        mock_pool = AsyncMock()
        mock_pool.acquire = MagicMock(return_value=mock_context_manager)
        mock_get_pool.return_value = mock_pool

        profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice-123"},
        ]
        tagged = await filter_and_record_duplicates(profiles)

        assert tagged[0]["is_duplicate"] is False
        assert tagged[0]["times_seen"] == 1
        assert "fingerprint" in tagged[0]
        assert tagged[0]["fingerprint"] == "li:alice-123"


@pytest.mark.asyncio
async def test_filter_and_record_duplicates_second_visit():
    """Test second visit: times_seen=2, is_duplicate=True."""
    mock_conn = AsyncMock()
    # Second insert returns times_seen=2 (duplicate)
    mock_conn.fetchrow.return_value = {"times_seen": 2}

    # Create proper async context manager mock
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_context_manager.__aexit__ = AsyncMock(return_value=None)

    with patch("src.mcp_server.tools.dedup.get_pool", new_callable=AsyncMock) as mock_get_pool:
        mock_pool = AsyncMock()
        mock_pool.acquire = MagicMock(return_value=mock_context_manager)
        mock_get_pool.return_value = mock_pool

        profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice-123"},
        ]
        tagged = await filter_and_record_duplicates(profiles)

        assert tagged[0]["is_duplicate"] is True
        assert tagged[0]["times_seen"] == 2


@pytest.mark.asyncio
async def test_filter_and_record_duplicates_mixed_profiles():
    """Test mixed profiles: some first-time, some duplicates."""
    mock_conn = AsyncMock()
    # Sequential returns: first profile is new (1), second is duplicate (2), third is new (1)
    mock_conn.fetchrow.side_effect = [
        {"times_seen": 1},
        {"times_seen": 2},
        {"times_seen": 1},
    ]

    # Create proper async context manager mock
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_context_manager.__aexit__ = AsyncMock(return_value=None)

    with patch("src.mcp_server.tools.dedup.get_pool", new_callable=AsyncMock) as mock_get_pool:
        mock_pool = AsyncMock()
        mock_pool.acquire = MagicMock(return_value=mock_context_manager)
        mock_get_pool.return_value = mock_pool

        profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice-123"},
            {"id": "p2", "full_name": "Bob", "linkedin_url": "https://linkedin.com/in/bob-456"},
            {"id": "p3", "full_name": "Charlie", "linkedin_url": "https://linkedin.com/in/charlie-789"},
        ]
        tagged = await filter_and_record_duplicates(profiles)

        assert tagged[0]["is_duplicate"] is False
        assert tagged[0]["times_seen"] == 1
        assert tagged[1]["is_duplicate"] is True
        assert tagged[1]["times_seen"] == 2
        assert tagged[2]["is_duplicate"] is False
        assert tagged[2]["times_seen"] == 1
