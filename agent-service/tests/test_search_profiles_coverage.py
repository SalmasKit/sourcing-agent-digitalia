"""
Coverage-focused tests for search_profiles.py to improve coverage.
"""
import pytest
from unittest.mock import AsyncMock, patch
import json

from src.mcp_server.tools.search_profiles import (
    _resolve_linkedin_url,
    _parse_json_from_llm,
)


class TestResolveLinkedInUrl:
    """Test LinkedIn URL resolution logic."""

    def test_resolve_linkedin_url_from_link_field(self):
        """Test resolving LinkedIn URL from link field."""
        result = {
            "link": "https://www.linkedin.com/in/john-doe"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/john-doe"

    def test_resolve_linkedin_url_from_redirect_link(self):
        """Test resolving LinkedIn URL from redirect_link field."""
        result = {
            "link": "https://google.com/goto?url=...",
            "redirect_link": "https://www.linkedin.com/in/jane-smith"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/jane-smith"

    def test_resolve_linkedin_url_from_displayed_link(self):
        """Test resolving LinkedIn URL from displayed_link field."""
        result = {
            "link": "https://google.com/goto?url=...",
            "redirect_link": "https://google.com/goto?url=...",
            "displayed_link": "linkedin.com/in/bob-johnson"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/bob-johnson"

    def test_resolve_linkedin_url_from_title(self):
        """Test resolving LinkedIn URL from title field."""
        result = {
            "link": "https://google.com/goto?url=...",
            "title": "John Doe - https://www.linkedin.com/in/john-doe"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/john-doe"

    def test_resolve_linkedin_url_from_snippet(self):
        """Test resolving LinkedIn URL from snippet field."""
        result = {
            "link": "https://google.com/goto?url=...",
            "snippet": "See profile at linkedin.com/in/jane-smith"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/jane-smith"

    def test_resolve_linkedin_url_with_language_suffix(self):
        """Test resolving LinkedIn URL with language suffix."""
        result = {
            "link": "https://www.linkedin.com/in/john-doe/en"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == "https://www.linkedin.com/in/john-doe"
        assert "/en" not in url

    def test_resolve_linkedin_url_empty_result(self):
        """Test resolving LinkedIn URL with empty result."""
        result = {}
        
        url = _resolve_linkedin_url(result)
        
        assert url == ""

    def test_resolve_linkedin_url_no_linkedin_url(self):
        """Test resolving LinkedIn URL when no LinkedIn URL present."""
        result = {
            "link": "https://example.com/john-doe"
        }
        
        url = _resolve_linkedin_url(result)
        
        assert url == ""


class TestParseJsonFromLLM:
    """Test JSON parsing from LLM responses."""

    def test_parse_json_clean_input(self):
        """Test parsing clean JSON input."""
        raw = '{"name": "John", "age": 30}'
        
        result = _parse_json_from_llm(raw)
        
        assert result == {"name": "John", "age": 30}

    def test_parse_json_with_markdown_fence(self):
        """Test parsing JSON with markdown fence."""
        raw = '```json\n{"name": "John", "age": 30}\n```'
        
        result = _parse_json_from_llm(raw)
        
        assert result == {"name": "John", "age": 30}

    def test_parse_json_with_think_blocks(self):
        """Test parsing JSON with think blocks."""
        raw = 'Let me think about this...\n{"name": "John", "age": 30}'
        
        result = _parse_json_from_llm(raw)
        
        assert result == {"name": "John", "age": 30}

    def test_parse_json_invalid_json(self):
        """Test parsing invalid JSON."""
        raw = 'This is not JSON'
        
        result = _parse_json_from_llm(raw)
        
        assert result is None

    def test_parse_json_empty_string(self):
        """Test parsing empty string."""
        raw = ""
        
        result = _parse_json_from_llm(raw)
        
        assert result is None

    def test_parse_json_nested_json(self):
        """Test parsing nested JSON."""
        raw = '{"person": {"name": "John", "details": {"age": 30}}}'
        
        result = _parse_json_from_llm(raw)
        
        assert result == {"person": {"name": "John", "details": {"age": 30}}}

    def test_parse_json_array(self):
        """Test parsing JSON array."""
        raw = '[{"name": "John"}, {"name": "Jane"}]'
        
        result = _parse_json_from_llm(raw)
        
        assert result == [{"name": "John"}, {"name": "Jane"}]

    def test_parse_json_with_whitespace(self):
        """Test parsing JSON with extra whitespace."""
        raw = '  \n  {"name": "John", "age": 30}  \n  '
        
        result = _parse_json_from_llm(raw)
        
        assert result == {"name": "John", "age": 30}


class TestLinkedInSlugExtraction:
    """Test LinkedIn slug extraction patterns."""

    def test_slug_extraction_basic(self):
        """Test basic slug extraction."""
        url = "https://www.linkedin.com/in/john-doe"
        
        import re
        LINKEDIN_SLUG_RE = re.compile(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE)
        m = LINKEDIN_SLUG_RE.search(url)
        
        assert m is not None
        assert m.group(1) == "john-doe"

    def test_slug_extraction_with_special_chars(self):
        """Test slug extraction with special characters."""
        url = "https://www.linkedin.com/in/john_doe-123"
        
        import re
        LINKEDIN_SLUG_RE = re.compile(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE)
        m = LINKEDIN_SLUG_RE.search(url)
        
        assert m is not None
        assert m.group(1) == "john_doe-123"

    def test_slug_extraction_with_trailing_slash(self):
        """Test slug extraction with trailing slash."""
        url = "https://www.linkedin.com/in/john-doe/"
        
        import re
        LINKEDIN_SLUG_RE = re.compile(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE)
        m = LINKEDIN_SLUG_RE.search(url)
        
        assert m is not None
        slug = m.group(1).rstrip("/")
        assert slug == "john-doe"

    def test_slug_extraction_case_insensitive(self):
        """Test slug extraction is case insensitive."""
        url = "https://www.LINKEDIN.COM/in/John-Doe"
        
        import re
        LINKEDIN_SLUG_RE = re.compile(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE)
        m = LINKEDIN_SLUG_RE.search(url)
        
        assert m is not None
        assert m.group(1) == "John-Doe"
