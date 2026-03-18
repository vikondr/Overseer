package com.overseer.controller;

import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /**
     * Returns the currently authenticated user's profile.
     * The actual login happens via OAuth2 redirect (/oauth2/authorization/google or /github).
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.toResponse(user));
    }

    /**
     * Endpoint the frontend can call to verify a token is still valid.
     */
    @GetMapping("/verify")
    public ResponseEntity<Void> verifyToken(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok().build();
    }
}
