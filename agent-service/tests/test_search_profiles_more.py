"""
More tests for search_profiles.py to improve coverage.
"""
import pytest

from src.mcp_server.tools.search_profiles import _get_llm
from unittest.mock import patch


def test_get_llm_search_with_credentials():
    """Test that search_profiles LLM is created when credentials are configured."""
    with patch('src.mcp_server.tools.search_profiles.settings') as mock_settings:
        mock_settings.groq_api_key = "test_key"
        mock_settings.groq_model = "llama-3.3-70b"
        mock_settings.groq_temperature = 0.1
        
        llm = _get_llm()
        
        assert llm is not None


def test_get_llm_search_without_credentials():
    """Test that search_profiles LLM is None when credentials are missing."""
    with patch('src.mcp_server.tools.search_profiles.settings') as mock_settings:
        mock_settings.groq_api_key = None
        mock_settings.groq_model = None
        
        llm = _get_llm()
        
        assert llm is None


def test_parse_json_from_llm_with_fences():
    """Test parsing JSON with code fences only."""
    from src.mcp_server.tools.search_profiles import _parse_json_from_llm
    
    raw = '```json\n{"name": "John", "score": 85}\n```'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_nested_json():
    """Test parsing nested JSON by extracting braces."""
    from src.mcp_server.tools.search_profiles import _parse_json_from_llm
    
    raw = 'Some text before {"name": "John", "nested": {"value": 5}} some text after'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "nested": {"value": 5}}


def test_parse_json_from_llm_with_newlines():
    """Test parsing JSON with newlines in text."""
    from src.mcp_server.tools.search_profiles import _parse_json_from_llm
    
    raw = '{"name": "John",\n"score": 85\n}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_multiple_braces():
    """Test that first opening and last closing brace are used."""
    from src.mcp_server.tools.search_profiles import _parse_json_from_llm
    
    raw = '{ "inner": {} }'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"inner": {}}


def test_parse_json_from_llm_no_braces():
    """Test that None is returned when no braces found."""
    from src.mcp_server.tools.search_profiles import _parse_json_from_llm
    
    raw = "No JSON here"
    
    result = _parse_json_from_llm(raw)
    
    assert result is None