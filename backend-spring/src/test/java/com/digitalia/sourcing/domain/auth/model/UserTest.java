package com.digitalia.sourcing.domain.auth.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    @Test
    void testUserBuilder() {
        UUID id = UUID.randomUUID();
        String email = "test@example.com";
        String password = "hashed-password";
        String fullName = "John Doe";
        Role role = Role.SUPER_ADMIN;

        User user = User.builder()
                .id(id)
                .email(email)
                .password(password)
                .fullName(fullName)
                .role(role)
                .teamId("digitalia_workspace")
                .build();

        assertNotNull(user);
        assertEquals(id, user.getId());
        assertEquals(email, user.getEmail());
        assertEquals(password, user.getPassword());
        assertEquals(fullName, user.getFullName());
        assertEquals(role, user.getRole());
        assertTrue(user.isEnabled());
        assertEquals("digitalia_workspace", user.getTeamId());
    }

    @Test
    void testUserNoArgsConstructor() {
        User user = new User();

        assertNotNull(user);
        assertNull(user.getId());
        assertEquals(Role.RECRUITER, user.getRole());
        assertTrue(user.isEnabled());
        assertNull(user.getTeamId());
    }

    @Test
    void testChangeRole() {
        User user = User.builder()
                .role(Role.RECRUITER)
                .build();

        assertEquals(Role.RECRUITER, user.getRole());

        user.changeRole(Role.SUPER_ADMIN);

        assertEquals(Role.SUPER_ADMIN, user.getRole());
    }

    @Test
    void testUpdatePassword() {
        User user = User.builder()
                .password("old-password")
                .passwordResetToken("reset-token")
                .passwordResetExpiry(Instant.now().plusSeconds(3600))
                .build();

        user.updatePassword("new-hashed-password");

        assertEquals("new-hashed-password", user.getPassword());
        assertNull(user.getPasswordResetToken());
        assertNull(user.getPasswordResetExpiry());
    }

    @Test
    void testUpdatePrivileges() {
        User user = User.builder()
                .privileges("old_privileges")
                .build();

        user.updatePrivileges("new_privileges");

        assertEquals("new_privileges", user.getPrivileges());
    }

    @Test
    void testUpdateTeamId() {
        User user = User.builder()
                .teamId("old-team")
                .build();

        user.updateTeamId("new-team");

        assertEquals("new-team", user.getTeamId());
    }

    @Test
    void testSetPasswordReset() {
        Instant expiry = Instant.now().plusSeconds(3600);
        User user = User.builder().build();

        user.setPasswordReset("reset-token", expiry);

        assertEquals("reset-token", user.getPasswordResetToken());
        assertEquals(expiry, user.getPasswordResetExpiry());
    }

    @Test
    void testClearPasswordReset() {
        User user = User.builder()
                .passwordResetToken("reset-token")
                .passwordResetExpiry(Instant.now().plusSeconds(3600))
                .build();

        user.clearPasswordReset();

        assertNull(user.getPasswordResetToken());
        assertNull(user.getPasswordResetExpiry());
    }

    @Test
    void testDisable() {
        User user = User.builder()
                .enabled(true)
                .build();

        assertTrue(user.isEnabled());

        user.disable();

        assertFalse(user.isEnabled());
    }

    @Test
    void testEnable() {
        User user = User.builder()
                .enabled(false)
                .build();

        assertFalse(user.isEnabled());

        user.enable();

        assertTrue(user.isEnabled());
    }

    @Test
    void testGetAuthorities() {
        User user = User.builder()
                .role(Role.SUPER_ADMIN)
                .build();

        Collection<? extends org.springframework.security.core.GrantedAuthority> authorities = user.getAuthorities();

        assertNotNull(authorities);
        assertEquals(1, authorities.size());
        assertEquals("ROLE_SUPER_ADMIN", authorities.iterator().next().getAuthority());
    }

    @Test
    void testGetUsername() {
        User user = User.builder()
                .email("test@example.com")
                .build();

        assertEquals("test@example.com", user.getUsername());
    }

    @Test
    void testIsAccountNonExpired() {
        User user = User.builder().build();
        assertTrue(user.isAccountNonExpired());
    }

    @Test
    void testIsAccountNonLocked() {
        User user = User.builder().build();
        assertTrue(user.isAccountNonLocked());
    }

    @Test
    void testIsCredentialsNonExpired() {
        User user = User.builder().build();
        assertTrue(user.isCredentialsNonExpired());
    }

    @Test
    void testIsEnabled() {
        User user = User.builder()
                .enabled(true)
                .build();

        assertTrue(user.isEnabled());

        user.disable();

        assertFalse(user.isEnabled());
    }
}