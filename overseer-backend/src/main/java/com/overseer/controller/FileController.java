package com.overseer.controller;

import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileController {

    private final StorageService storageService;

    @PostMapping("/sheets/{sheetId}/files")
    public ResponseEntity<FileResponse> uploadFile(
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "message", defaultValue = "") String commitMessage) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(storageService.uploadFile(sheetId, user.getId(), file, commitMessage));
    }

    @GetMapping("/sheets/{sheetId}/files")
    public ResponseEntity<List<FileResponse>> getSheetFiles(@PathVariable String sheetId) {
        return ResponseEntity.ok(storageService.getSheetFiles(sheetId));
    }

    @GetMapping("/sheets/{sheetId}/files/{fileName}/versions")
    public ResponseEntity<List<FileResponse>> getFileVersions(
            @PathVariable String sheetId,
            @PathVariable String fileName) {
        return ResponseEntity.ok(storageService.getFileVersions(sheetId, fileName));
    }

    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileId) throws IOException {
        byte[] data = storageService.downloadFile(fileId);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
            .body(data);
    }

    @GetMapping("/files/diff")
    public ResponseEntity<FileDiffResponse> diffFiles(
            @RequestParam String fileA,
            @RequestParam String fileB) {
        return ResponseEntity.ok(storageService.diffFiles(fileA, fileB));
    }
}
