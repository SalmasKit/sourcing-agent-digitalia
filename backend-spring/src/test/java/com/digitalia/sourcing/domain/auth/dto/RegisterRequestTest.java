package com.digitalia.sourcing.domain.auth.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RegisterRequestTest {

    @Test
    void testRegisterRequestWithAllFields() {
        RegisterRequest request = new RegisterRequest(
                "test@example.com",
                "Password123",
                "John Doe",
                com.digitalia.sourcing.domain.auth.model.Role.HR_ADMIN
        );

        assertEquals("test@example.com", request.email());
        assertEquals("Password123", request.password());
        assertEquals("John Doe", request.fullName());
        assertEquals(com.digitalia.sourcing.domain.auth.model.Role.HR_ADMIN, request.role());
    }

    @Test
    void testRegisterRequestWithThreeArgs() {
        RegisterRequest request = new RegisterRequest(
                "test@example.com",
                "Password123",
                "John Doe"
        );

        assertEquals("test@example.com", request.email());
        assertEquals("Password123", request.password());
        assertEquals("John Doe", request.fullName());
        assertEquals(com.digitalia.sourcing.domain.auth.model.Role.RECRUITER, request.role());
    }
}