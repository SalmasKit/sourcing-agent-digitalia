"""
Additional tests for score_profile.py helper functions.
"""
from unittest.mock import patch

from src.mcp_server.tools.score_profile import (
    _get_llm,
    _build_job_context,
    _build_profile_context,
    _build_candidate_corpus,
)


def test_get_llm_with_credentials():
    """Test that LLM is created when credentials are configured."""
    with patch('src.mcp_server.tools.score_profile.settings') as mock_settings:
        mock_settings.groq_api_key = "test_key"
        mock_settings.groq_model = "llama-3.3-70b"
        mock_settings.groq_temperature = 0.1
        
        llm = _get_llm()
        
        assert llm is not None


def test_get_llm_without_credentials():
    """Test that LLM is None when credentials are missing."""
    with patch('src.mcp_server.tools.score_profile.settings') as mock_settings:
        mock_settings.groq_api_key = None
        mock_settings.groq_model = None
        
        llm = _get_llm()
        
        assert llm is None


def test_build_job_context_full():
    """Test building job context with all fields."""
    criteria = {
        "job_title": "Software Engineer",
        "seniority": "Senior",
        "required_skills": ["Python", "FastAPI"],
        "nice_to_have_skills": ["Docker", "Kubernetes"],
        "location": "Remote",
        "min_experience_years": 5
    }
    
    context = _build_job_context(criteria)
    
    assert "Title: Software Engineer" in context
    assert "Seniority: Senior" in context
    assert "Required skills (must-have): Python, FastAPI" in context
    assert "Nice-to-have skills (bonus, not disqualifying): Docker, Kubernetes" in context
    assert "Location: Remote" in context
    assert "Min experience: 5 years" in context


def test_build_job_context_minimal():
    """Test building job context with minimal fields."""
    criteria = {"job_title": "Developer"}
    
    context = _build_job_context(criteria)
    
    assert "Title: Developer" in context
    assert "Seniority" not in context


def test_build_profile_context_full():
    """Test building profile context with all fields."""
    profile = {
        "full_name": "John Doe",
        "headline": "Senior Developer",
        "experience_years": 10,
        "location": "New York",
        "skills": ["Python", "Java"],
        "summary": "Experienced developer"
    }
    
    context = _build_profile_context(profile)
    
    assert "Name: John Doe" in context
    assert "Title: Senior Developer" in context
    assert "Experience: 10 years" in context
    assert "Location: New York" in context
    assert "Skills: Python, Java" in context
    assert "Summary: Experienced developer" in context


def test_build_profile_context_minimal():
    """Test building profile context with minimal fields."""
    profile = {"full_name": "Jane Smith"}
    
    context = _build_profile_context(profile)
    
    assert "Name: Jane Smith" in context
    assert "Title" not in context


def test_build_candidate_corpus_with_skills():
    """Test building candidate corpus with skills."""
    profile = {
        "skills": ["Python", "FastAPI", "Docker"],
        "headline": "Backend Developer",
        "summary": "Expert in Python"
    }
    
    corpus, skills = _build_candidate_corpus(profile)
    
    assert "python" in corpus
    assert "fastapi" in corpus
    assert "docker" in corpus
    assert "backend developer" in corpus
    assert "expert in python" in corpus
    assert "python" in skills
    assert "fastapi" in skills
    assert "docker" in skills


def test_build_candidate_corpus_with_experiences():
    """Test building candidate corpus with experience entries."""
    profile = {
        "experiences": [
            {"title": "Senior Developer", "description": "Built APIs"},
            {"role": "Tech Lead", "description": "Led team"}
        ]
    }
    
    corpus, skills = _build_candidate_corpus(profile)
    
    assert "senior developer" in corpus
    assert "built apis" in corpus
    assert "tech lead" in corpus
    assert "led team" in corpus


def test_build_candidate_corpus_with_extensions():
    """Test building candidate corpus with extensions."""
    profile = {
        "extensions": ["Open source contributor", "Speaker"]
    }
    
    corpus, skills = _build_candidate_corpus(profile)
    
    assert "open source contributor" in corpus
    assert "speaker" in corpus


def test_build_candidate_corpus_empty_profile():
    """Test building candidate corpus with empty profile."""
    corpus, skills = _build_candidate_corpus({})
    
    assert corpus == ""
    assert skills == []


def test_build_candidate_corpus_handles_non_string_skills():
    """Test that non-string skills are filtered out."""
    profile = {
        "skills": ["Python", None, 123, "FastAPI", ""]
    }
    
    corpus, skills = _build_candidate_corpus(profile)
    
    assert "python" in corpus
    assert "fastapi" in corpus
    assert len(skills) == 2