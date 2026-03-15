package com.rutauq.backend.modules.payments.webhook;

import com.rutauq.backend.modules.payments.config.MercadoPagoProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

/**
 * Validates Mercado Pago webhook signatures.
 *
 * According to official MP documentation, the validation process is:
 * 1. Parse the x-signature header: "ts=TIMESTAMP,v1=HASH"
 * 2. Build the signed template:
 *    "ts:{ts};x-request-id:{xRequestId};data.id:{dataId}"
 *    (x-request-id part is included only when the header is present)
 * 3. Compute HMAC-SHA256 with the webhook secret
 * 4. Compare hex result with the v1 value from the header
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookSignatureValidator {

    private final MercadoPagoProperties properties;

    public boolean validate(String xSignature, String xRequestId, String dataId) {
        if (properties.getWebhookSecret() == null || properties.getWebhookSecret().isBlank()) {
            log.warn("Webhook secret not configured — skipping signature validation");
            return true;
        }

        if (xSignature == null || xSignature.isBlank()) {
            log.warn("Missing x-signature header — rejecting webhook");
            return false;
        }

        Map<String, String> parts = parseSignatureHeader(xSignature);
        String ts = parts.get("ts");
        String receivedHash = parts.get("v1");

        if (ts == null || receivedHash == null) {
            log.warn("Malformed x-signature header: {}", xSignature);
            return false;
        }

        String template = buildSignedTemplate(ts, xRequestId, dataId);
        log.debug("Webhook signed template: [{}]", template);

        try {
            String computedHash = hmacSha256(template, properties.getWebhookSecret());
            boolean valid = computedHash.equals(receivedHash);
            if (!valid) {
                log.warn("Signature mismatch — template=[{}] expected={} received={}",
                        template, computedHash, receivedHash);
            }
            return valid;
        } catch (Exception e) {
            log.error("Error computing HMAC-SHA256 for webhook validation", e);
            return false;
        }
    }

    private Map<String, String> parseSignatureHeader(String header) {
        Map<String, String> result = new HashMap<>();
        for (String part : header.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                result.put(kv[0].trim(), kv[1].trim());
            }
        }
        return result;
    }

    /**
     * Builds the signed string template per official MP documentation:
     *   id:{dataId};request-id:{xRequestId};ts:{ts};
     *
     * Field names and order must match exactly what MP computes on their side.
     */
    private String buildSignedTemplate(String ts, String xRequestId, String dataId) {
        StringBuilder sb = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            sb.append("id:").append(dataId).append(";");
        }
        if (xRequestId != null && !xRequestId.isBlank()) {
            sb.append("request-id:").append(xRequestId).append(";");
        }
        sb.append("ts:").append(ts).append(";");
        return sb.toString();
    }

    private String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
