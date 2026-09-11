package com.digitalia.sourcing.domain.auth.dto;

import com.digitalia.sourcing.domain.auth.model.Role;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeamMemberDto(
    UUID id,
    String email,
    String fullName,
    Role role,
    boolean enabled,
    String teamId,
    List<String> privileges,
    Instant joinedAt
) {}
