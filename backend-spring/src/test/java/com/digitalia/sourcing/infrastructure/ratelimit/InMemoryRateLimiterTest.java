package com.digitalia.sourcing.infrastructure.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryRateLimiterTest {

    private InMemoryRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new InMemoryRateLimiter();
    }

    @Test
    void tryAcquire_shouldAllowWithinLimit() {
        RateLimitResult res1 = rateLimiter.tryAcquire("10.0.0.1", 3, 1000L);
        assertTrue(res1.allowed());
        assertEquals(1, res1.count());
        assertEquals(2, res1.remaining());

        RateLimitResult res2 = rateLimiter.tryAcquire("10.0.0.1", 3, 1000L);
        assertTrue(res2.allowed());
        assertEquals(2, res2.count());
        assertEquals(1, res2.remaining());

        RateLimitResult res3 = rateLimiter.tryAcquire("10.0.0.1", 3, 1000L);
        assertTrue(res3.allowed());
        assertEquals(3, res3.count());
        assertEquals(0, res3.remaining());
    }

    @Test
    void tryAcquire_shouldRejectWhenLimitExceeded() {
        for (int i = 0; i < 2; i++) {
            rateLimiter.tryAcquire("10.0.0.2", 2, 1000L);
        }

        RateLimitResult blocked = rateLimiter.tryAcquire("10.0.0.2", 2, 1000L);
        assertFalse(blocked.allowed());
        assertEquals(3, blocked.count());
        assertEquals(0, blocked.remaining());
        assertTrue(blocked.retryAfterSeconds() >= 0);
    }

    @Test
    void evictStaleBuckets_shouldRemoveExpiredEntries() {
        rateLimiter.tryAcquire("10.0.0.3", 5, 50L);
        assertEquals(1, rateLimiter.getActiveBucketsCount());

        // Fast-forward time beyond 2 * windowMs
        long futureTime = System.currentTimeMillis() + 200L;
        rateLimiter.evictStaleBuckets(futureTime, 50L);

        assertEquals(0, rateLimiter.getActiveBucketsCount());
    }
}
