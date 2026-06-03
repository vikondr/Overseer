package com.overseer.service;

import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
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
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
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
    private final ProjectRepository projectRepository;
    private final SheetRepository sheetRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ProjectAccessService access;

    @Value("${overseer.storage.type:local}")
    private String storageType;

    @Value("${overseer.storage.local-path:./uploads}")
    private String localPath;

    @Value("${overseer.storage.azure.connection-string:}")
    private String azureConnectionString;

    @Value("${overseer.storage.azure.container:overseer-files}")
    private String azureContainer;

    private BlobContainerClient blobContainerClient;

    @PostConstruct
    void init() {
        if ("azure".equals(storageType)) {
            blobContainerClient = new BlobServiceClientBuilder()
                    .connectionString(azureConnectionString)
                    .buildClient()
                    .getBlobContainerClient(azureContainer);
            blobContainerClient.createIfNotExists();
            log.info("Azure Blob Storage initialised — container: {}", azureContainer);
        }
    }

    @Transactional
    public FileResponse uploadFile(String sheetId, String userId,
                                   MultipartFile file, String commitMessage) throws IOException {
        Sheet sheet = sheetRepository.findById(sheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Sheet not found"));

        access.requireRole(sheet.getProject(), userId, Role.EDITOR);

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

        // Set thumbnail on the project when it's the first image uploaded
        Project project = sheet.getProject();
        if (project.getThumbnailUrl() == null && file.getContentType() != null
                && file.getContentType().startsWith("image/")) {
            project.setThumbnailUrl("/api/files/" + saved.getId() + "/download");
            projectRepository.save(project);
        }

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

    public record DownloadResult(byte[] data, String mimeType, String fileName) {}

    /** Stash a user-uploaded avatar in blob storage and return the storage key. */
    public String storeAvatar(String userId, MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar";
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot > 0 && dot < original.length() - 1) ext = original.substring(dot).toLowerCase();
        String key = "avatars/" + userId + "/" + UUID.randomUUID() + ext;
        if ("local".equals(storageType)) {
            Path target = Paths.get(localPath, key);
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } else if ("azure".equals(storageType)) {
            blobContainerClient.getBlobClient(key)
                .upload(file.getInputStream(), file.getSize(), true);
        } else {
            throw new UnsupportedOperationException("Unsupported storage type: " + storageType);
        }
        return key;
    }

    /** Pull raw bytes out of blob storage by key. Used by avatar streaming. */
    public DownloadResult downloadByKey(String key, String fallbackMime) throws IOException {
        byte[] data;
        if ("local".equals(storageType)) {
            data = Files.readAllBytes(Paths.get(localPath, key));
        } else if ("azure".equals(storageType)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            blobContainerClient.getBlobClient(key).downloadStream(out);
            data = out.toByteArray();
        } else {
            throw new UnsupportedOperationException("Unsupported storage type: " + storageType);
        }
        String mime = fallbackMime;
        int dot = key.lastIndexOf('.');
        if (dot > 0) {
            switch (key.substring(dot).toLowerCase()) {
                case ".png"  -> mime = "image/png";
                case ".jpg", ".jpeg" -> mime = "image/jpeg";
                case ".webp" -> mime = "image/webp";
                case ".gif"  -> mime = "image/gif";
                case ".svg"  -> mime = "image/svg+xml";
                default -> { /* keep fallback */ }
            }
        }
        return new DownloadResult(data, mime, key.substring(key.lastIndexOf('/') + 1));
    }

    public DownloadResult downloadFile(String fileId) throws IOException {
        ProjectFile pf = fileRepository.findById(fileId)
            .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        byte[] data;
        if ("local".equals(storageType)) {
            data = Files.readAllBytes(Paths.get(localPath, pf.getStorageKey()));
        } else if ("azure".equals(storageType)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            blobContainerClient.getBlobClient(pf.getStorageKey()).downloadStream(out);
            data = out.toByteArray();
        } else {
            throw new UnsupportedOperationException("Unsupported storage type: " + storageType);
        }

        return new DownloadResult(data, pf.getMimeType(), pf.getFileName());
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

        if ("azure".equals(storageType)) {
            String key = projectId + "/" + sheetId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
            blobContainerClient.getBlobClient(key)
                    .upload(file.getInputStream(), file.getSize(), true);
            return key;
        }

        throw new UnsupportedOperationException("Unsupported storage type: " + storageType);
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
