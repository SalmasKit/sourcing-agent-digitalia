package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.dto.LoginRequest;
import com.digitalia.sourcing.domain.auth.dto.LoginResponse;
import com.digitalia.sourcing.domain.auth.dto.RegisterRequest;
import com.digitalia.sourcing.domain.auth.dto.UserDto;
import com.digitalia.sourcing.domain.auth.model.RefreshToken;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.RefreshTokenRepository;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshTokenDurationMs", 604800000L);
    }

    @Test
    void register_shouldRegisterUserSuccessfully() {
        RegisterRequest request = new RegisterRequest("test@email.com", "Securepwd123", "Salma Barrak");
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@email.com")
                .password("hashed_password")
                .fullName("Salma Barrak")
                .role(Role.RECRUITER)
                .enabled(true)
                .build();

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDto result = authService.register(request);

        assertNotNull(result);
        assertEquals("test@email.com", result.email());
        assertEquals("Salma Barrak", result.fullName());
        assertEquals(Role.RECRUITER, result.role());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_shouldThrowExceptionWhenEmailExists() {
        RegisterRequest request = new RegisterRequest("test@email.com", "Securepwd123", "Salma Barrak");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_shouldAuthenticateAndReturnTokens() {
        LoginRequest request = new LoginRequest("test@email.com", "password");
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@email.com")
                .fullName("Salma Barrak")
                .role(Role.RECRUITER)
                .enabled(true)
                .build();
        RefreshToken refreshToken = RefreshToken.builder()
                .tokenHash("hashed-mock-refresh-token")
                .rawToken("mock-refresh-token")
                .build();

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("mock-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(refreshToken);

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-access-token", response.accessToken());
        assertEquals("mock-refresh-token", response.refreshToken());
        assertEquals("test@email.com", response.user().email());
        verify(authenticationManager, times(1)).authenticate(any());
    }
}
