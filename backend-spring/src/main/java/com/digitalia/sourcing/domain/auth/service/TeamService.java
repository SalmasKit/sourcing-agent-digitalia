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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private final UserRepository userRepository;
    private final TeamInvitationRepository invitationRepository;
    private final ActivityLogRepository activityLogRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public List<TeamMemberDto> getTeamMembers(User currentUser) {
        if (currentUser.getTeamId() == null) {
            return List.of();
        }

        List<User> members = userRepository.findByTeamId(currentUser.getTeamId());

        return members.stream()
                .map(this::mapToMemberDto)
                .collect(Collectors.toList());
    }

    public List<TeamInvitationDto> getPendingInvitations(User currentUser) {
        if (currentUser.getTeamId() == null) {
            return List.of();
        }

        return invitationRepository.findByTeamIdAndStatusOrderByCreatedAtDesc(currentUser.getTeamId(), "PENDING").stream()
                .map(this::mapToInvitationDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public TeamInvitationDto inviteRecruiter(User currentUser, InviteRecruiterRequest request) {
        verifyAdminAccess(currentUser);

        if (currentUser.getTeamId() == null) {
            throw new AccessDeniedException("You must be a member of a team to invite others.");
        }

        String teamId = currentUser.getTeamId();
        Role inviteRole = request.role() != null ? request.role() : Role.RECRUITER;
        String defaultPrivileges = inviteRole == Role.HR_ADMIN
                ? "create_roles,shortlist_candidates,manage_notes,source_candidates,export_data"
                : "shortlist_candidates,manage_notes,source_candidates";
        String privileges = (request.privileges() != null && !request.privileges().isEmpty())
                ? String.join(",", request.privileges())
                : defaultPrivileges;

        // Check if already registered
        if (userRepository.existsByEmail(request.email())) {
            User existing = userRepository.findByEmail(request.email()).orElseThrow();
            if (teamId.equals(existing.getTeamId())) {
                throw new IllegalArgumentException("User with this email is already a member of your team.");
            }
        }

        String rawToken = UUID.randomUUID().toString();
        TeamInvitation invitation = TeamInvitation.builder()
                .teamId(teamId)
                .email(request.email())
                .fullName(request.fullName())
                .invitedBy(currentUser)
                .role(inviteRole)
                .privileges(privileges)
                .token(rawToken)
                .status("PENDING")
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        TeamInvitation saved = invitationRepository.save(invitation);

        recordActivity(currentUser, new RecordActivityRequest(
                inviteRole == Role.HR_ADMIN ? "HR_ADMIN_INVITED" : "RECRUITER_INVITED",
                saved.getId().toString(),
                request.email(),
                "Invited " + request.email() + " as " + (inviteRole == Role.HR_ADMIN ? "HR Admin" : "Recruiter") + " with privileges: " + privileges
        ));

        // Dispatch invitation email
        String inviteUrl = frontendUrl + "/?invite=" + rawToken;
        String inviterDisplayName = (currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                ? currentUser.getFullName()
                : currentUser.getEmail();
        emailService.sendTeamInvitation(
                saved.getEmail(),
                inviterDisplayName,
                inviteUrl,
                saved.getRole() != null ? saved.getRole().name() : "RECRUITER",
                saved.getPrivileges()
        );

        log.info("Team invitation ({}) email dispatched to {} by admin {}", inviteRole, request.email(), currentUser.getEmail());
        return mapToInvitationDto(saved);
    }

    @Transactional
    public void cancelInvitation(User currentUser, UUID invitationId) {
        verifyAdminAccess(currentUser);

        if (currentUser.getTeamId() == null) {
            throw new AccessDeniedException("You must be a member of a team to cancel invitations.");
        }

        TeamInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!currentUser.getTeamId().equals(invitation.getTeamId())) {
            throw new AccessDeniedException("Cannot cancel invitation for a different team.");
        }

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new IllegalStateException("Only pending invitations can be cancelled.");
        }

        invitation.revoke();
        invitationRepository.save(invitation);

        recordActivity(currentUser, new RecordActivityRequest(
                "INVITATION_CANCELLED",
                invitation.getId().toString(),
                invitation.getEmail(),
                "Cancelled pending invitation for " + invitation.getEmail()
        ));
    }

    @Transactional
    public TeamMemberDto updateMemberPrivileges(User currentUser, UUID memberId, UpdatePrivilegesRequest request) {
        verifyAdminAccess(currentUser);

        if (currentUser.getTeamId() == null) {
            throw new AccessDeniedException("You must be a member of a team to modify privileges.");
        }

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found"));

        if (!currentUser.getTeamId().equals(member.getTeamId())) {
            throw new AccessDeniedException("Cannot modify privileges for users outside your team.");
        }

        String privString = String.join(",", request.privileges());
        member.updatePrivileges(privString);
        userRepository.save(member);

        recordActivity(currentUser, new RecordActivityRequest(
                "PRIVILEGES_UPDATED",
                member.getId().toString(),
                member.getFullName() != null ? member.getFullName() : member.getEmail(),
                "Updated privileges for " + member.getEmail() + " to: " + privString
        ));

        return mapToMemberDto(member);
    }

    @Transactional
    public void toggleMemberStatus(User currentUser, UUID memberId) {
        verifyAdminAccess(currentUser);

        if (currentUser.getTeamId() == null) {
            throw new AccessDeniedException("You must be a member of a team to modify member status.");
        }

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found"));

        if (!currentUser.getTeamId().equals(member.getTeamId())) {
            throw new AccessDeniedException("Cannot modify status for users outside your team.");
        }

        if (member.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Cannot disable your own admin account.");
        }

        if (member.isEnabled()) {
            member.disable();
        } else {
            member.enable();
        }
        userRepository.save(member);

        recordActivity(currentUser, new RecordActivityRequest(
                member.isEnabled() ? "MEMBER_ENABLED" : "MEMBER_DISABLED",
                member.getId().toString(),
                member.getFullName() != null ? member.getFullName() : member.getEmail(),
                (member.isEnabled() ? "Enabled" : "Disabled") + " access for " + member.getEmail()
        ));
    }

    @Transactional
    public void removeMember(User currentUser, UUID memberId) {
        verifyAdminAccess(currentUser);

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found"));

        if (member.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Cannot remove yourself from the team.");
        }

        member.updateTeamId("removed_" + UUID.randomUUID());
        member.disable();
        userRepository.save(member);

        recordActivity(currentUser, new RecordActivityRequest(
                "MEMBER_REMOVED",
                member.getId().toString(),
                member.getFullName() != null ? member.getFullName() : member.getEmail(),
                "Removed " + member.getEmail() + " from the team."
        ));
    }

    public List<ActivityLogDto> getTeamActivities(User currentUser, int limit) {
        if (currentUser.getTeamId() == null) {
            return List.of();
        }

        int size = Math.min(Math.max(limit, 1), 100);
        return activityLogRepository.findByTeamIdOrderByCreatedAtDesc(currentUser.getTeamId(), PageRequest.of(0, size)).stream()
                .map(this::mapToActivityDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ActivityLogDto recordActivity(User currentUser, RecordActivityRequest request) {
        if (currentUser.getTeamId() == null) {
            throw new AccessDeniedException("You must be a member of a team to record activity.");
        }

        String safeTargetTitle = request.targetTitle() != null && request.targetTitle().length() > 250
                ? request.targetTitle().substring(0, 247) + "..."
                : request.targetTitle();
        String safeTargetId = request.targetId() != null && request.targetId().length() > 100
                ? request.targetId().substring(0, 100)
                : request.targetId();

        ActivityLog logEntry = ActivityLog.builder()
                .teamId(currentUser.getTeamId())
                .actor(currentUser)
                .actorName(currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getEmail().split("@")[0])
                .actorEmail(currentUser.getEmail())
                .actorRole(currentUser.getRole() != null ? currentUser.getRole().name() : "RECRUITER")
                .actionType(request.actionType())
                .targetId(safeTargetId)
                .targetTitle(safeTargetTitle)
                .details(request.details())
                .build();

        ActivityLog saved = activityLogRepository.save(logEntry);
        return mapToActivityDto(saved);
    }

    private void verifyAdminAccess(User user) {
        if (user.getRole() != Role.HR_ADMIN && user.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Only HR Admins can perform this action.");
        }
    }

    private TeamMemberDto mapToMemberDto(User user) {
        List<String> privList = parsePrivileges(user.getPrivileges());
        return new TeamMemberDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getTeamId(),
                privList,
                user.getCreatedAt() != null ? user.getCreatedAt() : Instant.now()
        );
    }

    private TeamInvitationDto mapToInvitationDto(TeamInvitation inv) {
        return new TeamInvitationDto(
                inv.getId(),
                inv.getEmail(),
                inv.getFullName(),
                inv.getTeamId(),
                inv.getRole(),
                parsePrivileges(inv.getPrivileges()),
                inv.getToken(),
                inv.getStatus(),
                inv.getExpiresAt(),
                inv.getCreatedAt() != null ? inv.getCreatedAt() : Instant.now()
        );
    }

    private ActivityLogDto mapToActivityDto(ActivityLog a) {
        return new ActivityLogDto(
                a.getId(),
                a.getTeamId(),
                a.getActor() != null ? a.getActor().getId() : null,
                a.getActorName(),
                a.getActorEmail(),
                a.getActorRole(),
                a.getActionType(),
                a.getTargetId(),
                a.getTargetTitle(),
                a.getDetails(),
                a.getCreatedAt() != null ? a.getCreatedAt() : Instant.now()
        );
    }

    private List<String> parsePrivileges(String privileges) {
        if (privileges == null || privileges.isBlank()) {
            return List.of("shortlist_candidates", "manage_notes", "source_candidates");
        }
        return Arrays.stream(privileges.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
