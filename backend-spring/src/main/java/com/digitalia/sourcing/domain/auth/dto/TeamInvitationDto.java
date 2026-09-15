package com.digitalia.sourcing.domain.auth.dto;

import com.digitalia.sourcing.domain.auth.model.Role;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeamInvitationDto(
    UUID id,
    String email,
    String fullName,
    String teamId,
    Role role,
    List<String> privileges,
    String token,
    String status,
    Instant expiresAt,
    Instant createdAt
) {}
