package com.rutauq.backend.modules.payments.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.payments.dto.CreatePaymentRequest;
import com.rutauq.backend.modules.payments.dto.PaymentResponse;
import com.rutauq.backend.modules.payments.service.PaymentService;
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
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment operations via Mercado Pago Orders API v2")
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {

    private final PaymentService paymentService;
    private final SecurityUtils securityUtils;


    @PostMapping("/create")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Initiate payment for a reservation",
            description = "Creates a Mercado Pago order and associates it with the reservation. " +
                    "The reservation must be in PENDING_PAYMENT status. " +
                    "Obtain the card token from the frontend using the Mercado Pago.js SDK.")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        PaymentResponse response = paymentService.createPayment(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payment initiated successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get payment by ID")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(@PathVariable UUID id) {
        User currentUser = securityUtils.getCurrentUser();
        PaymentResponse response = paymentService.getPaymentById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get payment by reservation ID")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByReservation(
            @PathVariable UUID reservationId) {
        User currentUser = securityUtils.getCurrentUser();
        PaymentResponse response = paymentService.getPaymentByReservationId(reservationId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
