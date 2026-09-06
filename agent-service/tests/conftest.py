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


@pytest.fixture(autouse=True)
def reset_apollo_cache():
    """Reset the Apollo.io enrichment cache between tests to prevent flaky tests."""
    from src.mcp_server.tools.enrich_profile import _apollo_cache
    _apollo_cache.clear()
    yield
    _apollo_cache.clear()


@pytest.fixture(autouse=True)
def reset_embedding_cache():
    """Reset the embedding similarity cache between tests to prevent flaky tests."""
    from src.embeddings.client import _embedding_cache
    _embedding_cache.clear()
    yield
    _embedding_cache.clear()


@pytest.fixture(autouse=True)
def reset_groq_circuit_breaker():
    """Reset the Groq circuit breaker state between tests to prevent flaky tests."""
    from src.agent.groq_circuit_breaker import _global_breaker
    _global_breaker.reset()
    yield
    _global_breaker.reset()


@pytest.fixture(autouse=True)
def reset_embedding_model_cache():
    """Reset the embedding model LRU cache between tests to prevent flaky tests."""
    from src.embeddings.client import _get_model
    _get_model.cache_clear()
    yield
    _get_model.cache_clear()
