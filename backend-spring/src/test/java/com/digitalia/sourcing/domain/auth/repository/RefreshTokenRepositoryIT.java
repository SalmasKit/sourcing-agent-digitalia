package com.digitalia.sourcing.domain.auth.repository;

import com.digitalia.sourcing.AbstractRepositoryIT;
import com.digitalia.sourcing.domain.auth.model.RefreshToken;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenRepositoryIT extends AbstractRepositoryIT {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.saveAndFlush(User.builder()
                .email("token.user@digitalia.ma")
                .password("hash123")
                .fullName("Token Tester")
                .role(Role.RECRUITER)
                .build());
    }

    @Test
    @DisplayName("Should save and find refresh token by hash")
    void shouldSaveAndFindByTokenHash() {
        RefreshToken token = RefreshToken.builder()
                .tokenHash("sampleHash_abc123")
                .user(testUser)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .revoked(false)
                .build();

        refreshTokenRepository.saveAndFlush(token);

        Optional<RefreshToken> found = refreshTokenRepository.findByTokenHash("sampleHash_abc123");
        assertThat(found).isPresent();
        assertThat(found.get().getUser().getId()).isEqualTo(testUser.getId());
        assertThat(found.get().isRevoked()).isFalse();
    }

    @Test
    @DisplayName("Should delete refresh tokens by user")
    void shouldDeleteByUser() {
        RefreshToken token = RefreshToken.builder()
                .tokenHash("hash_to_delete")
                .user(testUser)
                .expiryDate(Instant.now().plus(1, ChronoUnit.DAYS))
                .build();
        refreshTokenRepository.saveAndFlush(token);

        refreshTokenRepository.deleteByUser(testUser);
        refreshTokenRepository.flush();

        assertThat(refreshTokenRepository.findByTokenHash("hash_to_delete")).isEmpty();
    }

    @Test
    @DisplayName("Should purge expired and revoked tokens")
    void shouldPurgeExpiredOrRevokedTokens() {
        // Expired token
        refreshTokenRepository.saveAndFlush(RefreshToken.builder()
                .tokenHash("expired_token")
                .user(testUser)
                .expiryDate(Instant.now().minus(1, ChronoUnit.DAYS))
                .revoked(false)
                .build());

        // Revoked token
        refreshTokenRepository.saveAndFlush(RefreshToken.builder()
                .tokenHash("revoked_token")
                .user(testUser)
                .expiryDate(Instant.now().plus(5, ChronoUnit.DAYS))
                .revoked(true)
                .build());

        // Valid active token
        refreshTokenRepository.saveAndFlush(RefreshToken.builder()
                .tokenHash("valid_token")
                .user(testUser)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .revoked(false)
                .build());

        int deletedCount = refreshTokenRepository.deleteByExpiryDateBeforeOrRevokedTrue(Instant.now());
        refreshTokenRepository.flush();

        assertThat(deletedCount).isEqualTo(2);
        assertThat(refreshTokenRepository.findByTokenHash("valid_token")).isPresent();
        assertThat(refreshTokenRepository.findByTokenHash("expired_token")).isEmpty();
        assertThat(refreshTokenRepository.findByTokenHash("revoked_token")).isEmpty();
    }
}
