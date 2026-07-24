package com.digitalia.sourcing.shared.response;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    void success_withData_shouldReturnSuccessResponse() {
        ApiResponse<String> response = ApiResponse.success("sample-data");

        assertTrue(response.isSuccess());
        assertEquals("sample-data", response.getData());
        assertEquals("Operation completed successfully", response.getMessage());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void success_withDataAndMessage_shouldReturnSuccessResponse() {
        ApiResponse<String> response = ApiResponse.success("sample-data", "Custom success message");

        assertTrue(response.isSuccess());
        assertEquals("sample-data", response.getData());
        assertEquals("Custom success message", response.getMessage());
    }

    @Test
    void error_withMessage_shouldReturnErrorResponse() {
        ApiResponse<Void> response = ApiResponse.error("Error occurred");

        assertFalse(response.isSuccess());
        assertNull(response.getData());
        assertEquals("Error occurred", response.getMessage());
        assertNull(response.getErrors());
    }

    @Test
    void error_withSingleErrorAndMessage_shouldReturnErrorResponse() {
        ApiResponse<Void> response = ApiResponse.error("Single error", "Failure message");

        assertFalse(response.isSuccess());
        assertEquals("Failure message", response.getMessage());
        assertNotNull(response.getErrors());
        assertEquals(1, response.getErrors().size());
        assertEquals("Single error", response.getErrors().get(0));
    }

    @Test
    void error_withErrorListAndMessage_shouldReturnErrorResponse() {
        List<String> errors = List.of("Error 1", "Error 2");
        ApiResponse<Void> response = ApiResponse.error(errors, "Multiple failures");

        assertFalse(response.isSuccess());
        assertEquals("Multiple failures", response.getMessage());
        assertEquals(2, response.getErrors().size());
    }

    @Test
    void error_withMessageAndData_shouldReturnErrorResponseWithData() {
        java.util.Map<String, String> dataMap = java.util.Map.of("email", "invalid email");
        ApiResponse<java.util.Map<String, String>> response = ApiResponse.error("Failed validation", dataMap);

        assertFalse(response.isSuccess());
        assertEquals("Failed validation", response.getMessage());
        assertNotNull(response.getData());
        assertEquals("invalid email", response.getData().get("email"));
    }
}
