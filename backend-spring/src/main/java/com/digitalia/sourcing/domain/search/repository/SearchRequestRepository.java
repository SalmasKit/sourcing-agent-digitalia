package com.digitalia.sourcing.domain.search.repository;

import com.digitalia.sourcing.domain.search.model.SearchRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SearchRequestRepository extends JpaRepository<SearchRequest, UUID> {
    Page<SearchRequest> findByCreatedById(UUID createdById, Pageable pageable);
}
