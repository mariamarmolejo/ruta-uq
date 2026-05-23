package com.rutauq.backend.modules.ratings.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.ratings.dto.CreateRatingRequest;
import com.rutauq.backend.modules.ratings.dto.RatingResponse;
import com.rutauq.backend.modules.ratings.service.RatingService;
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
@RequestMapping("/api/v1/ratings")
@RequiredArgsConstructor
@Tag(name = "Ratings", description = "Trip ratings by passengers")
@SecurityRequirement(name = "bearerAuth")
public class RatingController {

    private final RatingService ratingService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Rate a completed trip")
    public ResponseEntity<ApiResponse<RatingResponse>> rate(
            @Valid @RequestBody CreateRatingRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        RatingResponse response = ratingService.rate(
                request.getReservationId(), request.getStars(), request.getComment(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Rating submitted", response));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get rating for a reservation (if any)")
    public ResponseEntity<ApiResponse<RatingResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return ratingService.getByReservation(reservationId)
                .map(r -> ResponseEntity.ok(ApiResponse.ok(r)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("No rating found", "RATING_NOT_FOUND")));
    }
}
