package com.digitalia.sourcing.domain.search.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSearchRequest(
    @NotBlank(message = "Search description is required")
    @Size(max = 2000, message = "Search description must not exceed 2000 characters")
    String rawDescription
) {}

