package com.digitalia.sourcing.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class CorsConfigTest {

    private CorsConfig buildConfig(List<String> origins) {
        CorsConfig corsConfig = new CorsConfig();
        ReflectionTestUtils.setField(corsConfig, "allowedOrigins", origins);
        return corsConfig;
    }

    private MockHttpServletRequest mockRequest(String path) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI(path);
        return req;
    }

    @Test
    void corsConfigurationSource_returnsNonNull() {
        CorsConfigurationSource source = buildConfig(List.of("http://localhost:5173"))
                .corsConfigurationSource();
        assertNotNull(source);
        assertInstanceOf(UrlBasedCorsConfigurationSource.class, source);
    }

    @Test
    void corsConfigurationSource_allowsCredentials() {
        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource)
                buildConfig(List.of("http://localhost:5173")).corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(mockRequest("/api/v1/test"));

        assertNotNull(config);
        assertTrue(Boolean.TRUE.equals(config.getAllowCredentials()));
    }

    @Test
    void corsConfigurationSource_setsAllowedOrigins() {
        List<String> origins = List.of("http://localhost:5173", "https://app.example.com");
        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource)
                buildConfig(origins).corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(mockRequest("/api/v1/test"));

        assertNotNull(config);
        assertNotNull(config.getAllowedOrigins());
        assertTrue(config.getAllowedOrigins().containsAll(origins));
    }

    @Test
    void corsConfigurationSource_setsAllowedMethods() {
        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource)
                buildConfig(List.of("http://localhost:5173")).corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(mockRequest("/api/v1/test"));

        assertNotNull(config);
        List<String> methods = config.getAllowedMethods();
        assertNotNull(methods);
        assertTrue(methods.containsAll(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")));
    }

    @Test
    void corsConfigurationSource_setsAllowedHeaders() {
        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource)
                buildConfig(List.of("http://localhost:5173")).corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(mockRequest("/api/v1/test"));

        assertNotNull(config);
        assertTrue(config.getAllowedHeaders().contains("*"));
    }

    @Test
    void corsConfigurationSource_setsMaxAge() {
        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource)
                buildConfig(List.of("http://localhost:5173")).corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(mockRequest("/api/v1/test"));

        assertNotNull(config);
        assertEquals(3600L, config.getMaxAge());
    }
}
