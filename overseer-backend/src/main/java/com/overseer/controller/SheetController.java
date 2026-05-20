package com.overseer.controller;

import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.SheetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/sheets")
@RequiredArgsConstructor
public class SheetController {

    private final SheetService sheetService;

    @PostMapping
    public ResponseEntity<SheetResponse> createSheet(
            @PathVariable String projectId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateSheetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sheetService.createSheet(projectId, user.getId(), request));
    }

    @PostMapping("/{sheetId}/fork")
    public ResponseEntity<SheetResponse> forkSheet(
            @PathVariable String projectId,
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ForkSheetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sheetService.forkSheet(projectId, sheetId, user.getId(), request));
    }

    @GetMapping("/{sheetId}/merge/preview")
    public ResponseEntity<MergePreviewResponse> previewMerge(
            @PathVariable String projectId,
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(sheetService.previewMerge(sheetId, user.getId()));
    }

    @PostMapping("/{sheetId}/merge")
    public ResponseEntity<MergeCommitResponse> commitMerge(
            @PathVariable String projectId,
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MergeCommitRequest request) {
        return ResponseEntity.ok(sheetService.commitMerge(sheetId, user.getId(), request));
    }

    @GetMapping
    public ResponseEntity<List<SheetSummary>> getSheets(
            @PathVariable String projectId,
            @AuthenticationPrincipal User user) {
        String requesterId = user != null ? user.getId() : null;
        return ResponseEntity.ok(sheetService.getProjectSheets(projectId, requesterId));
    }

    @GetMapping("/{sheetId}")
    public ResponseEntity<SheetResponse> getSheet(
            @PathVariable String projectId,
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user) {
        String requesterId = user != null ? user.getId() : null;
        return ResponseEntity.ok(sheetService.getSheet(sheetId, requesterId));
    }

    @DeleteMapping("/{sheetId}")
    public ResponseEntity<Void> deleteSheet(
            @PathVariable String projectId,
            @PathVariable String sheetId,
            @AuthenticationPrincipal User user) {
        sheetService.deleteSheet(sheetId, user.getId());
        return ResponseEntity.noContent().build();
    }
}
