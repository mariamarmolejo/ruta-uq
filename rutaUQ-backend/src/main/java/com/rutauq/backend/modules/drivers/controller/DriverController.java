package com.rutauq.backend.modules.drivers.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.drivers.dto.DriverProfileRequest;
import com.rutauq.backend.modules.drivers.dto.DriverProfileResponse;
import com.rutauq.backend.modules.drivers.service.DriverService;
import com.rutauq.backend.shared.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/drivers")
@RequiredArgsConstructor
@Tag(name = "Drivers", description = "Driver profile management")
@SecurityRequirement(name = "bearerAuth")
public class DriverController {

    private final DriverService driverService;
    private final SecurityUtils securityUtils;

    @PostMapping("/profile")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Create driver profile", description = "Creates the driving license profile for the authenticated DRIVER user")
    public ResponseEntity<ApiResponse<DriverProfileResponse>> createProfile(
            @Valid @RequestBody DriverProfileRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Driver profile created", driverService.createProfile(driver, request)));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Get driver profile", description = "Returns the driver profile including vehicles")
    public ResponseEntity<ApiResponse<DriverProfileResponse>> getProfile() {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(driverService.getMyProfile(driver)));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Update driver profile", description = "Updates license number and expiry date")
    public ResponseEntity<ApiResponse<DriverProfileResponse>> updateProfile(
            @Valid @RequestBody DriverProfileRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Driver profile updated", driverService.updateProfile(driver, request)));
    }
}
