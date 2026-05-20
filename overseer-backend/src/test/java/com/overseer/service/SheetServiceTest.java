package com.overseer.service;

import com.overseer.dto.Dtos.ConflictKind;
import com.overseer.dto.Dtos.FileResolution;
import com.overseer.dto.Dtos.ForkSheetRequest;
import com.overseer.dto.Dtos.MergeCommitRequest;
import com.overseer.dto.Dtos.MergeCommitResponse;
import com.overseer.dto.Dtos.MergePreviewResponse;
import com.overseer.dto.Dtos.Resolution;
import com.overseer.dto.Dtos.UserSummary;
import com.overseer.model.Project;
import com.overseer.model.ProjectFile;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectFileRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.SheetRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SheetService}. Focused on fork / merge semantics —
 * the load-bearing collaborative-VCS behaviour that distinguishes Overseer
 * from a flat upload service.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SheetServiceTest {

    @Mock private SheetRepository sheetRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectFileRepository projectFileRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private ProjectAccessService access;

    @InjectMocks private SheetService sheetService;

    private Project project;
    private Sheet parentSheet;
    private User actor;

    @BeforeEach
    void setUp() {
        project = Project.builder()
            .id("proj-1")
            .name("p")
            .visibility(Project.Visibility.PUBLIC)
            .build();
        parentSheet = Sheet.builder()
            .id("parent-1")
            .name("main")
            .project(project)
            .isDefault(true)
            .build();
        project.getSheets().add(parentSheet);
        actor = User.builder().id("user-1").username("v").build();

        when(userService.toSummary(any(User.class)))
            .thenReturn(UserSummary.builder().id("user-1").username("v").build());
    }

    private ProjectFile file(String name, int version, String checksum, Sheet sheet) {
        return ProjectFile.builder()
            .id("file-" + name + "-" + version)
            .fileName(name)
            .filePath("/" + name)
            .mimeType("image/png")
            .fileSize(100L)
            .storageKey("blob/" + name + "/" + version)
            .checksum(checksum)
            .version(version)
            .sheet(sheet)
            .uploadedBy(actor)
            .build();
    }

    // ── forkSheet copies only the latest version of each file ──────

    @Test
    @DisplayName("forkSheet copies the latest version of each file, not the full history")
    void forkSheetSnapshotsLatestVersionOnly() {
        // Parent has two versions of foo.png and one of bar.png.
        List<ProjectFile> parentFiles = List.of(
            file("foo.png", 1, "aaa", parentSheet),
            file("foo.png", 2, "bbb", parentSheet),  // latest
            file("bar.png", 1, "ccc", parentSheet)
        );
        when(sheetRepository.findById("parent-1")).thenReturn(Optional.of(parentSheet));
        when(sheetRepository.existsByProjectIdAndName("proj-1", "feature")).thenReturn(false);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(parentFiles);
        when(sheetRepository.save(any(Sheet.class))).thenAnswer(inv -> {
            Sheet s = inv.getArgument(0);
            s.setId("fork-1");
            return s;
        });
        when(sheetRepository.findById("fork-1"))
            .thenReturn(Optional.of(Sheet.builder()
                .id("fork-1").name("feature").project(project).parentSheet(parentSheet)
                .files(new ArrayList<>()).build()));

        ForkSheetRequest req = new ForkSheetRequest();
        req.setName("feature");
        req.setDescription("trying a thing");

        sheetService.forkSheet("proj-1", "parent-1", "user-1", req);

        ArgumentCaptor<ProjectFile> savedFiles = ArgumentCaptor.forClass(ProjectFile.class);
        org.mockito.Mockito.verify(projectFileRepository, org.mockito.Mockito.times(2))
            .save(savedFiles.capture());

        List<ProjectFile> copied = savedFiles.getAllValues();
        // Two files were copied — one per unique fileName, picking the highest version.
        assertThat(copied).extracting(ProjectFile::getFileName)
            .containsExactlyInAnyOrder("foo.png", "bar.png");
        // foo.png's copy must reference the v2 checksum, not v1.
        ProjectFile foo = copied.stream().filter(f -> f.getFileName().equals("foo.png")).findFirst().orElseThrow();
        assertThat(foo.getChecksum()).isEqualTo("bbb");
        // Each copy starts at version 1 in the fork.
        assertThat(copied).allSatisfy(f -> assertThat(f.getVersion()).isEqualTo(1));
    }

    @Test
    @DisplayName("forkSheet on a PUBLIC project only requires read access (the VCS pitch)")
    void forkOnPublicProjectRequiresOnlyReadAccess() {
        when(sheetRepository.findById("parent-1")).thenReturn(Optional.of(parentSheet));
        when(sheetRepository.existsByProjectIdAndName(any(), any())).thenReturn(false);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(List.of());
        when(sheetRepository.save(any(Sheet.class))).thenAnswer(inv -> {
            Sheet s = inv.getArgument(0);
            s.setId("fork-1");
            return s;
        });
        when(sheetRepository.findById("fork-1"))
            .thenReturn(Optional.of(Sheet.builder().id("fork-1").name("f").project(project)
                .files(new ArrayList<>()).parentSheet(parentSheet).build()));

        ForkSheetRequest req = new ForkSheetRequest();
        req.setName("feature");

        sheetService.forkSheet("proj-1", "parent-1", "user-1", req);

        org.mockito.Mockito.verify(access).requireReadAccess(project, "user-1");
        org.mockito.Mockito.verify(access, org.mockito.Mockito.never())
            .requireRole(any(), any(), any());
    }

    @Test
    @DisplayName("forkSheet on a PRIVATE project requires EDITOR (forking == writing)")
    void forkOnPrivateProjectRequiresEditor() {
        project.setVisibility(Project.Visibility.PRIVATE);
        when(sheetRepository.findById("parent-1")).thenReturn(Optional.of(parentSheet));
        when(sheetRepository.existsByProjectIdAndName(any(), any())).thenReturn(false);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(List.of());
        when(sheetRepository.save(any(Sheet.class))).thenAnswer(inv -> {
            Sheet s = inv.getArgument(0);
            s.setId("fork-1");
            return s;
        });
        when(sheetRepository.findById("fork-1"))
            .thenReturn(Optional.of(Sheet.builder().id("fork-1").name("f").project(project)
                .files(new ArrayList<>()).parentSheet(parentSheet).build()));

        ForkSheetRequest req = new ForkSheetRequest();
        req.setName("feature");

        sheetService.forkSheet("proj-1", "parent-1", "user-1", req);

        org.mockito.Mockito.verify(access).requireRole(project, "user-1", Role.EDITOR);
    }

    // ── previewMerge categorises files correctly ──────────────────

    @Test
    @DisplayName("previewMerge labels files as UNCHANGED / MODIFIED_IN_BOTH / ONLY_IN_FORK / ONLY_IN_PARENT")
    void previewMergeCategorisesFiles() {
        Sheet fork = Sheet.builder()
            .id("fork-1").name("feature")
            .project(project).parentSheet(parentSheet).build();

        List<ProjectFile> parentFiles = List.of(
            file("same.png",     1, "aaa", parentSheet),
            file("modified.png", 1, "bbb", parentSheet),
            file("removed.png",  1, "ccc", parentSheet)
        );
        List<ProjectFile> forkFiles = List.of(
            file("same.png",     1, "aaa", fork),
            file("modified.png", 1, "xxx", fork),   // different checksum
            file("new.png",      1, "yyy", fork)    // not in parent
        );

        when(sheetRepository.findById("fork-1")).thenReturn(Optional.of(fork));
        when(projectFileRepository.findBySheetId("fork-1")).thenReturn(forkFiles);
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(parentFiles);

        MergePreviewResponse preview = sheetService.previewMerge("fork-1", "user-1");

        Map<String, ConflictKind> byName = preview.getFiles().stream()
            .collect(java.util.stream.Collectors.toMap(
                com.overseer.dto.Dtos.FileConflict::getFileName,
                com.overseer.dto.Dtos.FileConflict::getKind
            ));

        assertThat(byName)
            .containsEntry("same.png", ConflictKind.UNCHANGED)
            .containsEntry("modified.png", ConflictKind.MODIFIED_IN_BOTH)
            .containsEntry("new.png", ConflictKind.ONLY_IN_FORK)
            .containsEntry("removed.png", ConflictKind.ONLY_IN_PARENT);
    }

    @Test
    @DisplayName("previewMerge refuses to merge a non-fork sheet")
    void previewMergeRefusesNonFork() {
        Sheet orphan = Sheet.builder()
            .id("orphan").name("standalone").project(project).build();
        when(sheetRepository.findById("orphan")).thenReturn(Optional.of(orphan));

        assertThatThrownBy(() -> sheetService.previewMerge("orphan", "user-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("not a fork");
    }

    // ── commitMerge: validation + version-bump semantics ──────────

    @Test
    @DisplayName("commitMerge fails when caller forgets a resolution for a changed file")
    void commitMergeRejectsIncompleteResolutions() {
        Sheet fork = Sheet.builder()
            .id("fork-1").name("feature")
            .project(project).parentSheet(parentSheet).build();
        when(sheetRepository.findById("fork-1")).thenReturn(Optional.of(fork));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));
        when(projectFileRepository.findBySheetId("fork-1")).thenReturn(List.of(
            file("a.png", 1, "xxx", fork),
            file("b.png", 1, "yyy", fork)
        ));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(List.of(
            file("a.png", 1, "aaa", parentSheet)
            // b.png is only-in-fork → actionable
        ));

        MergeCommitRequest req = new MergeCommitRequest();
        FileResolution onlyOne = new FileResolution();
        onlyOne.setFileName("a.png");
        onlyOne.setResolution(Resolution.TAKE_FORK);
        req.setResolutions(List.of(onlyOne));

        assertThatThrownBy(() -> sheetService.commitMerge("fork-1", "user-1", req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("b.png");
    }

    @Test
    @DisplayName("commitMerge TAKE_FORK on MODIFIED_IN_BOTH writes a bumped version on parent")
    void commitMergeBumpsParentVersionForModifiedInBoth() {
        Sheet fork = Sheet.builder()
            .id("fork-1").name("feature")
            .project(project).parentSheet(parentSheet).build();
        when(sheetRepository.findById("fork-1")).thenReturn(Optional.of(fork));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));

        when(projectFileRepository.findBySheetId("fork-1")).thenReturn(List.of(
            file("a.png", 1, "fork-checksum", fork)
        ));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(List.of(
            file("a.png", 3, "parent-checksum", parentSheet)
        ));

        MergeCommitRequest req = new MergeCommitRequest();
        FileResolution take = new FileResolution();
        take.setFileName("a.png");
        take.setResolution(Resolution.TAKE_FORK);
        req.setResolutions(List.of(take));
        req.setCommitMessage("ship it");

        MergeCommitResponse response = sheetService.commitMerge("fork-1", "user-1", req);

        ArgumentCaptor<ProjectFile> saved = ArgumentCaptor.forClass(ProjectFile.class);
        org.mockito.Mockito.verify(projectFileRepository).save(saved.capture());
        ProjectFile written = saved.getValue();
        assertThat(written.getSheet().getId()).isEqualTo("parent-1");
        assertThat(written.getChecksum()).isEqualTo("fork-checksum");
        assertThat(written.getVersion()).isEqualTo(4); // parent v3 + 1
        assertThat(written.getCommitMessage()).isEqualTo("ship it");

        assertThat(response.getFilesUpdated()).isEqualTo(1);
        assertThat(response.getFilesAdded()).isZero();
        assertThat(response.getFilesDeleted()).isZero();
    }

    @Test
    @DisplayName("commitMerge TAKE_PARENT on a changed file leaves parent untouched and counts as skipped")
    void commitMergeTakeParentIsNoOp() {
        Sheet fork = Sheet.builder()
            .id("fork-1").name("feature")
            .project(project).parentSheet(parentSheet).build();
        when(sheetRepository.findById("fork-1")).thenReturn(Optional.of(fork));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(actor));

        when(projectFileRepository.findBySheetId("fork-1")).thenReturn(List.of(
            file("a.png", 1, "fork-checksum", fork)
        ));
        when(projectFileRepository.findBySheetId("parent-1")).thenReturn(List.of(
            file("a.png", 3, "parent-checksum", parentSheet)
        ));

        MergeCommitRequest req = new MergeCommitRequest();
        FileResolution take = new FileResolution();
        take.setFileName("a.png");
        take.setResolution(Resolution.TAKE_PARENT);
        req.setResolutions(List.of(take));

        MergeCommitResponse response = sheetService.commitMerge("fork-1", "user-1", req);

        org.mockito.Mockito.verify(projectFileRepository, org.mockito.Mockito.never())
            .save(any(ProjectFile.class));
        assertThat(response.getFilesSkipped()).isEqualTo(1);
    }

    // ── deleteSheet: default sheet is protected ───────────────────

    @Test
    @DisplayName("deleteSheet refuses to delete the default sheet")
    void deleteSheetRefusesDefault() {
        when(sheetRepository.findById("parent-1")).thenReturn(Optional.of(parentSheet));

        assertThatThrownBy(() -> sheetService.deleteSheet("parent-1", "user-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("default");

        org.mockito.Mockito.verify(sheetRepository, org.mockito.Mockito.never())
            .delete(any());
    }
}