package com.overseer.dto;

import com.overseer.model.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

public class Dtos {

    @Data @Builder
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private UserResponse user;
    }

    // ═══════════════════════════════════════════════════════════
    // USER
    // ═══════════════════════════════════════════════════════════

    @Data
    @Builder
    public static class UserResponse {
        private String id;
        private String username;
        private String email;
        private String displayName;
        private String avatarUrl;
        private String bio;
        private String location;
        private String websiteUrl;
        private String portfolioUrl;
        private Set<String> skills;
        private int projectCount;
        private int followerCount;
        private int followingCount;
        private Instant createdAt;
    }

    @Data
    public static class UpdateUserRequest {
        @Size(max = 50) private String displayName;
        @Size(max = 500) private String bio;
        @Size(max = 100) private String location;
        private String websiteUrl;
        private String portfolioUrl;
        private Set<String> skills;
    }

    @Data @Builder
    public static class UserSummary {
        private String id;
        private String username;
        private String displayName;
        private String avatarUrl;
    }

    // ═══════════════════════════════════════════════════════════
    // PROJECT
    // ═══════════════════════════════════════════════════════════

    @Data
    public static class CreateProjectRequest {
        @NotBlank @Size(max = 100) private String name;
        @Size(max = 2000) private String description;
        private Project.Visibility visibility;
        private Set<String> tags;
    }

    @Data
    public static class UpdateProjectRequest {
        @Size(max = 100) private String name;
        @Size(max = 2000) private String description;
        private String readmeContent;
        private Project.Visibility visibility;
        private String livePreviewUrl;
        private Set<String> tags;
    }

    @Data @Builder
    public static class ProjectResponse {
        private String id;
        private String name;
        private String slug;
        private String description;
        private String readmeContent;
        private String thumbnailUrl;
        private String visibility;
        private String livePreviewUrl;
        private int starCount;
        private int viewCount;
        private Set<String> tags;
        private UserSummary owner;
        private List<SheetSummary> sheets;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder
    public static class ProjectSummary {
        private String id;
        private String name;
        private String slug;
        private String description;
        private String thumbnailUrl;
        private String visibility;
        private int starCount;
        private Set<String> tags;
        private UserSummary owner;
        private Instant updatedAt;
    }

    // ═══════════════════════════════════════════════════════════
    // SHEET
    // ═══════════════════════════════════════════════════════════

    @Data
    public static class CreateSheetRequest {
        @NotBlank @Size(max = 100) private String name;
        @Size(max = 500) private String description;
        private String parentSheetId;
    }

    @Data @Builder
    public static class SheetResponse {
        private String id;
        private String name;
        private String description;
        private boolean isDefault;
        private String parentSheetId;
        private List<FileResponse> files;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder
    public static class SheetSummary {
        private String id;
        private String name;
        private boolean isDefault;
        private int fileCount;
    }

    // ═══════════════════════════════════════════════════════════
    // FILE
    // ═══════════════════════════════════════════════════════════

    @Data @Builder
    public static class FileResponse {
        private String id;
        private String fileName;
        private String filePath;
        private String mimeType;
        private long fileSize;
        private String checksum;
        private int version;
        private String commitMessage;
        private UserSummary uploadedBy;
        private Instant createdAt;
    }

    @Data @Builder
    public static class FileDiffResponse {
        private FileResponse fileA;
        private FileResponse fileB;
        private String diffImageUrl;
        private double similarityPercent;
        private int changedPixels;
        private int totalPixels;
    }

    // ═══════════════════════════════════════════════════════════
    // PAGINATION
    // ═══════════════════════════════════════════════════════════

    @Data @Builder
    public static class PageResponse<T> {
        private List<T> content;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean last;
    }
}
