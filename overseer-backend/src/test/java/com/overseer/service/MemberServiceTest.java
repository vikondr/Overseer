package com.overseer.service;

import com.overseer.dto.Dtos.AddMemberRequest;
import com.overseer.dto.Dtos.UpdateMemberRoleRequest;
import com.overseer.dto.Dtos.UserSummary;
import com.overseer.exception.GlobalExceptionHandler.DuplicateResourceException;
import com.overseer.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.User;
import com.overseer.repository.ProjectMemberRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link MemberService}. Pins down the invariants that defend
 * the role model: the OWNER is unique-and-immutable, OWNER cannot be added or
 * promoted into, and self-removal is the only path for a non-owner to leave.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MemberServiceTest {

    @Mock private ProjectMemberRepository memberRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private ProjectAccessService access;

    @InjectMocks private MemberService memberService;

    private Project project;
    private User newMember;

    @BeforeEach
    void setUp() {
        project = Project.builder()
            .id("proj-1")
            .name("p")
            .visibility(Project.Visibility.PRIVATE)
            .build();
        newMember = User.builder().id("user-2").username("alice").build();

        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(project));
        when(userService.toSummary(any(User.class)))
            .thenReturn(UserSummary.builder().id("user-2").username("alice").build());
    }

    // ── addMember ───────────────────────────────────────────────────

    @Test
    @DisplayName("addMember requires the requester to be OWNER")
    void addMemberRequiresOwner() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(newMember));
        when(memberRepository.existsByProjectIdAndUserId("proj-1", "user-2")).thenReturn(false);
        when(memberRepository.save(any(ProjectMember.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        AddMemberRequest req = new AddMemberRequest();
        req.setUsername("alice");
        req.setRole(Role.EDITOR);

        memberService.addMember("proj-1", "owner-1", req);

        verify(access).requireRole(project, "owner-1", Role.OWNER);
        verify(memberRepository).save(any(ProjectMember.class));
    }

    @Test
    @DisplayName("addMember rejects role OWNER — a project has exactly one owner")
    void addMemberRejectsOwnerRole() {
        AddMemberRequest req = new AddMemberRequest();
        req.setUsername("alice");
        req.setRole(Role.OWNER);

        assertThatThrownBy(() -> memberService.addMember("proj-1", "owner-1", req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("OWNER");

        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("addMember rejects duplicate membership")
    void addMemberRejectsDuplicate() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(newMember));
        when(memberRepository.existsByProjectIdAndUserId("proj-1", "user-2")).thenReturn(true);

        AddMemberRequest req = new AddMemberRequest();
        req.setUsername("alice");
        req.setRole(Role.EDITOR);

        assertThatThrownBy(() -> memberService.addMember("proj-1", "owner-1", req))
            .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("addMember errors when the target user does not exist")
    void addMemberMissingUser() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        AddMemberRequest req = new AddMemberRequest();
        req.setUsername("ghost");
        req.setRole(Role.VIEWER);

        assertThatThrownBy(() -> memberService.addMember("proj-1", "owner-1", req))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateMemberRole ────────────────────────────────────────────

    @Test
    @DisplayName("updateMemberRole rejects role OWNER — ownership is not transferred via PATCH")
    void updateRoleRejectsOwner() {
        UpdateMemberRoleRequest req = new UpdateMemberRoleRequest();
        req.setRole(Role.OWNER);

        assertThatThrownBy(() ->
            memberService.updateMemberRole("proj-1", "user-2", "owner-1", req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("ownership");
    }

    @Test
    @DisplayName("updateMemberRole cannot change the existing owner's role")
    void updateRoleCannotDemoteOwner() {
        ProjectMember ownerRow = ProjectMember.builder()
            .project(project).user(newMember).role(Role.OWNER).build();
        when(memberRepository.findByProjectIdAndUserId("proj-1", "user-2"))
            .thenReturn(Optional.of(ownerRow));

        UpdateMemberRoleRequest req = new UpdateMemberRoleRequest();
        req.setRole(Role.EDITOR);

        assertThatThrownBy(() ->
            memberService.updateMemberRole("proj-1", "user-2", "owner-1", req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("owner");
    }

    // ── removeMember ────────────────────────────────────────────────

    @Test
    @DisplayName("removeMember rejects removing the project OWNER")
    void removeMemberRejectsOwnerRemoval() {
        ProjectMember ownerRow = ProjectMember.builder()
            .project(project).user(newMember).role(Role.OWNER).build();
        when(memberRepository.findByProjectIdAndUserId("proj-1", "user-2"))
            .thenReturn(Optional.of(ownerRow));

        assertThatThrownBy(() ->
            memberService.removeMember("proj-1", "user-2", "owner-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("owner");

        verify(memberRepository, never()).delete(any());
    }

    @Test
    @DisplayName("non-owner can remove themselves (leave the project)")
    void selfRemovalIsAllowed() {
        ProjectMember editorRow = ProjectMember.builder()
            .project(project).user(newMember).role(Role.EDITOR).build();
        when(memberRepository.findByProjectIdAndUserId("proj-1", "user-2"))
            .thenReturn(Optional.of(editorRow));

        memberService.removeMember("proj-1", "user-2", "user-2");

        // Self-removal still requires VIEWER on the project — verify the
        // service does NOT require OWNER for a self-removal.
        verify(access).requireRole(project, "user-2", Role.VIEWER);
        verify(access, never()).requireRole(project, "user-2", Role.OWNER);
        verify(memberRepository).delete(editorRow);
    }

    @Test
    @DisplayName("removing someone else requires OWNER")
    void removingOthersRequiresOwner() {
        ProjectMember editorRow = ProjectMember.builder()
            .project(project).user(newMember).role(Role.EDITOR).build();
        when(memberRepository.findByProjectIdAndUserId("proj-1", "user-2"))
            .thenReturn(Optional.of(editorRow));

        memberService.removeMember("proj-1", "user-2", "owner-1");

        verify(access).requireRole(project, "owner-1", Role.OWNER);
        verify(memberRepository).delete(editorRow);
    }
}