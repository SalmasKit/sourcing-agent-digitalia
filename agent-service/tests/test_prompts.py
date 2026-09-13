"""
Test prompt templates.
"""
from src.agent.prompts import (
    CRITERIA_EXTRACTION_SYSTEM,
    CRITERIA_EXTRACTION_USER,
    SCORING_SYSTEM,
    SCORING_USER,
)


def test_criteria_extraction_system_prompt_content():
    """Test that system prompt contains expected content."""
    assert "HR sourcing assistant" in CRITERIA_EXTRACTION_SYSTEM
    assert "Targetalent" in CRITERIA_EXTRACTION_SYSTEM
    assert "structured sourcing criteria" in CRITERIA_EXTRACTION_SYSTEM
    assert "required_skills" in CRITERIA_EXTRACTION_SYSTEM
    assert "min_experience_years" in CRITERIA_EXTRACTION_SYSTEM


def test_criteria_extraction_user_prompt_format():
    """Test that user prompt has correct placeholder."""
    assert "{query}" in CRITERIA_EXTRACTION_USER
    assert "Recruiter query:" in CRITERIA_EXTRACTION_USER


def test_scoring_system_prompt_content():
    """Test that scoring system prompt contains expected content."""
    assert "executive recruiter" in SCORING_SYSTEM
    assert "Targetalent" in SCORING_SYSTEM
    assert "semantic understanding" in SCORING_SYSTEM
    assert "match_score" in SCORING_SYSTEM
    assert "skill_match_score" in SCORING_SYSTEM
    assert "matched_skills" in SCORING_SYSTEM
    assert "missing_skills" in SCORING_SYSTEM


def test_scoring_system_score_anchoring():
    """Test that scoring system contains score anchoring guidelines."""
    assert "90-100" in SCORING_SYSTEM
    assert "75-89" in SCORING_SYSTEM
    assert "60-74" in SCORING_SYSTEM
    assert "40-59" in SCORING_SYSTEM


def test_scoring_user_prompt_format():
    """Test that scoring user prompt has correct placeholders."""
    assert "{criteria_json}" in SCORING_USER
    assert "{profile_json}" in SCORING_USER
    assert "Job Requirements:" in SCORING_USER
    assert "Candidate Profile:" in SCORING_USER