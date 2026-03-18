package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.ProjectFile;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectFileRepository;
import com.overseer.repository.SheetRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final ProjectFileRepository fileRepository;
    private final SheetRepository sheetRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Value("${overseer.storage.type:local}")
    private String storageType;

    @Value("${overseer.storage.local-path:./uploads}")
    private String localPath;

    @Transactional
    public FileResponse uploadFile(String sheetId, String userId,
                                   MultipartFile file, String commitMessage) throws IOException {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));

        if (!sheet.getProject().getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("Only the project owner can upload files");
        }

        User uploader = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Calculate checksum
        String checksum = computeSha256(file.getBytes());

        // Determine version
        Integer maxVersion = fileRepository.findMaxVersionBySheetIdAndFileName(sheetId, file.getOriginalFilename());
        int version = (maxVersion != null) ? maxVersion + 1 : 1;

        // Store the file
        String storageKey = storeFile(file, sheet.getProject().getId(), sheetId);

        ProjectFile projectFile = ProjectFile.builder()
            .fileName(file.getOriginalFilename())
            .filePath(file.getOriginalFilename())
            .mimeType(file.getContentType())
            .fileSize(file.getSize())
            .storageKey(storageKey)
            .checksum(checksum)
            .version(version)
            .commitMessage(commitMessage)
            .sheet(sheet)
            .uploadedBy(uploader)
            .build();

        ProjectFile saved = fileRepository.save(projectFile);

        return FileResponse.builder()
            .id(saved.getId())
            .fileName(saved.getFileName())
            .filePath(saved.getFilePath())
            .mimeType(saved.getMimeType())
            .fileSize(saved.getFileSize())
            .checksum(saved.getChecksum())
            .version(saved.getVersion())
            .commitMessage(saved.getCommitMessage())
            .uploadedBy(userService.toSummary(uploader))
            .createdAt(saved.getCreatedAt())
            .build();
    }

    public List<FileResponse> getSheetFiles(String sheetId) {
        return fileRepository.findBySheetId(sheetId).stream()
            .map(f -> FileResponse.builder()
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
            ).collect(Collectors.toList());
    }

    public List<FileResponse> getFileVersions(String sheetId, String fileName) {
        return fileRepository.findBySheetIdAndFileNameOrderByVersionDesc(sheetId, fileName).stream()
            .map(f -> FileResponse.builder()
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
            ).collect(Collectors.toList());
    }

    public byte[] downloadFile(String fileId) throws IOException {
        ProjectFile pf = fileRepository.findById(fileId)
            .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if ("local".equals(storageType)) {
            Path filePath = Paths.get(localPath, pf.getStorageKey());
            return Files.readAllBytes(filePath);
        }

        // TODO: implement S3 download
        throw new UnsupportedOperationException("S3 storage not yet implemented");
    }

    /**
     * Compare two files and return diff metadata.
     * The actual pixel-level diffing would be done by a dedicated image processing library.
     */
    public FileDiffResponse diffFiles(String fileIdA, String fileIdB) {
        ProjectFile fileA = fileRepository.findById(fileIdA)
            .orElseThrow(() -> new ResourceNotFoundException("File A not found"));
        ProjectFile fileB = fileRepository.findById(fileIdB)
            .orElseThrow(() -> new ResourceNotFoundException("File B not found"));

        boolean identical = fileA.getChecksum().equals(fileB.getChecksum());

        return FileDiffResponse.builder()
            .fileA(toFileResponse(fileA))
            .fileB(toFileResponse(fileB))
            .similarityPercent(identical ? 100.0 : -1.0) // -1 signals "needs pixel diff"
            .changedPixels(identical ? 0 : -1)
            .totalPixels(-1)
            .diffImageUrl(null) // Would be generated by image diff service
            .build();
    }

    // ── Internal helpers ────────────────────────────────────

    private String storeFile(MultipartFile file, String projectId, String sheetId) throws IOException {
        if ("local".equals(storageType)) {
            String key = projectId + "/" + sheetId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path target = Paths.get(localPath, key);
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return key;
        }

        // TODO: implement S3 upload
        throw new UnsupportedOperationException("S3 storage not yet implemented");
    }

    private String computeSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
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
            .createdAt(f.getCreatedAt())
            .build();
    }
}
