package com.digitalia.sourcing.shared.exception;

import com.digitalia.sourcing.shared.response.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    void handleAuthException_shouldReturn401() {
        BadCredentialsException ex = new BadCredentialsException("Bad credentials");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleAuthException(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Invalid credentials", response.getBody().getMessage());
    }

    @Test
    void handleInvalidRefreshToken_shouldReturn401() {
        InvalidRefreshTokenException ex = new InvalidRefreshTokenException("Token expired");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleInvalidRefreshToken(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Token expired", response.getBody().getMessage());
    }

    @Test
    void handleNotFound_shouldReturn404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("User not found");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("User not found", response.getBody().getMessage());
    }

    @Test
    void handleIllegalArgument_shouldReturn409() {
        IllegalArgumentException ex = new IllegalArgumentException("Email already in use");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleIllegalArgument(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Email already in use", response.getBody().getMessage());
    }

    @Test
    void handleValidation_shouldReturn400WithErrorsMap() throws NoSuchMethodException {
        BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "target");
        bindingResult.addError(new FieldError("target", "email", "must be a valid email"));

        MethodParameter methodParameter = new MethodParameter(
                this.getClass().getDeclaredMethod("dummyMethod", String.class), 0);
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(methodParameter, bindingResult);

        ResponseEntity<ApiResponse<Map<String, String>>> response = exceptionHandler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Validation failed", response.getBody().getMessage());
        assertNotNull(response.getBody().getData());
        assertEquals("must be a valid email", response.getBody().getData().get("email"));
    }

    @Test
    void handleAccessDenied_shouldReturn403() {
        AccessDeniedException ex = new AccessDeniedException("Access is denied");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleAccessDenied(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().contains("Access is denied"));
    }

    @Test
    void handleGeneric_shouldReturn500() {
        RuntimeException ex = new RuntimeException("Unexpected DB crash");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleGeneric(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("An unexpected error occurred", response.getBody().getMessage());
    }

    @Test
    void handleTypeMismatch_shouldReturn400WithDescriptiveMessage() throws NoSuchMethodException {
        MethodParameter methodParameter = new MethodParameter(
                this.getClass().getDeclaredMethod("dummyMethod", String.class), 0);
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "not-a-uuid", java.util.UUID.class, "id", methodParameter, null);

        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleTypeMismatch(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().contains("id"));
        assertTrue(response.getBody().getMessage().contains("UUID"));
    }

    @SuppressWarnings("unused")
    private void dummyMethod(String param) {}
}
