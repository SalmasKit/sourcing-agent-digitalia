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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TeamInvitationRepository teamInvitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-token-expiration-ms}")
    private long refreshTokenDurationMs;

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use");
        }

        Role assignedRole = request.role() != null ? request.role() : Role.RECRUITER;
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(assignedRole)
                .enabled(true)
                .teamId("targetalent_workspace")
                .privileges("create_roles,shortlist_candidates,manage_notes,source_candidates,export_data")
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered user with email: {}", savedUser.getEmail());
        return mapToDto(savedUser);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String accessToken = jwtService.generateToken(user);
        RefreshToken refreshToken = createRefreshToken(user);

        return new LoginResponse(
                accessToken,
                refreshToken.getRawToken(),
                jwtService.getExpirationTime() / 1000,
                "Bearer",
                mapToDto(user)
        );
    }

    @Transactional
    public LoginResponse refreshToken(String requestRefreshToken) {
        String hashedToken = hashToken(requestRefreshToken);
        return refreshTokenRepository.findByTokenHash(hashedToken)
                .map(this::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtService.generateToken(user);
                    // Cycle the refresh token for security (Rotation)
                    refreshTokenRepository.deleteByTokenHash(hashedToken);
                    RefreshToken newRefreshToken = createRefreshToken(user);
                    return new LoginResponse(
                            accessToken,
                            newRefreshToken.getRawToken(),
                            jwtService.getExpirationTime() / 1000,
                            "Bearer",
                            mapToDto(user)
                    );
                })
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is not in database"));
    }

    @Transactional
    public void logout(String requestRefreshToken) {
        String hashedToken = hashToken(requestRefreshToken);
        refreshTokenRepository.deleteByTokenHash(hashedToken);
    }

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPassword())) {
            throw new IllegalArgumentException("Current password does not match");
        }
        if (passwordEncoder.matches(request.newPassword(), currentUser.getPassword())) {
            throw new IllegalArgumentException("New password cannot be the same as the old password");
        }

        currentUser.updatePassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
        log.info("Password updated successfully for user {}", currentUser.getEmail());
    }

    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email address"));

        String resetToken = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plus(2, ChronoUnit.HOURS);
        user.setPasswordReset(resetToken, expiry);
        userRepository.save(user);

        String resetUrl = frontendUrl + "/?resetToken=" + resetToken;
        emailService.sendPasswordReset(user.getEmail(), resetUrl);

        log.info("Generated password reset token and dispatched email for user {}: {}", user.getEmail(), resetToken);
        return resetToken;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.token())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset token"));

        if (user.getPasswordResetExpiry() == null || Instant.now().isAfter(user.getPasswordResetExpiry())) {
            user.clearPasswordReset();
            userRepository.save(user);
            throw new IllegalArgumentException("Password reset token has expired. Please request a new one.");
        }

        user.updatePassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Password reset successfully for user {}", user.getEmail());
    }

    @Transactional
    public LoginResponse acceptInvite(AcceptInviteRequest request) {
        TeamInvitation invitation = teamInvitationRepository.findByToken(request.token())
                .orElseThrow(() -> new IllegalArgumentException("Invalid invitation token"));

        if (invitation.isExpired() || !"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new IllegalArgumentException("Invitation has expired or already been accepted.");
        }

        User user;
        if (userRepository.existsByEmail(invitation.getEmail())) {
            user = userRepository.findByEmail(invitation.getEmail()).orElseThrow();
            user.updatePassword(passwordEncoder.encode(request.password()));
            user.updateTeamId(invitation.getTeamId());
            user.updatePrivileges(invitation.getPrivileges());
            user.changeRole(invitation.getRole());
            user.enable();
        } else {
            user = User.builder()
                    .email(invitation.getEmail())
                    .fullName(request.fullName())
                    .password(passwordEncoder.encode(request.password()))
                    .role(invitation.getRole())
                    .teamId(invitation.getTeamId())
                    .privileges(invitation.getPrivileges())
                    .enabled(true)
                    .build();
        }

        User savedUser = userRepository.save(user);
        invitation.accept();
        teamInvitationRepository.save(invitation);

        String accessToken = jwtService.generateToken(savedUser);
        RefreshToken refreshToken = createRefreshToken(savedUser);

        log.info("Invitation accepted by user {}. Joined team {}", savedUser.getEmail(), invitation.getTeamId());

        return new LoginResponse(
                accessToken,
                refreshToken.getRawToken(),
                jwtService.getExpirationTime() / 1000,
                "Bearer",
                mapToDto(savedUser)
        );
    }

    private RefreshToken createRefreshToken(User user) {
        String rawToken = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(rawToken))
                .rawToken(rawToken)
                .expiryDate(Instant.now().plusMillis(refreshTokenDurationMs))
                .revoked(false)
                .build();
        return refreshTokenRepository.save(refreshToken);
    }

    private RefreshToken verifyExpiration(RefreshToken token) {
        if (token.isExpired() || token.isRevoked()) {
            refreshTokenRepository.delete(token);
            throw new InvalidRefreshTokenException("Refresh token was expired or revoked. Please sign in again.");
        }
        return token;
    }

    private UserDto mapToDto(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getTeamId() != null ? user.getTeamId() : "targetalent_workspace",
                user.getPrivileges() != null ? user.getPrivileges() : "create_roles,shortlist_candidates,manage_notes,source_candidates,export_data"
        );
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
