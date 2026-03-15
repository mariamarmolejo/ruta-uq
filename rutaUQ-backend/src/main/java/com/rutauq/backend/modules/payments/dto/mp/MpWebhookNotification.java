package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Webhook notification payload sent by Mercado Pago Payments API v1.
 *
 * Example payload:
 * {
 *   "id": "12345",
 *   "live_mode": false,
 *   "type": "payment",
 *   "api_version": "v1",
 *   "action": "payment.updated",
 *   "date_created": "2024-01-01T00:00:00+00:00",
 *   "data": { "id": "123456789" }
 * }
 *
 * Possible actions: "payment.created" | "payment.updated"
 * data.id = the numeric MP payment ID (as a string)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MpWebhookNotification {

    /** Notification ID — used for idempotency */
    private String id;

    @JsonProperty("live_mode")
    private Boolean liveMode;

    /** Event type: "payment" */
    private String type;

    @JsonProperty("api_version")
    private String apiVersion;

    /** "payment.created" | "payment.updated" */
    private String action;

    @JsonProperty("date_created")
    private String dateCreated;

    private NotificationData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NotificationData {
        /** Mercado Pago Payment ID (numeric, as string) */
        private String id;
    }
}
