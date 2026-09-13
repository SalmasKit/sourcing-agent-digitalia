"""
Additional tests for graph.py helper functions.
"""
from src.agent.graph import (
    _get_llm,
    _parse_json_from_llm,
)
from unittest.mock import patch


def test_get_llm_graph_with_credentials():
    """Test that graph LLM is created when credentials are configured."""
    with patch('src.agent.graph.settings') as mock_settings:
        mock_settings.groq_api_key = "test_key"
        mock_settings.groq_model = "llama-3.3-70b"
        mock_settings.groq_temperature = 0.1
        
        llm = _get_llm()
        
        assert llm is not None


def test_get_llm_graph_without_credentials():
    """Test that graph LLM is None when credentials are missing."""
    with patch('src.agent.graph.settings') as mock_settings:
        mock_settings.groq_api_key = None
        mock_settings.groq_model = None
        
        llm = _get_llm()
        
        assert llm is None


def test_get_llm_graph_with_custom_max_tokens():
    """Test that graph LLM respects custom max_tokens."""
    with patch('src.agent.graph.settings') as mock_settings:
        mock_settings.groq_api_key = "test_key"
        mock_settings.groq_model = "llama-3.3-70b"
        mock_settings.groq_temperature = 0.1
        
        llm = _get_llm(max_tokens=2048)
        
        assert llm is not None


def test_parse_json_from_llm_graph_clean_json():
    """Test parsing clean JSON from LLM response."""
    raw = '{"name": "John", "score": 85}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_graph_with_think_block():
    """Test parsing JSON with think blocks removed."""
    raw = '</think>Some reasoning\n{"name": "John", "score": 85}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_graph_with_fences():
    """Test parsing JSON with code fences."""
    raw = '```json\n{"name": "John", "score": 85}\n```'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "score": 85}


def test_parse_json_from_llm_graph_with_array():
    """Test parsing JSON array."""
    raw = '```json\n["Python", "Java", "Go"]\n```'
    
    result = _parse_json_from_llm(raw)
    
    assert result == ["Python", "Java", "Go"]


def test_parse_json_from_llm_graph_nested_json():
    """Test parsing nested JSON."""
    raw = '{"name": "John", "nested": {"value": 5}}'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John", "nested": {"value": 5}}


def test_parse_json_from_llm_graph_invalid_json():
    """Test that invalid JSON returns None."""
    raw = "This is not JSON"
    
    result = _parse_json_from_llm(raw)
    
    assert result is None


def test_parse_json_from_llm_graph_empty_string():
    """Test that empty string returns None."""
    raw = ""
    
    result = _parse_json_from_llm(raw)
    
    assert result is None


def test_parse_json_from_llm_graph_partial_json():
    """Test extracting JSON from text with surrounding content."""
    raw = 'Some text before {"name": "John"} some text after'
    
    result = _parse_json_from_llm(raw)
    
    assert result == {"name": "John"}