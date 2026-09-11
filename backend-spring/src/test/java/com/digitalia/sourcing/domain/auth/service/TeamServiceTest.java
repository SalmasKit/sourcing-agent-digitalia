package com.digitalia.sourcing.domain.auth.service;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.ActivityLog;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.TeamInvitation;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.ActivityLogRepository;
import com.digitalia.sourcing.domain.auth.repository.TeamInvitationRepository;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import com.digitalia.sourcing.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
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
    private User recruiterUser;

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

        recruiterUser = User.builder()
                .id(UUID.randomUUID())
                .email("recruiter@example.com")
                .fullName("Recruiter Jane")
                .role(Role.RECRUITER)
                .teamId("targetalent_workspace")
                .enabled(true)
                .build();
    }

    @Test
    void getTeamMembers_shouldReturnListIncludingCurrentUser() {
        when(userRepository.findByTeamId("targetalent_workspace")).thenReturn(List.of(adminUser, recruiterUser));

        List<TeamMemberDto> members = teamService.getTeamMembers(adminUser);

        assertEquals(2, members.size());
        assertEquals("admin@example.com", members.get(0).email());
        assertEquals("recruiter@example.com", members.get(1).email());
    }

    @Test
    void getTeamMembers_whenEmpty_shouldIncludeCurrentUser() {
        when(userRepository.findByTeamId("targetalent_workspace")).thenReturn(List.of());

        List<TeamMemberDto> members = teamService.getTeamMembers(adminUser);

        assertEquals(1, members.size());
        assertEquals("admin@example.com", members.get(0).email());
    }

    @Test
    void getPendingInvitations_shouldReturnInvitations() {
        TeamInvitation inv = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .email("pending@example.com")
                .teamId("targetalent_workspace")
                .role(Role.RECRUITER)
                .status("PENDING")
                .build();

        when(invitationRepository.findByTeamIdAndStatusOrderByCreatedAtDesc("targetalent_workspace", "PENDING"))
                .thenReturn(List.of(inv));

        List<TeamInvitationDto> results = teamService.getPendingInvitations(adminUser);

        assertEquals(1, results.size());
        assertEquals("pending@example.com", results.get(0).email());
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
    }

    @Test
    void inviteRecruiter_shouldThrowWhenNonAdmin() {
        InviteRecruiterRequest request = new InviteRecruiterRequest(
                "other@example.com",
                "Other",
                Role.RECRUITER,
                List.of()
        );

        assertThrows(AccessDeniedException.class, () -> teamService.inviteRecruiter(recruiterUser, request));
    }

    @Test
    void inviteRecruiter_shouldThrowWhenUserAlreadyInTeam() {
        InviteRecruiterRequest request = new InviteRecruiterRequest(
                "recruiter@example.com",
                "Recruiter Jane",
                Role.RECRUITER,
                List.of()
        );

        when(userRepository.existsByEmail("recruiter@example.com")).thenReturn(true);
        when(userRepository.findByEmail("recruiter@example.com")).thenReturn(Optional.of(recruiterUser));

        assertThrows(IllegalArgumentException.class, () -> teamService.inviteRecruiter(adminUser, request));
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

        when(invitationRepository.findById(invitationId)).thenReturn(Optional.of(invitation));
        when(invitationRepository.save(any(TeamInvitation.class))).thenReturn(invitation);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mockLog);

        teamService.cancelInvitation(adminUser, invitationId);

        assertEquals("REVOKED", invitation.getStatus());
        verify(invitationRepository, times(1)).save(invitation);
    }

    @Test
    void cancelInvitation_shouldThrowWhenNotFoundOrNotPending() {
        UUID id = UUID.randomUUID();
        when(invitationRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.cancelInvitation(adminUser, id));

        TeamInvitation acceptedInv = TeamInvitation.builder()
                .id(id)
                .teamId("targetalent_workspace")
                .status("ACCEPTED")
                .build();
        when(invitationRepository.findById(id)).thenReturn(Optional.of(acceptedInv));

        assertThrows(IllegalStateException.class, () -> teamService.cancelInvitation(adminUser, id));
    }

    @Test
    void cancelInvitation_shouldThrowWhenDifferentTeam() {
        UUID id = UUID.randomUUID();
        TeamInvitation foreignInv = TeamInvitation.builder()
                .id(id)
                .teamId("other_team")
                .status("PENDING")
                .build();
        when(invitationRepository.findById(id)).thenReturn(Optional.of(foreignInv));

        assertThrows(AccessDeniedException.class, () -> teamService.cancelInvitation(adminUser, id));
    }

    @Test
    void updateMemberPrivileges_shouldUpdateAndReturnDto() {
        UUID memberId = recruiterUser.getId();
        UpdatePrivilegesRequest request = new UpdatePrivilegesRequest(List.of("create_roles", "manage_notes"));

        when(userRepository.findById(memberId)).thenReturn(Optional.of(recruiterUser));
        when(userRepository.save(any(User.class))).thenReturn(recruiterUser);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mock(ActivityLog.class));

        TeamMemberDto result = teamService.updateMemberPrivileges(adminUser, memberId, request);

        assertNotNull(result);
        assertEquals("create_roles,manage_notes", recruiterUser.getPrivileges());
        verify(userRepository, times(1)).save(recruiterUser);
    }

    @Test
    void updateMemberPrivileges_shouldThrowWhenDifferentTeam() {
        UUID memberId = UUID.randomUUID();
        User foreignUser = User.builder().id(memberId).teamId("other_team").build();
        when(userRepository.findById(memberId)).thenReturn(Optional.of(foreignUser));

        assertThrows(AccessDeniedException.class,
                () -> teamService.updateMemberPrivileges(adminUser, memberId, new UpdatePrivilegesRequest(List.of("create_roles"))));
    }

    @Test
    void toggleMemberStatus_shouldToggleBetweenDisabledAndEnabled() {
        UUID memberId = recruiterUser.getId();
        when(userRepository.findById(memberId)).thenReturn(Optional.of(recruiterUser));
        when(userRepository.save(any(User.class))).thenReturn(recruiterUser);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mock(ActivityLog.class));

        // Disable
        teamService.toggleMemberStatus(adminUser, memberId);
        assertFalse(recruiterUser.isEnabled());

        // Re-enable
        teamService.toggleMemberStatus(adminUser, memberId);
        assertTrue(recruiterUser.isEnabled());
    }

    @Test
    void toggleMemberStatus_shouldThrowWhenSelfDisable() {
        UUID adminId = adminUser.getId();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));

        assertThrows(IllegalArgumentException.class, () -> teamService.toggleMemberStatus(adminUser, adminId));
    }

    @Test
    void removeMember_shouldDisableAndChangeTeamId() {
        UUID memberId = recruiterUser.getId();
        when(userRepository.findById(memberId)).thenReturn(Optional.of(recruiterUser));
        when(userRepository.save(any(User.class))).thenReturn(recruiterUser);
        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(mock(ActivityLog.class));

        teamService.removeMember(adminUser, memberId);

        assertFalse(recruiterUser.isEnabled());
        assertTrue(recruiterUser.getTeamId().startsWith("removed_"));
        verify(userRepository, times(1)).save(recruiterUser);
    }

    @Test
    void removeMember_shouldThrowWhenSelfRemove() {
        UUID adminId = adminUser.getId();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));

        assertThrows(IllegalArgumentException.class, () -> teamService.removeMember(adminUser, adminId));
    }

    @Test
    void getTeamActivities_shouldReturnLogs() {
        ActivityLog log = ActivityLog.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .actorName("Admin")
                .actionType("ROLE_CREATED")
                .build();

        when(activityLogRepository.findByTeamIdOrderByCreatedAtDesc(eq("targetalent_workspace"), any(Pageable.class)))
                .thenReturn(List.of(log));

        List<ActivityLogDto> activities = teamService.getTeamActivities(adminUser, 10);

        assertEquals(1, activities.size());
        assertEquals("ROLE_CREATED", activities.get(0).actionType());
    }

    @Test
    void recordActivity_shouldPersistAndReturnDto() {
        RecordActivityRequest req = new RecordActivityRequest("LOGIN", "user-1", "Admin Login", "Logged in from web");
        ActivityLog log = ActivityLog.builder()
                .id(UUID.randomUUID())
                .teamId("targetalent_workspace")
                .actorName("Admin")
                .actionType("LOGIN")
                .build();

        when(activityLogRepository.save(any(ActivityLog.class))).thenReturn(log);

        ActivityLogDto dto = teamService.recordActivity(adminUser, req);

        assertNotNull(dto);
        assertEquals("LOGIN", dto.actionType());
        verify(activityLogRepository, times(1)).save(any(ActivityLog.class));
    }
}
