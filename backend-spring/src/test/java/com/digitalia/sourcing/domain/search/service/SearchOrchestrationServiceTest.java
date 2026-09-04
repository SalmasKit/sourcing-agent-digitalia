package com.digitalia.sourcing.domain.search.service;

import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.search.dto.CreateSearchRequest;
import com.digitalia.sourcing.domain.search.dto.SearchRequestDto;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.model.SearchStatus;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import com.digitalia.sourcing.infrastructure.agent.AgentClient;
import com.digitalia.sourcing.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchOrchestrationServiceTest {

    @Mock
    private SearchRequestRepository searchRequestRepository;

    @Mock
    private SearchResultPersistenceService searchResultPersistenceService;

    @Mock
    private AgentClient agentClient;

    @InjectMocks
    private SearchOrchestrationService searchOrchestrationService;

    private User recruiterUser;
    private User adminUser;
    private SearchRequest searchRequest;

    @BeforeEach
    void setUp() {
        recruiterUser = User.builder()
                .id(UUID.randomUUID())
                .email("recruiter@test.com")
                .role(Role.RECRUITER)
                .build();

        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .role(Role.HR_ADMIN)
                .build();

        searchRequest = SearchRequest.builder()
                .id(UUID.randomUUID())
                .rawDescription("Senior Java Developer with Spring Boot")
                .status(SearchStatus.PENDING)
                .createdBy(recruiterUser)
                .build();
    }

    @Test
    void initiateSearch_shouldSaveAndTriggerAgent() {
        CreateSearchRequest dto = new CreateSearchRequest("Senior Java Developer with Spring Boot");

        when(searchRequestRepository.save(any(SearchRequest.class))).thenReturn(searchRequest);
        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));
        when(agentClient.executeSearch(anyString(), any(UUID.class))).thenReturn(Mono.empty());

        SearchRequestDto result = searchOrchestrationService.initiateSearch(dto, recruiterUser);

        assertNotNull(result);
        assertEquals("Senior Java Developer with Spring Boot", result.rawDescription());
        verify(searchRequestRepository, times(2)).save(any(SearchRequest.class));
        verify(agentClient, times(1)).executeSearch(eq("Senior Java Developer with Spring Boot"), eq(searchRequest.getId()));
    }

    @Test
    void retrySearch_shouldSubscribeSuccessCallback() {
        AgentClient.AgentSearchResponse agentResponse = new AgentClient.AgentSearchResponse(null, List.of());

        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));
        when(agentClient.executeSearch(anyString(), any(UUID.class))).thenReturn(Mono.just(agentResponse));

        SearchRequestDto result = searchOrchestrationService.retrySearch(searchRequest.getId(), recruiterUser);

        assertNotNull(result);
        verify(searchResultPersistenceService, times(1)).saveSearchResults(eq(searchRequest.getId()), eq(agentResponse));
    }

    @Test
    void retrySearch_shouldSubscribeErrorCallback() {
        RuntimeException searchError = new RuntimeException("Agent connection refused");

        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));
        when(agentClient.executeSearch(anyString(), any(UUID.class))).thenReturn(Mono.error(searchError));

        SearchRequestDto result = searchOrchestrationService.retrySearch(searchRequest.getId(), recruiterUser);

        assertNotNull(result);
        verify(searchResultPersistenceService, times(1)).handleSearchFailure(eq(searchRequest.getId()), eq(searchError));
    }

    @Test
    void retrySearch_unauthorizedRecruiter_shouldThrowAccessDeniedException() {
        User otherRecruiter = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).email("other@test.com").build();
        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));

        assertThrows(AccessDeniedException.class, () ->
                searchOrchestrationService.retrySearch(searchRequest.getId(), otherRecruiter));
    }

    @Test
    void listSearchesForUser_shouldFilterByCreatedByForRecruiter() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<SearchRequest> page = new PageImpl<>(List.of(searchRequest));

        when(searchRequestRepository.findByCreatedById(recruiterUser.getId(), pageable)).thenReturn(page);

        Page<SearchRequestDto> result = searchOrchestrationService.listSearchesForUser(recruiterUser, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(searchRequestRepository, times(1)).findByCreatedById(recruiterUser.getId(), pageable);
        verify(searchRequestRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void listSearchesForUser_shouldReturnAllForAdmin() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<SearchRequest> page = new PageImpl<>(List.of(searchRequest));

        when(searchRequestRepository.findAll(pageable)).thenReturn(page);

        Page<SearchRequestDto> result = searchOrchestrationService.listSearchesForUser(adminUser, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(searchRequestRepository, times(1)).findAll(pageable);
    }

    @Test
    void getSearchDetails_shouldReturnForOwnerRecruiter() {
        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));

        SearchRequestDto result = searchOrchestrationService.getSearchDetails(searchRequest.getId(), recruiterUser);

        assertNotNull(result);
        assertEquals(searchRequest.getId(), result.id());
    }

    @Test
    void getSearchDetails_shouldThrowAccessDeniedForOtherRecruiter() {
        User otherRecruiter = User.builder().id(UUID.randomUUID()).role(Role.RECRUITER).build();

        when(searchRequestRepository.findById(searchRequest.getId())).thenReturn(Optional.of(searchRequest));

        assertThrows(AccessDeniedException.class,
                () -> searchOrchestrationService.getSearchDetails(searchRequest.getId(), otherRecruiter));
    }

    @Test
    void getSearchDetails_shouldThrowResourceNotFoundWhenMissing() {
        UUID randomId = UUID.randomUUID();
        when(searchRequestRepository.findById(randomId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> searchOrchestrationService.getSearchDetails(randomId, recruiterUser));
    }
}
