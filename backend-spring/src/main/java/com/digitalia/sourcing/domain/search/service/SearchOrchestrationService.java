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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchOrchestrationService {

    private final SearchRequestRepository searchRequestRepository;
    private final SearchResultPersistenceService searchResultPersistenceService;
    private final AgentClient agentClient;
    private final MeterRegistry meterRegistry;

    @Transactional
    public SearchRequestDto initiateSearch(CreateSearchRequest dto, User user) {
        SearchRequest searchRequest = SearchRequest.builder()
                .rawDescription(dto.rawDescription())
                .status(SearchStatus.PENDING)
                .createdBy(user)
                .build();

        SearchRequest savedRequest = searchRequestRepository.save(searchRequest);
        meterRegistry.counter("sourcing.searches.initiated").increment();
        log.info("Saved search request with ID: {} for user: {}", savedRequest.getId(), user.getEmail());

        // Trigger agent search asynchronously via reactive pipeline
        triggerAgentSearch(savedRequest.getId(), savedRequest.getRawDescription());

        return mapToDto(savedRequest);
    }

    @Transactional
    public SearchRequestDto retrySearch(UUID searchRequestId, User user) {
        SearchRequest searchRequest = searchRequestRepository.findById(searchRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Search request not found"));

        if (user.getRole() == Role.RECRUITER && !searchRequest.getCreatedBy().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to retry this search");
        }

        if (searchRequest.getStatus() == SearchStatus.RUNNING) {
            throw new IllegalStateException("Search is currently running");
        }

        log.info("Retrying search request ID: {} for user: {}", searchRequestId, user.getEmail());
        triggerAgentSearch(searchRequest.getId(), searchRequest.getRawDescription());
        return mapToDto(searchRequest);
    }

    private void triggerAgentSearch(UUID searchRequestId, String query) {
        log.info("Starting background agent search for request ID: {}", searchRequestId);
        
        searchRequestRepository.findById(searchRequestId).ifPresent(sr -> {
            sr.markRunning();
            searchRequestRepository.save(sr);
        });

        Timer.Sample sample = Timer.start(meterRegistry);

        agentClient.executeSearch(query, searchRequestId)
                .subscribe(
                        response -> {
                            sample.stop(meterRegistry.timer("sourcing.agent.client.duration"));
                            meterRegistry.counter("sourcing.searches.completed").increment();
                            searchResultPersistenceService.saveSearchResults(searchRequestId, response);
                        },
                        error -> {
                            sample.stop(meterRegistry.timer("sourcing.agent.client.duration", "outcome", "error"));
                            meterRegistry.counter("sourcing.searches.failed").increment();
                            searchResultPersistenceService.handleSearchFailure(searchRequestId, error);
                        }
                );
    }

    @Transactional(readOnly = true)
    public Page<SearchRequestDto> listSearchesForUser(User user, Pageable pageable) {
        Page<SearchRequest> page;
        if (user.getRole() == Role.RECRUITER) {
            page = searchRequestRepository.findByCreatedById(user.getId(), pageable);
        } else {
            page = searchRequestRepository.findAll(pageable);
        }
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public SearchRequestDto getSearchDetails(UUID id, User user) {
        SearchRequest searchRequest = searchRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Search request not found"));

        if (user.getRole() == Role.RECRUITER && !searchRequest.getCreatedBy().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to view this search");
        }

        return mapToDto(searchRequest);
    }

    public SearchRequestDto mapToDto(SearchRequest request) {
        return new SearchRequestDto(
                request.getId(),
                request.getRawDescription(),
                request.getExtractedCriteria(),
                request.getStatus(),
                request.getCreatedBy().getId(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
