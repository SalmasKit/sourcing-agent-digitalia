package com.digitalia.sourcing.domain.search.model;

import com.digitalia.sourcing.domain.auth.model.User;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SearchRequestTest {

    @Test
    void testSearchRequestBuilder() {
        UUID id = UUID.randomUUID();
        String rawDescription = "Software Engineer with Python experience";
        User createdBy = new User();

        SearchRequest searchRequest = SearchRequest.builder()
                .id(id)
                .rawDescription(rawDescription)
                .createdBy(createdBy)
                .build();

        assertNotNull(searchRequest);
        assertEquals(id, searchRequest.getId());
        assertEquals(rawDescription, searchRequest.getRawDescription());
        assertEquals(createdBy, searchRequest.getCreatedBy());
        assertEquals(SearchStatus.PENDING, searchRequest.getStatus());
    }

    @Test
    void testSearchRequestNoArgsConstructor() {
        SearchRequest searchRequest = new SearchRequest();

        assertNotNull(searchRequest);
        assertNull(searchRequest.getId());
        assertEquals(SearchStatus.PENDING, searchRequest.getStatus());
    }

    @Test
    void testMarkRunning() {
        SearchRequest searchRequest = SearchRequest.builder()
                .status(SearchStatus.PENDING)
                .build();

        assertEquals(SearchStatus.PENDING, searchRequest.getStatus());

        searchRequest.markRunning();

        assertEquals(SearchStatus.RUNNING, searchRequest.getStatus());
    }

    @Test
    void testComplete() {
        SearchRequest searchRequest = SearchRequest.builder()
                .status(SearchStatus.RUNNING)
                .build();

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("job_title", "Software Engineer");
        criteria.put("skills", new String[]{"Python", "Java"});

        searchRequest.complete(criteria);

        assertEquals(SearchStatus.COMPLETED, searchRequest.getStatus());
        assertEquals(criteria, searchRequest.getExtractedCriteria());
    }

    @Test
    void testFail() {
        SearchRequest searchRequest = SearchRequest.builder()
                .status(SearchStatus.RUNNING)
                .build();

        assertEquals(SearchStatus.RUNNING, searchRequest.getStatus());

        searchRequest.fail();

        assertEquals(SearchStatus.FAILED, searchRequest.getStatus());
    }
}