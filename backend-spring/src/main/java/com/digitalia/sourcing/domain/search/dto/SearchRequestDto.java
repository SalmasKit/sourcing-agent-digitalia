package com.digitalia.sourcing.domain.search.dto;

import com.digitalia.sourcing.domain.search.model.SearchStatus;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SearchRequestDto(
    UUID id,
    String rawDescription,
    Map<String, Object> extractedCriteria,
    SearchStatus status,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt
) {}
