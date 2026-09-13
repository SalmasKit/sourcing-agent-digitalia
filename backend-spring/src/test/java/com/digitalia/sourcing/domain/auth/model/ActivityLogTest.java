package com.digitalia.sourcing.domain.auth.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ActivityLogTest {

    @Test
    void testActivityLogBuilder() {
        UUID id = UUID.randomUUID();
        String teamId = "team-123";
        String actorName = "John Doe";
        String actorEmail = "john@example.com";
        String actorRole = "ADMIN";
        String actionType = "ROLE_CREATED";

        ActivityLog activityLog = ActivityLog.builder()
                .id(id)
                .teamId(teamId)
                .actorName(actorName)
                .actorEmail(actorEmail)
                .actorRole(actorRole)
                .actionType(actionType)
                .build();

        assertNotNull(activityLog);
        assertEquals(id, activityLog.getId());
        assertEquals(teamId, activityLog.getTeamId());
        assertEquals(actorName, activityLog.getActorName());
        assertEquals(actorEmail, activityLog.getActorEmail());
        assertEquals(actorRole, activityLog.getActorRole());
        assertEquals(actionType, activityLog.getActionType());
    }

    @Test
    void testActivityLogNoArgsConstructor() {
        ActivityLog activityLog = new ActivityLog();

        assertNotNull(activityLog);
        assertNull(activityLog.getId());
        assertNull(activityLog.getTeamId());
    }

    @Test
    void testActivityLogAllArgsConstructor() {
        UUID id = UUID.randomUUID();
        String teamId = "team-123";
        User actor = new User();
        String actorName = "John Doe";
        String actorEmail = "john@example.com";
        String actorRole = "ADMIN";
        String actionType = "ROLE_CREATED";
        String targetId = "target-456";
        String targetTitle = "Test Target";
        String details = "Test details";
        Instant createdAt = Instant.now();

        ActivityLog activityLog = new ActivityLog(
                id, teamId, actor, actorName, actorEmail, actorRole,
                actionType, targetId, targetTitle, details, createdAt
        );

        assertNotNull(activityLog);
        assertEquals(id, activityLog.getId());
        assertEquals(teamId, activityLog.getTeamId());
        assertEquals(actor, activityLog.getActor());
        assertEquals(actorName, activityLog.getActorName());
        assertEquals(actorEmail, activityLog.getActorEmail());
        assertEquals(actorRole, activityLog.getActorRole());
        assertEquals(actionType, activityLog.getActionType());
        assertEquals(targetId, activityLog.getTargetId());
        assertEquals(targetTitle, activityLog.getTargetTitle());
        assertEquals(details, activityLog.getDetails());
        assertEquals(createdAt, activityLog.getCreatedAt());
    }
}