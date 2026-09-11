package com.digitalia.sourcing.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RecordActivityRequest(
    @NotBlank(message = "Action type is required")
    String actionType,

    String targetId,
    String targetTitle,
    String details
) {}
