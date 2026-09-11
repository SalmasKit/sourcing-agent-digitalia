package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.dto.InviteRecruiterRequest;
import com.digitalia.sourcing.domain.auth.dto.TeamInvitationDto;
import com.digitalia.sourcing.domain.auth.model.ActivityLog;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.TeamInvitation;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.ActivityLogRepository;
import com.digitalia.sourcing.domain.auth.repository.TeamInvitationRepository;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamInvitationRepository invitationRepository;

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private TeamService teamService;

    private User adminUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(teamService, "frontendUrl", "http://localhost:5173");
        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .fullName("Targetalent Admin")
                .role(Role.HR_ADMIN)
                .teamId("targetalent_workspace")
                .enabled(true)
                .build();
    }

    @Test
    void inviteRecruiter_shouldSaveInvitationAndDispatchEmail() {
        InviteRecruiterRequest request = new InviteRecruiterRequest(
                "candidate.recruiter@example.com",
                "Jane Doe",
                Role.RECRUITER,
                List.of("shortlist_candidates", "source_candidates")
        );

        TeamInvitation savedInvitation = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .email(request.email())
                .invitedBy(adminUser)
                .role(Role.RECRUITER)
                .privileges("shortlist_candidates,source_candidates")
                .token(UUID.randomUUID().toString())
                .status("PENDING")
                .expiresAt(Instant.now().plusSeconds(604800))
                .build();

        ActivityLog mockLog = ActivityLog.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .actorName("Targetalent Admin")
                .actorEmail("admin@example.com")
                .actorRole("HR_ADMIN")
                .actionType("RECRUITER_INVITED")
                .build();

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(invitationRepository.save(any(TeamInvitation.class))).thenReturn(savedInvitation);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mockLog);

        TeamInvitationDto result = teamService.inviteRecruiter(adminUser, request);

        assertNotNull(result);
        assertEquals(request.email(), result.email());
        assertEquals("PENDING", result.status());
        assertEquals(Role.RECRUITER, result.role());

        verify(invitationRepository, times(1)).save(any(TeamInvitation.class));
        verify(emailService, times(1)).sendTeamInvitation(
                eq(request.email()),
                eq("Targetalent Admin"),
                contains("http://localhost:5173/?invite="),
                eq("RECRUITER"),
                eq("shortlist_candidates,source_candidates")
        );
    }

    @Test
    void inviteHrAdmin_shouldSaveInvitationWithAdminRole() {
        InviteRecruiterRequest request = new InviteRecruiterRequest(
                "admin.colleague@example.com",
                "Alex Smith",
                Role.HR_ADMIN,
                List.of("create_roles", "shortlist_candidates", "manage_notes", "source_candidates", "export_data")
        );

        TeamInvitation savedInvitation = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .email(request.email())
                .invitedBy(adminUser)
                .role(Role.HR_ADMIN)
                .privileges("create_roles,shortlist_candidates,manage_notes,source_candidates,export_data")
                .token(UUID.randomUUID().toString())
                .status("PENDING")
                .expiresAt(Instant.now().plusSeconds(604800))
                .build();

        ActivityLog mockLog = ActivityLog.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .actorName("Targetalent Admin")
                .actorEmail("admin@example.com")
                .actorRole("HR_ADMIN")
                .actionType("HR_ADMIN_INVITED")
                .build();

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(invitationRepository.save(any(TeamInvitation.class))).thenReturn(savedInvitation);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mockLog);

        TeamInvitationDto result = teamService.inviteRecruiter(adminUser, request);

        assertNotNull(result);
        assertEquals(request.email(), result.email());
        assertEquals(Role.HR_ADMIN, result.role());

        verify(emailService, times(1)).sendTeamInvitation(
                eq(request.email()),
                eq("Targetalent Admin"),
                contains("http://localhost:5173/?invite="),
                eq("HR_ADMIN"),
                eq("create_roles,shortlist_candidates,manage_notes,source_candidates,export_data")
        );
    }

    @Test
    void cancelInvitation_shouldRevokePendingInvitation() {
        UUID invitationId = UUID.randomUUID();
        TeamInvitation invitation = TeamInvitation.builder()
                .id(invitationId)
                .teamId("targetalent_workspace")
                .email("invitee@example.com")
                .invitedBy(adminUser)
                .role(Role.RECRUITER)
                .privileges("shortlist_candidates")
                .token("tok-123")
                .status("PENDING")
                .expiresAt(Instant.now().plusSeconds(604800))
                .build();

        ActivityLog mockLog = ActivityLog.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .actorName("Targetalent Admin")
                .actorEmail("admin@example.com")
                .actorRole("HR_ADMIN")
                .actionType("INVITATION_CANCELLED")
                .build();

        when(invitationRepository.findById(invitationId)).thenReturn(java.util.Optional.of(invitation));
        when(invitationRepository.save(any(TeamInvitation.class))).thenReturn(invitation);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mockLog);

        teamService.cancelInvitation(adminUser, invitationId);

        assertEquals("REVOKED", invitation.getStatus());
        verify(invitationRepository, times(1)).save(invitation);
        verify(activityLogRepository, times(1)).save(any(ActivityLog.class));
    }
}
