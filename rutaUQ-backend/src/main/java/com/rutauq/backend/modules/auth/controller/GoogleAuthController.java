package com.rutauq.backend.modules.auth.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.dto.AuthResponse;
import com.rutauq.backend.modules.auth.dto.GoogleAuthRequest;
import com.rutauq.backend.modules.auth.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse response = googleAuthService.authenticateWithGoogle(request.idToken());
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }
}
