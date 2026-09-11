package com.digitalia.sourcing.domain.auth.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UpdatePrivilegesRequest(
    @NotNull(message = "Privileges list cannot be null")
    List<String> privileges
) {}
