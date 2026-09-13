"""
Test MCP server registration and tool wrappers.
"""
import pytest
from unittest.mock import AsyncMock, patch

from src.mcp_server.server import (
    search_candidate_profiles,
    enrich_candidate_profile,
    score_candidate_profile,
)


@pytest.mark.asyncio
async def test_search_candidate_profiles():
    """Test that search_candidate_profiles calls search_profiles with correct parameters."""
    mock_search = AsyncMock(return_value=[{"id": "1", "name": "Test"}])
    
    with patch("src.mcp_server.server.search_profiles", mock_search):
        result = await search_candidate_profiles(
            job_title="Software Engineer",
            required_skills=["Python", "FastAPI"],
            location="Casablanca",
            seniority="Senior",
            limit=10
        )
        
        mock_search.assert_awaited_once_with(
            {
                "job_title": "Software Engineer",
                "required_skills": ["Python", "FastAPI"],
                "location": "Casablanca",
                "seniority": "Senior",
            },
            limit=10
        )
        assert result == [{"id": "1", "name": "Test"}]


@pytest.mark.asyncio
async def test_search_candidate_profiles_defaults():
    """Test that search_candidate_profiles uses default values."""
    mock_search = AsyncMock(return_value=[])
    
    with patch("src.mcp_server.server.search_profiles", mock_search):
        await search_candidate_profiles(
            job_title="Developer",
            required_skills=["Python"]
        )
        
        mock_search.assert_awaited_once()
        call_args = mock_search.call_args
        assert call_args[0][0]["location"] == "Any"
        assert call_args[0][0]["seniority"] == "Any"
        assert call_args[1]["limit"] == 20


@pytest.mark.asyncio
async def test_enrich_candidate_profile():
    """Test that enrich_candidate_profile calls enrich_profile with correct parameters."""
    mock_enrich = AsyncMock(return_value={"name": "Test", "skills": ["Python"]})
    
    with patch("src.mcp_server.server.enrich_profile", mock_enrich):
        result = await enrich_candidate_profile(
            linkedin_url="https://linkedin.com/in/test",
            snippet_hint="Senior Python Developer"
        )
        
        mock_enrich.assert_awaited_once_with(
            linkedin_url="https://linkedin.com/in/test",
            snippet_hint="Senior Python Developer"
        )
        assert result == {"name": "Test", "skills": ["Python"]}


@pytest.mark.asyncio
async def test_enrich_candidate_profile_defaults():
    """Test that enrich_candidate_profile uses default snippet_hint."""
    mock_enrich = AsyncMock(return_value={})
    
    with patch("src.mcp_server.server.enrich_profile", mock_enrich):
        await enrich_candidate_profile(linkedin_url="https://linkedin.com/in/test")
        
        mock_enrich.assert_awaited_once_with(
            linkedin_url="https://linkedin.com/in/test",
            snippet_hint=""
        )


@pytest.mark.asyncio
async def test_score_candidate_profile():
    """Test that score_candidate_profile calls score_profile with correct parameters."""
    mock_score = AsyncMock(return_value={"score": 85, "match": True})
    
    with patch("src.mcp_server.server.score_profile", mock_score):
        profile = {"name": "Test", "skills": ["Python"]}
        criteria = {"required_skills": ["Python", "FastAPI"]}
        
        result = await score_candidate_profile(profile, criteria)
        
        mock_score.assert_awaited_once_with(profile, criteria)
        assert result == {"score": 85, "match": True}
