package com.digitalia.sourcing.config;

import com.digitalia.sourcing.infrastructure.ratelimit.InMemoryRateLimiter;
import com.digitalia.sourcing.infrastructure.ratelimit.RateLimiter;
import com.digitalia.sourcing.infrastructure.ratelimit.RateLimitingInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the {@link RateLimitingInterceptor} on all {@code /api/v1/**} paths.
 *
 * <p>Can be disabled entirely via {@code app.rate-limit.enabled=false}.
 * <p>By default uses {@link InMemoryRateLimiter} for single instances.
 * In a multi-instance / cluster deployment, provide a {@link RateLimiter} bean backed by Redis.
 */
@Configuration
@ConditionalOnProperty(name = "app.rate-limit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitConfig implements WebMvcConfigurer {

    private final RateLimitingInterceptor rateLimitingInterceptor;

    public RateLimitConfig(RateLimitingInterceptor rateLimitingInterceptor) {
        this.rateLimitingInterceptor = rateLimitingInterceptor;
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitingInterceptor)
                .addPathPatterns("/api/v1/**");
    }

    @Configuration
    @ConditionalOnProperty(name = "app.rate-limit.enabled", havingValue = "true", matchIfMissing = true)
    static class RateLimiterBeansConfig {

        @Bean
        @ConditionalOnMissingBean(RateLimiter.class)
        public RateLimiter rateLimiter() {
            return new InMemoryRateLimiter();
        }

        @Bean
        public RateLimitingInterceptor rateLimitingInterceptor(
                RateLimiter rateLimiter,
                @Value("${app.rate-limit.requests-per-minute:60}") int requestsPerMinute,
                ObjectMapper objectMapper) {
            return new RateLimitingInterceptor(rateLimiter, requestsPerMinute, 60_000L, objectMapper);
        }
    }
}
