package com.overseer.controller;

import com.overseer.dto.Dtos;
import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
