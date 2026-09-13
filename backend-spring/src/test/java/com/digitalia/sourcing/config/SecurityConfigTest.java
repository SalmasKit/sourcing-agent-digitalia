package com.digitalia.sourcing.config;

import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SecurityConfig}.
 *
 * <p>We test individual {@code @Bean} methods in isolation using Mockito —
 * no Spring context is loaded, so these tests are fast and don't need Docker.
 */
@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CorsConfigurationSource corsConfigurationSource;

    @InjectMocks
    private SecurityConfig securityConfig;

    // -----------------------------------------------------------------------
    // userDetailsService()
    // -----------------------------------------------------------------------

    @Test
    void userDetailsService_returnsUserWhenFound() {
        User mockUser = mock(User.class);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(mockUser));

        UserDetailsService service = securityConfig.userDetailsService();
        UserDetails result = service.loadUserByUsername("alice@example.com");

        assertNotNull(result);
        assertSame(mockUser, result);
    }

    @Test
    void userDetailsService_throwsWhenUserNotFound() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        UserDetailsService service = securityConfig.userDetailsService();

        assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("ghost@example.com"));
    }

    // -----------------------------------------------------------------------
    // authenticationProvider()
    // -----------------------------------------------------------------------

    @Test
    void authenticationProvider_returnsDaoProvider() {
        // No stub needed — userDetailsService is set on the provider but not called during construction
        var provider = securityConfig.authenticationProvider();

        assertNotNull(provider);
        assertInstanceOf(DaoAuthenticationProvider.class, provider);
    }

    // -----------------------------------------------------------------------
    // passwordEncoder()
    // -----------------------------------------------------------------------

    @Test
    void passwordEncoder_returnsBCryptEncoder() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();

        assertNotNull(encoder);
        assertInstanceOf(BCryptPasswordEncoder.class, encoder);
    }

    @Test
    void passwordEncoder_encodesAndMatches() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();
        String raw = "mySecret123";

        String encoded = encoder.encode(raw);

        assertNotNull(encoded);
        assertNotEquals(raw, encoded);
        assertTrue(encoder.matches(raw, encoded));
    }

    // -----------------------------------------------------------------------
    // authenticationManager()
    // -----------------------------------------------------------------------

    @Test
    void authenticationManager_delegatesToConfiguration() throws Exception {
        AuthenticationConfiguration authConfig = mock(AuthenticationConfiguration.class);
        AuthenticationManager mockManager = mock(AuthenticationManager.class);
        when(authConfig.getAuthenticationManager()).thenReturn(mockManager);

        AuthenticationManager result = securityConfig.authenticationManager(authConfig);

        assertNotNull(result);
        assertSame(mockManager, result);
        verify(authConfig).getAuthenticationManager();
    }
}
