package com.digitalia.sourcing.domain.profile.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ProfileTest {

    @Test
    void testUpdateScore() {
        Profile profile = Profile.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .build();

        BigDecimal newScore = new BigDecimal("85.5");
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("skill_match", 90);
        breakdown.put("experience", 80);

        profile.updateScore(newScore, breakdown);

        assertEquals(newScore, profile.getScore());
        assertEquals(breakdown, profile.getScoreBreakdown());
    }

    @Test
    void testUpdateScoreWithNullBreakdown() {
        Profile profile = Profile.builder()
                .id(UUID.randomUUID())
                .fullName("Jane Smith")
                .build();

        BigDecimal newScore = new BigDecimal("75.0");

        profile.updateScore(newScore, null);

        assertEquals(newScore, profile.getScore());
        assertNull(profile.getScoreBreakdown());
    }

    @Test
    void testProfileBuilder() {
        UUID id = UUID.randomUUID();
        String fullName = "Test User";
        String location = "Paris";

        Profile profile = Profile.builder()
                .id(id)
                .fullName(fullName)
                .location(location)
                .build();

        assertNotNull(profile);
        assertEquals(id, profile.getId());
        assertEquals(fullName, profile.getFullName());
        assertEquals(location, profile.getLocation());
    }

    @Test
    void testProfileNoArgsConstructor() {
        Profile profile = new Profile();

        assertNotNull(profile);
        assertNull(profile.getId());
        assertNull(profile.getFullName());
    }
}