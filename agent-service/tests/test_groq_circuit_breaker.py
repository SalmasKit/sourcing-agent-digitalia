"""
Unit tests for Groq circuit breaker module.
"""
import time

import pytest

from src.agent.groq_circuit_breaker import GroqCircuitBreaker, get_groq_circuit_breaker


@pytest.fixture(autouse=True)
def reset_breaker():
    """Reset the global circuit breaker before and after each test to prevent singleton leaks."""
    import src.agent.groq_circuit_breaker as m
    m._global_breaker = None
    yield
    m._global_breaker = None


def test_circuit_breaker_initial_state():
    """Test that circuit breaker starts in non-rate-limited state."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    assert breaker.is_rate_limited() is False


def test_circuit_breaker_trigger():
    """Test that triggering the breaker sets rate-limited state."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    breaker.trigger_breaker()
    assert breaker.is_rate_limited() is True


def test_circuit_breaker_auto_reset():
    """Test that circuit breaker auto-resets after cooldown period."""
    breaker = GroqCircuitBreaker(cooldown_seconds=1)
    breaker.trigger_breaker()
    assert breaker.is_rate_limited() is True
    time.sleep(1.1)
    assert breaker.is_rate_limited() is False


def test_circuit_breaker_no_reset_before_cooldown():
    """Test that circuit breaker does not reset before cooldown expires."""
    breaker = GroqCircuitBreaker(cooldown_seconds=10)
    breaker.trigger_breaker()
    assert breaker.is_rate_limited() is True
    time.sleep(0.5)
    assert breaker.is_rate_limited() is True


def test_check_and_trigger_from_exception_429():
    """Test that 429 exception triggers the breaker."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    exc = Exception("HTTP 429 Too Many Requests")
    result = breaker.check_and_trigger_from_exception(exc)
    assert result is True
    assert breaker.is_rate_limited() is True


def test_check_and_trigger_from_exception_rate_limit():
    """Test that 'rate limit' exception triggers the breaker."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    exc = Exception("Rate limit exceeded")
    result = breaker.check_and_trigger_from_exception(exc)
    assert result is True
    assert breaker.is_rate_limited() is True


def test_check_and_trigger_from_exception_too_many_requests():
    """Test that 'too many requests' exception triggers the breaker."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    exc = Exception("too many requests")
    result = breaker.check_and_trigger_from_exception(exc)
    assert result is True
    assert breaker.is_rate_limited() is True


def test_check_and_trigger_from_exception_other_error():
    """Test that non-rate-limit exceptions do not trigger the breaker."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    exc = Exception("Internal server error")
    result = breaker.check_and_trigger_from_exception(exc)
    assert result is False
    assert breaker.is_rate_limited() is False


def test_check_and_trigger_from_exception_case_insensitive():
    """Test that exception matching is case-insensitive."""
    breaker = GroqCircuitBreaker(cooldown_seconds=60)
    exc = Exception("HTTP 429 RATE LIMIT")
    result = breaker.check_and_trigger_from_exception(exc)
    assert result is True
    assert breaker.is_rate_limited() is True


def test_get_groq_circuit_breaker_singleton():
    """Test that get_groq_circuit_breaker returns singleton instance."""
    breaker1 = get_groq_circuit_breaker(cooldown_seconds=30)
    breaker2 = get_groq_circuit_breaker(cooldown_seconds=60)
    assert breaker1 is breaker2


def test_get_groq_circuit_breaker_custom_cooldown():
    """Test that custom cooldown is respected on first call."""
    breaker = get_groq_circuit_breaker(cooldown_seconds=1)
    breaker.trigger_breaker()
    assert breaker.is_rate_limited() is True
    time.sleep(1.1)
    assert breaker.is_rate_limited() is False
