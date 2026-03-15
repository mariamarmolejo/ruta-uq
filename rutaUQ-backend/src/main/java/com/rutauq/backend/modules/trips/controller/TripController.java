package com.rutauq.backend.modules.trips.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.trips.dto.CreateTripRequest;
import com.rutauq.backend.modules.trips.dto.TripFilter;
import com.rutauq.backend.modules.trips.dto.TripResponse;
import com.rutauq.backend.modules.trips.dto.UpdateTripRequest;
import com.rutauq.backend.modules.reservations.dto.ReservationResponse;
import com.rutauq.backend.modules.reservations.service.ReservationService;
import com.rutauq.backend.modules.trips.service.TripService;
import com.rutauq.backend.shared.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
@Tag(name = "Trips", description = "Trip publishing and management")
@SecurityRequirement(name = "bearerAuth")
public class TripController {

    private final TripService tripService;
    private final ReservationService reservationService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Publish a trip", description = "Creates a new scheduled trip. Requires DRIVER role and an active vehicle.")
    public ResponseEntity<ApiResponse<TripResponse>> create(
            @Valid @RequestBody CreateTripRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Trip published", tripService.createTrip(driver, request)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search available trips", description = "Lists SCHEDULED trips with optional filters")
    public ResponseEntity<ApiResponse<List<TripResponse>>> list(
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer minSeats) {

        TripFilter filter = new TripFilter();
        filter.setOrigin(origin);
        filter.setDestination(destination);
        filter.setDepartureDate(date);
        filter.setMinSeats(minSeats);

        return ResponseEntity.ok(ApiResponse.ok(tripService.listTrips(filter)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "List my trips", description = "Returns all trips published by the authenticated driver")
    public ResponseEntity<ApiResponse<List<TripResponse>>> myTrips() {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(tripService.getMyTrips(driver)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get trip details")
    public ResponseEntity<ApiResponse<TripResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(tripService.getTripById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Update a trip", description = "Partial update allowed. Only works on SCHEDULED trips owned by the driver.")
    public ResponseEntity<ApiResponse<TripResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTripRequest request) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Trip updated", tripService.updateTrip(driver, id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Cancel a trip", description = "Cancels a SCHEDULED trip. Cannot be undone.")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable UUID id) {
        User driver = securityUtils.getCurrentUser();
        tripService.cancelTrip(driver, id);
        return ResponseEntity.ok(ApiResponse.ok("Trip cancelled", null));
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('DRIVER','ADMIN')")
    @Operation(summary = "Start a trip", description = "Transitions a SCHEDULED trip to IN_PROGRESS.")
    public ResponseEntity<ApiResponse<TripResponse>> start(@PathVariable UUID id) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Trip started", tripService.startTrip(driver, id)));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('DRIVER','ADMIN')")
    @Operation(summary = "Complete a trip", description = "Transitions an IN_PROGRESS trip to COMPLETED and marks all CONFIRMED reservations as COMPLETED.")
    public ResponseEntity<ApiResponse<TripResponse>> complete(@PathVariable UUID id) {
        User driver = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("Trip completed", tripService.completeTrip(driver, id)));
    }

    @GetMapping("/{id}/reservations")
    @PreAuthorize("hasAnyRole('DRIVER','ADMIN')")
    @Operation(
        summary = "List reservations for a trip",
        description = "Returns all reservations for a trip. Only accessible by the trip's driver or an ADMIN."
    )
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getTripReservations(@PathVariable UUID id) {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(
                reservationService.getTripReservations(id, currentUser)));
    }
}
