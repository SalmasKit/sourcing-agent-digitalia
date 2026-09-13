package com.digitalia.sourcing.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link MetricsSecurityConfig}.
 *
 * <p>These tests exercise all branches of {@code validateScraperCredentials()},
 * {@code isProductionEnvironment()}, and {@code isTestEnvironment()} without
 * loading a Spring context, so they run fast and don't need Testcontainers.
 */
@ExtendWith(MockitoExtension.class)
class MetricsSecurityConfigTest {

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Build a config with the given active profiles and credentials. */
    private MetricsSecurityConfig buildConfig(String[] activeProfiles,
                                               String username,
                                               String password) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(activeProfiles);

        MetricsSecurityConfig config = new MetricsSecurityConfig(env);
        ReflectionTestUtils.setField(config, "scraperUsername", username);
        ReflectionTestUtils.setField(config, "scraperPassword", password);
        return config;
    }

    // -----------------------------------------------------------------------
    // validateScraperCredentials — test profile (skip validation)
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_testProfile_doesNotThrow_evenWithBlankPassword() {
        MetricsSecurityConfig config = buildConfig(new String[]{"test"}, "prometheus", "");
        // Must not throw regardless of blank password
        assertDoesNotThrow(config::validateScraperCredentials);
    }

    @Test
    void validateScraperCredentials_testProfile_doesNotThrow_withNullPassword() {
        MetricsSecurityConfig config = buildConfig(new String[]{"test"}, "prometheus", null);
        assertDoesNotThrow(config::validateScraperCredentials);
    }

    // -----------------------------------------------------------------------
    // validateScraperCredentials — non-prod, valid password
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_devProfile_validPassword_doesNotThrow() {
        MetricsSecurityConfig config = buildConfig(new String[]{"dev"}, "prometheus", "secret");
        assertDoesNotThrow(config::validateScraperCredentials);
    }

    // -----------------------------------------------------------------------
    // validateScraperCredentials — non-prod, blank / null password → generic message
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_devProfile_blankPassword_throwsWithDevMessage() {
        MetricsSecurityConfig config = buildConfig(new String[]{"dev"}, "prometheus", "   ");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        assertTrue(ex.getMessage().contains(".env"),
                "Message should mention .env file for non-prod profile");
    }

    @Test
    void validateScraperCredentials_noProfile_nullPassword_throwsWithDevMessage() {
        MetricsSecurityConfig config = buildConfig(new String[]{}, "prometheus", null);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        assertTrue(ex.getMessage().contains(".env"));
    }

    // -----------------------------------------------------------------------
    // validateScraperCredentials — prod profile, blank password → prod message
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_prodProfile_blankPassword_throwsWithProdMessage() {
        MetricsSecurityConfig config = buildConfig(new String[]{"prod"}, "prometheus", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        assertTrue(ex.getMessage().contains("production"),
                "Message should reference production for prod profile");
    }

    @Test
    void validateScraperCredentials_productionProfile_blankPassword_throwsWithProdMessage() {
        MetricsSecurityConfig config = buildConfig(new String[]{"production"}, "prometheus", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        assertTrue(ex.getMessage().contains("production"));
    }

    // -----------------------------------------------------------------------
    // isTestEnvironment — null environment (no-args constructor path)
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_nullEnvironment_validPassword_doesNotThrow() {
        // null environment → both isTestEnvironment() and isProductionEnvironment() return false
        MetricsSecurityConfig config = new MetricsSecurityConfig(null);
        ReflectionTestUtils.setField(config, "scraperUsername", "prometheus");
        ReflectionTestUtils.setField(config, "scraperPassword", "secret");

        assertDoesNotThrow(config::validateScraperCredentials);
    }

    @Test
    void validateScraperCredentials_nullEnvironment_blankPassword_throwsDevMessage() {
        MetricsSecurityConfig config = new MetricsSecurityConfig(null);
        ReflectionTestUtils.setField(config, "scraperUsername", "prometheus");
        ReflectionTestUtils.setField(config, "scraperPassword", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        // null env → isProductionEnvironment() = false → dev message
        assertTrue(ex.getMessage().contains(".env"));
    }

    // -----------------------------------------------------------------------
    // Case-insensitivity of profile matching
    // -----------------------------------------------------------------------

    @Test
    void validateScraperCredentials_PROD_uppercase_throwsWithProdMessage() {
        MetricsSecurityConfig config = buildConfig(new String[]{"PROD"}, "prometheus", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                config::validateScraperCredentials);
        assertTrue(ex.getMessage().contains("production"));
    }

    @Test
    void validateScraperCredentials_TEST_uppercase_doesNotThrow() {
        MetricsSecurityConfig config = buildConfig(new String[]{"TEST"}, "prometheus", "");
        assertDoesNotThrow(config::validateScraperCredentials);
    }
}
