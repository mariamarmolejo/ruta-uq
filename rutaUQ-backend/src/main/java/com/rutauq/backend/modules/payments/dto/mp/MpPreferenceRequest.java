package com.rutauq.backend.modules.payments.dto.mp;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for POST /checkout/preferences — Mercado Pago Checkout Pro.
 * Used to create a payment link (init_point) that MP hosts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MpPreferenceRequest {

    private List<MpPreferenceItem> items;

    private MpPreferencePayer payer;

    @JsonProperty("back_urls")
    private MpBackUrls backUrls;

    @JsonProperty("auto_return")
    private String autoReturn;

    @JsonProperty("external_reference")
    private String externalReference;

    @JsonProperty("notification_url")
    private String notificationUrl;

    // ---- Nested types ----

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPreferenceItem {
        private String id;
        private String title;
        private String description;

        @JsonProperty("unit_price")
        private BigDecimal unitPrice;

        private Integer quantity;

        @JsonProperty("currency_id")
        @Builder.Default
        private String currencyId = "COP";
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpPreferencePayer {
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MpBackUrls {
        private String success;
        private String failure;
        private String pending;
    }
}
