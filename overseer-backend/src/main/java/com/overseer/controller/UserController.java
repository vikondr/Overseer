package com.overseer.controller;

import com.overseer.dto.Dtos;
import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.StorageService;
import com.overseer.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<Dtos.PageResponse<Dtos.UserSummary>> searchUsers(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.searchUsers(q, page, size));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateProfile(user.getId(), request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(userService.uploadAvatar(user.getId(), file));
    }

    @GetMapping("/{username}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String username) throws IOException {
        StorageService.DownloadResult result = userService.loadAvatar(username);
        MediaType mime = result.mimeType() != null
            ? MediaType.parseMediaType(result.mimeType())
            : MediaType.IMAGE_PNG;
        return ResponseEntity.ok()
            .contentType(mime)
            .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
            .body(result.data());
    }

    @GetMapping("/{username}/follow")
    public ResponseEntity<Boolean> isFollowing(
            @AuthenticationPrincipal User user,
            @PathVariable String username) {
        return ResponseEntity.ok(userService.isFollowing(user.getId(), username));
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<Void> followUser(
            @AuthenticationPrincipal User user,
            @PathVariable String username) {
        userService.followUser(user.getId(), username);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{username}/follow")
    public ResponseEntity<Void> unfollowUser(
            @AuthenticationPrincipal User user,
            @PathVariable String username) {
        userService.unfollowUser(user.getId(), username);
        return ResponseEntity.ok().build();
    }
}
