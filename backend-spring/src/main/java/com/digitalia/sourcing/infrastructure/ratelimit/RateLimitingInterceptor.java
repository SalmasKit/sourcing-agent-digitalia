package com.digitalia.sourcing.infrastructure.ratelimit;

import com.digitalia.sourcing.shared.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP sliding-window rate limiter (no extra dependency).
 *
 * <p>Each IP is allowed {@code maxRequestsPerWindow} requests
 * within a rolling {@code windowMs} millisecond window.
 * Stale buckets are evicted lazily to avoid unbounded memory growth.
 */
@Slf4j
public class RateLimitingInterceptor implements HandlerInterceptor {

    private final int maxRequestsPerWindow;
    private final long windowMs;
    private final ObjectMapper objectMapper;

    /** Bucket per client IP: (windowStartEpochMs, requestCount) */
    private final ConcurrentHashMap<String, long[]> buckets = new ConcurrentHashMap<>();

    public RateLimitingInterceptor(int maxRequestsPerWindow, long windowMs, ObjectMapper objectMapper) {
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.windowMs = windowMs;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws IOException {

        String clientIp = resolveClientIp(request);
        long now = Instant.now().toEpochMilli();

        long[] bucket = buckets.compute(clientIp, (ip, existing) -> {
            if (existing == null || now - existing[0] >= windowMs) {
                // New window
                return new long[]{now, 1};
            }
            existing[1]++;
            return existing;
        });

        int count = (int) bucket[1];
        int remaining = Math.max(0, maxRequestsPerWindow - count);
        long windowStart = bucket[0];
        long retryAfterSeconds = Math.max(0, (windowMs - (now - windowStart)) / 1000);

        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerWindow));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(windowStart + windowMs));

        if (count > maxRequestsPerWindow) {
            log.warn("Rate limit exceeded for IP: {} ({} requests in window)", clientIp, count);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            objectMapper.writeValue(response.getWriter(),
                    ApiResponse.error("Too many requests. Please slow down and retry after " + retryAfterSeconds + "s."));
            return false;
        }

        return true;
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Respect reverse-proxy headers
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
