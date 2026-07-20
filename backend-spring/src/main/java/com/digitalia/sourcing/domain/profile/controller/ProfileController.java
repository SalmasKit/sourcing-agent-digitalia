package com.digitalia.sourcing.domain.profile.controller;

import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.profile.dto.ProfileDto;
import com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto;
import com.digitalia.sourcing.domain.profile.service.ProfileService;
import com.digitalia.sourcing.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Profiles Management", description = "Endpoints for retrieving candidate profiles sourced by the LLM agent")
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/searches/{searchId}/profiles")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HR_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List candidates sourced for a specific search query")
    public ResponseEntity<ApiResponse<Page<ProfileSummaryDto>>> getSourcedProfiles(
            @PathVariable UUID searchId,
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20, sort = "score", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ProfileSummaryDto> profiles = profileService.getProfilesForSearch(searchId, user, pageable);
        return ResponseEntity.ok(ApiResponse.success(profiles, "Profiles retrieved successfully"));
    }

    @GetMapping("/profiles/{id}")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HR_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get full details of a specific sourced profile")
    public ResponseEntity<ApiResponse<ProfileDto>> getProfileDetails(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        ProfileDto profileDto = profileService.getProfileDetails(id, user);
        return ResponseEntity.ok(ApiResponse.success(profileDto, "Profile details retrieved successfully"));
    }
}
