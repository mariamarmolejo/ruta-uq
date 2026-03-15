package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response body from POST /v1/payments and GET /v1/payments/{id}
 * — Mercado Pago Payments API v1 (used for Colombia MCO).
 *
 * Payment status values:
 *   "pending"        → PENDING
 *   "approved"       → APPROVED  (status_detail: "accredited")
 *   "in_process"     → PENDING
 *   "in_mediation"   → PENDING
 *   "rejected"       → REJECTED
 *   "cancelled"      → CANCELLED
 *   "refunded"       → REFUNDED
 *   "charged_back"   → REFUNDED
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MpPaymentResponse {

    /** Numeric payment ID, e.g. 123456789 */
    private Long id;

    /**
     * Payment status:
     * "pending" | "approved" | "in_process" | "in_mediation" |
     * "rejected" | "cancelled" | "refunded" | "charged_back"
     */
    private String status;

    @JsonProperty("status_detail")
    private String statusDetail;

    @JsonProperty("external_reference")
    private String externalReference;

    @JsonProperty("payment_method_id")
    private String paymentMethodId;

    @JsonProperty("payment_type_id")
    private String paymentTypeId;

    @JsonProperty("transaction_amount")
    private BigDecimal transactionAmount;

    @JsonProperty("currency_id")
    private String currencyId;

    @JsonProperty("date_created")
    private String dateCreated;

    @JsonProperty("date_approved")
    private String dateApproved;
}
