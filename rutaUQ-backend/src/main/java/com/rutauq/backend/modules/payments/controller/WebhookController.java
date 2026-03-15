package com.rutauq.backend.modules.payments.controller;

import com.rutauq.backend.modules.payments.service.WebhookHandlerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Receives Mercado Pago webhook notifications (Payments API v1).
 *
 * This endpoint is PUBLIC — no JWT required.
 * Security is enforced via HMAC-SHA256 signature validation inside WebhookHandlerService.
 *
 * IMPORTANT: Mercado Pago expects 200 OK to acknowledge receipt.
 * Any non-2xx response triggers a retry from MP.
 * All processing errors are caught here and logged — they never affect the HTTP response.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments/webhook")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Mercado Pago webhook receiver")
public class WebhookController {

    private final WebhookHandlerService webhookHandlerService;

    @PostMapping
    @Operation(summary = "Mercado Pago webhook endpoint",
            description = "Receives payment status notifications from Mercado Pago. " +
                    "Always returns 200 to prevent MP retries. " +
                    "Signature is validated inside the handler.")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "x-signature", required = false) String xSignature,
            @RequestHeader(value = "x-request-id", required = false) String xRequestId) {

        log.debug("Webhook POST received — xRequestId={}", xRequestId);

        try {
            webhookHandlerService.handleWebhook(rawPayload, xSignature, xRequestId);
        } catch (Exception e) {
            // Never propagate exceptions to MP — it would trigger retries.
            // The event log records the failure with processed=false for investigation.
            log.error("Webhook processing failed — xRequestId={} error={}", xRequestId, e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}
