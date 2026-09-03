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
async def test_filter_and_record_duplicates_first_and_second_visit():
    mock_conn = MagicMock()

    # First call: times_seen = 1
    # Second call: times_seen = 2
    mock_conn.fetchrow = AsyncMock(
        side_effect=[
            {"times_seen": 1},
            {"times_seen": 2},
        ]
    )
    mock_conn.close = AsyncMock()

    with patch("src.mcp_server.tools.dedup._get_conn", new_callable=AsyncMock, return_value=mock_conn):
        profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice"},
            {"id": "p2", "full_name": "Alice", "linkedin_url": "https://linkedin.com/in/alice"},
        ]
        tagged = await filter_and_record_duplicates(profiles)

        assert tagged[0]["is_duplicate"] is False
        assert tagged[0]["times_seen"] == 1

        assert tagged[1]["is_duplicate"] is True
        assert tagged[1]["times_seen"] == 2


@pytest.mark.asyncio
async def test_filter_and_record_duplicates_db_error_fallback():
    with patch("src.mcp_server.tools.dedup._get_conn", side_effect=Exception("Database connection timeout")):
        profiles = [{"id": "p1", "full_name": "Bob"}]
        tagged = await filter_and_record_duplicates(profiles)

        assert len(tagged) == 1
        assert tagged[0]["is_duplicate"] is False
        assert tagged[0]["times_seen"] == 1
