package com.digitalia.sourcing.domain.profile.model;

import com.digitalia.sourcing.domain.search.model.SearchRequest;
import com.digitalia.sourcing.shared.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Profile extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "search_request_id", nullable = false)
    private SearchRequest searchRequest;

    @Column(name = "source_platform", length = 100)
    private String sourcePlatform;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "full_name")
    private String fullName;

    @Column(columnDefinition = "TEXT")
    private String headline;

    private String location;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private Map<String, Object> skills;

    @Column(name = "experience_years")
    private Short experienceYears;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_data", columnDefinition = "JSONB")
    private Map<String, Object> rawData;

    private BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_breakdown", columnDefinition = "JSONB")
    private Map<String, Object> scoreBreakdown;

    public void updateScore(BigDecimal newScore, Map<String, Object> breakdown) {
        this.score = newScore;
        this.scoreBreakdown = breakdown;
    }
}
