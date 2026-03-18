package com.overseer.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "project_files")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProjectFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String fileName;

    private String filePath;
    private String mimeType;
    private long fileSize;

    /** URL/key pointing to blob storage */
    @Column(nullable = false)
    private String storageKey;

    /** SHA-256 hash for deduplication & diff detection */
    private String checksum;

    @Builder.Default
    private int version = 1;

    @Column(columnDefinition = "TEXT")
    private String commitMessage;

    // ── Relationships ───────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sheet_id", nullable = false)
    private Sheet sheet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    // ── Timestamps ──────────────────────────────────────────
    @CreationTimestamp
    private Instant createdAt;
}
