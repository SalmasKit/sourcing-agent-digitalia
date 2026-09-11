package com.digitalia.sourcing.domain.auth.dto;

import com.digitalia.sourcing.domain.auth.model.Role;
import java.util.UUID;

public record UserDto(
    UUID id,
    String email,
    String fullName,
    Role role,
    boolean enabled,
    String teamId,
    String privileges
) {
    public UserDto(UUID id, String email, String fullName, Role role, boolean enabled) {
        this(id, email, fullName, role, enabled, "digitalia_workspace", "create_roles,shortlist_candidates,manage_notes,source_candidates,export_data");
    }
}
