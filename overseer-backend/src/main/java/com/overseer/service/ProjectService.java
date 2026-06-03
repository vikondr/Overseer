package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectMemberRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ProjectAccessService access;

    @Transactional
    public ProjectResponse createProject(String ownerId, CreateProjectRequest request) {
        User owner = userRepository.findById(ownerId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String slug = generateSlug(request.getName());

        Project project = Project.builder()
            .name(request.getName())
            .slug(slug)
            .description(request.getDescription())
            .visibility(request.getVisibility() != null ? request.getVisibility() : Project.Visibility.PRIVATE)
            .tags(request.getTags() != null ? request.getTags() : java.util.Collections.emptySet())
            .owner(owner)
            .build();

        // Create default "main" sheet
        Sheet mainSheet = Sheet.builder()
            .name("main")
            .description("Default sheet")
            .isDefault(true)
            .project(project)
            .build();
        project.getSheets().add(mainSheet);

        Project saved = projectRepository.save(project);

        // Mirror the owner into project_members so role checks have a single source.
        memberRepository.save(ProjectMember.builder()
            .project(saved)
            .user(owner)
            .role(Role.OWNER)
            .build());

        return toResponse(saved, ownerId);
    }

    public ProjectResponse getProjectById(String projectId, String requesterId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        access.requireReadAccess(project, requesterId);
        return toResponse(project, requesterId);
    }

    public ProjectResponse getProjectByOwnerAndSlug(String username, String slug, String requesterId) {
        Project project = projectRepository.findByOwnerUsernameAndSlug(username, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + username + "/" + slug));

        access.requireReadAccess(project, requesterId);
        return toResponse(project, requesterId);
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, String userId, UpdateProjectRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        access.requireRole(project, userId, Role.EDITOR);

        if (request.getName() != null) {
            project.setName(request.getName());
            project.setSlug(generateSlug(request.getName()));
        }
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getReadmeContent() != null) project.setReadmeContent(request.getReadmeContent());
        if (request.getVisibility() != null) project.setVisibility(request.getVisibility());
        if (request.getLivePreviewUrl() != null) project.setLivePreviewUrl(request.getLivePreviewUrl());
        if (request.getTags() != null) project.setTags(request.getTags());

        return toResponse(projectRepository.save(project), userId);
    }

    @Transactional
    public void deleteProject(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        access.requireRole(project, userId, Role.OWNER);

        // project_members and user_starred_projects FKs have no ON DELETE CASCADE
        // in legacy schemas (the @OnDelete annotation on ProjectMember only takes
        // effect when DDL is regenerated). Clean them up explicitly so the delete
        // succeeds against both fresh and pre-existing databases.
        memberRepository.deleteByProjectId(projectId);
        projectRepository.deleteStarsForProject(projectId);
        projectRepository.flush();

        projectRepository.delete(project);
    }

    public List<ProjectSummary> getUserProjects(String username, String requesterId) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Union of (a) projects this user owns and (b) projects they are a member of.
        // Deduplicate by project id while preserving insertion order.
        Map<String, Project> byId = new LinkedHashMap<>();
        for (Project p : projectRepository.findByOwnerId(user.getId())) byId.put(p.getId(), p);
        for (Project p : memberRepository.findProjectsByUserId(user.getId())) byId.putIfAbsent(p.getId(), p);

        boolean self = user.getId().equals(requesterId);
        List<Project> visible = new ArrayList<>();
        for (Project p : byId.values()) {
            if (p.getVisibility() == Project.Visibility.PUBLIC) {
                visible.add(p);
                continue;
            }
            // For private/unlisted, only show if the requester themselves has access.
            if (requesterId != null && access.roleOf(p, requesterId) != null) {
                visible.add(p);
                continue;
            }
            if (self) visible.add(p);
        }
        return visible.stream().map(this::toSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectSummary> getStarredProjects(String username, String requesterId) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Mirror the visibility filter from getUserProjects so we never leak a
        // private project just because someone starred it.
        boolean self = user.getId().equals(requesterId);
        List<Project> visible = new ArrayList<>();
        for (Project p : user.getStarredProjects()) {
            if (p.getVisibility() == Project.Visibility.PUBLIC) {
                visible.add(p);
                continue;
            }
            if (requesterId != null && access.roleOf(p, requesterId) != null) {
                visible.add(p);
                continue;
            }
            if (self) visible.add(p);
        }
        // Newest-starred first isn't tracked; fall back to most recently updated.
        visible.sort((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()));
        return visible.stream().map(this::toSummary).collect(Collectors.toList());
    }

    // ── Explore & Search ────────────────────────────────────

    public PageResponse<ProjectSummary> exploreProjects(int page, int size, String sortBy) {
        Sort sort = switch (sortBy) {
            case "recent" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "views" -> Sort.by(Sort.Direction.DESC, "viewCount");
            default -> Sort.by(Sort.Direction.DESC, "starCount");
        };
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Project> projects = projectRepository.findPublicProjects(pageable);
        return toPageResponse(projects);
    }

    public PageResponse<ProjectSummary> searchProjects(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "starCount"));
        Page<Project> projects = projectRepository.searchPublicProjects(query, pageable);
        return toPageResponse(projects);
    }

    public PageResponse<ProjectSummary> getProjectsByTag(String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "starCount"));
        Page<Project> projects = projectRepository.findPublicProjectsByTag(tag, pageable);
        return toPageResponse(projects);
    }

    // ── Star / Unstar ───────────────────────────────────────

    @Transactional
    public void starProject(String userId, String projectId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (user.getStarredProjects().add(project)) {
            project.setStarCount(project.getStarCount() + 1);
            userRepository.save(user);
            projectRepository.save(project);
        }
    }

    @Transactional
    public void unstarProject(String userId, String projectId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (user.getStarredProjects().remove(project)) {
            project.setStarCount(Math.max(0, project.getStarCount() - 1));
            userRepository.save(user);
            projectRepository.save(project);
        }
    }

    // ── Mapping ─────────────────────────────────────────────

    public ProjectResponse toResponse(Project p, String requesterId) {
        return ProjectResponse.builder()
            .id(p.getId())
            .name(p.getName())
            .slug(p.getSlug())
            .description(p.getDescription())
            .readmeContent(p.getReadmeContent())
            .thumbnailUrl(p.getThumbnailUrl())
            .visibility(p.getVisibility().name())
            .livePreviewUrl(p.getLivePreviewUrl())
            .starCount(p.getStarCount())
            .viewCount(p.getViewCount())
            .tags(p.getTags())
            .owner(userService.toSummary(p.getOwner()))
            .sheets(p.getSheets().stream().map(s -> SheetSummary.builder()
                .id(s.getId())
                .name(s.getName())
                .isDefault(s.isDefault())
                .parentSheetId(s.getParentSheet() != null ? s.getParentSheet().getId() : null)
                .createdBy(s.getCreatedBy() != null ? userService.toSummary(s.getCreatedBy()) : null)
                .fileCount(s.getFiles() != null ? s.getFiles().size() : 0)
                .build()
            ).collect(Collectors.toList()))
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .myRole(access.roleOf(p, requesterId))
            .build();
    }

    public ProjectSummary toSummary(Project p) {
        return ProjectSummary.builder()
            .id(p.getId())
            .name(p.getName())
            .slug(p.getSlug())
            .description(p.getDescription())
            .thumbnailUrl(p.getThumbnailUrl())
            .visibility(p.getVisibility().name())
            .starCount(p.getStarCount())
            .tags(p.getTags())
            .owner(userService.toSummary(p.getOwner()))
            .updatedAt(p.getUpdatedAt())
            .build();
    }

    private PageResponse<ProjectSummary> toPageResponse(Page<Project> page) {
        return PageResponse.<ProjectSummary>builder()
            .content(page.getContent().stream().map(this::toSummary).collect(Collectors.toList()))
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }
}
