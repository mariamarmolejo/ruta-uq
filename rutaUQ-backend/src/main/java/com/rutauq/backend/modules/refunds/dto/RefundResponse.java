package com.rutauq.backend.modules.refunds.dto;

import com.rutauq.backend.modules.refunds.domain.RefundStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class RefundResponse {
    private UUID id;
    private UUID reservationId;
    private UUID paymentId;
    private BigDecimal amount;
    private RefundStatus status;
    private String reason;
    private String mpRefundId;
    private Instant requestedAt;
    private Instant processedAt;
}
