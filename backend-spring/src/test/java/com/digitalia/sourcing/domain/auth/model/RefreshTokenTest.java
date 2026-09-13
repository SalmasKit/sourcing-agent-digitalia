package com.digitalia.sourcing.domain.auth.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RefreshTokenTest {

    @Test
    void testRefreshTokenBuilder() {
        UUID id = UUID.randomUUID();
        String tokenHash = "hashed-token";
        User user = new User();
        Instant expiryDate = Instant.now().plusSeconds(3600);

        RefreshToken refreshToken = RefreshToken.builder()
                .id(id)
                .tokenHash(tokenHash)
                .user(user)
                .expiryDate(expiryDate)
                .build();

        assertNotNull(refreshToken);
        assertEquals(id, refreshToken.getId());
        assertEquals(tokenHash, refreshToken.getTokenHash());
        assertEquals(user, refreshToken.getUser());
        assertEquals(expiryDate, refreshToken.getExpiryDate());
        assertFalse(refreshToken.isRevoked());
    }

    @Test
    void testRefreshTokenNoArgsConstructor() {
        RefreshToken refreshToken = new RefreshToken();

        assertNotNull(refreshToken);
        assertNull(refreshToken.getId());
        assertFalse(refreshToken.isRevoked());
    }

    @Test
    void testIsExpiredTrue() {
        RefreshToken refreshToken = RefreshToken.builder()
                .expiryDate(Instant.now().minusSeconds(3600))
                .build();

        assertTrue(refreshToken.isExpired());
    }

    @Test
    void testIsExpiredFalse() {
        RefreshToken refreshToken = RefreshToken.builder()
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        assertFalse(refreshToken.isExpired());
    }

    @Test
    void testRevoke() {
        RefreshToken refreshToken = RefreshToken.builder()
                .revoked(false)
                .build();

        assertFalse(refreshToken.isRevoked());

        refreshToken.revoke();

        assertTrue(refreshToken.isRevoked());
    }

    @Test
    void testRawTokenTransient() {
        RefreshToken refreshToken = RefreshToken.builder()
                .rawToken("raw-token-value")
                .build();

        assertEquals("raw-token-value", refreshToken.getRawToken());
    }
}