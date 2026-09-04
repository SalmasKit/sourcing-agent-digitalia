package com.digitalia.sourcing.domain.auth.repository;

import com.digitalia.sourcing.AbstractRepositoryIT;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserRepositoryIT extends AbstractRepositoryIT {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Should persist user and find by email")
    void shouldPersistAndFindByEmail() {
        User user = User.builder()
                .email("recruiter@digitalia.ma")
                .password("$2a$10$hashedPasswordSample")
                .fullName("Salma Recruiter")
                .role(Role.RECRUITER)
                .enabled(true)
                .build();

        User saved = userRepository.saveAndFlush(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<User> found = userRepository.findByEmail("recruiter@digitalia.ma");
        assertThat(found).isPresent();
        assertThat(found.get().getFullName()).isEqualTo("Salma Recruiter");
        assertThat(found.get().getRole()).isEqualTo(Role.RECRUITER);
    }

    @Test
    @DisplayName("Should check existence by email")
    void shouldCheckExistsByEmail() {
        User user = User.builder()
                .email("hr.admin@digitalia.ma")
                .password("$2a$10$hashedPasswordSample")
                .fullName("HR Manager")
                .role(Role.HR_ADMIN)
                .enabled(true)
                .build();
        userRepository.saveAndFlush(user);

        assertThat(userRepository.existsByEmail("hr.admin@digitalia.ma")).isTrue();
        assertThat(userRepository.existsByEmail("nonexistent@digitalia.ma")).isFalse();
    }

    @Test
    @DisplayName("Should fail when inserting duplicate email due to unique constraint")
    void shouldEnforceUniqueEmailConstraint() {
        User user1 = User.builder()
                .email("unique@digitalia.ma")
                .password("hash1")
                .fullName("User One")
                .build();
        userRepository.saveAndFlush(user1);

        User user2 = User.builder()
                .email("unique@digitalia.ma")
                .password("hash2")
                .fullName("User Two")
                .build();

        assertThatThrownBy(() -> userRepository.saveAndFlush(user2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
