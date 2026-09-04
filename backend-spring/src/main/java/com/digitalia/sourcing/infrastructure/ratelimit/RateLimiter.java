package com.digitalia.sourcing.infrastructure.ratelimit;

/**
 * Strategy interface for rate limiting.
 * Allows transparent swapping between local in-memory storage (single instance)
 * and distributed backends such as Redis (horizontal scaling across multiple instances).
 */
public interface RateLimiter {

    /**
     * Attempts to acquire a permit for the given client identifier.
     *
     * @param clientIp client IP or identifier
     * @param maxRequests maximum allowed requests per window
     * @param windowMs window size in milliseconds
     * @return {@link RateLimitResult} containing allow/reject decision and quota headers
     */
    RateLimitResult tryAcquire(String clientIp, int maxRequests, long windowMs);
}
