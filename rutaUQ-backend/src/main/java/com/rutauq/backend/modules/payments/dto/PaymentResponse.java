package com.rutauq.backend.modules.payments.dto;

import com.rutauq.backend.modules.payments.domain.PaymentStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class PaymentResponse {

    private UUID id;
    private UUID reservationId;
    private String mercadoPagoPaymentId;
    private PaymentStatus status;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String externalReference;
    private Instant createdAt;
    private Instant updatedAt;
}
