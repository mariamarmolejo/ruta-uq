package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response body from GET/POST /v2/orders — Mercado Pago Orders API v2.
 * Unknown fields are ignored to remain forward-compatible with MP API changes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MpOrderResponse {

    /** Order ID, e.g. "01JGRB6DFQKQ8KMEYDKGE2Z2TC" */
    private String id;

    private String type;

    /**
     * Order status: "open" | "closed" | "expired" | "error"
     */
    private String status;

    @JsonProperty("status_detail")
    private String statusDetail;

    @JsonProperty("processing_mode")
    private String processingMode;

    @JsonProperty("total_amount")
    private String totalAmount;

    @JsonProperty("external_reference")
    private String externalReference;

    private MpTransactions transactions;

    // ---- Nested types ----

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MpTransactions {
        private List<MpPaymentInfo> payments;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MpPaymentInfo {
        private String id;
        private String amount;

        /**
         * Transaction status: "pending" | "approved" | "rejected" |
         *   "cancelled" | "refunded" | "authorized" | "in_process"
         */
        private String status;

        @JsonProperty("status_detail")
        private String statusDetail;

        @JsonProperty("payment_method")
        private MpPaymentMethodInfo paymentMethod;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MpPaymentMethodInfo {
        private String id;
        private String type;
        private Integer installments;
    }
}
