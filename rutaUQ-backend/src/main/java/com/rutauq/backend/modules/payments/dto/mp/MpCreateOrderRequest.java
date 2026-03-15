package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request body for POST /v2/orders — Mercado Pago Orders API v2.
 * Field names follow the official MP API snake_case convention.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MpCreateOrderRequest {

    private String type;

    @JsonProperty("processing_mode")
    private String processingMode;

    @JsonProperty("total_amount")
    private String totalAmount;

    @JsonProperty("external_reference")
    private String externalReference;

    private MpPayer payer;

    private MpTransactions transactions;

    private List<MpItem> items;

    @JsonProperty("notification_url")
    private String notificationUrl;

    // ---- Nested types ----

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPayer {
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpTransactions {
        private List<MpPayment> payments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPayment {
        private String amount;

        @JsonProperty("payment_method")
        private MpPaymentMethod paymentMethod;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPaymentMethod {
        /** Payment method ID: "visa", "master", "amex", etc. */
        private String id;

        /** "credit_card" | "debit_card" | "bank_transfer" */
        private String type;

        /** Card token obtained from the frontend via MP.js */
        private String token;

        private Integer installments;

        @JsonProperty("statement_descriptor")
        private String statementDescriptor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpItem {
        private String id;
        private String title;

        @JsonProperty("unit_price")
        private String unitPrice;

        private Integer quantity;

        @JsonProperty("total_amount")
        private String totalAmount;
    }
}
