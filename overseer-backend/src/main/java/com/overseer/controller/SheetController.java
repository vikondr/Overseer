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

    @GetMapping
    public ResponseEntity<List<SheetSummary>> getSheets(@PathVariable String projectId) {
        return ResponseEntity.ok(sheetService.getProjectSheets(projectId));
    }

    @GetMapping("/{sheetId}")
    public ResponseEntity<SheetResponse> getSheet(
            @PathVariable String projectId,
            @PathVariable String sheetId) {
        return ResponseEntity.ok(sheetService.getSheet(sheetId));
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
