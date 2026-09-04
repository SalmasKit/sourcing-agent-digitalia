package com.digitalia.sourcing.domain.profile.repository;

import com.digitalia.sourcing.AbstractRepositoryIT;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.repository.UserRepository;
import com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto;
import com.digitalia.sourcing.domain.profile.model.Profile;
import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.domain.search.model.SearchStatus;
import com.digitalia.sourcing.domain.search.repository.SearchRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ProfileRepositoryIT extends AbstractRepositoryIT {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private SearchRequestRepository searchRequestRepository;

    @Autowired
    private UserRepository userRepository;

    private SearchRequest searchRequest;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();
        searchRequestRepository.deleteAll();
        userRepository.deleteAll();

        User user = userRepository.saveAndFlush(User.builder()
                .email("recruiter.profiles@digitalia.ma")
                .password("hash123")
                .fullName("Profile Recruiter")
                .role(Role.RECRUITER)
                .build());

        searchRequest = searchRequestRepository.saveAndFlush(SearchRequest.builder()
                .rawDescription("Fullstack React & Node.js")
                .status(SearchStatus.COMPLETED)
                .createdBy(user)
                .build());
    }

    @Test
    @DisplayName("Should persist profile with JSONB fields and query summaries sorted by score")
    void shouldPersistAndFindSummariesSortedByScore() {
        Profile p1 = Profile.builder()
                .searchRequest(searchRequest)
                .sourcePlatform("LinkedIn")
                .sourceUrl("https://linkedin.com/in/john-doe")
                .fullName("John Doe")
                .headline("Lead React Engineer")
                .location("Casablanca, Morocco")
                .skills(Map.of("primary", "React, TypeScript", "secondary", "Node.js"))
                .experienceYears((short) 7)
                .score(new BigDecimal("92.50"))
                .scoreBreakdown(Map.of("technical", 95, "experience", 90))
                .build();

        Profile p2 = Profile.builder()
                .searchRequest(searchRequest)
                .sourcePlatform("GitHub")
                .sourceUrl("https://github.com/jane-smith")
                .fullName("Jane Smith")
                .headline("Senior Full-Stack Architect")
                .location("Paris, France")
                .skills(Map.of("primary", "React, Java", "secondary", "AWS"))
                .experienceYears((short) 10)
                .score(new BigDecimal("97.00"))
                .scoreBreakdown(Map.of("technical", 98, "experience", 96))
                .build();

        profileRepository.saveAndFlush(p1);
        profileRepository.saveAndFlush(p2);

        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "score"));
        Page<ProfileSummaryDto> summaries = profileRepository.findSummaryBySearchRequestId(searchRequest.getId(), pageRequest);

        assertThat(summaries.getTotalElements()).isEqualTo(2);
        // p2 has higher score (97.00 > 92.50)
        assertThat(summaries.getContent().get(0).fullName()).isEqualTo("Jane Smith");
        assertThat(summaries.getContent().get(0).score()).isEqualByComparingTo("97.00");
        assertThat(summaries.getContent().get(1).fullName()).isEqualTo("John Doe");
    }
}
