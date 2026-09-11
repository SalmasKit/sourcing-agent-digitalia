package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.RefreshToken;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.TeamInvitation;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.RefreshTokenRepository;
import com.digitalia.sourcing.domain.auth.repository.TeamInvitationRepository;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import com.digitalia.sourcing.shared.exception.InvalidRefreshTokenException;
import com.digitalia.sourcing.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
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
    private TeamInvitationRepository teamInvitationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshTokenDurationMs", 604800000L);
        ReflectionTestUtils.setField(authService, "frontendUrl", "http://localhost:5173");
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

    @Test
    void refreshToken_shouldRotateTokenSuccessfully() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@email.com")
                .fullName("Salma Barrak")
                .role(Role.RECRUITER)
                .enabled(true)
                .build();

        RefreshToken oldToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tokenHash("hashed-token")
                .expiryDate(Instant.now().plusSeconds(3600))
                .revoked(false)
                .build();

        RefreshToken newToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tokenHash("new-hashed-token")
                .rawToken("new-raw-refresh-token")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(oldToken));
        when(jwtService.generateToken(user)).thenReturn("new-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(newToken);

        LoginResponse response = authService.refreshToken("raw-token");

        assertNotNull(response);
        assertEquals("new-access-token", response.accessToken());
        assertEquals("new-raw-refresh-token", response.refreshToken());
        verify(refreshTokenRepository, times(1)).deleteByTokenHash(anyString());
    }

    @Test
    void refreshToken_shouldThrowExceptionWhenTokenNotFound() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThrows(InvalidRefreshTokenException.class,
                () -> authService.refreshToken("non-existent-token"));
    }

    @Test
    void refreshToken_shouldThrowExceptionWhenTokenExpired() {
        User user = User.builder().build();
        RefreshToken expiredToken = RefreshToken.builder()
                .user(user)
                .expiryDate(Instant.now().minusSeconds(3600))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expiredToken));

        assertThrows(InvalidRefreshTokenException.class,
                () -> authService.refreshToken("expired-token"));
        verify(refreshTokenRepository, times(1)).delete(expiredToken);
    }

    @Test
    void logout_shouldDeleteTokenByHash() {
        authService.logout("raw-token-to-logout");

        verify(refreshTokenRepository, times(1)).deleteByTokenHash(anyString());
    }

    @Test
    void changePassword_shouldSucceedWhenCurrentMatches() {
        User user = User.builder()
                .email("user@example.com")
                .password("old_encoded")
                .build();
        ChangePasswordRequest request = new ChangePasswordRequest("OldPass123", "NewPass456");

        when(passwordEncoder.matches("OldPass123", "old_encoded")).thenReturn(true);
        when(passwordEncoder.matches("NewPass456", "old_encoded")).thenReturn(false);
        when(passwordEncoder.encode("NewPass456")).thenReturn("new_encoded");

        authService.changePassword(user, request);

        assertEquals("new_encoded", user.getPassword());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void changePassword_shouldThrowWhenCurrentPasswordDoesNotMatch() {
        User user = User.builder()
                .email("user@example.com")
                .password("old_encoded")
                .build();
        ChangePasswordRequest request = new ChangePasswordRequest("WrongPass", "NewPass456");

        when(passwordEncoder.matches("WrongPass", "old_encoded")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> authService.changePassword(user, request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_shouldThrowWhenNewPasswordSameAsOld() {
        User user = User.builder()
                .email("user@example.com")
                .password("old_encoded")
                .build();
        ChangePasswordRequest request = new ChangePasswordRequest("SamePass", "SamePass");

        when(passwordEncoder.matches("SamePass", "old_encoded")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.changePassword(user, request));
    }

    @Test
    void forgotPassword_shouldGenerateTokenAndSendEmail() {
        User user = User.builder()
                .email("forgot@example.com")
                .build();
        ForgotPasswordRequest request = new ForgotPasswordRequest("forgot@example.com");

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));

        String token = authService.forgotPassword(request);

        assertNotNull(token);
        assertEquals(token, user.getPasswordResetToken());
        assertNotNull(user.getPasswordResetExpiry());
        verify(userRepository, times(1)).save(user);
        verify(emailService, times(1)).sendPasswordReset(eq("forgot@example.com"), contains("resetToken=" + token));
    }

    @Test
    void forgotPassword_shouldThrowWhenEmailNotFound() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("nonexistent@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.forgotPassword(request));
    }

    @Test
    void resetPassword_shouldUpdatePasswordSuccessfully() {
        User user = User.builder()
                .email("user@example.com")
                .passwordResetToken("valid-token")
                .passwordResetExpiry(Instant.now().plusSeconds(3600))
                .build();
        ResetPasswordRequest request = new ResetPasswordRequest("valid-token", "NewPassword123");

        when(userRepository.findByPasswordResetToken("valid-token")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPassword123")).thenReturn("new_encoded_password");

        authService.resetPassword(request);

        assertEquals("new_encoded_password", user.getPassword());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void resetPassword_shouldThrowWhenTokenNotFound() {
        ResetPasswordRequest request = new ResetPasswordRequest("invalid-token", "NewPassword123");
        when(userRepository.findByPasswordResetToken("invalid-token")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(request));
    }

    @Test
    void resetPassword_shouldThrowWhenTokenExpired() {
        User user = User.builder()
                .email("user@example.com")
                .passwordResetToken("expired-token")
                .passwordResetExpiry(Instant.now().minusSeconds(3600))
                .build();
        ResetPasswordRequest request = new ResetPasswordRequest("expired-token", "NewPassword123");

        when(userRepository.findByPasswordResetToken("expired-token")).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(request));
        assertNull(user.getPasswordResetToken());
        assertNull(user.getPasswordResetExpiry());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void acceptInvite_forNewUser_shouldCreateUserAndAccept() {
        AcceptInviteRequest request = new AcceptInviteRequest("tok-123", "New User", "Pass12345");
        TeamInvitation invitation = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .email("new@example.com")
                .teamId("team_1")
                .role(Role.RECRUITER)
                .privileges("shortlist_candidates")
                .token("tok-123")
                .status("PENDING")
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        RefreshToken refreshToken = RefreshToken.builder()
                .tokenHash("hash")
                .rawToken("raw-refresh-token")
                .build();

        when(teamInvitationRepository.findByToken("tok-123")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Pass12345")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");
        when(jwtService.getExpirationTime()).thenReturn(3600000L);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(refreshToken);

        LoginResponse response = authService.acceptInvite(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.accessToken());
        assertEquals("raw-refresh-token", response.refreshToken());
        assertEquals("ACCEPTED", invitation.getStatus());
        verify(teamInvitationRepository, times(1)).save(invitation);
    }

    @Test
    void acceptInvite_forExistingUser_shouldUpdateUserAndAccept() {
        AcceptInviteRequest request = new AcceptInviteRequest("tok-123", "Existing User", "Pass12345");
        TeamInvitation invitation = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .email("existing@example.com")
                .teamId("new_team")
                .role(Role.HR_ADMIN)
                .privileges("create_roles,shortlist_candidates")
                .token("tok-123")
                .status("PENDING")
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        User existingUser = User.builder()
                .email("existing@example.com")
                .teamId("old_team")
                .role(Role.RECRUITER)
                .build();

        RefreshToken refreshToken = RefreshToken.builder()
                .tokenHash("hash")
                .rawToken("raw-refresh-token")
                .build();

        when(teamInvitationRepository.findByToken("tok-123")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.encode("Pass12345")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenReturn(existingUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");
        when(jwtService.getExpirationTime()).thenReturn(3600000L);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(refreshToken);

        LoginResponse response = authService.acceptInvite(request);

        assertNotNull(response);
        assertEquals("new_team", existingUser.getTeamId());
        assertEquals(Role.HR_ADMIN, existingUser.getRole());
        assertEquals("ACCEPTED", invitation.getStatus());
    }

    @Test
    void acceptInvite_shouldThrowWhenInvitationNotFoundOrExpired() {
        when(teamInvitationRepository.findByToken("tok-missing")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> authService.acceptInvite(new AcceptInviteRequest("tok-missing", "Name", "Pass")));

        TeamInvitation expiredInv = TeamInvitation.builder()
                .status("PENDING")
                .expiresAt(Instant.now().minusSeconds(100))
                .build();
        when(teamInvitationRepository.findByToken("tok-expired")).thenReturn(Optional.of(expiredInv));

        assertThrows(IllegalArgumentException.class,
                () -> authService.acceptInvite(new AcceptInviteRequest("tok-expired", "Name", "Pass")));
    }
}
