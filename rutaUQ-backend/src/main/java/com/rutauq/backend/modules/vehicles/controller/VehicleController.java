package com.rutauq.backend.modules.vehicles.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.vehicles.dto.VehicleRequest;
import com.rutauq.backend.modules.vehicles.dto.VehicleResponse;
import com.rutauq.backend.modules.vehicles.service.VehicleService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicles", description = "Vehicle registration for drivers")
@SecurityRequirement(name = "bearerAuth")
public class VehicleController {

    private final VehicleService vehicleService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "List my vehicles", description = "Returns all active vehicles for the authenticated driver")
    public ResponseEntity<ApiResponse<List<VehicleResponse>>> getMyVehicles() {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(vehicleService.getMyVehicles(driver)));
    }

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Register a vehicle", description = "Registers a new vehicle for the authenticated driver")
    public ResponseEntity<ApiResponse<VehicleResponse>> register(
            @Valid @RequestBody VehicleRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Vehicle registered", vehicleService.registerVehicle(driver, request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Update a vehicle")
    public ResponseEntity<ApiResponse<VehicleResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody VehicleRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Vehicle updated", vehicleService.updateVehicle(driver, id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Deactivate a vehicle")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        User driver = securityUtils.getCurrentUser();
        vehicleService.deactivateVehicle(driver, id);
        return ResponseEntity.ok(ApiResponse.ok("Vehicle deactivated", null));
    }
}
