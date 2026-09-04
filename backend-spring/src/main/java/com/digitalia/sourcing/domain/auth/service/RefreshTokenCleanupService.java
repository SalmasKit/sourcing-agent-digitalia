package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Periodically purges expired refresh tokens to prevent unbounded growth in the database.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Scheduled(cron = "${app.jwt.cleanup-cron:0 0 3 * * ?}")
    @Transactional
    public int purgeExpiredTokens() {
        log.info("Starting scheduled purge of expired and revoked refresh tokens");
        int deletedCount = refreshTokenRepository.deleteByExpiryDateBeforeOrRevokedTrue(Instant.now());
        log.info("Purged {} expired or revoked refresh token(s) from database", deletedCount);
        return deletedCount;
    }
}
