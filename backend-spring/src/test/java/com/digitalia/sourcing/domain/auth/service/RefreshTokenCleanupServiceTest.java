package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCleanupServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenCleanupService cleanupService;

    @Test
    void purgeExpiredTokens_shouldCallRepositoryAndReturnCount() {
        when(refreshTokenRepository.deleteByExpiryDateBeforeOrRevokedTrue(any(Instant.class))).thenReturn(5);

        int count = cleanupService.purgeExpiredTokens();

        assertEquals(5, count);
        verify(refreshTokenRepository, times(1)).deleteByExpiryDateBeforeOrRevokedTrue(any(Instant.class));
    }
}
