package com.rutauq.backend.modules.payments.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.payments.config.MercadoPagoProperties;
import com.rutauq.backend.modules.payments.dto.mp.MpCreatePaymentRequest;
import com.rutauq.backend.modules.payments.dto.mp.MpPaymentResponse;
import com.rutauq.backend.modules.payments.dto.mp.MpPreferenceRequest;
import com.rutauq.backend.modules.payments.dto.mp.MpPreferenceResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Low-level client for the Mercado Pago Payments API v1.
 * Endpoint: POST /v1/payments (Colombia MCO uses Payments API, not Orders API v2).
 *
 * Authentication: Bearer token via RestTemplate interceptor (MercadoPagoHttpConfig).
 * Idempotency:   X-Idempotency-Key header = externalReference (reservationId).
 */
@Slf4j
@Service
public class MercadoPagoService {

    private final RestTemplate restTemplate;
    private final MercadoPagoProperties properties;
    private final ObjectMapper objectMapper;

    public MercadoPagoService(
            @Qualifier("mercadoPagoRestTemplate") RestTemplate restTemplate,
            MercadoPagoProperties properties,
            ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a payment on Mercado Pago (POST /v1/payments).
     *
     * @param request         the payment payload (card token, amount, payer, etc.)
     * @param idempotencyKey  unique key to prevent duplicate payments (use reservationId)
     * @return the created payment response with numeric ID and status
     */
    public MpPaymentResponse createPayment(MpCreatePaymentRequest request, String idempotencyKey) {
        String url = properties.getApiBaseUrl() + "/v1/payments";
        log.info("Creating MP payment — externalReference={} amount={}",
                request.getExternalReference(), request.getTransactionAmount());
        try {
            log.info("MP payment request payload: {}", objectMapper.writeValueAsString(request));
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize MP payment request for logging", e);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Idempotency-Key", idempotencyKey);
        HttpEntity<MpCreatePaymentRequest> entity = new HttpEntity<>(request, headers);
        log.info("MP payment request headers: {}", headers.toSingleValueMap());
        log.info(entity.getBody().toString());

        try {
            ResponseEntity<MpPaymentResponse> response =
                    restTemplate.exchange(url, HttpMethod.POST, entity, MpPaymentResponse.class);
            MpPaymentResponse body = response.getBody();
            log.info("MP payment created — paymentId={} status={} statusDetail={}",
                    body.getId(), body.getStatus(), body.getStatusDetail());
            return body;
        } catch (HttpClientErrorException e) {
            log.error("MP API client error creating payment: {} — {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), url);
            throw new AppException(ErrorCode.MERCADO_PAGO_ERROR,
                    "Mercado Pago rejected the payment: " + e.getResponseBodyAsString(), e);
        } catch (HttpServerErrorException e) {
            log.error("MP API server error creating payment: {} — {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), url);
            throw new AppException(ErrorCode.MERCADO_PAGO_ERROR,
                    "Mercado Pago service is temporarily unavailable", e);
        }
    }

    /**
     * Creates a Checkout Pro preference (POST /checkout/preferences).
     * Returns init_point (prod) and sandbox_init_point (test) redirect URLs.
     */
    public MpPreferenceResponse createPreference(MpPreferenceRequest request) {
        String url = properties.getApiBaseUrl() + "/checkout/preferences";
        log.info("Creating MP preference — externalReference={}", request.getExternalReference());
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Idempotency-Key", request.getExternalReference());
        HttpEntity<MpPreferenceRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<MpPreferenceResponse> response =
                    restTemplate.exchange(url, HttpMethod.POST, entity, MpPreferenceResponse.class);
            MpPreferenceResponse body = response.getBody();
            log.info("MP preference created — preferenceId={}", body.getId());
            return body;
        } catch (HttpClientErrorException e) {
            log.error("MP API client error creating preference: {} — {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), url);
            throw new AppException(ErrorCode.MERCADO_PAGO_ERROR,
                    "Mercado Pago rejected the preference request: " + e.getResponseBodyAsString(), e);
        } catch (HttpServerErrorException e) {
            log.error("MP API server error creating preference: {} — {}-{}", e.getStatusCode(), e.getResponseBodyAsString(), url);
            throw new AppException(ErrorCode.MERCADO_PAGO_ERROR,
                    "Mercado Pago service is temporarily unavailable", e);
        }
    }

    /**
     * Fetches the latest state of a payment (GET /v1/payments/{paymentId}).
     *
     * @param paymentId the numeric Mercado Pago payment ID
     * @return the current payment response
     */
    public MpPaymentResponse getPayment(String paymentId) {
        String url = properties.getApiBaseUrl() + "/v1/payments/" + paymentId;
        log.info("Fetching MP payment — paymentId={}", paymentId);

        try {
            ResponseEntity<MpPaymentResponse> response =
                    restTemplate.exchange(url, HttpMethod.GET, HttpEntity.EMPTY, MpPaymentResponse.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("MP API client error fetching payment {}: {}", paymentId, e.getStatusCode());
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND,
                    "Payment not found on Mercado Pago: " + paymentId, e);
        } catch (HttpServerErrorException e) {
            log.error("MP API server error fetching payment {}: {}", paymentId, e.getStatusCode());
            throw new AppException(ErrorCode.MERCADO_PAGO_ERROR,
                    "Mercado Pago service is temporarily unavailable", e);
        }
    }
}
