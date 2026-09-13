"""
Test agent state definition.
"""
from src.agent.state import SourcingState


def test_sourcing_state_basic_structure():
    """Test that SourcingState can be instantiated with all required fields."""
    state = SourcingState(
        raw_query="Software Engineer",
        job_id="job-123",
        max_results=10,
        offset=0,
        criteria={"job_title": "Software Engineer"},
        raw_profiles=[],
        scored_profiles=[],
        final_output={},
        messages=[],
        error=None
    )
    
    assert state["raw_query"] == "Software Engineer"
    assert state["job_id"] == "job-123"
    assert state["max_results"] == 10
    assert state["offset"] == 0
    assert state["criteria"]["job_title"] == "Software Engineer"
    assert state["raw_profiles"] == []
    assert state["scored_profiles"] == []
    assert state["final_output"] == {}
    assert state["messages"] == []
    assert state["error"] is None


def test_sourcing_state_with_error():
    """Test that SourcingState can hold error information."""
    state = SourcingState(
        raw_query="Test",
        job_id=None,
        max_results=5,
        offset=0,
        criteria={},
        raw_profiles=[],
        scored_profiles=[],
        final_output={},
        messages=[],
        error="API rate limit exceeded"
    )
    
    assert state["error"] == "API rate limit exceeded"


def test_sourcing_state_with_profiles():
    """Test that SourcingState can hold profile data."""
    profile = {"id": "1", "name": "Test Candidate"}
    state = SourcingState(
        raw_query="Test",
        job_id=None,
        max_results=5,
        offset=0,
        criteria={},
        raw_profiles=[profile],
        scored_profiles=[profile],
        final_output={"profiles": [profile]},
        messages=[],
        error=None
    )
    
    assert len(state["raw_profiles"]) == 1
    assert state["raw_profiles"][0]["name"] == "Test Candidate"
    assert len(state["scored_profiles"]) == 1
    assert state["final_output"]["profiles"][0]["name"] == "Test Candidate"