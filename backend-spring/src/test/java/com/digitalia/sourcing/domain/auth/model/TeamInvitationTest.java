package com.digitalia.sourcing.domain.auth.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TeamInvitationTest {

    @Test
    void testTeamInvitationBuilder() {
        UUID id = UUID.randomUUID();
        String teamId = "team-123";
        String email = "test@example.com";
        User invitedBy = new User();
        Role role = Role.RECRUITER;
        String token = "invitation-token";
        Instant expiresAt = Instant.now().plusSeconds(86400);

        TeamInvitation invitation = TeamInvitation.builder()
                .id(id)
                .teamId(teamId)
                .email(email)
                .invitedBy(invitedBy)
                .role(role)
                .token(token)
                .expiresAt(expiresAt)
                .build();

        assertNotNull(invitation);
        assertEquals(id, invitation.getId());
        assertEquals(teamId, invitation.getTeamId());
        assertEquals(email, invitation.getEmail());
        assertEquals(invitedBy, invitation.getInvitedBy());
        assertEquals(role, invitation.getRole());
        assertEquals(token, invitation.getToken());
        assertEquals("PENDING", invitation.getStatus());
        assertEquals(expiresAt, invitation.getExpiresAt());
    }

    @Test
    void testTeamInvitationNoArgsConstructor() {
        TeamInvitation invitation = new TeamInvitation();

        assertNotNull(invitation);
        assertNull(invitation.getId());
        assertEquals(Role.RECRUITER, invitation.getRole());
        assertEquals("PENDING", invitation.getStatus());
    }

    @Test
    void testIsExpiredTrue() {
        TeamInvitation invitation = TeamInvitation.builder()
                .expiresAt(Instant.now().minusSeconds(3600))
                .build();

        assertTrue(invitation.isExpired());
    }

    @Test
    void testIsExpiredFalse() {
        TeamInvitation invitation = TeamInvitation.builder()
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        assertFalse(invitation.isExpired());
    }

    @Test
    void testAccept() {
        TeamInvitation invitation = TeamInvitation.builder()
                .status("PENDING")
                .build();

        assertEquals("PENDING", invitation.getStatus());

        invitation.accept();

        assertEquals("ACCEPTED", invitation.getStatus());
    }

    @Test
    void testRevoke() {
        TeamInvitation invitation = TeamInvitation.builder()
                .status("PENDING")
                .build();

        assertEquals("PENDING", invitation.getStatus());

        invitation.revoke();

        assertEquals("REVOKED", invitation.getStatus());
    }

    @Test
    void testExpire() {
        TeamInvitation invitation = TeamInvitation.builder()
                .status("PENDING")
                .build();

        assertEquals("PENDING", invitation.getStatus());

        invitation.expire();

        assertEquals("EXPIRED", invitation.getStatus());
    }

    @Test
    void testDefaultPrivileges() {
        TeamInvitation invitation = TeamInvitation.builder().build();

        assertEquals("shortlist_candidates,manage_notes,source_candidates", invitation.getPrivileges());
    }
}