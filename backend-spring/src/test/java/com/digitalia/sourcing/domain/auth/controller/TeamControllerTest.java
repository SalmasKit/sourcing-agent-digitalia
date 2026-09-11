package com.digitalia.sourcing.domain.auth.controller;

import com.digitalia.sourcing.domain.auth.dto.*;
import com.digitalia.sourcing.domain.auth.model.Role;
import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.domain.auth.service.JwtService;
import com.digitalia.sourcing.domain.auth.service.TeamService;
import com.digitalia.sourcing.infrastructure.security.JwtAuthenticationFilter;
import com.digitalia.sourcing.shared.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TeamController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class))
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class TeamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TeamService teamService;

    @MockBean
    private JwtService jwtService;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@digitalia.ma")
                .fullName("Salma Admin")
                .role(Role.HR_ADMIN)
                .teamId("digitalia_workspace")
                .enabled(true)
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(adminUser, null, adminUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getTeamMembers_shouldReturnMemberList() throws Exception {
        TeamMemberDto member = new TeamMemberDto(
                adminUser.getId(),
                adminUser.getEmail(),
                adminUser.getFullName(),
                adminUser.getRole(),
                true,
                adminUser.getTeamId(),
                List.of("create_roles", "shortlist_candidates"),
                Instant.now()
        );

        when(teamService.getTeamMembers(any(User.class))).thenReturn(List.of(member));

        mockMvc.perform(get("/api/v1/team/members")
                        .with(user(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].email").value("admin@digitalia.ma"));
    }

    @Test
    void getPendingInvitations_shouldReturnInvitations() throws Exception {
        TeamInvitationDto inv = new TeamInvitationDto(
                UUID.randomUUID(),
                "recruit@digitalia.ma",
                "digitalia_workspace",
                Role.RECRUITER,
                List.of("shortlist_candidates"),
                "tok-123",
                "PENDING",
                Instant.now().plusSeconds(3600),
                Instant.now()
        );

        when(teamService.getPendingInvitations(any(User.class))).thenReturn(List.of(inv));

        mockMvc.perform(get("/api/v1/team/invitations")
                        .with(user(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].email").value("recruit@digitalia.ma"));
    }

    @Test
    void inviteRecruiter_shouldReturn201() throws Exception {
        InviteRecruiterRequest request = new InviteRecruiterRequest(
                "newrecruiter@digitalia.ma",
                "New Recruiter",
                Role.RECRUITER,
                List.of("shortlist_candidates", "source_candidates")
        );

        TeamInvitationDto inv = new TeamInvitationDto(
                UUID.randomUUID(),
                request.email(),
                "digitalia_workspace",
                Role.RECRUITER,
                request.privileges(),
                "tok-abc",
                "PENDING",
                Instant.now().plusSeconds(3600),
                Instant.now()
        );

        when(teamService.inviteRecruiter(any(User.class), any(InviteRecruiterRequest.class))).thenReturn(inv);

        mockMvc.perform(post("/api/v1/team/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("newrecruiter@digitalia.ma"));
    }

    @Test
    void cancelInvitation_shouldReturn200() throws Exception {
        UUID invId = UUID.randomUUID();

        doNothing().when(teamService).cancelInvitation(any(User.class), eq(invId));

        mockMvc.perform(delete("/api/v1/team/invitations/" + invId)
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void updateMemberPrivileges_shouldReturnUpdatedMember() throws Exception {
        UUID memberId = UUID.randomUUID();
        UpdatePrivilegesRequest request = new UpdatePrivilegesRequest(List.of("create_roles", "manage_notes"));
        TeamMemberDto member = new TeamMemberDto(
                memberId,
                "recruiter@digitalia.ma",
                "Recruiter",
                Role.RECRUITER,
                true,
                "digitalia_workspace",
                request.privileges(),
                Instant.now()
        );

        when(teamService.updateMemberPrivileges(any(User.class), eq(memberId), any(UpdatePrivilegesRequest.class)))
                .thenReturn(member);

        mockMvc.perform(put("/api/v1/team/members/" + memberId + "/privileges")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.privileges[0]").value("create_roles"));
    }

    @Test
    void toggleMemberStatus_shouldReturn200() throws Exception {
        UUID memberId = UUID.randomUUID();
        doNothing().when(teamService).toggleMemberStatus(any(User.class), eq(memberId));

        mockMvc.perform(put("/api/v1/team/members/" + memberId + "/toggle-status")
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void removeMember_shouldReturn200() throws Exception {
        UUID memberId = UUID.randomUUID();
        doNothing().when(teamService).removeMember(any(User.class), eq(memberId));

        mockMvc.perform(delete("/api/v1/team/members/" + memberId)
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getTeamActivities_shouldReturnLogs() throws Exception {
        ActivityLogDto log = new ActivityLogDto(
                UUID.randomUUID(),
                "digitalia_workspace",
                adminUser.getId(),
                adminUser.getFullName(),
                adminUser.getEmail(),
                "HR_ADMIN",
                "SEARCH_CONDUCTED",
                "123",
                "Java Dev",
                "Ran search",
                Instant.now()
        );

        when(teamService.getTeamActivities(any(User.class), eq(30))).thenReturn(List.of(log));

        mockMvc.perform(get("/api/v1/team/activities?limit=30")
                        .with(user(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].actionType").value("SEARCH_CONDUCTED"));
    }

    @Test
    void recordActivity_shouldReturn201() throws Exception {
        RecordActivityRequest request = new RecordActivityRequest(
                "SEARCH_EXPORTED",
                "target-1",
                "Fullstack role",
                "Exported 10 candidates"
        );
        ActivityLogDto log = new ActivityLogDto(
                UUID.randomUUID(),
                "digitalia_workspace",
                adminUser.getId(),
                adminUser.getFullName(),
                adminUser.getEmail(),
                "HR_ADMIN",
                request.actionType(),
                request.targetId(),
                request.targetTitle(),
                request.details(),
                Instant.now()
        );

        when(teamService.recordActivity(any(User.class), any(RecordActivityRequest.class))).thenReturn(log);

        mockMvc.perform(post("/api/v1/team/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(user(adminUser))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.actionType").value("SEARCH_EXPORTED"));
    }
}
