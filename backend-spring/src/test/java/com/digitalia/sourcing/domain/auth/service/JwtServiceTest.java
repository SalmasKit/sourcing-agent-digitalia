package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        byte[] randomKeyBytes = new byte[32];
        new SecureRandom().nextBytes(randomKeyBytes);
        String base64Key = Base64.getEncoder().encodeToString(randomKeyBytes);

        ReflectionTestUtils.setField(jwtService, "secretKey", base64Key);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3600000L); // 1 hour

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("jwt@test.com")
                .password("password")
                .fullName("JWT Tester")
                .role(Role.RECRUITER)
                .enabled(true)
                .build();
    }

    @Test
    void generateToken_shouldCreateValidToken() {
        String token = jwtService.generateToken(testUser);

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals("jwt@test.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isTokenValid(token, testUser));
        assertEquals(3600000L, jwtService.getExpirationTime());
    }

    @Test
    void isTokenValid_shouldReturnFalseForDifferentUser() {
        String token = jwtService.generateToken(testUser);

        User otherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@test.com")
                .build();

        assertFalse(jwtService.isTokenValid(token, otherUser));
    }

    @Test
    void validateConfiguration_shouldFailWhenSecretBlank() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey", "   ");
        assertThrows(IllegalStateException.class, service::validateConfiguration);
    }

    @Test
    void validateConfiguration_shouldFailWhenDevSecretUsedInProduction() {
        JwtService service = new JwtService();
        // Sample development key to verify prevention in production
        String sampleDevKey = "9a4f2c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c";
        ReflectionTestUtils.setField(service, "secretKey", sampleDevKey);
        org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("prod");
        ReflectionTestUtils.setField(service, "environment", env);

        IllegalStateException ex = assertThrows(IllegalStateException.class, service::validateConfiguration);
        assertTrue(ex.getMessage().contains("default development JWT secret cannot be used in production"));
    }

    @Test
    void validateConfiguration_shouldPassWithValidKey() {
        assertDoesNotThrow(() -> jwtService.validateConfiguration());
    }
}
