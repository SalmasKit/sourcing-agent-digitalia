package com.digitalia.sourcing.domain.auth.dto;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    Long expiresIn,
    String tokenType,
    UserDto user
) {}

