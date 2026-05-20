package com.overseer.service;

import com.overseer.exception.GlobalExceptionHandler.UnauthorizedException;
import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.repository.ProjectMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ProjectAccessService}. Covers the role-hierarchy and
 * visibility-based read rules that underpin every protected endpoint in the
 * backend — this is the thesis's defense for role-based collaborative VCS.
 */
class ProjectAccessServiceTest {

    private ProjectMemberRepository memberRepository;
    private ProjectAccessService service;

    @BeforeEach
    void setUp() {
        memberRepository = Mockito.mock(ProjectMemberRepository.class);
        service = new ProjectAccessService(memberRepository);
    }

    private Project project(Project.Visibility visibility) {
        Project p = new Project();
        p.setId("proj-1");
        p.setVisibility(visibility);
        return p;
    }

    private void givenMembership(Role role) {
        ProjectMember pm = new ProjectMember();
        pm.setRole(role);
        when(memberRepository.findByProjectIdAndUserId(any(), any()))
            .thenReturn(Optional.of(pm));
    }

    private void givenNoMembership() {
        when(memberRepository.findByProjectIdAndUserId(any(), any()))
            .thenReturn(Optional.empty());
    }

    // ── Role hierarchy ──────────────────────────────────────────────

    @Nested
    @DisplayName("role hierarchy: OWNER > EDITOR > VIEWER")
    class RoleHierarchy {

        @Test
        void ownerSatisfiesEditorRequirement() {
            assertThat(Role.OWNER.atLeast(Role.EDITOR)).isTrue();
            assertThat(Role.OWNER.atLeast(Role.VIEWER)).isTrue();
            assertThat(Role.OWNER.atLeast(Role.OWNER)).isTrue();
        }

        @Test
        void editorSatisfiesViewerButNotOwner() {
            assertThat(Role.EDITOR.atLeast(Role.VIEWER)).isTrue();
            assertThat(Role.EDITOR.atLeast(Role.EDITOR)).isTrue();
            assertThat(Role.EDITOR.atLeast(Role.OWNER)).isFalse();
        }

        @Test
        void viewerOnlySatisfiesViewer() {
            assertThat(Role.VIEWER.atLeast(Role.VIEWER)).isTrue();
            assertThat(Role.VIEWER.atLeast(Role.EDITOR)).isFalse();
            assertThat(Role.VIEWER.atLeast(Role.OWNER)).isFalse();
        }
    }

    // ── requireRole ─────────────────────────────────────────────────

    @Test
    @DisplayName("requireRole returns role on success and rejects insufficient role")
    void requireRoleAllowsSufficientPrivilegeAndRejectsInsufficient() {
        Project p = project(Project.Visibility.PRIVATE);
        givenMembership(Role.EDITOR);

        assertThat(service.requireRole(p, "user-1", Role.VIEWER)).isEqualTo(Role.EDITOR);
        assertThat(service.requireRole(p, "user-1", Role.EDITOR)).isEqualTo(Role.EDITOR);

        assertThatThrownBy(() -> service.requireRole(p, "user-1", Role.OWNER))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("OWNER");
    }

    @Test
    @DisplayName("requireRole rejects non-members regardless of project visibility")
    void requireRoleRejectsNonMembers() {
        Project p = project(Project.Visibility.PUBLIC);
        givenNoMembership();

        assertThatThrownBy(() -> service.requireRole(p, "stranger", Role.VIEWER))
            .isInstanceOf(UnauthorizedException.class);
    }

    // ── requireReadAccess ───────────────────────────────────────────

    @Test
    @DisplayName("public projects are readable by anonymous and non-members")
    void requireReadAccessAllowsAnonymousForPublic() {
        Project p = project(Project.Visibility.PUBLIC);
        givenNoMembership();

        // Anonymous (null requester) and non-member both pass
        service.requireReadAccess(p, null);
        service.requireReadAccess(p, "stranger");
    }

    @Test
    @DisplayName("private projects deny anonymous and non-member access")
    void requireReadAccessDeniesAnonymousForPrivate() {
        Project p = project(Project.Visibility.PRIVATE);
        givenNoMembership();

        assertThatThrownBy(() -> service.requireReadAccess(p, null))
            .isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> service.requireReadAccess(p, "stranger"))
            .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("private projects allow access for VIEWER and higher")
    void requireReadAccessAllowsMembersForPrivate() {
        Project p = project(Project.Visibility.PRIVATE);

        givenMembership(Role.VIEWER);
        service.requireReadAccess(p, "user-1");

        givenMembership(Role.EDITOR);
        service.requireReadAccess(p, "user-1");

        givenMembership(Role.OWNER);
        service.requireReadAccess(p, "user-1");
    }

    @Test
    @DisplayName("unlisted projects behave like private (membership required)")
    void requireReadAccessTreatsUnlistedAsPrivate() {
        Project p = project(Project.Visibility.UNLISTED);
        givenNoMembership();

        assertThatThrownBy(() -> service.requireReadAccess(p, "stranger"))
            .isInstanceOf(UnauthorizedException.class);
    }

    // ── roleOf nullability contract ─────────────────────────────────

    @Test
    @DisplayName("roleOf returns null for null project or null user (defensive)")
    void roleOfHandlesNulls() {
        assertThat(service.roleOf(null, "user-1")).isNull();
        assertThat(service.roleOf(project(Project.Visibility.PUBLIC), null)).isNull();
    }
}