package com.digitalia.sourcing.domain.auth.repository;

import com.digitalia.sourcing.domain.auth.model.TeamInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, UUID> {
    Optional<TeamInvitation> findByToken(String token);
    Optional<TeamInvitation> findByEmailAndTeamIdAndStatus(String email, String teamId, String status);
    List<TeamInvitation> findByTeamIdOrderByCreatedAtDesc(String teamId);
    List<TeamInvitation> findByTeamIdAndStatusOrderByCreatedAtDesc(String teamId, String status);
}
