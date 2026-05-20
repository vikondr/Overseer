package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.Project;
import com.overseer.model.ProjectFile;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectFileRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.SheetRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SheetService {

    private final SheetRepository sheetRepository;
    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ProjectAccessService access;

    @Transactional
    public SheetResponse createSheet(String projectId, String userId, CreateSheetRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        access.requireRole(project, userId, Role.EDITOR);

        if (sheetRepository.existsByProjectIdAndName(projectId, request.getName())) {
            throw new DuplicateResourceException("Sheet '" + request.getName() + "' already exists in this project");
        }

        User creator = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Sheet sheet = Sheet.builder()
            .name(request.getName())
            .description(request.getDescription())
            .project(project)
            .isDefault(false)
            .createdBy(creator)
            .build();

        // Link parent sheet if provided
        if (request.getParentSheetId() != null) {
            Sheet parent = sheetRepository.findById(request.getParentSheetId())
                .orElseThrow(() -> new ResourceNotFoundException("Parent sheet not found"));
            sheet.setParentSheet(parent);
        }

        return toResponse(sheetRepository.save(sheet));
    }

    @Transactional
    public SheetResponse forkSheet(String projectId, String sourceSheetId, String userId, ForkSheetRequest request) {
        Sheet source = sheetRepository.findById(sourceSheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Source sheet not found"));

        Project project = source.getProject();
        if (!project.getId().equals(projectId)) {
            throw new ResourceNotFoundException("Sheet does not belong to this project");
        }

        // Forking creates a sheet (a mutation). On PUBLIC projects anyone with
        // read access may fork — that is the collaborative-VCS pitch. On
        // PRIVATE/UNLISTED projects forking is a mutation like any other and
        // requires EDITOR+. VIEWER on a private project gets read but no fork.
        if (project.getVisibility() == Project.Visibility.PUBLIC) {
            access.requireReadAccess(project, userId);
        } else {
            access.requireRole(project, userId, Role.EDITOR);
        }

        if (sheetRepository.existsByProjectIdAndName(projectId, request.getName())) {
            throw new DuplicateResourceException("Sheet '" + request.getName() + "' already exists in this project");
        }

        User forker = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Sheet fork = Sheet.builder()
            .name(request.getName())
            .description(request.getDescription())
            .project(project)
            .parentSheet(source)
            .createdBy(forker)
            .isDefault(false)
            .build();
        fork = sheetRepository.save(fork);

        // Snapshot: copy the latest version of each fileName from the source sheet.
        // Full per-file history is intentionally not duplicated (see 11.2 — lazy CoW + history walk).
        Map<String, ProjectFile> latestByName = new HashMap<>();
        for (ProjectFile f : projectFileRepository.findBySheetId(sourceSheetId)) {
            ProjectFile current = latestByName.get(f.getFileName());
            if (current == null || f.getVersion() > current.getVersion()) {
                latestByName.put(f.getFileName(), f);
            }
        }

        for (ProjectFile original : latestByName.values()) {
            ProjectFile copy = ProjectFile.builder()
                .fileName(original.getFileName())
                .filePath(original.getFilePath())
                .mimeType(original.getMimeType())
                .fileSize(original.getFileSize())
                .storageKey(original.getStorageKey())
                .checksum(original.getChecksum())
                .version(1)
                .commitMessage(original.getCommitMessage())
                .sheet(fork)
                .uploadedBy(original.getUploadedBy())
                .build();
            projectFileRepository.save(copy);
        }

        // Re-fetch so the response includes the freshly persisted files.
        Sheet refreshed = sheetRepository.findById(fork.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Fork not found"));
        return toResponse(refreshed);
    }

    // ── Merge ───────────────────────────────────────────────

    /**
     * Compare a forked sheet against its parent, file-by-file, by latest version.
     * Caller needs read access to the project (PUBLIC or owner).
     */
    public MergePreviewResponse previewMerge(String forkId, String userId) {
        Sheet fork = sheetRepository.findById(forkId)
            .orElseThrow(() -> new ResourceNotFoundException("Fork sheet not found"));
        Sheet parent = fork.getParentSheet();
        if (parent == null) {
            throw new IllegalArgumentException("Sheet is not a fork; nothing to merge");
        }

        Project project = fork.getProject();
        access.requireReadAccess(project, userId);

        Map<String, ProjectFile> forkLatest   = latestByFileName(forkId);
        Map<String, ProjectFile> parentLatest = latestByFileName(parent.getId());

        Set<String> allNames = new TreeSet<>();
        allNames.addAll(forkLatest.keySet());
        allNames.addAll(parentLatest.keySet());

        List<FileConflict> files = new ArrayList<>(allNames.size());
        for (String name : allNames) {
            ProjectFile f = forkLatest.get(name);
            ProjectFile p = parentLatest.get(name);
            ConflictKind kind;
            if (f != null && p != null) {
                kind = Objects.equals(f.getChecksum(), p.getChecksum())
                    ? ConflictKind.UNCHANGED
                    : ConflictKind.MODIFIED_IN_BOTH;
            } else if (f != null) {
                kind = ConflictKind.ONLY_IN_FORK;
            } else {
                kind = ConflictKind.ONLY_IN_PARENT;
            }
            files.add(FileConflict.builder()
                .fileName(name)
                .kind(kind)
                .forkFile(f != null ? toFileResponse(f) : null)
                .parentFile(p != null ? toFileResponse(p) : null)
                .build());
        }

        return MergePreviewResponse.builder()
            .forkSheetId(fork.getId())
            .parentSheetId(parent.getId())
            .files(files)
            .build();
    }

    /**
     * Apply user-chosen resolutions: bump the parent sheet so each picked file reflects the fork.
     * Requires EDITOR or OWNER on the project — merging is a write to the parent sheet.
     */
    @Transactional
    public MergeCommitResponse commitMerge(String forkId, String userId, MergeCommitRequest request) {
        Sheet fork = sheetRepository.findById(forkId)
            .orElseThrow(() -> new ResourceNotFoundException("Fork sheet not found"));
        Sheet parent = fork.getParentSheet();
        if (parent == null) {
            throw new IllegalArgumentException("Sheet is not a fork; nothing to merge");
        }

        Project project = fork.getProject();
        // Merging modifies the parent sheet — EDITOR or OWNER may commit a merge.
        access.requireRole(project, userId, Role.EDITOR);

        User actor = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Map<String, ProjectFile> forkLatest   = latestByFileName(forkId);
        Map<String, ProjectFile> parentLatest = latestByFileName(parent.getId());

        // Validate that the resolutions cover every actionable file in the diff.
        Set<String> actionable = new HashSet<>();
        Set<String> allNames   = new HashSet<>();
        allNames.addAll(forkLatest.keySet());
        allNames.addAll(parentLatest.keySet());
        for (String name : allNames) {
            ProjectFile f = forkLatest.get(name);
            ProjectFile p = parentLatest.get(name);
            boolean unchanged = f != null && p != null
                && Objects.equals(f.getChecksum(), p.getChecksum());
            if (!unchanged) actionable.add(name);
        }
        Set<String> resolved = request.getResolutions().stream()
            .map(FileResolution::getFileName)
            .collect(Collectors.toSet());
        if (!resolved.containsAll(actionable)) {
            Set<String> missing = new TreeSet<>(actionable);
            missing.removeAll(resolved);
            throw new IllegalArgumentException(
                "Missing resolutions for: " + String.join(", ", missing));
        }

        String message = request.getCommitMessage() != null && !request.getCommitMessage().isBlank()
            ? request.getCommitMessage()
            : "Merged from fork '" + fork.getName() + "'";

        int updated = 0, added = 0, deleted = 0, skipped = 0;
        for (FileResolution r : request.getResolutions()) {
            if (r.getResolution() == Resolution.TAKE_PARENT) { skipped++; continue; }

            String name   = r.getFileName();
            ProjectFile f = forkLatest.get(name);
            ProjectFile p = parentLatest.get(name);

            if (f != null && p != null) {
                // UNCHANGED → never write (defensive: the user may have resolved a no-op).
                if (Objects.equals(f.getChecksum(), p.getChecksum())) { skipped++; continue; }
                // MODIFIED_IN_BOTH → write a new version on parent referencing fork's blob.
                ProjectFile bumped = ProjectFile.builder()
                    .fileName(f.getFileName())
                    .filePath(f.getFilePath())
                    .mimeType(f.getMimeType())
                    .fileSize(f.getFileSize())
                    .storageKey(f.getStorageKey())
                    .checksum(f.getChecksum())
                    .version(p.getVersion() + 1)
                    .commitMessage(message)
                    .sheet(parent)
                    .uploadedBy(actor)
                    .build();
                projectFileRepository.save(bumped);
                updated++;
            } else if (f != null) {
                // ONLY_IN_FORK → first version on parent.
                ProjectFile copy = ProjectFile.builder()
                    .fileName(f.getFileName())
                    .filePath(f.getFilePath())
                    .mimeType(f.getMimeType())
                    .fileSize(f.getFileSize())
                    .storageKey(f.getStorageKey())
                    .checksum(f.getChecksum())
                    .version(1)
                    .commitMessage(message)
                    .sheet(parent)
                    .uploadedBy(actor)
                    .build();
                projectFileRepository.save(copy);
                added++;
            } else {
                // ONLY_IN_PARENT + TAKE_FORK → drop every version of this fileName in parent.
                List<ProjectFile> rows = projectFileRepository
                    .findBySheetIdAndFileNameOrderByVersionDesc(parent.getId(), name);
                projectFileRepository.deleteAll(rows);
                deleted++;
            }
        }

        return MergeCommitResponse.builder()
            .parentSheetId(parent.getId())
            .filesUpdated(updated)
            .filesAdded(added)
            .filesDeleted(deleted)
            .filesSkipped(skipped)
            .build();
    }

    private Map<String, ProjectFile> latestByFileName(String sheetId) {
        Map<String, ProjectFile> latest = new HashMap<>();
        for (ProjectFile f : projectFileRepository.findBySheetId(sheetId)) {
            ProjectFile current = latest.get(f.getFileName());
            if (current == null || f.getVersion() > current.getVersion()) {
                latest.put(f.getFileName(), f);
            }
        }
        return latest;
    }

    private FileResponse toFileResponse(ProjectFile f) {
        return FileResponse.builder()
            .id(f.getId())
            .fileName(f.getFileName())
            .filePath(f.getFilePath())
            .mimeType(f.getMimeType())
            .fileSize(f.getFileSize())
            .checksum(f.getChecksum())
            .version(f.getVersion())
            .commitMessage(f.getCommitMessage())
            .uploadedBy(f.getUploadedBy() != null ? userService.toSummary(f.getUploadedBy()) : null)
            .createdAt(f.getCreatedAt())
            .build();
    }

    public List<SheetSummary> getProjectSheets(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        access.requireReadAccess(project, userId);
        return sheetRepository.findByProjectId(projectId).stream()
            .map(this::toSummary)
            .collect(Collectors.toList());
    }

    public SheetResponse getSheet(String sheetId, String userId) {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));
        access.requireReadAccess(sheet.getProject(), userId);
        return toResponse(sheet);
    }

    @Transactional
    public void deleteSheet(String sheetId, String userId) {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));

        access.requireRole(sheet.getProject(), userId, Role.EDITOR);

        if (sheet.isDefault()) {
            throw new IllegalArgumentException("Cannot delete the default sheet");
        }

        sheetRepository.delete(sheet);
    }

    // ── Mapping ─────────────────────────────────────────────

    private SheetResponse toResponse(Sheet s) {
        return SheetResponse.builder()
            .id(s.getId())
            .name(s.getName())
            .description(s.getDescription())
            .isDefault(s.isDefault())
            .parentSheetId(s.getParentSheet() != null ? s.getParentSheet().getId() : null)
            .createdBy(s.getCreatedBy() != null ? userService.toSummary(s.getCreatedBy()) : null)
            .files(s.getFiles().stream().map(f -> FileResponse.builder()
                .id(f.getId())
                .fileName(f.getFileName())
                .filePath(f.getFilePath())
                .mimeType(f.getMimeType())
                .fileSize(f.getFileSize())
                .checksum(f.getChecksum())
                .version(f.getVersion())
                .commitMessage(f.getCommitMessage())
                .uploadedBy(f.getUploadedBy() != null ? userService.toSummary(f.getUploadedBy()) : null)
                .createdAt(f.getCreatedAt())
                .build()
            ).collect(Collectors.toList()))
            .createdAt(s.getCreatedAt())
            .updatedAt(s.getUpdatedAt())
            .build();
    }

    private SheetSummary toSummary(Sheet s) {
        return SheetSummary.builder()
            .id(s.getId())
            .name(s.getName())
            .isDefault(s.isDefault())
            .parentSheetId(s.getParentSheet() != null ? s.getParentSheet().getId() : null)
            .createdBy(s.getCreatedBy() != null ? userService.toSummary(s.getCreatedBy()) : null)
            .fileCount(s.getFiles() != null ? s.getFiles().size() : 0)
            .build();
    }
}
