"""
Additional tests for outreach.py to improve coverage.
"""
from src.mcp_server.tools.outreach import (
    _build_candidate_context,
    _clean_llm_text,
)


def test_build_candidate_context_with_all_fields():
    """Test building candidate context with all fields."""
    candidate = {
        "full_name": "John Doe",
        "headline": "Senior Developer",
        "skills": ["Python", "FastAPI", "Docker"],
        "experiences": [
            {"description": "Built scalable APIs"}
        ]
    }
    
    context = _build_candidate_context(candidate)
    
    assert "John Doe" in context
    assert "Senior Developer" in context
    assert "Python" in context
    assert "Built scalable APIs" in context


def test_build_candidate_context_minimal():
    """Test building candidate context with minimal fields."""
    candidate = {"full_name": "Jane Smith"}
    
    context = _build_candidate_context(candidate)
    
    assert "Jane Smith" in context
    assert "N/A" in context


def test_build_candidate_context_empty():
    """Test building candidate context with empty dict."""
    candidate = {}
    
    context = _build_candidate_context(candidate)
    
    assert "the candidate" in context


def test_clean_llm_text_simple():
    """Test cleaning simple LLM text."""
    class MockResponse:
        content = "Simple text"
    
    result = _clean_llm_text(MockResponse())
    
    assert result == "Simple text"


def test_clean_llm_text_with_think_block():
    """Test cleaning text with think block."""
    class MockResponse:
        content = 'Some reasoning\nFinal answer'
    
    result = _clean_llm_text(MockResponse())
    
    assert "Final answer" in result


def test_clean_llm_text_empty_content():
    """Test cleaning text with empty content."""
    class MockResponse:
        content = ""
        additional_kwargs = {"reasoning_content": "Alternative content"}
    
    result = _clean_llm_text(MockResponse())
    
    assert result == "Alternative content"


def test_clean_llm_text_empty_string():
    """Test cleaning text that results in empty string."""
    class MockResponse:
        content = "  \n  "
    
    result = _clean_llm_text(MockResponse())
    
    assert result == ""