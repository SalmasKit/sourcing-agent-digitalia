package com.digitalia.sourcing.domain.auth.dto;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserDtoTest {

    @Test
    void testUserDtoWithAllFields() {
        UUID id = UUID.randomUUID();
        String email = "test@example.com";
        String fullName = "John Doe";
        com.digitalia.sourcing.domain.auth.model.Role role = com.digitalia.sourcing.domain.auth.model.Role.SUPER_ADMIN;
        boolean enabled = true;
        String teamId = "team-123";
        String privileges = "create_roles,shortlist_candidates";

        UserDto userDto = new UserDto(id, email, fullName, role, enabled, teamId, privileges);

        assertEquals(id, userDto.id());
        assertEquals(email, userDto.email());
        assertEquals(fullName, userDto.fullName());
        assertEquals(role, userDto.role());
        assertEquals(enabled, userDto.enabled());
        assertEquals(teamId, userDto.teamId());
        assertEquals(privileges, userDto.privileges());
    }

    @Test
    void testUserDtoWithFiveArgs() {
        UUID id = UUID.randomUUID();
        String email = "test@example.com";
        String fullName = "Jane Smith";
        com.digitalia.sourcing.domain.auth.model.Role role = com.digitalia.sourcing.domain.auth.model.Role.RECRUITER;
        boolean enabled = true;

        UserDto userDto = new UserDto(id, email, fullName, role, enabled);

        assertEquals(id, userDto.id());
        assertEquals(email, userDto.email());
        assertEquals(fullName, userDto.fullName());
        assertEquals(role, userDto.role());
        assertEquals(enabled, userDto.enabled());
        assertEquals("digitalia_workspace", userDto.teamId());
        assertEquals("create_roles,shortlist_candidates,manage_notes,source_candidates,export_data", userDto.privileges());
    }
}