package com.digitalia.sourcing.domain.search.service;

import com.digitalia.sourcing.domain.profile.model.Profile;
import com.digitalia.sourcing.domain.profile.repository.ProfileRepository;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import com.digitalia.sourcing.infrastructure.agent.AgentClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchResultPersistenceService {

    private final SearchRequestRepository searchRequestRepository;
    private final ProfileRepository profileRepository;

    @Transactional
    @SuppressWarnings("unchecked")
    public void saveSearchResults(UUID searchRequestId, AgentClient.AgentSearchResponse response) {
        log.info("Successfully received search results for request ID: {}", searchRequestId);

        SearchRequest searchRequest = searchRequestRepository.findById(searchRequestId)
                .orElseThrow(() -> new IllegalStateException("Search request not found for ID: " + searchRequestId));

        searchRequest.complete(response.extractedCriteria());
        searchRequestRepository.save(searchRequest);

        if (response.profiles() != null) {
            List<Profile> profiles = response.profiles().stream()
                    .map((AgentClient.AgentProfileResponse p) -> {
                        Map<String, Object> skillsMap = new HashMap<>();
                        if (p.skills() instanceof Map<?, ?> m) {
                            skillsMap = (Map<String, Object>) m;
                        } else if (p.skills() instanceof List<?> list) {
                            skillsMap.put("skills", list);
                        }
                        Profile profile = Profile.builder()
                                .searchRequest(searchRequest)
                                .sourcePlatform(p.sourcePlatform())
                                .sourceUrl(p.sourceUrl())
                                .fullName(p.fullName())
                                .headline(p.headline())
                                .location(p.location())
                                .skills(skillsMap)
                                .experienceYears(p.experienceYears())
                                .rawData(p.rawData())
                                .score(p.score())
                                .scoreBreakdown(p.scoreBreakdown())
                                .build();
                        return profile;
                    })
                    .collect(Collectors.toList());

            profileRepository.saveAll(profiles);
            log.info("Persisted {} profiles matching search request ID: {}", profiles.size(), searchRequestId);
        }
    }

    @Transactional
    public void handleSearchFailure(UUID searchRequestId, Throwable error) {
        log.error("Agent search failed for request ID: {}. Error: {}", searchRequestId, error.getMessage());
        searchRequestRepository.findById(searchRequestId).ifPresent(sr -> {
            sr.fail();
            searchRequestRepository.save(sr);
        });
    }
}
