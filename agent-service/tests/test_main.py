"""
Test main.py startup validation functions.
"""
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPBasicCredentials

from src.main import _settings, verify_metrics_scraper


def test_verify_metrics_scraper_valid_credentials():
    """Test that valid metrics scraper credentials are accepted."""
    _settings.metrics_scraper_username = "admin"
    _settings.metrics_scraper_password = "secret123"
    
    credentials = HTTPBasicCredentials(username="admin", password="secret123")
    
    # Should not raise exception
    verify_metrics_scraper(credentials)


def test_verify_metrics_scraper_invalid_username():
    """Test that invalid username raises 401."""
    _settings.metrics_scraper_username = "admin"
    _settings.metrics_scraper_password = "secret123"
    
    credentials = HTTPBasicCredentials(username="wrong", password="secret123")
    
    with pytest.raises(HTTPException) as exc_info:
        verify_metrics_scraper(credentials)
    
    assert exc_info.value.status_code == 401


def test_verify_metrics_scraper_invalid_password():
    """Test that invalid password raises 401."""
    _settings.metrics_scraper_username = "admin"
    _settings.metrics_scraper_password = "secret123"
    
    credentials = HTTPBasicCredentials(username="admin", password="wrong")
    
    with pytest.raises(HTTPException) as exc_info:
        verify_metrics_scraper(credentials)
    
    assert exc_info.value.status_code == 401


def test_assert_jwt_secret_configured_with_secret():
    """Test that configured JWT secret passes validation."""
    from src.main import _assert_jwt_secret_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.jwt_secret = "valid_secret"
    settings.app_env = "production"
    
    # Should not raise exception
    _assert_jwt_secret_configured()


def test_assert_jwt_secret_configured_production_missing():
    """Test that missing JWT secret in production raises RuntimeError."""
    from src.main import _assert_jwt_secret_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.jwt_secret = None
    settings.app_env = "production"
    
    with pytest.raises(RuntimeError) as exc_info:
        _assert_jwt_secret_configured()
    
    assert "JWT_SECRET must be set in production" in str(exc_info.value)


def test_assert_jwt_secret_configured_dev_missing():
    """Test that missing JWT secret in dev only warns (no exception)."""
    from src.main import _assert_jwt_secret_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.jwt_secret = None
    settings.app_env = "development"
    
    # Should not raise exception in dev
    _assert_jwt_secret_configured()


def test_assert_metrics_scraper_configured_with_credentials():
    """Test that configured metrics credentials pass validation."""
    from src.main import _assert_metrics_scraper_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.metrics_scraper_username = "admin"
    settings.metrics_scraper_password = "secret"
    settings.app_env = "production"
    
    # Should not raise exception
    _assert_metrics_scraper_configured()


def test_assert_metrics_scraper_configured_production_missing():
    """Test that missing metrics credentials in production raises RuntimeError."""
    from src.main import _assert_metrics_scraper_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.metrics_scraper_username = None
    settings.metrics_scraper_password = None
    settings.app_env = "production"
    
    with pytest.raises(RuntimeError) as exc_info:
        _assert_metrics_scraper_configured()
    
    assert "METRICS_SCRAPER_USERNAME and METRICS_SCRAPER_PASSWORD must be set" in str(exc_info.value)


def test_assert_metrics_scraper_configured_dev_missing():
    """Test that missing metrics credentials in dev only warns (no exception)."""
    from src.main import _assert_metrics_scraper_configured
    from src.config import get_settings
    
    settings = get_settings()
    settings.metrics_scraper_username = None
    settings.metrics_scraper_password = None
    settings.app_env = "development"
    
    # Should not raise exception in dev
    _assert_metrics_scraper_configured()