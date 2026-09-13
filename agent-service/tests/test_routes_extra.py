"""
Additional tests for API routes to improve coverage.
"""
import pytest
from pydantic import ValidationError

from src.api.routes import SearchRequest, ScoreRequest, HealthResponse


def test_search_request_validation():
    """Test SearchRequest model validation."""
    # Valid request
    request = SearchRequest(
        query="Software Engineer",
        job_id="job-123",
        max_results=15,
        offset=5
    )
    assert request.query == "Software Engineer"
    assert request.job_id == "job-123"
    assert request.max_results == 15
    assert request.offset == 5


def test_search_request_min_length_validation():
    """Test that query must be at least 3 characters."""
    with pytest.raises(ValidationError) as exc_info:
        SearchRequest(query="ab")
    
    errors = exc_info.value.errors()
    assert any("min_length" in str(err) for err in errors)


def test_search_request_max_results_validation():
    """Test that max_results must be between 1 and 50."""
    with pytest.raises(ValidationError):
        SearchRequest(query="Test", max_results=0)
    
    with pytest.raises(ValidationError):
        SearchRequest(query="Test", max_results=51)


def test_search_request_offset_validation():
    """Test that offset must be non-negative."""
    with pytest.raises(ValidationError):
        SearchRequest(query="Test", offset=-1)


def test_search_request_defaults():
    """Test that SearchRequest has correct defaults."""
    request = SearchRequest(query="Test")
    assert request.job_id is None
    assert request.search_request_id is None
    assert request.max_results == 10
    assert request.offset == 0


def test_score_request_basic():
    """Test ScoreRequest model."""
    profile = {"name": "Test", "skills": ["Python"]}
    criteria = {"required_skills": ["Python"]}
    
    request = ScoreRequest(profile=profile, criteria=criteria)
    assert request.profile == profile
    assert request.criteria == criteria


def test_health_response_basic():
    """Test HealthResponse model."""
    response = HealthResponse(
        status="ok",
        agent="Sourcing Agent",
        model="llama-3.3-70b",
        data_sources={"serpapi": True, "apollo": False},
        groq_configured=True,
        database_connected=True
    )
    
    assert response.status == "ok"
    assert response.agent == "Sourcing Agent"
    assert response.model == "llama-3.3-70b"
    assert response.data_sources["serpapi"] is True
    assert response.groq_configured is True
    assert response.database_connected is True