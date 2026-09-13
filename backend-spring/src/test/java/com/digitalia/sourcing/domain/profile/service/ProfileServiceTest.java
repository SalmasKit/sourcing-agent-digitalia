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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private SearchRequestRepository searchRequestRepository;

    @InjectMocks
    private ProfileService profileService;

    @Test
    void getProfilesForSearch_shouldReturnProfilesForAuthorizedUser() {
        @SuppressWarnings("null")
        UUID searchId = UUID.randomUUID();
        User user = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();
        SearchRequest searchRequest = SearchRequest.builder()
                .id(searchId)
                .createdBy(user)
                .build();

        ProfileSummaryDto summaryDto = new ProfileSummaryDto(
                UUID.randomUUID(), "LinkedIn", "Salma Barrak", "Dev", "Oujda", (short) 3, BigDecimal.valueOf(85.0)
        );
        Page<ProfileSummaryDto> page = new PageImpl<>(List.of(summaryDto));

        when(searchRequestRepository.findById(searchId)).thenReturn(Optional.of(searchRequest));
        when(profileRepository.findSummaryBySearchRequestId(searchId, PageRequest.of(0, 10))).thenReturn(page);

        Page<ProfileSummaryDto> result = profileService.getProfilesForSearch(searchId, user, PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Salma Barrak", result.getContent().get(0).fullName());
    }

    @Test
    void getProfilesForSearch_shouldThrowAccessDeniedForUnauthorizedUser() {
        @SuppressWarnings("null")
        UUID searchId = UUID.randomUUID();
        User creator = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();
        User otherRecruiter = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();
        
        SearchRequest searchRequest = SearchRequest.builder()
                .id(searchId)
                .createdBy(creator)
                .build();

        when(searchRequestRepository.findById(searchId)).thenReturn(Optional.of(searchRequest));

        assertThrows(AccessDeniedException.class, () ->
                profileService.getProfilesForSearch(searchId, otherRecruiter, PageRequest.of(0, 10))
        );
    }

    @Test
    void getProfileDetails_shouldReturnProfileForAdmin() {
        @SuppressWarnings("null")
        UUID profileId = UUID.randomUUID();
        User admin = User.builder().id(UUID.randomUUID()).role(Role.HR_ADMIN).build();
        User creator = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();
        
        SearchRequest searchRequest = SearchRequest.builder()
                .id(UUID.randomUUID())
                .createdBy(creator)
                .build();
        Profile profile = Profile.builder()
                .id(profileId)
                .fullName("Salma Barrak")
                .searchRequest(searchRequest)
                .build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(profile));

        ProfileDto result = profileService.getProfileDetails(profileId, admin);

        assertNotNull(result);
        assertEquals("Salma Barrak", result.fullName());
    }

    @Test
    void getProfileDetails_shouldThrowResourceNotFound() {
        UUID profileId = UUID.randomUUID();
        User admin = User.builder().id(UUID.randomUUID()).role(Role.HR_ADMIN).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                profileService.getProfileDetails(profileId, admin)
        );
    }

    @Test
    void getProfileDetails_shouldThrowAccessDeniedForUnauthorizedRecruiter() {
        UUID profileId = UUID.randomUUID();
        User creator = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();
        User otherRecruiter = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();

        SearchRequest searchRequest = SearchRequest.builder()
                .id(UUID.randomUUID())
                .createdBy(creator)
                .build();
        Profile profile = Profile.builder()
                .id(profileId)
                .fullName("Salma Barrak")
                .searchRequest(searchRequest)
                .build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(profile));

        assertThrows(AccessDeniedException.class, () ->
                profileService.getProfileDetails(profileId, otherRecruiter)
        );
    }

    @Test
    void getProfilesForSearch_shouldThrowResourceNotFound() {
        UUID searchId = UUID.randomUUID();
        User user = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();

        when(searchRequestRepository.findById(searchId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                profileService.getProfilesForSearch(searchId, user, PageRequest.of(0, 10))
        );
    }
}
