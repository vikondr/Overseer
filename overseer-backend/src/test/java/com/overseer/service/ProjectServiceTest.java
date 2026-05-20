package com.overseer.service;

import com.overseer.dto.Dtos.CreateProjectRequest;
import com.overseer.dto.Dtos.ProjectResponse;
import com.overseer.dto.Dtos.UpdateProjectRequest;
import com.overseer.dto.Dtos.UserSummary;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ProjectService}. Targets behaviour that is testable
 * without a live database: slug generation, the side-effects of project
 * creation (default sheet + owner membership), star idempotency, and
 * authorization wiring on update.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProjectServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private ProjectAccessService access;

    @InjectMocks private ProjectService projectService;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = User.builder()
            .id("owner-1")
            .username("vikondr")
            .email("v@example.com")
            .build();
        when(userService.toSummary(any(User.class)))
            .thenReturn(UserSummary.builder().id("owner-1").username("vikondr").build());
    }

    // ── createProject ───────────────────────────────────────────────

    @Test
    @DisplayName("createProject persists project with default sheet and owner membership")
    void createProjectAttachesDefaultSheetAndOwnerMembership() {
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(owner));
        when(projectRepository.save(any(Project.class)))
            .thenAnswer(inv -> {
                Project p = inv.getArgument(0);
                p.setId("proj-1");
                return p;
            });

        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("My New Project!");
        req.setDescription("Some description");

        ProjectResponse response = projectService.createProject("owner-1", req);

        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());
        Project saved = projectCaptor.getValue();

        // ── Default sheet semantics ────────────────────────────────
        assertThat(saved.getSheets()).hasSize(1);
        assertThat(saved.getSheets().get(0).getName()).isEqualTo("main");
        assertThat(saved.getSheets().get(0).isDefault()).isTrue();
        assertThat(saved.getSheets().get(0).getProject()).isSameAs(saved);

        // ── Visibility defaults to PRIVATE ─────────────────────────
        assertThat(saved.getVisibility()).isEqualTo(Project.Visibility.PRIVATE);
        assertThat(saved.getOwner()).isSameAs(owner);

        // ── Owner membership row was created with role OWNER ───────
        ArgumentCaptor<ProjectMember> memberCaptor = ArgumentCaptor.forClass(ProjectMember.class);
        verify(memberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getRole()).isEqualTo(Role.OWNER);
        assertThat(memberCaptor.getValue().getUser()).isSameAs(owner);

        assertThat(response.getName()).isEqualTo("My New Project!");
    }

    @Test
    @DisplayName("createProject generates a URL-safe slug from the name")
    void createProjectGeneratesSlug() {
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(owner));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setId("proj-1");
            return p;
        });

        CreateProjectRequest req = new CreateProjectRequest();
        // mixed case, punctuation, multiple spaces and stray hyphens
        req.setName("  Hello,   World!! -- Project  ");

        projectService.createProject("owner-1", req);

        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());
        String slug = projectCaptor.getValue().getSlug();

        assertThat(slug)
            .matches("[a-z0-9-]+")
            .doesNotStartWith("-")
            .doesNotEndWith("-")
            .doesNotContain("--");
    }

    @Test
    @DisplayName("createProject throws when the owner does not exist")
    void createProjectThrowsForMissingOwner() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());
        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("Whatever");

        assertThatThrownBy(() -> projectService.createProject("ghost", req))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("User not found");

        verify(projectRepository, never()).save(any());
    }

    // ── starProject idempotency ─────────────────────────────────────

    @Test
    @DisplayName("starring a project twice only increments starCount once")
    void starProjectIsIdempotent() {
        Project p = Project.builder().id("proj-1").name("p").owner(owner).build();
        p.setStarCount(0);

        User starrer = User.builder().id("u-2").username("starrer").starredProjects(new HashSet<>()).build();

        when(userRepository.findById("u-2")).thenReturn(Optional.of(starrer));
        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(p));

        projectService.starProject("u-2", "proj-1");
        projectService.starProject("u-2", "proj-1");

        assertThat(p.getStarCount()).isEqualTo(1);
        assertThat(starrer.getStarredProjects()).containsExactly(p);
        // Only one persistent update each side
        verify(userRepository, times(1)).save(starrer);
        verify(projectRepository, times(1)).save(p);
    }

    @Test
    @DisplayName("unstar of an unstarred project is a no-op")
    void unstarOfUnstarredIsNoOp() {
        Project p = Project.builder().id("proj-1").name("p").owner(owner).build();
        p.setStarCount(0);

        User starrer = User.builder().id("u-2").username("starrer").starredProjects(new HashSet<>()).build();
        when(userRepository.findById("u-2")).thenReturn(Optional.of(starrer));
        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(p));

        projectService.unstarProject("u-2", "proj-1");

        assertThat(p.getStarCount()).isEqualTo(0);
        verify(userRepository, never()).save(any(User.class));
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("unstar never drives starCount below zero")
    void unstarClampsAtZero() {
        Project p = Project.builder().id("proj-1").name("p").owner(owner).build();
        p.setStarCount(0); // already zero — corrupt state in the wild

        Set<Project> starred = new HashSet<>();
        starred.add(p);
        User starrer = User.builder().id("u-2").username("starrer").starredProjects(starred).build();
        when(userRepository.findById("u-2")).thenReturn(Optional.of(starrer));
        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(p));

        projectService.unstarProject("u-2", "proj-1");

        assertThat(p.getStarCount()).isZero();
    }

    // ── updateProject authorization ─────────────────────────────────

    @Test
    @DisplayName("updateProject delegates the role check to ProjectAccessService")
    void updateProjectDelegatesAuthorization() {
        Project p = Project.builder().id("proj-1").name("orig").owner(owner)
            .visibility(Project.Visibility.PRIVATE).build();
        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(p));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProjectRequest req = new UpdateProjectRequest();
        req.setName("renamed");

        projectService.updateProject("proj-1", "user-2", req);

        verify(access).requireRole(p, "user-2", Role.EDITOR);
        assertThat(p.getName()).isEqualTo("renamed");
        assertThat(p.getSlug()).isEqualTo("renamed");
    }

    // ── deleteProject (FK cleanup contract) ────────────────────────

    @Test
    @DisplayName("deleteProject clears project_members and starred-by rows before delete")
    void deleteProjectClearsJoinTablesBeforeDelete() {
        Project p = Project.builder().id("proj-1").name("p").owner(owner).build();
        when(projectRepository.findById("proj-1")).thenReturn(Optional.of(p));

        projectService.deleteProject("proj-1", "owner-1");

        verify(access).requireRole(p, "owner-1", Role.OWNER);
        verify(memberRepository).deleteByProjectId("proj-1");
        verify(projectRepository).deleteStarsForProject("proj-1");
        verify(projectRepository).delete(p);
    }
}