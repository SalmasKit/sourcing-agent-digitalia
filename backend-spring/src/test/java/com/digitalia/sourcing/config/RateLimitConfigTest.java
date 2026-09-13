package com.digitalia.sourcing.config;

import com.digitalia.sourcing.infrastructure.ratelimit.InMemoryRateLimiter;
import com.digitalia.sourcing.infrastructure.ratelimit.RateLimiter;
import com.digitalia.sourcing.infrastructure.ratelimit.RateLimitingInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RateLimitConfig} and its inner {@code RateLimiterBeansConfig}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>{@code addInterceptors()} — registers the interceptor on {@code /api/v1/**}</li>
 *   <li>{@code RateLimiterBeansConfig.rateLimiter()} — returns {@link InMemoryRateLimiter}</li>
 *   <li>{@code RateLimiterBeansConfig.rateLimitingInterceptor()} — constructs interceptor correctly</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class RateLimitConfigTest {

    @Mock
    private RateLimitingInterceptor mockInterceptor;

    @SuppressWarnings("unchecked")
    private ObjectProvider<io.micrometer.core.instrument.MeterRegistry> emptyProvider() {
        ObjectProvider<io.micrometer.core.instrument.MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        return provider;
    }

    // -----------------------------------------------------------------------
    // addInterceptors
    // -----------------------------------------------------------------------

    @Test
    void addInterceptors_registersInterceptorWithoutException() {
        RateLimitConfig config = new RateLimitConfig(mockInterceptor);
        InterceptorRegistry registry = new InterceptorRegistry();

        assertDoesNotThrow(() -> config.addInterceptors(registry));
    }

    // -----------------------------------------------------------------------
    // RateLimiterBeansConfig — package-private static inner class
    // (accessed via reflection-friendly instantiation from within the same package)
    // -----------------------------------------------------------------------

    @Test
    void rateLimiter_bean_returnsInMemoryRateLimiter() {
        // Instantiate the static inner class directly — it has no dependencies
        RateLimitConfig.RateLimiterBeansConfig beansConfig =
                new RateLimitConfig.RateLimiterBeansConfig();

        RateLimiter limiter = beansConfig.rateLimiter();

        assertNotNull(limiter);
        assertInstanceOf(InMemoryRateLimiter.class, limiter);
    }

    @Test
    void rateLimitingInterceptor_bean_createdSuccessfully() {
        RateLimitConfig.RateLimiterBeansConfig beansConfig =
                new RateLimitConfig.RateLimiterBeansConfig();

        RateLimiter limiter = new InMemoryRateLimiter();
        ObjectMapper objectMapper = new ObjectMapper();

        RateLimitingInterceptor interceptor =
                beansConfig.rateLimitingInterceptor(limiter, 60, objectMapper, emptyProvider());

        assertNotNull(interceptor);
    }

    @Test
    void rateLimitingInterceptor_bean_withCustomRpm_createdSuccessfully() {
        RateLimitConfig.RateLimiterBeansConfig beansConfig =
                new RateLimitConfig.RateLimiterBeansConfig();

        RateLimiter limiter = new InMemoryRateLimiter();
        ObjectMapper objectMapper = new ObjectMapper();

        RateLimitingInterceptor interceptor =
                beansConfig.rateLimitingInterceptor(limiter, 120, objectMapper, emptyProvider());

        assertNotNull(interceptor);
    }
}
