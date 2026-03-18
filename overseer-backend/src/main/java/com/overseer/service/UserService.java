package com.overseer.service;

import com.overseer.dto.Dtos.*;
import com.overseer.exception.GlobalExceptionHandler.*;
import com.overseer.model.User;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String id) {
        User user = userRepository.findByIdWithSkills(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getDisplayName() != null) user.setDisplayName(request.getDisplayName());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getWebsiteUrl() != null) user.setWebsiteUrl(request.getWebsiteUrl());
        if (request.getPortfolioUrl() != null) user.setPortfolioUrl(request.getPortfolioUrl());
        if (request.getSkills() != null) user.setSkills(request.getSkills());

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void followUser(String followerId, String targetUsername) {
        User follower = userRepository.findById(followerId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findByUsername(targetUsername)
            .orElseThrow(() -> new ResourceNotFoundException("Target user not found: " + targetUsername));

        if (follower.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Cannot follow yourself");
        }

        target.getFollowers().add(follower);
        userRepository.save(target);
    }

    @Transactional
    public void unfollowUser(String followerId, String targetUsername) {
        User follower = userRepository.findById(followerId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findByUsername(targetUsername)
            .orElseThrow(() -> new ResourceNotFoundException("Target user not found: " + targetUsername));

        target.getFollowers().remove(follower);
        userRepository.save(target);
    }

    // ── Mapping ─────────────────────────────────────────────

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .avatarUrl(user.getAvatarUrl())
            .bio(user.getBio())
            .location(user.getLocation())
            .websiteUrl(user.getWebsiteUrl())
            .portfolioUrl(user.getPortfolioUrl())
            .skills(user.getSkills())
            .projectCount(user.getProjects() != null ? user.getProjects().size() : 0)
            .followerCount(user.getFollowers() != null ? user.getFollowers().size() : 0)
            .followingCount(user.getFollowing() != null ? user.getFollowing().size() : 0)
            .createdAt(user.getCreatedAt())
            .build();
    }

    public UserSummary toSummary(User user) {
        return UserSummary.builder()
            .id(user.getId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .avatarUrl(user.getAvatarUrl())
            .build();
    }
}
