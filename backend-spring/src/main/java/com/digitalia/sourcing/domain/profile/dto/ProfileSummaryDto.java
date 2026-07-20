package com.digitalia.sourcing.domain.profile.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public record ProfileSummaryDto(
    UUID id,
    String sourcePlatform,
    String fullName,
    String headline,
    String location,
    Short experienceYears,
    BigDecimal score
) {}
