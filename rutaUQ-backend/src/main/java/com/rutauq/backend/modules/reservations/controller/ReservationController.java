package com.rutauq.backend.modules.reservations.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.reservations.dto.CreateReservationRequest;
import com.rutauq.backend.modules.reservations.dto.ReservationResponse;
import com.rutauq.backend.modules.reservations.service.ReservationService;
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
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
@Tag(name = "Reservations", description = "Trip reservation management")
@SecurityRequirement(name = "bearerAuth")
public class ReservationController {

    private final ReservationService reservationService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(
        summary = "Reserve seats on a trip",
        description = "Creates a PENDING reservation. Seats are immediately held. " +
                      "Reservation moves to CONFIRMED after payment (Phase 6)."
    )
    public ResponseEntity<ApiResponse<ReservationResponse>> create(
            @Valid @RequestBody CreateReservationRequest request) {
        User passenger = securityUtils.getCurrentUser();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Reservation created",
                        reservationService.createReservation(passenger, request)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List my reservations", description = "Returns all reservations for the authenticated passenger")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> myReservations() {
        User passenger = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(reservationService.getMyReservations(passenger)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get reservation by ID",
        description = "Accessible by the passenger, the trip's driver, or an ADMIN"
    )
    public ResponseEntity<ApiResponse<ReservationResponse>> getById(@PathVariable UUID id) {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(
                reservationService.getReservationById(id, currentUser)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Cancel a reservation",
        description = "Can be done by the passenger, the trip's driver, or an ADMIN. " +
                      "Seats are released back to the trip."
    )
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(@PathVariable UUID id) {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Reservation cancelled",
                reservationService.cancelReservation(id, currentUser)));
    }
}
