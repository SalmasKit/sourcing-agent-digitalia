package com.digitalia.sourcing.infrastructure.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitingInterceptorTest {

    private RateLimitingInterceptor interceptor;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        interceptor = new RateLimitingInterceptor(3, 1000L, objectMapper);
    }

    @Test
    void preHandle_shouldAllowRequestsUnderLimit() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed1 = interceptor.preHandle(request, response, new Object());
        assertTrue(allowed1);
        assertEquals("3", response.getHeader("X-RateLimit-Limit"));
        assertEquals("2", response.getHeader("X-RateLimit-Remaining"));

        MockHttpServletResponse response2 = new MockHttpServletResponse();
        boolean allowed2 = interceptor.preHandle(request, response2, new Object());
        assertTrue(allowed2);
        assertEquals("1", response2.getHeader("X-RateLimit-Remaining"));
    }

    @Test
    void preHandle_shouldBlockRequestsExceedingLimit() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.2");

        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            assertTrue(interceptor.preHandle(request, response, new Object()));
        }

        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        boolean allowed = interceptor.preHandle(request, blockedResponse, new Object());

        assertFalse(allowed);
        assertEquals(429, blockedResponse.getStatus());
        assertEquals("0", blockedResponse.getHeader("X-RateLimit-Remaining"));
        assertTrue(blockedResponse.getContentAsString().contains("Too many requests"));
    }

    @Test
    void preHandle_shouldUseXForwardedForIpIfPresent() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.195, 70.41.3.18");

        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertTrue(allowed);
        assertEquals("2", response.getHeader("X-RateLimit-Remaining"));
    }

    @Test
    void preHandle_shouldUseXRealIpIfPresent() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("X-Real-IP", "198.51.100.1");

        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertTrue(allowed);
        assertEquals("2", response.getHeader("X-RateLimit-Remaining"));
    }

    @Test
    void preHandle_shouldResetCountAfterWindowMs() throws Exception {
        RateLimitingInterceptor shortWindowInterceptor = new RateLimitingInterceptor(1, 100L, objectMapper);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.3");

        MockHttpServletResponse response1 = new MockHttpServletResponse();
        assertTrue(shortWindowInterceptor.preHandle(request, response1, new Object()));

        MockHttpServletResponse response2 = new MockHttpServletResponse();
        assertFalse(shortWindowInterceptor.preHandle(request, response2, new Object()));

        Thread.sleep(150L);

        MockHttpServletResponse response3 = new MockHttpServletResponse();
        assertTrue(shortWindowInterceptor.preHandle(request, response3, new Object()));
    }
}
