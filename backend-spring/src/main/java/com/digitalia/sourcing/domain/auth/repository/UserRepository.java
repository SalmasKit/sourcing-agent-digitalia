package com.digitalia.sourcing.domain.auth.repository;

import com.digitalia.sourcing.domain.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    java.util.List<User> findByTeamId(String teamId);
    Optional<User> findByPasswordResetToken(String token);
    long countByTeamId(String teamId);
}
