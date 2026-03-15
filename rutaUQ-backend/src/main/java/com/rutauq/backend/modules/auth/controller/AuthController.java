package com.rutauq.backend.modules.auth.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.dto.AuthResponse;
import com.rutauq.backend.modules.auth.dto.ForgotPasswordRequest;
import com.rutauq.backend.modules.auth.dto.LoginRequest;
import com.rutauq.backend.modules.auth.dto.RegisterRequest;
import com.rutauq.backend.modules.auth.dto.RegisterResponse;
import com.rutauq.backend.modules.auth.dto.ResetPasswordRequest;
import com.rutauq.backend.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, email verification and password reset")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user",
               description = "Creates a new account and sends a verification email. The user must verify before logging in.")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        RegisterResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registration successful. Please check your email to verify your account.", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login",
               description = "Authenticates a user and returns a JWT token. Email must be verified first.")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email address",
               description = "Validates the token sent to the user's email and marks it as verified.")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.ok("Email verified successfully. You can now log in.", null));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email",
               description = "Sends a new verification email if the previous one expired.")
    public ResponseEntity<ApiResponse<Void>> resendVerification(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("Verification email sent", null));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset",
               description = "Sends a password reset link to the email if it is registered.")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok(
                "If that email is registered, a reset link has been sent.", null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password",
               description = "Sets a new password using the token received by email.")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully. You can now log in.", null));
    }
}
