"""
Additional tests for candidate_pool.py helper functions.
"""
import pytest
from src.mcp_server.tools.candidate_pool import _fail_or_warn_pgvector
from src.config import get_settings


def test_fail_or_warn_pgvector_production():
    """Test that production environment raises RuntimeError."""
    settings = get_settings()
    original_env = settings.app_env
    
    settings.app_env = "production"
    
    with pytest.raises(RuntimeError) as exc_info:
        _fail_or_warn_pgvector("Test error", Exception("Database error"))
    
    assert "Test error" in str(exc_info.value)
    
    # Restore
    settings.app_env = original_env


def test_fail_or_warn_pgvector_development():
    """Test that development environment only warns (no exception)."""
    settings = get_settings()
    original_env = settings.app_env
    
    settings.app_env = "development"
    
    # Should not raise exception in dev
    _fail_or_warn_pgvector("Test warning", Exception("Database error"))
    
    # Restore
    settings.app_env = original_env