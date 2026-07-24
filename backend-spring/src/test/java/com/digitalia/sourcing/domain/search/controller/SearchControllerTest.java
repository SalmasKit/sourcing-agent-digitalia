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

import com.digitalia.sourcing.shared.exception.GlobalExceptionHandler;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.List;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@WebMvcTest(controllers = SearchController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
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
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rawDescription").value("Need Java developer with React"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void createSearch_shouldReturn400WhenBlankDescription() throws Exception {
        CreateSearchRequest invalidRequest = new CreateSearchRequest("");

        mockMvc.perform(post("/api/v1/searches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest))
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void listSearches_shouldReturn200AndPage() throws Exception {
        SearchRequestDto dto = new SearchRequestDto(
                UUID.randomUUID(), "Dev Java", Map.of(), SearchStatus.COMPLETED,
                UUID.randomUUID(), Instant.now(), Instant.now()
        );

        when(searchOrchestrationService.listSearchesForUser(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/v1/searches")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].rawDescription").value("Dev Java"));
    }

    @Test
    void getSearchDetails_shouldReturn200AndDetails() throws Exception {
        UUID searchId = UUID.randomUUID();
        SearchRequestDto dto = new SearchRequestDto(
                searchId, "Dev Senior Python", Map.of(), SearchStatus.RUNNING,
                UUID.randomUUID(), Instant.now(), Instant.now()
        );

        when(searchOrchestrationService.getSearchDetails(eq(searchId), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/searches/{id}", searchId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rawDescription").value("Dev Senior Python"))
                .andExpect(jsonPath("$.data.status").value("RUNNING"));
    }
}
