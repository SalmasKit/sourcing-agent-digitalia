"""
Additional tests for search_profiles.py helper functions.
"""
import pytest

from src.mcp_server.tools.search_profiles import (
    _resolve_linkedin_url,
    _parse_json_from_llm,
)


def test_resolve_linkedin_url_from_link_field():
    """Test extracting LinkedIn URL from link field."""
    result = {
        "link": "https://www.linkedin.com/in/john-doe-123"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/john-doe-123"


def test_resolve_linkedin_url_from_redirect_link():
    """Test extracting LinkedIn URL from redirect_link field."""
    result = {
        "link": "https://google.com/goto?url=...",
        "redirect_link": "https://www.linkedin.com/in/jane-smith"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/jane-smith"


def test_resolve_linkedin_url_from_displayed_link():
    """Test extracting LinkedIn URL from displayed_link field."""
    result = {
        "link": "https://google.com/goto?url=...",
        "redirect_link": None,
        "displayed_link": "https://www.linkedin.com/in/bob-wilson"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/bob-wilson"


def test_resolve_linkedin_url_from_title():
    """Test extracting LinkedIn URL from title field."""
    result = {
        "link": "https://example.com",
        "title": "John Doe - https://www.linkedin.com/in/john-doe-abc"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/john-doe-abc"


def test_resolve_linkedin_url_from_snippet():
    """Test extracting LinkedIn URL from snippet field."""
    result = {
        "link": "https://example.com",
        "title": "John Doe Profile",
        "snippet": "View profile at https://www.linkedin.com/in/john-doe-xyz"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/john-doe-xyz"


def test_resolve_linkedin_url_strips_language_suffix():
    """Test that language suffixes are stripped from LinkedIn URLs."""
    result = {
        "link": "https://www.linkedin.com/in/john-doe/en"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == "https://www.linkedin.com/in/john-doe"


def test_resolve_linkedin_url_not_found():
    """Test that empty string is returned when no LinkedIn URL is found."""
    result = {
        "link": "https://example.com",
        "title": "John Doe",
        "snippet": "Profile page"
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == ""


def test_resolve_linkedin_url_handles_empty_fields():
    """Test that empty or None fields are handled gracefully."""
    result = {
        "link": None,
        "redirect_link": "",
        "displayed_link": None
    }
    
    url = _resolve_linkedin_url(result)
    
    assert url == ""


def test_parse_json_from_llm_clean_json():
    """Test parsing clean JSON from LLM response."""
    raw = '{"name": "John", "score": 85}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_with_markdown():
    """Test parsing JSON with markdown code fences."""
    raw = '```json\n{"name": "John", "score": 85}\n```'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_with_think_block():
    """Test parsing JSON with think blocks removed."""
    raw = '<think>Some reasoning</think>\n{"name": "John", "score": 85}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_with_markdown_and_think():
    """Test parsing JSON with both markdown and think blocks."""
    raw = '<think>Reasoning</think>\n```json\n{"name": "John", "score": 85}\n```'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_invalid_json():
    """Test that invalid JSON returns None."""
    raw = "This is not JSON"
    
    result = _parse_json_from_llm(raw)
    
    assert result is None


def test_parse_json_from_llm_empty_string():
    """Test that empty string returns None."""
    raw = ""
    
    result = _parse_json_from_llm(raw)
    
    assert result is None