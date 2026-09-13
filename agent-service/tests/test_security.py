"""
Test JWT verification security module.
"""
import base64
import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.api.security import verify_jwt
from src.config import get_settings


@pytest.fixture
def mock_settings():
    """Create mock settings with a valid JWT secret."""
    settings = get_settings()
    # Use a valid base64-encoded secret
    settings.jwt_secret = base64.b64encode(b"test_secret_key_1234567890123456").decode('utf-8')
    return settings


def test_verify_jwt_missing_credentials(mock_settings, monkeypatch):
    """Test that missing credentials raises 401."""
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt(None)
    
    assert exc_info.value.status_code == 401
    assert "Missing or malformed" in exc_info.value.detail


def test_verify_jwt_no_secret_dev_mode(monkeypatch):
    """Test dev mode escape hatch when JWT_SECRET is not configured."""
    mock_settings = get_settings()
    mock_settings.jwt_secret = None
    mock_settings.app_env = "development"
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="any_token_here"
    )
    
    result = verify_jwt(credentials)
    assert result["sub"] == "unauthenticated-dev"
    assert result["role"] == "RECRUITER"


def test_verify_jwt_invalid_base64_secret(monkeypatch):
    """Test that invalid base64 JWT_SECRET raises 503."""
    mock_settings = get_settings()
    mock_settings.jwt_secret = "not_valid_base64!!!"
    mock_settings.app_env = "production"
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="some_token"
    )
    
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt(credentials)
    
    assert exc_info.value.status_code == 503
    assert "misconfigured" in exc_info.value.detail


def test_verify_jwt_expired_token(mock_settings, monkeypatch):
    """Test that expired token raises 401."""
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    # Create an expired token
    secret_bytes = base64.b64decode(mock_settings.jwt_secret)
    expired_token = jwt.encode(
        {"sub": "test@example.com", "exp": 1234567890},  # Far in the past
        secret_bytes,
        algorithm="HS256"
    )
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=expired_token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt(credentials)
    
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_verify_jwt_invalid_token(mock_settings, monkeypatch):
    """Test that invalid/tampered token raises 401."""
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid.token.here"
    )
    
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt(credentials)
    
    assert exc_info.value.status_code == 401
    assert "Invalid or tampered" in exc_info.value.detail


def test_verify_jwt_valid_token(mock_settings, monkeypatch):
    """Test that valid token is accepted and payload returned."""
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    # Create a valid token
    secret_bytes = base64.b64decode(mock_settings.jwt_secret)
    valid_token = jwt.encode(
        {"sub": "test@example.com", "role": "RECRUITER"},
        secret_bytes,
        algorithm="HS256"
    )
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=valid_token
    )
    
    result = verify_jwt(credentials)
    assert result["sub"] == "test@example.com"
    assert result["role"] == "RECRUITER"


def test_verify_jwt_wrong_secret(mock_settings, monkeypatch):
    """Test that token signed with wrong secret is rejected."""
    monkeypatch.setattr("src.api.security.get_settings", lambda: mock_settings)
    
    # Create token with different secret
    wrong_secret = b"different_secret_key_1234567890123456"
    token = jwt.encode(
        {"sub": "test@example.com"},
        wrong_secret,
        algorithm="HS256"
    )
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt(credentials)
    
    assert exc_info.value.status_code == 401
