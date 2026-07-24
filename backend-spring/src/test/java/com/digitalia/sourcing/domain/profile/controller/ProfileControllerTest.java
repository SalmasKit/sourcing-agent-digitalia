package com.digitalia.sourcing.domain.profile.controller;

import com.digitalia.sourcing.domain.auth.service.JwtService;
import com.digitalia.sourcing.domain.profile.dto.ProfileDto;
import com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto;
import com.digitalia.sourcing.domain.profile.service.ProfileService;
import com.digitalia.sourcing.infrastructure.security.JwtAuthenticationFilter;
import com.digitalia.sourcing.shared.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProfileController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfileService profileService;

    @MockBean
    private JwtService jwtService;

    @Test
    void getSourcedProfiles_shouldReturn200AndPage() throws Exception {
        UUID searchId = UUID.randomUUID();
        ProfileSummaryDto summary = new ProfileSummaryDto(
                UUID.randomUUID(), "LinkedIn", "John Doe", "Senior Dev", "Paris",
                (short) 5, new BigDecimal("0.95")
        );

        when(profileService.getProfilesForSearch(eq(searchId), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(summary)));

        mockMvc.perform(get("/api/v1/searches/{searchId}/profiles", searchId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].fullName").value("John Doe"))
                .andExpect(jsonPath("$.data.content[0].location").value("Paris"));
    }

    @Test
    void getProfileDetails_shouldReturn200AndDetails() throws Exception {
        UUID profileId = UUID.randomUUID();
        UUID searchId = UUID.randomUUID();
        ProfileDto profileDto = new ProfileDto(
                profileId, searchId, "GitHub", "https://github.com/johndoe",
                "John Doe", "Lead Dev", "Lyon", Map.of("Java", 8), (short) 10,
                new BigDecimal("0.98"), Map.of(), Map.of(), java.time.Instant.now()
        );

        when(profileService.getProfileDetails(eq(profileId), any())).thenReturn(profileDto);

        mockMvc.perform(get("/api/v1/profiles/{id}", profileId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("John Doe"))
                .andExpect(jsonPath("$.data.sourcePlatform").value("GitHub"));
    }

    @Test
    void getSourcedProfiles_shouldReturn403WhenAccessDenied() throws Exception {
        UUID searchId = UUID.randomUUID();

        doThrow(new AccessDeniedException("You do not have permission to view profiles from this search request"))
                .when(profileService).getProfilesForSearch(any(), any(), any(Pageable.class));

        mockMvc.perform(get("/api/v1/searches/{searchId}/profiles", searchId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Access denied")));
    }

    @Test
    void getProfileDetails_shouldReturn403WhenAccessDenied() throws Exception {
        UUID profileId = UUID.randomUUID();

        doThrow(new AccessDeniedException("You do not have permission to view details of this profile"))
                .when(profileService).getProfileDetails(any(), any());

        mockMvc.perform(get("/api/v1/profiles/{id}", profileId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Access denied")));
    }

    @Test
    void getProfileDetails_shouldReturn400ForMalformedUUID() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/{id}", "not-a-valid-uuid")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("id")));
    }
}

