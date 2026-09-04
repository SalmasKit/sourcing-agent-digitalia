package com.digitalia.sourcing.infrastructure.ratelimit;

import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-instance deployments. Automatically evicts stale buckets to avoid memory leaks.
 */
@Slf4j
public class InMemoryRateLimiter implements RateLimiter {

    private final ConcurrentHashMap<String, long[]> buckets = new ConcurrentHashMap<>();
    private final AtomicInteger requestCounter = new AtomicInteger(0);
    private static final int EVICTION_INTERVAL = 100;

    @Override
    public RateLimitResult tryAcquire(String clientIp, int maxRequests, long windowMs) {
        long now = Instant.now().toEpochMilli();

        // Evict stale buckets periodically to prevent memory leaks from inactive IPs
        if (requestCounter.incrementAndGet() % EVICTION_INTERVAL == 0) {
            evictStaleBuckets(now, windowMs);
        }

        long[] bucket = buckets.compute(clientIp, (ip, existing) -> {
            if (existing == null || now - existing[0] >= windowMs) {
                // New window
                return new long[]{now, 1};
            }
            existing[1]++;
            return existing;
        });

        int count = (int) bucket[1];
        int remaining = Math.max(0, maxRequests - count);
        long windowStart = bucket[0];
        long retryAfterSeconds = Math.max(0, (windowMs - (now - windowStart)) / 1000);
        boolean allowed = count <= maxRequests;

        return new RateLimitResult(allowed, count, remaining, windowStart, retryAfterSeconds);
    }

    public void evictStaleBuckets(long now, long windowMs) {
        int initialSize = buckets.size();
        buckets.entrySet().removeIf(entry -> now - entry.getValue()[0] >= 2 * windowMs);
        int evicted = initialSize - buckets.size();
        if (evicted > 0) {
            log.debug("Evicted {} stale rate limit bucket(s)", evicted);
        }
    }

    public int getActiveBucketsCount() {
        return buckets.size();
    }
}
