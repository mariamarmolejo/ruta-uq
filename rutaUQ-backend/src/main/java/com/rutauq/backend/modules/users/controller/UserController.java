package com.rutauq.backend.modules.users.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.users.dto.UpdateProfileRequest;
import com.rutauq.backend.modules.users.dto.UserProfileResponse;
import com.rutauq.backend.modules.users.service.UserService;
import com.rutauq.backend.shared.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile management")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own profile", description = "Returns the full profile of the currently authenticated user")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile() {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(currentUser)));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update own profile", description = "Updates user info and profile fields. Partial updates are supported.")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", userService.updateMyProfile(currentUser, request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get user by ID", description = "Accessible by the user themselves or an ADMIN")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserById(@PathVariable UUID id) {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserById(id, currentUser)));
    }
}
