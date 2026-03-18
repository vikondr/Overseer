package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.Project;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserService userService;

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
        return toResponse(saved);
    }

    public ProjectResponse getProjectById(String projectId, String requesterId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        checkReadAccess(project, requesterId);
        return toResponse(project);
    }

    public ProjectResponse getProjectByOwnerAndSlug(String username, String slug, String requesterId) {
        Project project = projectRepository.findByOwnerUsernameAndSlug(username, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + username + "/" + slug));

        checkReadAccess(project, requesterId);
        return toResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, String ownerId, UpdateProjectRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        checkOwnership(project, ownerId);

        if (request.getName() != null) {
            project.setName(request.getName());
            project.setSlug(generateSlug(request.getName()));
        }
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getReadmeContent() != null) project.setReadmeContent(request.getReadmeContent());
        if (request.getVisibility() != null) project.setVisibility(request.getVisibility());
        if (request.getLivePreviewUrl() != null) project.setLivePreviewUrl(request.getLivePreviewUrl());
        if (request.getTags() != null) project.setTags(request.getTags());

        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(String projectId, String ownerId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        checkOwnership(project, ownerId);
        projectRepository.delete(project);
    }

    public List<ProjectSummary> getUserProjects(String username, String requesterId) {
        User owner = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        return projectRepository.findByOwnerId(owner.getId()).stream()
            .filter(p -> p.getVisibility() == Project.Visibility.PUBLIC
                         || owner.getId().equals(requesterId))
            .map(this::toSummary)
            .collect(Collectors.toList());
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

    // ── Access control ──────────────────────────────────────

    private void checkReadAccess(Project project, String requesterId) {
        if (project.getVisibility() == Project.Visibility.PUBLIC) return;
        if (project.getOwner().getId().equals(requesterId)) return;
        throw new UnauthorizedException("You do not have access to this project");
    }

    private void checkOwnership(Project project, String userId) {
        if (!project.getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("You are not the owner of this project");
        }
    }

    // ── Mapping ─────────────────────────────────────────────

    public ProjectResponse toResponse(Project p) {
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
                .fileCount(s.getFiles() != null ? s.getFiles().size() : 0)
                .build()
            ).collect(Collectors.toList()))
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
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
