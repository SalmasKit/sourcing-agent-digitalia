package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.RefreshToken;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.RefreshTokenRepository;
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
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.jwt.refresh-token-expiration-ms}")
    private long refreshTokenDurationMs;

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(Role.RECRUITER)
                .enabled(true)
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
                user.isEnabled()
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
