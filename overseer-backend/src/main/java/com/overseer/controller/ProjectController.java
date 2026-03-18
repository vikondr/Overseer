package com.overseer.controller;

import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    // ── CRUD ────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(projectService.createProject(user.getId(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        String requesterId = user != null ? user.getId() : null;
        return ResponseEntity.ok(projectService.getProjectById(id, requesterId));
    }

    @GetMapping("/by/{username}/{slug}")
    public ResponseEntity<ProjectResponse> getProjectBySlug(
            @PathVariable String username,
            @PathVariable String slug,
            @AuthenticationPrincipal User user) {
        String requesterId = user != null ? user.getId() : null;
        return ResponseEntity.ok(projectService.getProjectByOwnerAndSlug(username, slug, requesterId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable String id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, user.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        projectService.deleteProject(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ── User Projects ───────────────────────────────────────

    @GetMapping("/user/{username}")
    public ResponseEntity<List<ProjectSummary>> getUserProjects(
            @PathVariable String username,
            @AuthenticationPrincipal User user) {
        String requesterId = user != null ? user.getId() : null;
        return ResponseEntity.ok(projectService.getUserProjects(username, requesterId));
    }

    // ── Explore & Search ────────────────────────────────────

    @GetMapping("/explore")
    public ResponseEntity<PageResponse<ProjectSummary>> exploreProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "stars") String sort) {
        return ResponseEntity.ok(projectService.exploreProjects(page, size, sort));
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<ProjectSummary>> searchProjects(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(projectService.searchProjects(q, page, size));
    }

    @GetMapping("/tag/{tag}")
    public ResponseEntity<PageResponse<ProjectSummary>> getProjectsByTag(
            @PathVariable String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(projectService.getProjectsByTag(tag, page, size));
    }

    // ── Star / Unstar ───────────────────────────────────────

    @PostMapping("/{id}/star")
    public ResponseEntity<Void> starProject(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        projectService.starProject(user.getId(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/star")
    public ResponseEntity<Void> unstarProject(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        projectService.unstarProject(user.getId(), id);
        return ResponseEntity.ok().build();
    }
}
