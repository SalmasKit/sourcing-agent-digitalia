package com.digitalia.sourcing.domain.search.controller;

import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.search.dto.CreateSearchRequest;
import com.digitalia.sourcing.domain.search.dto.SearchRequestDto;
import com.digitalia.sourcing.domain.search.service.SearchOrchestrationService;
import com.digitalia.sourcing.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/searches")
@RequiredArgsConstructor
@Tag(name = "Search Orchestration", description = "Endpoints for initiating and listing sourcing search queries")
public class SearchController {

    private final SearchOrchestrationService searchOrchestrationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('RECRUITER', 'HR_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Initiate a profiling search query asynchronously")
    public ResponseEntity<ApiResponse<SearchRequestDto>> createSearch(
            @Valid @RequestBody CreateSearchRequest request,
            @AuthenticationPrincipal User user) {
        SearchRequestDto responseDto = searchOrchestrationService.initiateSearch(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(responseDto, "Search request initiated successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECRUITER', 'HR_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List sourcing search requests")
    public ResponseEntity<ApiResponse<Page<SearchRequestDto>>> listSearches(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<SearchRequestDto> dtoPage = searchOrchestrationService.listSearchesForUser(user, pageable);
        return ResponseEntity.ok(ApiResponse.success(dtoPage, "Searches retrieved successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HR_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get detailed information about a single search request")
    public ResponseEntity<ApiResponse<SearchRequestDto>> getSearchDetails(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        SearchRequestDto dto = searchOrchestrationService.getSearchDetails(id, user);
        return ResponseEntity.ok(ApiResponse.success(dto, "Search details retrieved successfully"));
    }
}
