package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.Project;
import com.overseer.model.Sheet;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.SheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SheetService {

    private final SheetRepository sheetRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;

    @Transactional
    public SheetResponse createSheet(String projectId, String userId, CreateSheetRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (!project.getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("Only the project owner can create sheets");
        }

        if (sheetRepository.existsByProjectIdAndName(projectId, request.getName())) {
            throw new DuplicateResourceException("Sheet '" + request.getName() + "' already exists in this project");
        }

        Sheet sheet = Sheet.builder()
            .name(request.getName())
            .description(request.getDescription())
            .project(project)
            .isDefault(false)
            .build();

        // Link parent sheet if provided
        if (request.getParentSheetId() != null) {
            Sheet parent = sheetRepository.findById(request.getParentSheetId())
                .orElseThrow(() -> new ResourceNotFoundException("Parent sheet not found"));
            sheet.setParentSheet(parent);
        }

        return toResponse(sheetRepository.save(sheet));
    }

    public List<SheetSummary> getProjectSheets(String projectId) {
        return sheetRepository.findByProjectId(projectId).stream()
            .map(this::toSummary)
            .collect(Collectors.toList());
    }

    public SheetResponse getSheet(String sheetId) {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));
        return toResponse(sheet);
    }

    @Transactional
    public void deleteSheet(String sheetId, String userId) {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));

        if (!sheet.getProject().getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("Only the project owner can delete sheets");
        }

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
            .fileCount(s.getFiles() != null ? s.getFiles().size() : 0)
            .build();
    }
}
