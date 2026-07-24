package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // 256-bit secret key encoded in Base64
        String base64SecretKey = Base64.getEncoder().encodeToString(
                "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970".getBytes()
        );
        ReflectionTestUtils.setField(jwtService, "secretKey", base64SecretKey);
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
}
