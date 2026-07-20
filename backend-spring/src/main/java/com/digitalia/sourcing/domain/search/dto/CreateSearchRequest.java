package com.digitalia.sourcing.domain.search.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSearchRequest(
    @NotBlank(message = "Search description is required")
    String rawDescription
) {}
