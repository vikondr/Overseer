package com.overseer.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sheets", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"project_id", "name"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Sheet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private boolean isDefault = false;

    // ── Parent reference (for forked sheets) ────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_sheet_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Sheet parentSheet;

    // ── Relationships ───────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "sheet", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProjectFile> files = new ArrayList<>();

    // ── Timestamps ──────────────────────────────────────────
    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
