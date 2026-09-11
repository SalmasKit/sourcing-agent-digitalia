package com.digitalia.sourcing.domain.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record ActivityLogDto(
    UUID id,
    String teamId,
    UUID actorId,
    String actorName,
    String actorEmail,
    String actorRole,
    String actionType,
    String targetId,
    String targetTitle,
    String details,
    Instant createdAt
) {}
