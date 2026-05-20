package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.User;
import com.overseer.repository.ProjectMemberRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ProjectAccessService access;

    /** Any member can list. */
    public List<ProjectMemberResponse> listMembers(String projectId, String requesterId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        access.requireRole(project, requesterId, Role.VIEWER);
        return memberRepository.findByProjectId(projectId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    /** OWNER only. The new role must be EDITOR or VIEWER. */
    @Transactional
    public ProjectMemberResponse addMember(String projectId, String requesterId, AddMemberRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        access.requireRole(project, requesterId, Role.OWNER);

        if (request.getRole() == Role.OWNER) {
            throw new IllegalArgumentException("Cannot add a member with role OWNER");
        }

        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUsername()));

        if (memberRepository.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new DuplicateResourceException(
                "User " + request.getUsername() + " is already a member of this project");
        }

        ProjectMember saved = memberRepository.save(ProjectMember.builder()
            .project(project)
            .user(user)
            .role(request.getRole())
            .build());
        return toResponse(saved);
    }

    /** OWNER only. Cannot demote the OWNER and cannot promote anyone to OWNER. */
    @Transactional
    public ProjectMemberResponse updateMemberRole(
            String projectId, String memberUserId, String requesterId, UpdateMemberRoleRequest request) {

        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        access.requireRole(project, requesterId, Role.OWNER);

        if (request.getRole() == Role.OWNER) {
            throw new IllegalArgumentException("Cannot transfer ownership via role change");
        }

        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, memberUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        if (member.getRole() == Role.OWNER) {
            throw new IllegalArgumentException("Cannot change the owner's role");
        }

        member.setRole(request.getRole());
        return toResponse(memberRepository.save(member));
    }

    /**
     * Remove a member. OWNER can remove any non-owner; non-owners can remove themselves
     * (leave the project). The OWNER cannot be removed.
     */
    @Transactional
    public void removeMember(String projectId, String memberUserId, String requesterId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, memberUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        if (member.getRole() == Role.OWNER) {
            throw new IllegalArgumentException("Cannot remove the project owner");
        }

        boolean selfRemoval = memberUserId.equals(requesterId);
        if (!selfRemoval) {
            access.requireRole(project, requesterId, Role.OWNER);
        } else {
            // Self-removal still requires the requester to actually be a member.
            access.requireRole(project, requesterId, Role.VIEWER);
        }

        memberRepository.delete(member);
    }

    private ProjectMemberResponse toResponse(ProjectMember m) {
        return ProjectMemberResponse.builder()
            .id(m.getId())
            .user(userService.toSummary(m.getUser()))
            .role(m.getRole())
            .addedAt(m.getAddedAt())
            .build();
    }
}
