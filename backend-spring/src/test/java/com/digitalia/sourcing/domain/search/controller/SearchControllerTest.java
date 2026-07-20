package com.digitalia.sourcing.domain.search.controller;

import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.service.JwtService;
import com.digitalia.sourcing.domain.search.dto.CreateSearchRequest;
import com.digitalia.sourcing.domain.search.dto.SearchRequestDto;
import com.digitalia.sourcing.domain.search.model.SearchStatus;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import com.digitalia.sourcing.domain.search.service.SearchOrchestrationService;
import com.digitalia.sourcing.infrastructure.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SearchController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@AutoConfigureMockMvc(addFilters = false)
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SearchOrchestrationService searchOrchestrationService;

    @MockBean
    private SearchRequestRepository searchRequestRepository;

    @MockBean
    private JwtService jwtService;

    @Test
    @WithMockUser(username = "recruiter@digitalia.com", roles = "RECRUITER")
    void createSearch_shouldReturnSearchRequestDto() throws Exception {
        CreateSearchRequest request = new CreateSearchRequest("Need Java developer with React");
        SearchRequestDto responseDto = new SearchRequestDto(
                UUID.randomUUID(),
                "Need Java developer with React",
                Map.of(),
                SearchStatus.PENDING,
                UUID.randomUUID(),
                Instant.now(),
                Instant.now()
        );

        when(searchOrchestrationService.initiateSearch(any(CreateSearchRequest.class), any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/searches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rawDescription").value("Need Java developer with React"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }
}
