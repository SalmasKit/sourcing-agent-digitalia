package com.digitalia.sourcing.infrastructure.ratelimit;

import com.digitalia.sourcing.shared.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * Per-IP sliding-window rate limiter (no extra dependency).
 *
 * <p>Each IP is allowed {@code maxRequestsPerWindow} requests
 * within a rolling {@code windowMs} millisecond window.
 * Stale buckets are evicted lazily to avoid unbounded memory growth.
 */
@Slf4j
public class RateLimitingInterceptor implements HandlerInterceptor {

    private final RateLimiter rateLimiter;
    private final int maxRequestsPerWindow;
    private final long windowMs;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public RateLimitingInterceptor(RateLimiter rateLimiter, int maxRequestsPerWindow, long windowMs,
                                   ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.rateLimiter = rateLimiter;
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.windowMs = windowMs;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry != null ? meterRegistry : new SimpleMeterRegistry();
    }

    public RateLimitingInterceptor(RateLimiter rateLimiter, int maxRequestsPerWindow, long windowMs, ObjectMapper objectMapper) {
        this(rateLimiter, maxRequestsPerWindow, windowMs, objectMapper, new SimpleMeterRegistry());
    }

    public RateLimitingInterceptor(int maxRequestsPerWindow, long windowMs, ObjectMapper objectMapper) {
        this(new InMemoryRateLimiter(), maxRequestsPerWindow, windowMs, objectMapper, new SimpleMeterRegistry());
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws IOException {

        String clientIp = resolveClientIp(request);
        RateLimitResult result = rateLimiter.tryAcquire(clientIp, maxRequestsPerWindow, windowMs);

        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerWindow));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
        response.setHeader("X-RateLimit-Reset", String.valueOf(result.windowStartEpochMs() + windowMs));

        if (!result.allowed()) {
            meterRegistry.counter("sourcing.ratelimit.rejected").increment();
            log.warn("Rate limit exceeded for IP: {} ({} requests in window)", clientIp, result.count());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            objectMapper.writeValue(response.getWriter(),
                    ApiResponse.error("Too many requests. Please slow down and retry after " + result.retryAfterSeconds() + "s."));
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
