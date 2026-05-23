package com.rutauq.backend.modules.incidents.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.incidents.dto.CreateIncidentRequest;
import com.rutauq.backend.modules.incidents.dto.IncidentResponse;
import com.rutauq.backend.modules.incidents.service.IncidentService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incidents", description = "Trip incident reports")
@SecurityRequirement(name = "bearerAuth")
public class IncidentController {

    private final IncidentService incidentService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Report an incident for a reservation")
    public ResponseEntity<ApiResponse<IncidentResponse>> report(
            @Valid @RequestBody CreateIncidentRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        IncidentResponse response = incidentService.report(
                request.getReservationId(), request.getDescription(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Incident reported", response));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get incident for a reservation (if any)")
    public ResponseEntity<ApiResponse<IncidentResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return incidentService.getByReservation(reservationId)
                .map(r -> ResponseEntity.ok(ApiResponse.ok(r)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("No incident found", "INCIDENT_NOT_FOUND")));
    }
}
