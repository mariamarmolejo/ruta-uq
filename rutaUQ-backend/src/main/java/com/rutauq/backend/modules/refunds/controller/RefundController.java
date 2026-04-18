package com.rutauq.backend.modules.refunds.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.refunds.dto.CreateRefundRequest;
import com.rutauq.backend.modules.refunds.dto.RefundResponse;
import com.rutauq.backend.modules.refunds.service.RefundService;
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

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
@Tag(name = "Refunds", description = "Refund requests for cancelled trips")
@SecurityRequirement(name = "bearerAuth")
public class RefundController {

    private final RefundService refundService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Request a refund",
               description = "Requests a refund for a cancelled reservation. The payment must be APPROVED and no prior refund must exist.")
    public ResponseEntity<ApiResponse<RefundResponse>> requestRefund(
            @Valid @RequestBody CreateRefundRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        RefundResponse response = refundService.requestRefund(request.getReservationId(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Refund requested", response));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List my refunds")
    public ResponseEntity<ApiResponse<List<RefundResponse>>> getMyRefunds() {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(refundService.getMyRefunds(currentUser)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all refunds (ADMIN)")
    public ResponseEntity<ApiResponse<List<RefundResponse>>> getAllRefunds() {
        return ResponseEntity.ok(ApiResponse.ok(refundService.getAllRefunds()));
    }
}
