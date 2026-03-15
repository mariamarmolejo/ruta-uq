package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for POST /v1/payments — Mercado Pago Payments API v1.
 * This is the correct API for Colombia (MCO).
 * Note: transaction_amount is a number (BigDecimal), NOT a string.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MpCreatePaymentRequest {

    @JsonProperty("transaction_amount")
    private BigDecimal transactionAmount;

    /** Card token obtained from frontend via Mercado Pago.js */
    private String token;

    private String description;

    private Integer installments;

    @JsonProperty("payment_method_id")
    private String paymentMethodId;

    private MpPayer payer;

    @JsonProperty("external_reference")
    private String externalReference;

    @JsonProperty("notification_url")
    private String notificationUrl;

    @JsonProperty("additional_info")
    private MpAdditionalInfo additionalInfo;

    // ---- Nested types ----

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPayer {
        private String email;

        private MpIdentification identification;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpIdentification {
        private String type;
        private String number;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpAdditionalInfo {
        private List<MpItem> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpItem {
        private String id;
        private String title;

        @JsonProperty("unit_price")
        private BigDecimal unitPrice;

        private Integer quantity;
    }
}
