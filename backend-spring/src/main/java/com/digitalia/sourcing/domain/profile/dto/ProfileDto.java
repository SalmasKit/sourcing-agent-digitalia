package com.digitalia.sourcing.domain.profile.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ProfileDto(
    UUID id,
    UUID searchRequestId,
    String sourcePlatform,
    String sourceUrl,
    String fullName,
    String headline,
    String location,
    Map<String, Object> skills,
    Short experienceYears,
    BigDecimal score,
    Map<String, Object> scoreBreakdown,
    Map<String, Object> rawData,
    Instant createdAt
) {}
