package com.rutauq.backend.modules.payments.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePaymentRequest {

    @NotNull(message = "reservationId is required")
    private UUID reservationId;

    /**
     * Card token obtained from the frontend via Mercado Pago.js SDK.
     * Required for credit_card and debit_card types.
     */
    @NotBlank(message = "cardToken is required")
    private String cardToken;

    /**
     * Mercado Pago payment method ID, e.g. "visa", "master", "amex".
     */
    @NotBlank(message = "paymentMethodId is required")
    private String paymentMethodId;

    /**
     * Payment type: "credit_card" or "debit_card".
     * Defaults to "credit_card".
     */
    @NotBlank(message = "paymentType is required")
    private String paymentType = "credit_card";

    @Min(value = 1, message = "installments must be at least 1")
    @Max(value = 36, message = "installments cannot exceed 36")
    private int installments = 1;

    /**
     * Optional payer email override. If omitted, the authenticated user's email is used.
     */
    @Email(message = "payerEmail must be a valid email address")
    private String payerEmail;
}
