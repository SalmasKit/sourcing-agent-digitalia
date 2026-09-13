package com.digitalia.sourcing.domain.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    // SHA-256 digest of sample development key to forbid in production environments
    private static final String INSECURE_SAMPLE_DIGEST = "438664e1ff7481677e0eccd327d0bc3b734e20d7943c8ff10aaecceb3d17e27f";

    private final String secretKey;
    private final long jwtExpiration;
    private final Environment environment;

    public JwtService(
            @Value("${app.jwt.secret:}") String secretKey,
            @Value("${app.jwt.access-token-expiration-ms:900000}") long jwtExpiration,
            @Autowired(required = false) Environment environment) {
        this.secretKey = secretKey;
        this.jwtExpiration = jwtExpiration;
        this.environment = environment;
    }

    @PostConstruct
    public void validateConfiguration() {
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret key (app.jwt.secret) must not be empty! Set the JWT_SECRET environment variable.");
        }

        if (isProductionEnvironment() && isKnownInsecureDevSecret(secretKey)) {
            throw new IllegalStateException("CRITICAL SECURITY ERROR: The default development JWT secret cannot be used in production! Please set a unique, strong JWT_SECRET environment variable.");
        }

        try {
            byte[] keyBytes = Decoders.BASE64.decode(secretKey);
            if (keyBytes.length < 32) {
                throw new IllegalStateException("JWT secret key must be at least 256 bits (32 bytes) long when Base64-decoded.");
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT secret key must be a valid Base64-encoded string.", e);
        }
        log.info("JWT configuration validated successfully.");
    }

    private boolean isKnownInsecureDevSecret(String key) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(key.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return INSECURE_SAMPLE_DIGEST.equalsIgnoreCase(hexString.toString());
        } catch (NoSuchAlgorithmException e) {
            return false;
        }
    }

    private boolean isProductionEnvironment() {
        if (environment == null) {
            return false;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    public String generateSystemToken() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "SUPER_ADMIN");
        return Jwts.builder()
                .claims(claims)
                .subject("system-internal@digitalia.io")
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + 86400000L)) // 24 hours
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public long getExpirationTime() {
        return jwtExpiration;
    }

    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        return Jwts
                .builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
