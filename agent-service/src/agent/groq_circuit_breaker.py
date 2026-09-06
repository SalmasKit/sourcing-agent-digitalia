"""
Global Groq circuit breaker to prevent hammering the API during rate limits.
Shared across all Groq call sites in the agent service.
"""
import logging
import time

from src.metrics import groq_circuit_breaker_trips

logger = logging.getLogger(__name__)


class GroqCircuitBreaker:
    """Circuit breaker for Groq API calls with automatic reset after cooldown."""
    
    def __init__(self, cooldown_seconds: int = 60):
        self._rate_limited = False
        self._reset_time = 0.0
        self._cooldown_seconds = cooldown_seconds
    
    def is_rate_limited(self) -> bool:
        """Check if circuit breaker is currently active."""
        # Auto-reset if cooldown period has passed
        if self._rate_limited and time.time() > self._reset_time:
            logger.info("[GroqCircuitBreaker] Circuit breaker reset after cooldown period.")
            self._rate_limited = False
            self._reset_time = 0.0
        return self._rate_limited
    
    def trigger_breaker(self) -> None:
        """Activate circuit breaker for cooldown period."""
        self._rate_limited = True
        self._reset_time = time.time() + self._cooldown_seconds
        logger.warning(f"[GroqCircuitBreaker] Rate limit detected, activating circuit breaker for {self._cooldown_seconds}s")
        groq_circuit_breaker_trips.inc()
    
    def check_and_trigger_from_exception(self, exc: Exception) -> bool:
        """
        Check if exception indicates rate limit and trigger breaker if so.
        Returns True if breaker was triggered, False otherwise.
        """
        exc_str = str(exc).lower()
        if "429" in exc_str or "rate limit" in exc_str or "too many requests" in exc_str:
            self.trigger_breaker()
            return True
        return False


# Global singleton instance
_global_breaker: GroqCircuitBreaker | None = None


def get_groq_circuit_breaker(cooldown_seconds: int = 60) -> GroqCircuitBreaker:
    """Get the global Groq circuit breaker instance."""
    global _global_breaker
    if _global_breaker is None:
        _global_breaker = GroqCircuitBreaker(cooldown_seconds)
    return _global_breaker
