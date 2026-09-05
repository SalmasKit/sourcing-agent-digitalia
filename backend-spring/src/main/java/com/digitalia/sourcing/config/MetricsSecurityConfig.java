package com.digitalia.sourcing.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Arrays;

import static org.springframework.security.config.Customizer.withDefaults;

/**
 * Chaîne de sécurité dédiée au scraping Prometheus, isolée du flux JWT applicatif.
 *
 * <p>Utilise Basic Auth avec un compte de service en mémoire (pas lié à
 * {@link com.digitalia.sourcing.domain.auth.repository.UserRepository}), pour que
 * les identifiants de scraping n'expirent jamais contrairement à un access token JWT.
 *
 * <p>{@code @Order(1)} garantit que cette chaîne est évaluée en priorité sur
 * {@code /actuator/prometheus} avant que la chaîne principale (JWT) ne s'applique.
 *
 * <p>Un mot de passe vide n'est <em>pas</em> un échec d'auth : BCrypt hashe et
 * compare {@code ""} comme n'importe quelle autre valeur. D'où le fail-fast
 * {@link #validateScraperCredentials()}, qui refuse de démarrer <em>y compris en
 * dev</em> si {@code METRICS_SCRAPER_PASSWORD} est absent.
 *
 * <p>C'est volontairement plus strict que le soft-warning JWT côté agent Python
 * ({@code _assert_jwt_secret_configured}) : l'agent a un cas d'usage légitime
 * « tourner seul sans Spring Boot » en local ; le scraper Prometheus n'a pas
 * d'équivalent « parfois inutile » — sans mot de passe réel, l'endpoint serait
 * ouvert au blank-password, donc hard-fail partout.
 */
@Configuration
public class MetricsSecurityConfig {

    @Value("${app.metrics.scraper.username}")
    private String scraperUsername;

    @Value("${app.metrics.scraper.password}")
    private String scraperPassword;

    @Autowired(required = false)
    private Environment environment;

    /**
     * Refuse le démarrage si le mot de passe scraper est vide — tous profils inclus sauf test.
     * Les messages diffèrent prod / non-prod ; le résultat (exception) est le même.
     */
    @PostConstruct
    public void validateScraperCredentials() {
        if (isTestEnvironment()) {
            // Skip validation in test environment
            return;
        }
        if (scraperPassword == null || scraperPassword.isBlank()) {
            if (isProductionEnvironment()) {
                throw new IllegalStateException(
                        "METRICS_SCRAPER_PASSWORD must be set in production — "
                                + "the backend cannot start without it."
                );
            }
            throw new IllegalStateException(
                    "METRICS_SCRAPER_PASSWORD is not set. Define it in your .env file "
                            + "before starting the backend — see .env.example."
            );
        }
    }

    private boolean isProductionEnvironment() {
        if (environment == null) {
            return false;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
    }

    private boolean isTestEnvironment() {
        if (environment == null) {
            return false;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "test".equalsIgnoreCase(p));
    }

    @Bean
    @Order(1)
    public SecurityFilterChain metricsSecurityFilterChain(HttpSecurity http, PasswordEncoder passwordEncoder) throws Exception {
        http
                .securityMatcher("/actuator/prometheus")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("METRICS_SCRAPER"))
                .httpBasic(withDefaults())
                .userDetailsService(scraperUserDetailsService(passwordEncoder));

        return http.build();
    }

    private UserDetailsService scraperUserDetailsService(PasswordEncoder passwordEncoder) {
        UserDetails scraper = User.withUsername(scraperUsername)
                .password(passwordEncoder.encode(scraperPassword))
                .roles("METRICS_SCRAPER")
                .build();
        return new InMemoryUserDetailsManager(scraper);
    }
}
