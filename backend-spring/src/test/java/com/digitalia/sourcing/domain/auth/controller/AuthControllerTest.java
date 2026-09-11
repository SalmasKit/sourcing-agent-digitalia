package com.digitalia.sourcing.domain.auth.controller;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
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
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true, "digitalia_workspace", "create_roles");

        when(authService.register(any(RegisterRequest.class))).thenReturn(userDto);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("salma@dig.com"))
                .andExpect(jsonPath("$.data.fullName").value("Salma Barrak"));
    }

    @Test
    void login_shouldReturnTokens() throws Exception {
        LoginRequest request = new LoginRequest("salma@dig.com", "securepwd");
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true, "digitalia_workspace", "create_roles");
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
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        UserDto userDto = new UserDto(UUID.randomUUID(), "salma@dig.com", "Salma Barrak", Role.RECRUITER, true, "digitalia_workspace", "create_roles");
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

    @Test
    void changePassword_shouldReturn200() throws Exception {
        User user = User.builder().email("salma@dig.com").role(Role.RECRUITER).build();
        ChangePasswordRequest request = new ChangePasswordRequest("OldPass123", "NewPass456");

        doNothing().when(authService).changePassword(any(User.class), any(ChangePasswordRequest.class));

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(user(user))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void forgotPassword_shouldReturn200AndResetToken() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("salma@dig.com");
        when(authService.forgotPassword(any(ForgotPasswordRequest.class))).thenReturn("mock-reset-token");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resetToken").value("mock-reset-token"));
    }

    @Test
    void resetPassword_shouldReturn200() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("token-123", "NewPassword123");
        doNothing().when(authService).resetPassword(any(ResetPasswordRequest.class));

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void acceptInvite_shouldReturn200AndLoginResponse() throws Exception {
        AcceptInviteRequest request = new AcceptInviteRequest("tok-abc", "New Candidate", "SecretPass123");
        UserDto userDto = new UserDto(UUID.randomUUID(), "candidate@dig.com", "New Candidate", Role.RECRUITER, true, "digitalia_workspace", "create_roles");
        LoginResponse response = new LoginResponse("acc-token", "ref-token", 3600L, "Bearer", userDto);

        when(authService.acceptInvite(any(AcceptInviteRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/accept-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("acc-token"));
    }
}
