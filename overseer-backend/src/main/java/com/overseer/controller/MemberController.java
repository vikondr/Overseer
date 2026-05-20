package com.overseer.controller;

import com.overseer.dto.Dtos.*;
import com.overseer.model.User;
import com.overseer.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping
    public ResponseEntity<List<ProjectMemberResponse>> listMembers(
            @PathVariable String projectId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(memberService.listMembers(projectId, user.getId()));
    }

    @PostMapping
    public ResponseEntity<ProjectMemberResponse> addMember(
            @PathVariable String projectId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AddMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(memberService.addMember(projectId, user.getId(), request));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<ProjectMemberResponse> updateMemberRole(
            @PathVariable String projectId,
            @PathVariable String userId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        return ResponseEntity.ok(
            memberService.updateMemberRole(projectId, userId, user.getId(), request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String projectId,
            @PathVariable String userId,
            @AuthenticationPrincipal User authUser) {
        memberService.removeMember(projectId, userId, authUser.getId());
        return ResponseEntity.noContent().build();
    }
}
