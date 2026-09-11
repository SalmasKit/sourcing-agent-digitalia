package com.digitalia.sourcing.domain.auth.dto;

import com.digitalia.sourcing.domain.auth.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record InviteRecruiterRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    String fullName,

    Role role,

    List<String> privileges
) {}
