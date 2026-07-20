package com.digitalia.sourcing.domain.auth.dto;

import com.digitalia.sourcing.domain.auth.model.Role;
import java.util.UUID;

public record UserDto(
    UUID id,
    String email,
    String fullName,
    Role role,
    boolean enabled
) {}
