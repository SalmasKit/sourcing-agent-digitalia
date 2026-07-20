package com.digitalia.sourcing.domain.profile.repository;

import com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto;
import com.digitalia.sourcing.domain.profile.model.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    @Query("SELECT new com.digitalia.sourcing.domain.profile.dto.ProfileSummaryDto(" +
           "p.id, p.sourcePlatform, p.fullName, p.headline, p.location, p.experienceYears, p.score) " +
           "FROM Profile p WHERE p.searchRequest.id = :searchRequestId")
    Page<ProfileSummaryDto> findSummaryBySearchRequestId(UUID searchRequestId, Pageable pageable);
}
