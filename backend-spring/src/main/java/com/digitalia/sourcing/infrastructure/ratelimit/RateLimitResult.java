package com.digitalia.sourcing.infrastructure.ratelimit;

public record RateLimitResult(
        boolean allowed,
        int count,
        int remaining,
        long windowStartEpochMs,
        long retryAfterSeconds
) {}
