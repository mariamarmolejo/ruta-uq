package com.rutauq.backend.modules.users.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.users.domain.UserProfile;
import com.rutauq.backend.modules.users.dto.UpdateProfileRequest;
import com.rutauq.backend.modules.users.dto.UserProfileResponse;
import com.rutauq.backend.modules.users.mapper.UserMapper;
import com.rutauq.backend.modules.users.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(User currentUser) {
        UserProfile profile = userProfileRepository.findByUserId(currentUser.getId())
                .orElse(null);
        return profile != null
                ? userMapper.toResponse(currentUser, profile)
                : userMapper.toResponseWithoutProfile(currentUser);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserById(UUID userId, User currentUser) {
        boolean isSelf = currentUser.getId().equals(userId);
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");

        if (!isSelf && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        return profile != null
                ? userMapper.toResponse(user, profile)
                : userMapper.toResponseWithoutProfile(user);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(User currentUser, UpdateProfileRequest request) {
        // Load user in current persistence context to avoid "detached entity passed to persist"
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Update basic user fields
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        userRepository.save(user);

        // Update or create profile
        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserProfile p = new UserProfile();
                    p.setUser(user);
                    return p;
                });

        if (request.getBio() != null) {
            profile.setBio(request.getBio());
        }
        if (request.getAvatarUrl() != null) {
            profile.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getBirthDate() != null) {
            profile.setBirthDate(request.getBirthDate());
        }
        if (Boolean.TRUE.equals(request.getPrivacyAccepted()) && !profile.isPrivacyAccepted()) {
            profile.setPrivacyAccepted(true);
            profile.setPrivacyAcceptedAt(Instant.now());
            log.info("Privacy consent accepted by user {}", user.getEmail());
        }

        userProfileRepository.save(profile);
        log.info("Profile updated for user {}", user.getEmail());

        return userMapper.toResponse(user, profile);
    }
}
