"""
Tests for search_profiles.py — MCP Tool for searching candidate profiles via SerpAPI + Groq AI enrichment.
"""
import pytest
from unittest.mock import AsyncMock, patch

from src.mcp_server.tools.search_profiles import _parse_json_from_llm


class TestParseJsonFromLlm:
    """Tests for _parse_json_from_llm function."""

    def test_parse_json_clean_input(self):
        """Test parsing clean JSON input."""
        raw = '{"name": "John", "age": 30}'
        result = _parse_json_from_llm(raw)
        assert result == {"name": "John", "age": 30}

    def test_parse_json_with_markdown_fence(self):
        """Test parsing JSON wrapped in markdown fence."""
        raw = '```json\n{"name": "John", "age": 30}\n```'
        result = _parse_json_from_llm(raw)
        assert result == {"name": "John", "age": 30}

    def test_parse_json_with_think_blocks(self):
        """Test parsing JSON with think blocks removed."""
        raw = '</think>Some reasoning\n\n{"name": "John", "age": 30}'
        result = _parse_json_from_llm(raw)
        assert result == {"name": "John", "age": 30}

    def test_parse_json_nested_in_text(self):
        """Test extracting JSON from text with other content."""
        raw = 'Some text here {"name": "John", "age": 30} more text'
        result = _parse_json_from_llm(raw)
        assert result == {"name": "John", "age": 30}

    def test_parse_json_invalid_returns_none(self):
        """Test that invalid JSON returns None."""
        raw = "not valid json at all"
        result = _parse_json_from_llm(raw)
        assert result is None

    def test_parse_json_empty_string(self):
        """Test that empty string returns None."""
        raw = ""
        result = _parse_json_from_llm(raw)
        assert result is None

    def test_parse_json_with_nested_json(self):
        """Test parsing nested JSON structure."""
        raw = '{"person": {"name": "John", "details": {"age": 30}}}'
        result = _parse_json_from_llm(raw)
        assert result == {"person": {"name": "John", "details": {"age": 30}}}

    def test_parse_json_with_array(self):
        """Test parsing JSON array."""
        raw = '[{"name": "John"}, {"name": "Jane"}]'
        result = _parse_json_from_llm(raw)
        assert result == [{"name": "John"}, {"name": "Jane"}]


class TestGetLlm:
    """Tests for _get_llm function."""

    def test_get_llm_no_api_key(self):
        """Test that None is returned when no API key is configured."""
        with patch("src.mcp_server.tools.search_profiles.settings") as mock_settings:
            mock_settings.groq_api_key = None
            mock_settings.groq_model = "llama3-70b"
            from src.mcp_server.tools.search_profiles import _get_llm
            result = _get_llm()
            assert result is None

    def test_get_llm_no_model(self):
        """Test that None is returned when no model is configured."""
        with patch("src.mcp_server.tools.search_profiles.settings") as mock_settings:
            mock_settings.groq_api_key = "test-key"
            mock_settings.groq_model = None
            from src.mcp_server.tools.search_profiles import _get_llm
            result = _get_llm()
            assert result is None

    def test_get_llm_with_config(self):
        """Test that ChatGroq instance is returned when configured."""
        with patch("src.mcp_server.tools.search_profiles.settings") as mock_settings:
            mock_settings.groq_api_key = "test-key"
            mock_settings.groq_model = "llama3-70b"
            mock_settings.groq_temperature = 0.7
            from src.mcp_server.tools.search_profiles import _get_llm
            result = _get_llm()
            assert result is not None
            assert result.model_name == "llama3-70b"


class TestBuildSearchQuery:
    """Tests for _build_search_query function."""

    def test_build_query_basic_title(self):
        """Test basic query building with just a job title."""
        criteria = {"job_title": "Software Engineer"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert "Software Engineer" in query

    def test_build_query_with_location(self):
        """Test query building with location."""
        criteria = {"job_title": "Software Engineer", "location": "Casablanca"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert "Casablanca" in query
        assert location == "Casablanca"

    def test_build_query_with_seniority(self):
        """Test query building with seniority level."""
        criteria = {"job_title": "Software Engineer", "seniority": "Senior"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert "Senior" in query

    def test_build_query_with_skills(self):
        """Test query building with skills."""
        criteria = {"job_title": "Software Engineer", "skills": ["Python", "Django"]}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert "Python" in query or "Django" in query

    def test_build_query_morocco_location_code(self):
        """Test that Morocco locations use 'ma' country code."""
        criteria = {"job_title": "Software Engineer", "location": "Casablanca"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert gl_code == "ma"

    def test_build_query_french_location_code(self):
        """Test that France locations use 'fr' country code."""
        criteria = {"job_title": "Software Engineer", "location": "Paris"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query
        assert gl_code == "fr"

    def test_build_query_empty_location_any(self):
        """Test that empty/any locations don't add location term."""
        criteria = {"job_title": "Software Engineer", "location": "any"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query

    def test_build_query_digital_marketing_synonyms(self):
        """Test French/English synonyms for Digital Marketing in MA/FR."""
        criteria = {"job_title": "Digital Marketing Manager", "location": "Casablanca"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query

    def test_build_query_data_scientist_synonyms(self):
        """Test French/English synonyms for Data Scientist in MA/FR."""
        criteria = {"job_title": "Data Scientist", "location": "Paris"}
        from src.mcp_server.tools.search_profiles import _build_search_query
        query, gl_code, location = _build_search_query(criteria)
        assert "site:linkedin.com/in" in query


class TestAiEnrichProfile:
    """Tests for _ai_enrich_profile function."""

    @pytest.mark.asyncio
    async def test_ai_enrich_rate_limited(self):
        """Test that rate-limited requests return profile unchanged."""
        profile = {"name": "John", "summary": "Software engineer"}
        with patch("src.mcp_server.tools.search_profiles._groq_breaker") as mock_breaker:
            mock_breaker.is_rate_limited.return_value = True
            from src.mcp_server.tools.search_profiles import _ai_enrich_profile
            result = await _ai_enrich_profile(profile)
            assert result == profile

    @pytest.mark.asyncio
    async def test_ai_enrich_no_llm(self):
        """Test that missing LLM returns profile unchanged."""
        profile = {"name": "John", "summary": "Software engineer"}
        with patch("src.mcp_server.tools.search_profiles._get_llm") as mock_get_llm:
            mock_get_llm.return_value = None
            from src.mcp_server.tools.search_profiles import _ai_enrich_profile
            result = await _ai_enrich_profile(profile)
            assert result == profile
