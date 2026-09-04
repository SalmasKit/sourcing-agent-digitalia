package com.digitalia.sourcing.domain.search.repository;

import com.digitalia.sourcing.AbstractRepositoryIT;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.model.SearchStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SearchRequestRepositoryIT extends AbstractRepositoryIT {

    @Autowired
    private SearchRequestRepository searchRequestRepository;

    @Autowired
    private UserRepository userRepository;

    private User recruiter;

    @BeforeEach
    void setUp() {
        searchRequestRepository.deleteAll();
        userRepository.deleteAll();

        recruiter = userRepository.saveAndFlush(User.builder()
                .email("recruiter.search@digitalia.ma")
                .password("hash123")
                .fullName("Search Tester")
                .role(Role.RECRUITER)
                .build());
    }

    @Test
    @DisplayName("Should persist search request with JSONB criteria and find by creator")
    void shouldPersistAndFindByCreator() {
        SearchRequest request = SearchRequest.builder()
                .rawDescription("Senior Java Engineer with Spring Boot and AWS")
                .extractedCriteria(Map.of("seniority", "Senior", "tech", "Java, AWS"))
                .status(SearchStatus.PENDING)
                .createdBy(recruiter)
                .build();

        SearchRequest saved = searchRequestRepository.saveAndFlush(request);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(SearchStatus.PENDING);
        assertThat(saved.getExtractedCriteria()).containsEntry("seniority", "Senior");

        Page<SearchRequest> page = searchRequestRepository.findByCreatedById(recruiter.getId(), PageRequest.of(0, 10));
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getRawDescription()).contains("Senior Java Engineer");
    }

    @Test
    @DisplayName("Should update search status to COMPLETED with updated criteria")
    void shouldUpdateSearchStatus() {
        SearchRequest request = SearchRequest.builder()
                .rawDescription("DevOps Architect")
                .status(SearchStatus.PENDING)
                .createdBy(recruiter)
                .build();

        SearchRequest saved = searchRequestRepository.saveAndFlush(request);

        saved.markRunning();
        searchRequestRepository.saveAndFlush(saved);
        assertThat(searchRequestRepository.findById(saved.getId()).orElseThrow().getStatus())
                .isEqualTo(SearchStatus.RUNNING);

        saved.complete(Map.of("cloud", "GCP", "tools", "Terraform, Kubernetes"));
        searchRequestRepository.saveAndFlush(saved);

        SearchRequest completed = searchRequestRepository.findById(saved.getId()).orElseThrow();
        assertThat(completed.getStatus()).isEqualTo(SearchStatus.COMPLETED);
        assertThat(completed.getExtractedCriteria()).containsEntry("cloud", "GCP");
    }
}
