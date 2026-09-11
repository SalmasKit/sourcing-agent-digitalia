package com.digitalia.sourcing.domain.auth.controller;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.service.TeamService;
import com.digitalia.sourcing.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/team")
@RequiredArgsConstructor
@Tag(name = "Team Management", description = "Endpoints for HR Admin team and recruiter management")
public class TeamController {

    private final TeamService teamService;

    @GetMapping("/members")
    @Operation(summary = "Get all members of current user's team")
    public ResponseEntity<ApiResponse<List<TeamMemberDto>>> getTeamMembers(@AuthenticationPrincipal User currentUser) {
        List<TeamMemberDto> members = teamService.getTeamMembers(currentUser);
        return ResponseEntity.ok(ApiResponse.success(members, "Team members retrieved successfully"));
    }

    @GetMapping("/invitations")
    @Operation(summary = "Get pending invitations for current team")
    public ResponseEntity<ApiResponse<List<TeamInvitationDto>>> getPendingInvitations(@AuthenticationPrincipal User currentUser) {
        List<TeamInvitationDto> invitations = teamService.getPendingInvitations(currentUser);
        return ResponseEntity.ok(ApiResponse.success(invitations, "Pending invitations retrieved successfully"));
    }

    @PostMapping("/invite")
    @Operation(summary = "Invite a recruiter by email with assigned privileges")
    public ResponseEntity<ApiResponse<TeamInvitationDto>> inviteRecruiter(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody InviteRecruiterRequest request
    ) {
        TeamInvitationDto invitation = teamService.inviteRecruiter(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(invitation, "Recruiter invited successfully"));
    }

    @DeleteMapping("/invitations/{id}")
    @Operation(summary = "Cancel / revoke a pending team invitation")
    public ResponseEntity<ApiResponse<Void>> cancelInvitation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id
    ) {
        teamService.cancelInvitation(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Invitation cancelled successfully"));
    }

    @PutMapping("/members/{id}/privileges")
    @Operation(summary = "Update a team member's privileges (HR Admin only)")
    public ResponseEntity<ApiResponse<TeamMemberDto>> updateMemberPrivileges(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePrivilegesRequest request
    ) {
        TeamMemberDto updated = teamService.updateMemberPrivileges(currentUser, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Privileges updated successfully"));
    }

    @PutMapping("/members/{id}/toggle-status")
    @Operation(summary = "Enable or disable a team member")
    public ResponseEntity<ApiResponse<Void>> toggleMemberStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id
    ) {
        teamService.toggleMemberStatus(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Member status toggled successfully"));
    }

    @DeleteMapping("/members/{id}")
    @Operation(summary = "Remove a recruiter from the team")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id
    ) {
        teamService.removeMember(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Member removed from team successfully"));
    }

    @GetMapping("/activities")
    @Operation(summary = "Get team activity & audit logs")
    public ResponseEntity<ApiResponse<List<ActivityLogDto>>> getTeamActivities(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "30") int limit
    ) {
        List<ActivityLogDto> activities = teamService.getTeamActivities(currentUser, limit);
        return ResponseEntity.ok(ApiResponse.success(activities, "Activity logs retrieved successfully"));
    }

    @PostMapping("/activities")
    @Operation(summary = "Record a team activity / action event")
    public ResponseEntity<ApiResponse<ActivityLogDto>> recordActivity(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody RecordActivityRequest request
    ) {
        ActivityLogDto recorded = teamService.recordActivity(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(recorded, "Activity recorded"));
    }
}
