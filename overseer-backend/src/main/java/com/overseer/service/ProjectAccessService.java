package com.overseer.service;

import com.overseer.exception.GlobalExceptionHandler.UnauthorizedException;
import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Centralised role-based access control for projects.
 * Role hierarchy: OWNER > EDITOR > VIEWER.
 */
@Service
@RequiredArgsConstructor
public class ProjectAccessService {

    private final ProjectMemberRepository memberRepository;

    /** Returns the requesting user's role in the project, or null when they are not a member. */
    public Role roleOf(Project project, String userId) {
        if (project == null || userId == null) return null;
        return memberRepository.findByProjectIdAndUserId(project.getId(), userId)
            .map(ProjectMember::getRole)
            .orElse(null);
    }

    /**
     * Throws UnauthorizedException unless the user is a member with at least {@code minRole}.
     * Returns the user's actual role on success (useful for further branching).
     */
    public Role requireRole(Project project, String userId, Role minRole) {
        Role role = roleOf(project, userId);
        if (role == null || !role.atLeast(minRole)) {
            throw new UnauthorizedException(
                "Insufficient privileges: requires " + minRole + " on this project");
        }
        return role;
    }

    /**
     * Read access: PUBLIC projects are readable by anyone; PRIVATE/UNLISTED
     * require membership (any role).
     */
    public void requireReadAccess(Project project, String requesterId) {
        if (project.getVisibility() == Project.Visibility.PUBLIC) return;
        if (requesterId != null && roleOf(project, requesterId) != null) return;
        throw new UnauthorizedException("You do not have access to this project");
    }

    /** Best-effort lookup of the requester's role for inclusion in responses. */
    public Optional<Role> myRole(Project project, String requesterId) {
        return Optional.ofNullable(roleOf(project, requesterId));
    }
}
