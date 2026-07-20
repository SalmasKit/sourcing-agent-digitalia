package com.digitalia.sourcing.domain.profile.service;

import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.profile.dto.ProfileDto;
import com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto;
import com.digitalia.sourcing.domain.profile.model.Profile;
import com.digitalia.sourcing.domain.profile.repository.ProfileRepository;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import com.digitalia.sourcing.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final SearchRequestRepository searchRequestRepository;

    @Transactional(readOnly = true)
    public Page<ProfileSummaryDto> getProfilesForSearch(UUID searchRequestId, User user, Pageable pageable) {
        SearchRequest searchRequest = searchRequestRepository.findById(searchRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Search request not found"));

        if (user.getRole() == Role.RECRUITER && !searchRequest.getCreatedBy().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to view profiles from this search request");
        }

        return profileRepository.findSummaryBySearchRequestId(searchRequestId, pageable);
    }

    @Transactional(readOnly = true)
    public ProfileDto getProfileDetails(UUID profileId, User user) {
        Profile profile = profileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));

        SearchRequest searchRequest = profile.getSearchRequest();
        if (user.getRole() == Role.RECRUITER && !searchRequest.getCreatedBy().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to view details of this profile");
        }

        return mapToDto(profile);
    }

    private ProfileDto mapToDto(Profile profile) {
        return new ProfileDto(
                profile.getId(),
                profile.getSearchRequest().getId(),
                profile.getSourcePlatform(),
                profile.getSourceUrl(),
                profile.getFullName(),
                profile.getHeadline(),
                profile.getLocation(),
                profile.getSkills(),
                profile.getExperienceYears(),
                profile.getScore(),
                profile.getScoreBreakdown(),
                profile.getRawData(),
                profile.getCreatedAt()
        );
    }
}
