"""
Shared pytest fixtures for test isolation.
"""
import pytest

from src.api.limiter import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the rate limiter storage between tests to prevent flaky tests."""
    limiter.reset()
    yield
    limiter.reset()
