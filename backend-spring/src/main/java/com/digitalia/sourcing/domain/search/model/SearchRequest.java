package com.digitalia.sourcing.domain.search.model;

import com.digitalia.sourcing.domain.auth.model.User;
import com.digitalia.sourcing.shared.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "search_requests")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequest extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "raw_description", nullable = false, columnDefinition = "TEXT")
    private String rawDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_criteria", columnDefinition = "JSONB")
    private Map<String, Object> extractedCriteria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SearchStatus status = SearchStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    public void markRunning() {
        this.status = SearchStatus.RUNNING;
    }

    public void complete(Map<String, Object> extractedCriteria) {
        this.extractedCriteria = extractedCriteria;
        this.status = SearchStatus.COMPLETED;
    }

    public void fail() {
        this.status = SearchStatus.FAILED;
    }
}
