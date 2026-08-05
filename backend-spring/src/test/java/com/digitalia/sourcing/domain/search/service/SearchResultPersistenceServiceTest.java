package com.digitalia.sourcing.domain.search.service;

import com.digitalia.sourcing.domain.profile.repository.ProfileRepository;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.model.SearchStatus;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import com.digitalia.sourcing.infrastructure.agent.AgentClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchResultPersistenceServiceTest {

    @Mock
    private SearchRequestRepository searchRequestRepository;

    @Mock
    private ProfileRepository profileRepository;

    @InjectMocks
    private SearchResultPersistenceService searchResultPersistenceService;

    private UUID searchRequestId;
    private SearchRequest searchRequest;

    @BeforeEach
    void setUp() {
        searchRequestId = UUID.randomUUID();
        searchRequest = SearchRequest.builder()
                .id(searchRequestId)
                .status(SearchStatus.RUNNING)
                .build();
    }

    @Test
    void saveSearchResults_shouldCompleteSearchAndSaveProfiles() {
        AgentClient.AgentProfileResponse profile1 = new AgentClient.AgentProfileResponse(
                "LinkedIn", "https://linkedin.com/in/test", "John Doe", "Senior Dev", "Paris",
                Map.of("Java", 5), (short) 8, Map.of(), new BigDecimal("0.92"), Map.of()
        );

        AgentClient.AgentSearchResponse agentResponse = new AgentClient.AgentSearchResponse(
                Map.of("required_experience", 5),
                List.of(profile1)
        );

        when(searchRequestRepository.findById(searchRequestId)).thenReturn(Optional.of(searchRequest));

        searchResultPersistenceService.saveSearchResults(searchRequestId, agentResponse);

        assertEquals(SearchStatus.COMPLETED, searchRequest.getStatus());
        verify(searchRequestRepository, times(1)).save(searchRequest);
        verify(profileRepository, times(1)).saveAll(anyList());
    }

    @Test
    void saveSearchResults_shouldThrowIllegalStateWhenSearchNotFound() {
        AgentClient.AgentSearchResponse agentResponse = new AgentClient.AgentSearchResponse(Map.of(), List.of());
        when(searchRequestRepository.findById(searchRequestId)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class,
                () -> searchResultPersistenceService.saveSearchResults(searchRequestId, agentResponse));
    }

    @Test
    void handleSearchFailure_shouldMarkSearchAsFailed() {
        when(searchRequestRepository.findById(searchRequestId)).thenReturn(Optional.of(searchRequest));

        searchResultPersistenceService.handleSearchFailure(searchRequestId, new RuntimeException("Agent timeout"));

        assertEquals(SearchStatus.FAILED, searchRequest.getStatus());
        verify(searchRequestRepository, times(1)).save(searchRequest);
    }
}
