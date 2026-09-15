package com.digitalia.sourcing.domain.auth.model;

import com.digitalia.sourcing.shared.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "team_invitations")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamInvitation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "team_id", nullable = false)
    private String teamId;

    @Column(nullable = false)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.RECRUITER;

    @Column(nullable = false, length = 500)
    @Builder.Default
    private String privileges = "shortlist_candidates,manage_notes,source_candidates";

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, EXPIRED, REVOKED

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void accept() {
        this.status = "ACCEPTED";
    }

    public void revoke() {
        this.status = "REVOKED";
    }

    public void expire() {
        this.status = "EXPIRED";
    }
}
