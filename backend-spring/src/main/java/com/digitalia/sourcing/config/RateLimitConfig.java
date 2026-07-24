package com.digitalia.sourcing.config;

import com.digitalia.sourcing.infrastructure.ratelimit.RateLimitingInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
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
 */
@Configuration
@ConditionalOnProperty(name = "app.rate-limit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitConfig implements WebMvcConfigurer {

    @Value("${app.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    private final ObjectMapper objectMapper;

    public RateLimitConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public RateLimitingInterceptor rateLimitingInterceptor() {
        return new RateLimitingInterceptor(requestsPerMinute, 60_000L, objectMapper);
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitingInterceptor())
                .addPathPatterns("/api/v1/**");
    }
}
