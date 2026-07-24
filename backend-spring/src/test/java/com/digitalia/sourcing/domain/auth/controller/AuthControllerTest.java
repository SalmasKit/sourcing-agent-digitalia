package com.digitalia.sourcing.domain.auth.controller;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.service.AuthService;
import com.digitalia.sourcing.domain.auth.service.JwtService;
import com.digitalia.sourcing.infrastructure.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import com.digitalia.sourcing.shared.exception.GlobalExceptionHandler;
import org.springframework.context.annotation.Import;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @Test
    void register_shouldReturn201AndUserDto() throws Exception {
        RegisterRequest request = new RegisterRequest("salma@dig.com", "Securepwd123", "Salma Barrak");
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true);

        when(authService.register(any(RegisterRequest.class))).thenReturn(userDto);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                // 201 Created — correct REST convention for resource creation
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("salma@dig.com"))
                .andExpect(jsonPath("$.data.fullName").value("Salma Barrak"));
    }

    @Test
    void login_shouldReturnTokens() throws Exception {
        LoginRequest request = new LoginRequest("salma@dig.com", "securepwd");
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true);
        LoginResponse response = new LoginResponse("access-token", "refresh-token", 3600L, "Bearer", userDto);

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.data.expiresIn").value(3600))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    void refresh_shouldAcceptBodyNotQueryParam() throws Exception {
        // Validates that the token is sent in the body — never in the URL
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true);
        LoginResponse response = new LoginResponse("new-access-token", "new-refresh-token", 3600L, "Bearer", userDto);

        when(authService.refreshToken(anyString())).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.expiresIn").value(3600))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    void logout_shouldReturn200() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void register_shouldReturn400WhenInvalidRequest() throws Exception {
        // Invalid email format and blank password
        RegisterRequest invalidRequest = new RegisterRequest("invalid-email-format", "", "Salma Barrak");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest))
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.email").exists());
    }
}
