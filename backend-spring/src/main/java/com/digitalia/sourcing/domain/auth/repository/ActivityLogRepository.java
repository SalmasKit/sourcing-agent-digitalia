package com.digitalia.sourcing.domain.auth.repository;

import com.digitalia.sourcing.domain.auth.model.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findByTeamIdOrderByCreatedAtDesc(String teamId, Pageable pageable);
    List<ActivityLog> findByTeamIdAndActionTypeOrderByCreatedAtDesc(String teamId, String actionType, Pageable pageable);
}
