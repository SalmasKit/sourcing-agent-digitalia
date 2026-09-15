package com.digitalia.sourcing.domain.auth.model;

import com.digitalia.sourcing.shared.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends AuditableEntity implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.RECRUITER;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "team_id")
    private String teamId;

    @Column(length = 500)
    private String privileges;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_expiry")
    private java.time.Instant passwordResetExpiry;

    public void changeRole(Role newRole) {
        this.role = newRole;
    }

    public void updatePassword(String hashedPassword) {
        this.password = hashedPassword;
        this.passwordResetToken = null;
        this.passwordResetExpiry = null;
    }

    public void updatePrivileges(String privileges) {
        this.privileges = privileges;
    }

    public void updateTeamId(String teamId) {
        this.teamId = teamId;
    }

    public void setPasswordReset(String token, java.time.Instant expiry) {
        this.passwordResetToken = token;
        this.passwordResetExpiry = expiry;
    }

    public void clearPasswordReset() {
        this.passwordResetToken = null;
        this.passwordResetExpiry = null;
    }

    public void disable() {
        this.enabled = false;
    }

    public void enable() {
        this.enabled = true;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
